'use strict';

const fs = require('fs');
const path = require('path');
const POLICY = require('../calibration/pooled-study-policy.json');

const AGE_BANDS = [...POLICY.ageBands];
const ACTIVE_FORM_ITEMS = 2052;
const MATRIX_PREFIX = 'matrix:CIL-MATRIX-2026.09.1:';
const FORBIDDEN_KEYS = new Set([
  'name','fullname','firstname','lastname','email','account','accountid','ip','ipaddress',
  'location','address','dateofbirth','birthday','phone','phonenumber'
]);

const ROW_COLUMNS = [
  'sourceKey','sessionId','selectionReason','ageYears','ageBand','bankVersion','bankRevision',
  'scoringVersion','formId','recordType','itemId','domain','family','semanticKey','difficulty',
  'selectedOption','correctOption','correct','skipped','timeout','seconds','cpi',
  'anchorVersion','anchorRole','anchorFingerprint','primaryAnchorId','iqEstimate'
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scanForbiddenKeys(value, trail = [], hits = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenKeys(entry, [...trail, String(index)], hits));
    return hits;
  }
  if (!isObject(value)) return hits;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_KEYS.has(normalized)) hits.push([...trail, key].join('.'));
    scanForbiddenKeys(child, [...trail, key], hits);
  }
  return hits;
}

function privacyErrors(doc) {
  const errors = [];
  const hits = scanForbiddenKeys(doc);
  if (hits.length) errors.push(`forbidden identifying key(s): ${hits.slice(0, 8).join(', ')}`);
  const privacy = isObject(doc?.privacy) ? doc.privacy : null;
  if (privacy?.automaticUpload !== false) errors.push('privacy.automaticUpload must be false');
  for (const key of ['containsName','containsAccount','containsDateOfBirth','containsIp','containsLocation']) {
    if (privacy && privacy[key] !== false) errors.push(`privacy.${key} must be false`);
  }
  const product = isObject(doc?.productStatus) ? doc.productStatus : null;
  if (product?.iqEstimateAvailable === true) errors.push('export claims IQ estimate is available');
  if (product?.populationNormed === true) errors.push('export claims population norming is complete');
  return errors;
}

