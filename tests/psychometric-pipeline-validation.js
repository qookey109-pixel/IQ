'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const POLICY = require('../calibration/psychometric-readiness-policy.json');
const { buildPlan } = require('../scripts/run-psychometric-pipeline');
const { buildReport } = require('../scripts/build-psychometric-readiness-report');

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function csv(headers, rows) {
  const cell = value => {
    if (value == null) return '';
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(row => headers.map(h => cell(row[h])).join(','))].join('\n') + '\n';
}

assert.strictEqual(POLICY.safety.productIqUnlocked, false);
assert.strictEqual(POLICY.safety.autoRewrite, false);
assert.strictEqual(POLICY.safety.autoChangeAnswerKey, false);
assert.strictEqual(POLICY.safety.autoPublishNorms, false);
assert.strictEqual(POLICY.safety.autoConvertToIq, false);

const plan = buildPlan({ input: '/tmp/pooled.csv', outDir: '/tmp/psych', external: '/tmp/external.csv' });
assert.deepStrictEqual(plan.steps.map(x => x.name), [
  'reliability', 'irt', 'age-dif', 'cfa-invariance', 'general-theta', 'research-norming', 'external-linking', 'readiness-report'
]);
assert(plan.steps.every(step => ['Rscript', process.execPath].includes(step.command)));
assert(!JSON.stringify(plan).match(/fetch\(|XMLHttpRequest|sendBeacon|curl|wget/i));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-psych-v5-'));
const input = path.join(tmp, 'pooled-independent-responses.csv');
const outDir = path.join(tmp, 'psychometric-v5');
const headers = [
  'sourceKey','sessionId','ageYears','ageBand','formId','recordType','itemId','domain','family','semanticKey',
  'selectedOption','correctOption','correct','skipped','timeout','seconds','cpi'
];
const rows = [];
for (let i = 0; i < 240; i++) {
  const sourceKey = `participant-${String(i).padStart(4, '0')}`;
  rows.push({
    sourceKey, sessionId: `session-A-${String(i).padStart(4, '0')}`, ageYears: 30, ageBand: '25–34', formId: 'matrix:CIL-MATRIX-2026.09.1:epoch-0:slot-01',
    recordType: 'formal', itemId: 'ITEM-A', domain: '流體推理', family: 'family-a', semanticKey: 'sem-a',
    selectedOption: i < 236 ? 0 : 1, correctOption: 0, correct: i < 236 ? 1 : 0, skipped: 0, timeout: 0, seconds: 8, cpi: 80
  });
  rows.push({
    sourceKey, sessionId: `session-B-${String(i).padStart(4, '0')}`, ageYears: 30, ageBand: '25–34', formId: 'matrix:CIL-MATRIX-2026.09.1:epoch-0:slot-01',
    recordType: 'formal', itemId: 'ITEM-B', domain: '流體推理', family: 'family-b', semanticKey: 'sem-b',
    selectedOption: i % 2 === 0 ? 0 : 1, correctOption: 0, correct: i % 2 === 0 ? 1 : 0, skipped: 0, timeout: 0, seconds: 9, cpi: 80
  });
}
write(input, csv(headers, rows));
write(path.join(tmp, 'pooled-study-summary.json'), JSON.stringify({
  cohort: { independentParticipants: 5000, ageBandCounts: { '18–24': 1000, '25–34': 1000, '35–44': 1000, '45–54': 1000, '55–65': 1000 }, matrixSlotsObserved: 56, anchorCompletionRate: 0.9 },
  readiness: { normingCandidate: { ready: true } }
}, null, 2));
fs.mkdirSync(outDir, { recursive: true });
write(path.join(outDir, 'item-parameters.csv'), 'itemId,domain,a,b\nITEM-A,流體推理,0.05,-2\nITEM-B,流體推理,1.2,0\n');
write(path.join(outDir, 'age-dif.csv'), 'domain,itemId,difFlag,difDeltaR2,status\n流體推理,ITEM-A,true,0.03,ok\n流體推理,ITEM-B,false,0.00,ok\n');
const domains = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
write(path.join(outDir, 'reliability.json'), JSON.stringify({ domains: Object.fromEntries(domains.map(d => [d, { status: 'ok', omegaTotal: 0.82 }])) }, null, 2));
write(path.join(outDir, 'irt-domain-summary.csv'), 'domain,status,participants,items\n' + domains.map(d => `${d},ok,1000,20`).join('\n') + '\n');
write(path.join(outDir, 'cfa-invariance.json'), JSON.stringify({
  status: 'ok', participants: 3000, ageGroups: ['18–24','25–34','35–44','45–54','55–65'],
  configural: { cfi: 0.96, rmsea: 0.05 },
  delta: { metricVsConfiguralCFI: -0.005, scalarVsMetricCFI: -0.006 }
}, null, 2));
write(path.join(outDir, 'norming-manifest.json'), JSON.stringify({ participants: 3000, ageBands: 5, standardScoreProduced: false, productIqUnlocked: false }, null, 2));
write(path.join(outDir, 'external-linking.json'), JSON.stringify({ linkedParticipants: 150, instruments: { reference: { status: 'exploratory-validity-evidence' } } }, null, 2));

const result = buildReport({ input, outDir });
assert.strictEqual(result.report.safety.productIqUnlocked, false);
assert.strictEqual(result.report.safety.autoConvertToIq, false);
assert.strictEqual(result.report.candidateForNormStudy, false, 'representativeness/uncertainty blockers must keep norm-study candidate locked');
assert(result.report.blockers.some(x => /Representative age sampling/.test(x)));
assert(result.report.blockers.some(x => /uncertainty/i.test(x)));
const itemA = result.itemReview.items.find(x => x.itemId === 'ITEM-A');
assert(itemA, 'ITEM-A must be present');
assert(['REWRITE', 'RETIRE'].includes(itemA.action), `expected strong review action for weak/easy/DIF item, got ${itemA.action}`);
assert.strictEqual(itemA.autoMutationAllowed, false);
assert(fs.existsSync(path.join(outDir, 'item-health.csv')));
assert(fs.existsSync(path.join(outDir, 'item-review-queue.json')));
assert(fs.existsSync(path.join(outDir, 'psychometric-readiness.json')));
assert(fs.existsSync(path.join(outDir, 'psychometric-report.md')));

const runnerSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-psychometric-pipeline.js'), 'utf8');
const reportSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-psychometric-readiness-report.js'), 'utf8');
assert(!/\b(fetch|XMLHttpRequest|sendBeacon)\s*\(/.test(runnerSource + reportSource), 'pipeline must not upload participant data');
assert(/productIqUnlocked:\s*false/.test(runnerSource));
assert(/productIqUnlocked:\s*false/.test(reportSource));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('Psychometric Pipeline v5 validation PASS');
