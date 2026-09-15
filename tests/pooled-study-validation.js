'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pooler = require('../scripts/pool-calibration-exports.js');

const policy = require('../calibration/pooled-study-policy.json');
const schema = require('../calibration/pooled-study-schema.json');
const source = fs.readFileSync('scripts/pool-calibration-exports.js', 'utf8');

const DOMAINS = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];

function band(age) {
  return pooler.ageBandFor(age);
}

function formalRows(sourceKey, sessionId, formId, prefix) {
  return Array.from({ length: 42 }, (_, i) => ({
    schemaVersion: 1,
    sourceKey,
    sessionId,
    ageYears: 30,
    ageBand: '25–34',
    bankVersion: 'QB5',
    bankRevision: 'test',
    scoringVersion: 'SCORING-V2',
    formId,
    itemId: `${prefix}-formal-${String(i + 1).padStart(2, '0')}`,
    domain: DOMAINS[i % DOMAINS.length],
    family: `family-${i % 7}`,
    semanticKey: `${prefix}-semantic-${i}`,
    difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
    selectedOption: i % 4,
    correctOption: i % 4,
    correct: 1,
    skipped: 0,
    timeout: 0,
    seconds: 5.5,
    cpi: 70,
    iqEstimate: null
  }));
}

function anchorRows(sourceKey, sessionId, prefix, count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    schemaVersion: 1,
    sourceKey,
    sessionId,
    ageYears: 30,
    ageBand: '25–34',
    bankVersion: 'QB5',
    bankRevision: 'test',
    scoringVersion: 'SCORING-V2',
    formId: 'anchor:CIL-ANCHOR-2026.09.1',
    recordType: 'anchor',
    itemId: `${prefix}-anchor-${i + 1}`,
    domain: DOMAINS[i % DOMAINS.length],
    family: `anchor-family-${i}`,
    semanticKey: `${prefix}-anchor-semantic-${i}`,
    difficulty: 'medium',
    selectedOption: i % 4,
    correctOption: i % 4,
    correct: 1,
    skipped: 0,
    timeout: 0,
    seconds: 6,
    cpi: 70,
    anchorVersion: 'CIL-ANCHOR-2026.09.1',
    anchorRole: 'core',
    anchorFingerprint: `${prefix}-fingerprint-${i}`,
    primaryAnchorId: `${prefix}-anchor-${i + 1}`,
    iqEstimate: null
  }));
}

function session({ sourceKey, id, age = 30, slot = 0, optIn = true, completed = false, anchors = completed ? 6 : 0, formalCount = 42, createdAt = '2026-09-15T00:00:00Z' }) {
  const formId = `matrix:CIL-MATRIX-2026.09.1:epoch-0:slot-${String(slot).padStart(2, '0')}`;
  const rows = formalRows(sourceKey, id, formId, id).slice(0, formalCount);
  for (const row of rows) {
    row.ageYears = age;
    row.ageBand = band(age);
  }
  const extra = anchorRows(sourceKey, id, id, anchors);
  for (const row of extra) {
    row.ageYears = age;
    row.ageBand = band(age);
  }
  return {
    sessionId: id,
    createdAt,
    sourceKey,
    ageYears: age,
    ageBand: band(age),
    bankVersion: 'QB5',
    bankRevision: 'test',
    scoringVersion: 'SCORING-V2',
    formId,
    cpi: 70,
    iqEstimate: null,
    iqStatus: 'not-population-normed',
    anchorStudy: { optIn, completed, status: completed ? 'completed' : 'not-completed' },
    rows: [...rows, ...extra]
  };
}

function exportDoc(sourceKey, sessions) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-15T00:00:00Z',
    sourceKey,
    privacy: {
      automaticUpload: false,
      containsName: false,
      containsAccount: false,
      containsDateOfBirth: false,
      containsIp: false,
      containsLocation: false
    },
    productStatus: {
      cpiAvailable: true,
      iqEstimateAvailable: false,
      populationNormed: false
    },
    sessions
  };
}