function validateExport(doc) {
  const errors = [];
  if (!isObject(doc)) return ['export must be a JSON object'];
  if (doc.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
  if (typeof doc.sourceKey !== 'string' || doc.sourceKey.length < 8) errors.push('sourceKey must be a pseudonymous key');
  if (doc.sourceKey === 'local-unavailable') errors.push('sourceKey local-unavailable cannot establish an independent participant');
  if (!Array.isArray(doc.sessions)) errors.push('sessions must be an array');
  errors.push(...privacyErrors(doc));
  return errors;
}

function isAnchorRow(row) {
  return row?.recordType === 'anchor' || String(row?.formId || '').startsWith('anchor:');
}

function formalRows(session) {
  return (Array.isArray(session?.rows) ? session.rows : []).filter(row => !isAnchorRow(row));
}

function formalFormId(session) {
  if (typeof session?.formId === 'string' && session.formId) return session.formId;
  const ids = formalRows(session).map(row => row?.formId).filter(value => typeof value === 'string' && value);
  return ids[0] || null;
}

function isMatrixSession(session) {
  return String(formalFormId(session) || '').startsWith(MATRIX_PREFIX);
}

function matrixSlot(session) {
  const formId = String(formalFormId(session) || '');
  const match = formId.match(/^matrix:CIL-MATRIX-2026\.09\.1:epoch-(\d+):slot-(\d{2})$/);
  return match ? Number(match[2]) : null;
}

function isConsented(session) {
  return session?.anchorStudy?.optIn === true;
}

function sessionTime(session) {
  const ms = Date.parse(session?.createdAt || '');
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function preferenceScore(session) {
  if (session?.anchorStudy?.completed === true) return 3;
  if (isMatrixSession(session)) return 2;
  return 1;
}

function chooseIndependentSession(sessions) {
  const eligible = (Array.isArray(sessions) ? sessions : []).filter(isConsented);
  if (!eligible.length) return null;
  const ordered = [...eligible].sort((a, b) => preferenceScore(b) - preferenceScore(a) || sessionTime(a) - sessionTime(b) || String(a.sessionId || '').localeCompare(String(b.sessionId || '')));
  const session = ordered[0];
  const reason = session?.anchorStudy?.completed === true
    ? 'completed-anchor-session'
    : isMatrixSession(session)
      ? 'matrix-session'
      : 'earliest-consented-session';
  return { session, reason };
}

function validateSession(session, exportSourceKey) {
  const errors = [];
  if (!isObject(session)) return ['session must be an object'];
  if (typeof session.sessionId !== 'string' || session.sessionId.length < 8) errors.push('invalid sessionId');
  const sourceKey = session.sourceKey || exportSourceKey;
  if (typeof sourceKey !== 'string' || sourceKey.length < 8 || sourceKey === 'local-unavailable') errors.push('invalid session sourceKey');
  const age = Number(session.ageYears);
  if (!Number.isInteger(age) || age < 18 || age > 65) errors.push('ageYears must be 18–65');
  if (!AGE_BANDS.includes(session.ageBand)) errors.push('invalid ageBand');
  if (!Array.isArray(session.rows) || !session.rows.length) errors.push('session rows must be a non-empty array');
  if (session.iqEstimate != null) errors.push('iqEstimate must remain null');
  return errors;
}

function projectRow(row, session, selectionReason = '') {
  const sourceKey = session.sourceKey;
  return {
    sourceKey,
    sessionId: session.sessionId,
    selectionReason,
    ageYears: session.ageYears,
    ageBand: session.ageBand,
    bankVersion: row?.bankVersion ?? session.bankVersion ?? null,
    bankRevision: row?.bankRevision ?? session.bankRevision ?? null,
    scoringVersion: row?.scoringVersion ?? session.scoringVersion ?? null,
    formId: row?.formId ?? formalFormId(session),
    recordType: isAnchorRow(row) ? 'anchor' : 'formal',
    itemId: row?.itemId ?? null,
    domain: row?.domain ?? null,
    family: row?.family ?? null,
    semanticKey: row?.semanticKey ?? null,
    difficulty: row?.difficulty ?? null,
    selectedOption: Number.isInteger(row?.selectedOption) ? row.selectedOption : null,
    correctOption: Number.isInteger(row?.correctOption) ? row.correctOption : null,
    correct: Number(row?.correct) === 1 ? 1 : 0,
    skipped: Number(row?.skipped) === 1 ? 1 : 0,
    timeout: Number(row?.timeout) === 1 ? 1 : 0,
    seconds: Number.isFinite(Number(row?.seconds)) ? Number(row.seconds) : 0,
    cpi: Number.isFinite(Number(row?.cpi ?? session.cpi)) ? Number(row?.cpi ?? session.cpi) : null,
    anchorVersion: row?.anchorVersion ?? null,
    anchorRole: row?.anchorRole ?? null,
    anchorFingerprint: row?.anchorFingerprint ?? null,
    primaryAnchorId: row?.primaryAnchorId ?? null,
    iqEstimate: null
  };
}

function projectSession(session, selectionReason = '') {
  const rows = (Array.isArray(session.rows) ? session.rows : []).map(row => projectRow(row, session, selectionReason));
  return {
    sourceKey: session.sourceKey,
    sessionId: session.sessionId,
    createdAt: session.createdAt || null,
    ageYears: session.ageYears,
    ageBand: session.ageBand,
    cpi: Number.isFinite(Number(session.cpi)) ? Number(session.cpi) : null,
    formalFormId: formalFormId(session),
    matrixSlot: matrixSlot(session),
    matrix: isMatrixSession(session),
    anchorOptIn: true,
    anchorCompleted: session?.anchorStudy?.completed === true,
    anchorStatus: session?.anchorStudy?.status || null,
    selectionReason,
    rows
  };
}

function evaluateStage(metrics, stagePolicy) {
  const checks = {
    independentParticipants: metrics.independentParticipants >= stagePolicy.independentParticipants,
    minimumPerAgeBand: metrics.minimumAgeBandCount >= stagePolicy.minimumPerAgeBand,
    minimumMatrixSlotsObserved: metrics.matrixSlotsObserved >= stagePolicy.minimumMatrixSlotsObserved,
    minimumAnchorCompletionRate: metrics.anchorCompletionRate >= stagePolicy.minimumAnchorCompletionRate,
    minimumAverageFormalItemExposure: metrics.averageFormalItemExposure >= stagePolicy.minimumAverageFormalItemExposure
  };
  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    thresholds: { ...stagePolicy }
  };
}

function buildSummary({ exportsSeen, acceptedExports, rejectedExports, allSessions, consentedSessions, independent, unconsentedSessions, invalidSessions }) {
  const ageBandCounts = Object.fromEntries(AGE_BANDS.map(band => [band, 0]));
  const matrixSlots = new Set();
  let anchorsCompleted = 0;
  const itemExposure = new Map();
  let formalResponseCount = 0;

  for (const selected of independent) {
    const session = selected.session;
    if (AGE_BANDS.includes(session.ageBand)) ageBandCounts[session.ageBand] += 1;
    const slot = matrixSlot(session);
    if (slot != null) matrixSlots.add(slot);
    if (session?.anchorStudy?.completed === true) anchorsCompleted += 1;
    for (const row of formalRows(session)) {
      formalResponseCount += 1;
      if (row?.itemId) itemExposure.set(row.itemId, (itemExposure.get(row.itemId) || 0) + 1);
    }
  }

  const independentParticipants = independent.length;
  const minimumAgeBandCount = Math.min(...AGE_BANDS.map(band => ageBandCounts[band]));
  const anchorCompletionRate = independentParticipants ? anchorsCompleted / independentParticipants : 0;
  const averageFormalItemExposure = formalResponseCount / ACTIVE_FORM_ITEMS;
  const exposures = [...itemExposure.values()].sort((a, b) => a - b);
  const metrics = {
    independentParticipants,
    minimumAgeBandCount,
    matrixSlotsObserved: matrixSlots.size,
    anchorCompletionRate,
    averageFormalItemExposure
  };

  const stages = Object.fromEntries(Object.entries(POLICY.stages).map(([name, thresholds]) => [name, evaluateStage(metrics, thresholds)]));

  return {
    version: POLICY.version,
    generatedAt: new Date().toISOString(),
    mode: 'manual-offline-pooling',
    privacy: {
      automaticUpload: false,
      manualExportOnly: true,
      independentUnit: 'sourceKey',
      forbiddenIdentifyingKeysRejected: true
    },
    productStatus: {
      cpiAvailable: true,
      iqEstimateAvailable: false,
      populationNormed: false,
      productIqUnlocked: false,
      thresholdsAreValidationEvidence: false
    },
    inputs: {
      exportsSeen,
      acceptedExports,
      rejectedExports,
      sessionsSeen: allSessions,
      consentedSessions,
      unconsentedSessions,
      invalidSessions,
      repeatedConsentedSessions: Math.max(0, consentedSessions - independentParticipants)
    },
    cohort: {
      independentParticipants,
      ageBandCounts,
      minimumAgeBandCount,
      anchorCompletedParticipants: anchorsCompleted,
      anchorCompletionRate,
      matrixSlotsObserved: matrixSlots.size,
      matrixSlots: [...matrixSlots].sort((a, b) => a - b),
      formalResponses: formalResponseCount,
      activeFormalItemPool: ACTIVE_FORM_ITEMS,
      uniqueFormalItemsObserved: itemExposure.size,
      averageFormalItemExposure,
      minimumObservedItemExposure: exposures.length ? exposures[0] : 0,
      maximumObservedItemExposure: exposures.length ? exposures[exposures.length - 1] : 0
    },
    readiness: stages,
    blockers: [
      'Readiness thresholds are engineering planning thresholds, not evidence of validity.',
      'IQ remains locked until reliability, IRT, DIF/fairness, construct validity, external validity/linking, and age-norm uncertainty are independently supported.',
      'Manual pooled exports are not automatically representative of the 18–65 target population.'
    ],
    itemExposure: Object.fromEntries([...itemExposure.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en')))
  };
}

function poolDocuments(entries) {
  const accepted = [];
  const rejected = [];
  let allSessions = 0;
  let unconsentedSessions = 0;
  let invalidSessions = 0;
  const consented = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const name = String(entry?.name || 'unnamed');
    const doc = entry?.data;
    const errors = validateExport(doc);
    if (errors.length) {
      rejected.push({ name, errors });
      continue;
    }
    accepted.push(name);
    for (const rawSession of doc.sessions) {
      allSessions += 1;
      const session = { ...rawSession, sourceKey: rawSession?.sourceKey || doc.sourceKey };
      const sessionErrors = validateSession(session, doc.sourceKey);
      if (sessionErrors.length) {
        invalidSessions += 1;
        continue;
      }
      if (!isConsented(session)) {
        unconsentedSessions += 1;
        continue;
      }
      consented.push(session);
    }
  }

  const bySource = new Map();
  for (const session of consented) {
    if (!bySource.has(session.sourceKey)) bySource.set(session.sourceKey, []);
    bySource.get(session.sourceKey).push(session);
  }

  const independent = [];
  for (const [sourceKey, sessions] of bySource.entries()) {
    const selected = chooseIndependentSession(sessions);
    if (selected) independent.push({ sourceKey, ...selected });
  }
  independent.sort((a, b) => String(a.sourceKey).localeCompare(String(b.sourceKey), 'en'));

  const independentRows = independent.flatMap(selected => selected.session.rows.map(row => projectRow(row, selected.session, selected.reason)));
  const allConsentedProjected = consented
    .slice()
    .sort((a, b) => String(a.sourceKey).localeCompare(String(b.sourceKey), 'en') || sessionTime(a) - sessionTime(b))
    .map(session => projectSession(session));

  const summary = buildSummary({
    exportsSeen: Array.isArray(entries) ? entries.length : 0,
    acceptedExports: accepted.length,
    rejectedExports: rejected,
    allSessions,
    consentedSessions: consented.length,
    independent,
    unconsentedSessions,
    invalidSessions
  });

  return { policy: POLICY, accepted, rejected, independent, independentRows, allConsentedProjected, summary };
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows) {
  const header = ROW_COLUMNS.join(',');
  const body = (Array.isArray(rows) ? rows : []).map(row => ROW_COLUMNS.map(key => csvCell(row[key])).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}

function writeOutputs(result, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'pooled-independent-responses.csv'), rowsToCsv(result.independentRows));
  fs.writeFileSync(path.join(outDir, 'pooled-consented-sessions.json'), JSON.stringify({
    version: POLICY.version,
    automaticUpload: false,
    manualExportOnly: true,
    sessions: result.allConsentedProjected
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'pooled-study-summary.json'), JSON.stringify(result.summary, null, 2));

  const ageRows = AGE_BANDS.map(ageBand => ({ ageBand, independentParticipants: result.summary.cohort.ageBandCounts[ageBand] }));
  const ageCsv = ['ageBand,independentParticipants', ...ageRows.map(row => `${csvCell(row.ageBand)},${row.independentParticipants}`)].join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'pooled-age-band-counts.csv'), ageCsv);

  const itemRows = Object.entries(result.summary.itemExposure).map(([itemId, exposures]) => `${csvCell(itemId)},${exposures}`);
  fs.writeFileSync(path.join(outDir, 'pooled-item-exposure.csv'), ['itemId,exposures', ...itemRows].join('\n') + '\n');
}

