#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const POLICY = require('../calibration/psychometric-readiness-policy.json');
const { buildReviewQueue } = require('../calibration/item-review-engine');
const { parseCsv } = require('./build-item-review-queue');

function finite(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function truthy(value) {
  if (value === true || value === 1) return true;
  return ['true', '1', 'yes', 'y', 'flagged'].includes(String(value ?? '').trim().toLowerCase());
}

function readCsv(file) {
  if (!file || !fs.existsSync(file)) return [];
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function readJson(file) {
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function median(values) {
  const x = values.map(finite).filter(v => v != null).sort((a, b) => a - b);
  if (!x.length) return null;
  const mid = Math.floor(x.length / 2);
  return x.length % 2 ? x[mid] : (x[mid - 1] + x[mid]) / 2;
}

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(row);
  }
  return m;
}

function buildItemStats(responseRows, itemParameters = [], difRows = []) {
  const formal = responseRows.filter(row => String(row.recordType || 'formal') !== 'anchor' && row.itemId);
  const params = new Map(itemParameters.filter(r => r.itemId).map(r => [String(r.itemId), r]));
  const dif = new Map(difRows.filter(r => r.itemId).map(r => [String(r.itemId), r]));
  const groups = groupBy(formal, row => String(row.itemId));
  const out = [];

  for (const [itemId, rows] of groups.entries()) {
    const first = rows[0] || {};
    const n = rows.length;
    const correctN = rows.reduce((sum, row) => sum + (Number(row.correct) === 1 ? 1 : 0), 0);
    const skippedN = rows.reduce((sum, row) => sum + (Number(row.skipped) === 1 ? 1 : 0), 0);
    const timeoutN = rows.reduce((sum, row) => sum + (Number(row.timeout) === 1 ? 1 : 0), 0);
    const wrongRows = rows.filter(row => Number(row.correct) !== 1 && Number(row.skipped) !== 1);
    const distractors = new Map();
    for (const row of wrongRows) {
      const option = String(row.selectedOption ?? '').trim();
      if (!option) continue;
      distractors.set(option, (distractors.get(option) || 0) + 1);
    }
    const wrongResponses = wrongRows.length;
    let weakDistractors = null;
    if (wrongResponses >= 50) {
      weakDistractors = [...distractors.values()].filter(count => count / wrongResponses < 0.05).length;
    }

    const medSeconds = median(rows.map(row => row.seconds));
    const isSpeed = String(first.domain || '') === '處理速度';
    const parameter = params.get(itemId) || {};
    const difRow = dif.get(itemId) || {};

    out.push({
      itemId,
      domain: first.domain || parameter.domain || difRow.domain || null,
      family: first.family || null,
      semanticKey: first.semanticKey || null,
      n,
      p: n ? correctN / n : null,
      discrimination: finite(parameter.a ?? parameter.discrimination),
      difficultyB: finite(parameter.b),
      skipRate: n ? skippedN / n : null,
      timeoutRate: n ? timeoutN / n : null,
      medianSeconds: medSeconds,
      medianLimitShare: isSpeed && medSeconds != null ? medSeconds / 18 : null,
      wrongResponses,
      weakDistractors,
      difFlag: truthy(difRow.difFlag),
      difDeltaR2: finite(difRow.difDeltaR2),
      difReplications: 0,
      unresolvedFairness: truthy(difRow.difFlag)
    });
  }

  return out.sort((a, b) => a.itemId.localeCompare(b.itemId, 'en'));
}

function reliabilityScreen(report) {
  const domains = Object.values(report?.domains || {});
  const ok = domains.filter(x => x?.status === 'ok');
  const omegas = ok.map(x => finite(x?.omegaTotal)).filter(x => x != null);
  const minOmega = omegas.length ? Math.min(...omegas) : null;
  return {
    status: report ? (ok.length ? 'available' : 'insufficient-data') : 'not-run',
    domainsOk: ok.length,
    minimumOmegaTotal: minOmega,
    screenPass: ok.length >= POLICY.screens.reliability.minimumDomainsOk && minOmega != null && minOmega >= POLICY.screens.reliability.minimumOmegaTotal
  };
}

function irtScreen(rows) {
  const ok = rows.filter(row => String(row.status) === 'ok');
  return {
    status: rows.length ? (ok.length ? 'available' : 'insufficient-data') : 'not-run',
    domainsOk: ok.length,
    screenPass: ok.length >= POLICY.screens.irt.minimumDomainsOk
  };
}

function difScreen(rows) {
  const analyzed = rows.filter(row => row.itemId && String(row.status) === 'ok');
  const domains = new Set(analyzed.map(row => row.domain).filter(Boolean));
  const flagged = analyzed.filter(row => truthy(row.difFlag) || (finite(row.difDeltaR2) ?? 0) >= 0.02);
  const flagRate = analyzed.length ? flagged.length / analyzed.length : null;
  return {
    status: rows.length ? (analyzed.length ? 'available-review-required' : 'insufficient-data') : 'not-run',
    domainsAnalyzed: domains.size,
    itemsAnalyzed: analyzed.length,
    materialFlags: flagged.length,
    materialFlagRate: flagRate,
    unresolvedMaterialFlags: flagged.length,
    screenPass: domains.size >= POLICY.screens.dif.minimumDomainsAnalyzed && flagRate != null && flagRate <= POLICY.screens.dif.maximumMaterialFlagRate
  };
}

function cfaScreen(report) {
  if (!report) return { status: 'not-run', screenPass: false };
  if (report.status !== 'ok') return { status: report.status || 'insufficient-data', screenPass: false };
  const cfi = finite(report?.configural?.cfi);
  const rmsea = finite(report?.configural?.rmsea);
  const dMetric = finite(report?.delta?.metricVsConfiguralCFI);
  const dScalar = finite(report?.delta?.scalarVsMetricCFI);
  const pass = cfi != null && cfi >= POLICY.screens.cfa.minimumCFI &&
    rmsea != null && rmsea <= POLICY.screens.cfa.maximumRMSEA &&
    dMetric != null && Math.abs(dMetric) <= POLICY.screens.cfa.maximumAbsoluteDeltaCFI &&
    dScalar != null && Math.abs(dScalar) <= POLICY.screens.cfa.maximumAbsoluteDeltaCFI;
  return {
    status: 'available',
    participants: finite(report.participants),
    ageGroups: Array.isArray(report.ageGroups) ? report.ageGroups.length : null,
    configuralCFI: cfi,
    configuralRMSEA: rmsea,
    metricDeltaCFI: dMetric,
    scalarDeltaCFI: dScalar,
    screenPass: pass
  };
}

function normingScreen(manifest) {
  if (!manifest) return { status: 'not-run', screenPass: false };
  return {
    status: 'research-output-only',
    participants: finite(manifest.participants),
    ageBands: finite(manifest.ageBands),
    standardScoreProduced: manifest.standardScoreProduced === true,
    screenPass: finite(manifest.ageBands) >= POLICY.screens.norming.minimumAgeBands,
    representativeSamplingEstablished: false,
    uncertaintyEstablished: false
  };
}

function externalScreen(report) {
  if (!report) return { status: 'not-run', screenPass: false };
  const n = finite(report.linkedParticipants) ?? 0;
  return {
    status: n >= POLICY.screens.external.minimumLinkedParticipantsForPrimaryEvidence ? 'available-for-primary-review' : 'pilot-or-insufficient',
    linkedParticipants: n,
    instruments: Object.keys(report.instruments || {}).length,
    screenPass: n >= POLICY.screens.external.minimumLinkedParticipantsForPrimaryEvidence
  };
}

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function itemStatsCsv(rows) {
  const columns = ['itemId','domain','family','semanticKey','n','p','discrimination','difficultyB','skipRate','timeoutRate','medianSeconds','medianLimitShare','wrongResponses','weakDistractors','difFlag','difDeltaR2'];
  const body = rows.map(row => columns.map(key => csvCell(row[key])).join(','));
  return [columns.join(','), ...body].join('\n') + '\n';
}

function renderMarkdown(report) {
  const s = report.screens;
  const q = report.itemReview?.counts || {};
  return `# Cognitive IQ Lab — Psychometric Readiness Report\n\n` +
    `Generated: ${report.generatedAt}\n\n` +
    `## Product status\n\n` +
    `- CPI available: yes\n- IQ estimate unlocked: **no**\n- Population normed: **no**\n- Automatic item mutation: **disabled**\n\n` +
    `## Screening summary\n\n` +
    `- Reliability: ${s.reliability.status}; ${s.reliability.domainsOk}/${POLICY.expectedDomains} domains OK; min omega=${s.reliability.minimumOmegaTotal ?? 'n/a'}\n` +
    `- IRT: ${s.irt.status}; ${s.irt.domainsOk}/${POLICY.expectedDomains} domains fitted\n` +
    `- Age DIF: ${s.dif.status}; ${s.dif.materialFlags ?? 0} material flag(s)\n` +
    `- CFA / age invariance: ${s.cfa.status}\n` +
    `- Research age norms: ${s.norming.status}\n` +
    `- External validity/linking: ${s.external.status}\n\n` +
    `## Item review queue\n\n` +
    `KEEP=${q.KEEP ?? 0} WATCH=${q.WATCH ?? 0} REVIEW=${q.REVIEW ?? 0} REWRITE=${q.REWRITE ?? 0} RETIRE=${q.RETIRE ?? 0}\n\n` +
    `## Blocking conditions\n\n${report.blockers.map(x => `- ${x}`).join('\n')}\n\n` +
    `These are engineering screening outputs, not clinical or population-norm validation.\n`;
}

function buildReport(options = {}) {
  const input = options.input;
  const outDir = options.outDir;
  if (!input || !fs.existsSync(input)) throw new Error(`Missing pooled response CSV: ${input}`);
  if (!outDir) throw new Error('outDir is required');

  const responseRows = readCsv(input);
  const itemParameters = readCsv(options.itemParameters || path.join(outDir, 'item-parameters.csv'));
  const difRows = readCsv(options.ageDif || path.join(outDir, 'age-dif.csv'));
  const reliability = readJson(options.reliability || path.join(outDir, 'reliability.json'));
  const cfa = readJson(options.cfa || path.join(outDir, 'cfa-invariance.json'));
  const norming = readJson(options.norming || path.join(outDir, 'norming-manifest.json'));
  const external = readJson(options.external || path.join(outDir, 'external-linking.json'));
  const irtRows = readCsv(options.irtSummary || path.join(outDir, 'irt-domain-summary.csv'));
  const inferredPooled = path.join(path.dirname(input), 'pooled-study-summary.json');
  const pooled = readJson(options.pooledSummary || inferredPooled);

  const itemStats = buildItemStats(responseRows, itemParameters, difRows);
  const itemReview = buildReviewQueue(itemStats);
  const screens = {
    reliability: reliabilityScreen(reliability),
    irt: irtScreen(irtRows),
    dif: difScreen(difRows),
    cfa: cfaScreen(cfa),
    norming: normingScreen(norming),
    external: externalScreen(external)
  };

  const blockers = [];
  if (!pooled?.readiness?.normingCandidate?.ready) blockers.push('Pooled cohort has not reached the versioned norming-candidate collection target.');
  if (!screens.reliability.screenPass) blockers.push('Reliability screen is incomplete or below the engineering review threshold.');
  if (!screens.irt.screenPass) blockers.push('IRT calibration does not yet cover all expected domains.');
  if (!screens.dif.screenPass || screens.dif.unresolvedMaterialFlags > 0) blockers.push('Age-DIF/fairness review is incomplete or has unresolved material flags.');
  if (!screens.cfa.screenPass) blockers.push('Construct / age-invariance screen is incomplete or below the engineering review threshold.');
  if (!screens.external.screenPass) blockers.push('External/convergent validity or linking evidence is not yet sufficient for primary review.');
  blockers.push('Representative age sampling has not been established by this offline convenience-sample pipeline.');
  blockers.push('Versioned uncertainty / standard-error evidence for public age norms has not been approved.');

  const report = {
    version: POLICY.version,
    generatedAt: new Date().toISOString(),
    analysis: 'pooled-psychometric-readiness',
    source: {
      input,
      independentParticipants: pooled?.cohort?.independentParticipants ?? null,
      ageBandCounts: pooled?.cohort?.ageBandCounts ?? null,
      matrixSlotsObserved: pooled?.cohort?.matrixSlotsObserved ?? null,
      anchorCompletionRate: pooled?.cohort?.anchorCompletionRate ?? null
    },
    screens,
    itemReview: {
      counts: itemReview.counts,
      queueSize: itemReview.queue.length
    },
    blockers,
    candidateForPsychometricReview: screens.reliability.status === 'available' && screens.irt.status === 'available' && screens.dif.status.startsWith('available') && screens.cfa.status === 'available',
    candidateForNormStudy: blockers.length === 0,
    safety: {
      autoRewrite: false,
      autoChangeAnswerKey: false,
      autoRetire: false,
      autoPublishNorms: false,
      autoConvertToIq: false,
      productIqUnlocked: false,
      populationNormed: false,
      screeningThresholdsAreValidationEvidence: false
    }
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'item-health.csv'), itemStatsCsv(itemStats));
  fs.writeFileSync(path.join(outDir, 'item-review-queue.json'), JSON.stringify(itemReview, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'psychometric-readiness.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'psychometric-report.md'), renderMarkdown(report));
  return { report, itemStats, itemReview };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[key] = value;
  }
  return out;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = args.input || 'calibration/output/pooled-study/pooled-independent-responses.csv';
  const outDir = args.out || 'calibration/output/psychometric-v5';
  const result = buildReport({
    input,
    outDir,
    pooledSummary: args.pooledSummary,
    reliability: args.reliability,
    irtSummary: args.irtSummary,
    itemParameters: args.itemParameters,
    ageDif: args.ageDif,
    cfa: args.cfa,
    norming: args.norming,
    external: args.external
  });
  console.log(`Psychometric readiness report written to ${outDir}`);
  console.log(`Item queue: ${JSON.stringify(result.itemReview.counts)}`);
  console.log('Product IQ remains locked.');
  return result;
}

if (require.main === module) main();

module.exports = {
  finite,
  truthy,
  median,
  buildItemStats,
  reliabilityScreen,
  irtScreen,
  difScreen,
  cfaScreen,
  normingScreen,
  externalScreen,
  itemStatsCsv,
  buildReport,
  parseArgs,
  main
};