assert.strictEqual(policy.version, 'CIL-POOL-2026.09.1');
assert.strictEqual(policy.consent.automaticUpload, false);
assert.strictEqual(policy.consent.manualExportOnly, true);
assert.strictEqual(policy.safety.productIqUnlocked, false);
assert.strictEqual(policy.safety.populationNormed, false);
assert.strictEqual(policy.safety.thresholdsAreValidationEvidence, false);
assert.deepStrictEqual(policy.ageBands, ['18–24','25–34','35–44','45–54','55–65']);

assert.ok(schema.required.includes('privacy'), 'pooled export schema must require privacy declaration');
assert.ok(schema.required.includes('productStatus'), 'pooled export schema must require locked product status');
assert.strictEqual(schema.properties.sessions.items.properties.rows.items.$ref, 'schema.json', 'pooled row schema must resolve to the repository row schema');
assert.strictEqual(schema.properties.productStatus.properties.iqEstimateAvailable.const, false);
assert.strictEqual(schema.properties.productStatus.properties.populationNormed.const, false);

assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(source), 'offline pooling tool must not contain network-upload calls');
assert.strictEqual(pooler.ACTIVE_FORM_ITEMS, 2052);
assert.strictEqual(pooler.FORMAL_ITEMS_PER_SESSION, 42);
assert.strictEqual(pooler.ANCHOR_ITEMS_PER_COMPLETED_SESSION, 6);
assert.strictEqual(pooler.matrixSlot(session({ sourceKey: 'source-A-0001', id: 'session-A-valid', slot: 55 })), 55);
assert.strictEqual(pooler.matrixSlot(session({ sourceKey: 'source-A-0001', id: 'session-A-badslot', slot: 99 })), null);

const sourceA = 'source-A-0001';
const sourceB = 'source-B-0002';
const docA = exportDoc(sourceA, [
  session({ sourceKey: sourceA, id: 'session-A-unconsented', slot: 1, optIn: false, createdAt: '2026-09-15T00:00:00Z' }),
  session({ sourceKey: sourceA, id: 'session-A-matrix-only', slot: 4, optIn: true, completed: false, createdAt: '2026-09-15T00:01:00Z' }),
  session({ sourceKey: sourceA, id: 'session-A-anchor-complete', slot: 3, optIn: true, completed: true, createdAt: '2026-09-15T00:02:00Z' }),
  session({ sourceKey: sourceA, id: 'session-A-incomplete', slot: 5, optIn: true, formalCount: 41, createdAt: '2026-09-15T00:03:00Z' })
]);
const docB = exportDoc(sourceB, [
  session({ sourceKey: sourceB, id: 'session-B-matrix', age: 40, slot: 17, optIn: true, completed: false })
]);
const badDoc = exportDoc('source-C-0003', [
  session({ sourceKey: 'source-C-0003', id: 'session-C-valid', age: 50, slot: 20 })
]);
badDoc.profile = { email: 'must-not-enter-pool@example.com' };

const pooled = pooler.poolDocuments([
  { name: 'A.json', data: docA },
  { name: 'B.json', data: docB },
  { name: 'bad-pii.json', data: badDoc }
]);

assert.deepStrictEqual(pooled.accepted, ['A.json','B.json']);
assert.strictEqual(pooled.rejected.length, 1);
assert.ok(pooled.rejected[0].errors.some(error => error.includes('forbidden identifying key')));
assert.strictEqual(pooled.summary.inputs.exportsSeen, 3);
assert.strictEqual(pooled.summary.inputs.acceptedExports, 2);
assert.strictEqual(pooled.summary.inputs.rejectedExports, 1);
assert.strictEqual(pooled.summary.inputs.sessionsSeen, 5);
assert.strictEqual(pooled.summary.inputs.unconsentedSessions, 1);
assert.strictEqual(pooled.summary.inputs.invalidSessions, 1);
assert.strictEqual(pooled.summary.inputs.consentedSessions, 3);
assert.strictEqual(pooled.summary.inputs.repeatedConsentedSessions, 1);