function parseCli(argv) {
  const inputs = [];
  let outDir = 'calibration/output/pooled-study';
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--out') {
      outDir = argv[++i];
      if (!outDir) throw new Error('--out requires a directory');
    } else {
      inputs.push(token);
    }
  }
  return { inputs, outDir };
}

function main(argv = process.argv.slice(2)) {
  const { inputs, outDir } = parseCli(argv);
  if (!inputs.length) {
    console.error('Usage: node scripts/pool-calibration-exports.js [--out DIR] export1.json export2.json ...');
    process.exitCode = 2;
    return null;
  }
  const entries = inputs.map(file => ({ name: file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }));
  const result = poolDocuments(entries);
  writeOutputs(result, outDir);
  console.log(`Pooled study v1: ${result.summary.cohort.independentParticipants} independent participant(s) from ${result.summary.inputs.consentedSessions} consented session(s).`);
  console.log(`Rejected exports: ${result.rejected.length}; unconsented sessions excluded: ${result.summary.inputs.unconsentedSessions}.`);
  console.log(`Output: ${outDir}`);
  return result;
}

if (require.main === module) main();

module.exports = {
  POLICY,
  AGE_BANDS,
  ACTIVE_FORM_ITEMS,
  ROW_COLUMNS,
  scanForbiddenKeys,
  privacyErrors,
  validateExport,
  validateSession,
  isAnchorRow,
  formalRows,
  formalFormId,
  isMatrixSession,
  matrixSlot,
  isConsented,
  chooseIndependentSession,
  projectRow,
  projectSession,
  evaluateStage,
  buildSummary,
  poolDocuments,
  rowsToCsv,
  writeOutputs,
  parseCli,
  main
};