assert.strictEqual(pooled.independent.length, 2, 'same sourceKey must count as one independent participant');
const selectedA = pooled.independent.find(entry => entry.sourceKey === sourceA);
assert.ok(selectedA);
assert.strictEqual(selectedA.reason, 'completed-anchor-session', 'completed anchor session must win within the same sourceKey');
assert.strictEqual(selectedA.session.sessionId, 'session-A-anchor-complete');
assert.strictEqual(pooled.independent.find(entry => entry.sourceKey === sourceB).reason, 'matrix-session');

assert.strictEqual(pooled.independentRows.length, 90, 'selected completed-anchor session contributes 48 rows and second participant contributes 42');
assert.ok(pooled.independentRows.every(row => row.iqEstimate === null));
assert.ok(pooled.independentRows.every(row => row.sourceKey === sourceA || row.sourceKey === sourceB));
assert.strictEqual(pooled.summary.cohort.independentParticipants, 2);
assert.strictEqual(pooled.summary.cohort.anchorCompletedParticipants, 1);
assert.strictEqual(pooled.summary.cohort.anchorCompletionRate, 0.5);
assert.strictEqual(pooled.summary.cohort.matrixSlotsObserved, 2);
assert.deepStrictEqual(pooled.summary.cohort.matrixSlots, [3,17]);
assert.strictEqual(pooled.summary.cohort.formalResponses, 84);
assert.strictEqual(pooled.summary.cohort.activeFormalItemPool, 2052);
assert.strictEqual(pooled.summary.productStatus.productIqUnlocked, false);
assert.strictEqual(pooled.summary.productStatus.populationNormed, false);
assert.strictEqual(pooled.summary.readiness.pilot.ready, false, 'tiny synthetic cohort must not claim pilot readiness');

const incomplete = session({ sourceKey: sourceA, id: 'session-test-incomplete', formalCount: 41 });
assert.ok(pooler.validateSession(incomplete, sourceA).some(error => error.includes('exactly 42')));
const badSlot = session({ sourceKey: sourceA, id: 'session-test-badslot', slot: 99 });
assert.ok(pooler.validateSession(badSlot, sourceA).some(error => error.includes('00 through 55')));
const badAnchor = session({ sourceKey: sourceA, id: 'session-test-badanchor', completed: true, anchors: 5 });
assert.ok(pooler.validateSession(badAnchor, sourceA).some(error => error.includes('exactly 6 anchor rows')));
const wrongBand = session({ sourceKey: sourceA, id: 'session-test-wrongband', age: 30 });
wrongBand.ageBand = '45–54';
assert.ok(pooler.validateSession(wrongBand, sourceA).some(error => error.includes('ageBand must match')));

const pilotReady = pooler.evaluateStage({
  independentParticipants: 250,
  minimumAgeBandCount: 30,
  matrixSlotsObserved: 14,
  anchorCompletionRate: 0.5,
  averageFormalItemExposure: 4
}, policy.stages.pilot);
assert.strictEqual(pilotReady.ready, true, 'planning thresholds should evaluate deterministically');
assert.strictEqual(policy.safety.thresholdsAreValidationEvidence, false, 'threshold pass must not become validity evidence');

const csv = pooler.rowsToCsv(pooled.independentRows);
assert.ok(csv.startsWith(pooler.ROW_COLUMNS.join(',')));
assert.ok(!csv.includes('must-not-enter-pool@example.com'));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-pooled-study-'));
try {
  pooler.writeOutputs(pooled, temp);
  const expected = [
    'pooled-independent-responses.csv',
    'pooled-consented-sessions.json',
    'pooled-study-summary.json',
    'pooled-age-band-counts.csv',
    'pooled-item-exposure.csv'
  ];
  for (const file of expected) assert.ok(fs.existsSync(path.join(temp, file)), `missing pooled output ${file}`);
  const summary = JSON.parse(fs.readFileSync(path.join(temp, 'pooled-study-summary.json'), 'utf8'));
  assert.strictEqual(summary.productStatus.productIqUnlocked, false);
  assert.strictEqual(summary.privacy.automaticUpload, false);
  assert.strictEqual(summary.cohort.independentParticipants, 2);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('Calibration pooled-study validation PASS');
console.log('Manual-only pooling; PII rejection; 42-item completeness; sourceKey dedupe; six-anchor integrity; matrix slot bounds; IQ lock verified.');
