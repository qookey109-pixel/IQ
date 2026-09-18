'use strict';

const fs = require('fs');
const assert = require('assert');
const { getProductionRuntimeSources } = require('./runtime-bundle-helper');
const { classifyItem, buildReviewQueue } = require('../calibration/item-review-engine');
const { parseCsv } = require('../scripts/build-item-review-queue');

const read = path => fs.readFileSync(path, 'utf8');
const html = read('index.html');
const study = read('calibration-study.js');
const readme = read('calibration/README.md');
const schema = JSON.parse(read('calibration/schema.json'));
const policy = JSON.parse(read('calibration/item-review-policy.json'));

const scriptFiles = getProductionRuntimeSources(html);
const calibrationStudyIndex = scriptFiles.indexOf('calibration-study.js');
const calibrationReadinessIndex = scriptFiles.indexOf('calibration-readiness.js');
assert.ok(calibrationStudyIndex >= 0, 'calibration study runtime must be loaded');
assert.ok(
  calibrationStudyIndex > calibrationReadinessIndex,
  'calibration study exporter must load after existing readiness recorder'
);

assert.ok(study.includes('ageYears'), 'study rows must capture whole-year age');
assert.ok(study.includes('ageBand'), 'study rows must capture age band');
assert.ok(study.includes('selectedOption'), 'study rows must capture selected option for distractor analysis');
assert.ok(study.includes('correctOption'), 'study rows must capture correct option index');
assert.ok(study.includes('iqEstimate: null'), 'study runtime must not fabricate IQ');
assert.ok(study.includes('questions.length !== 42'), 'study export must require formal 42-item form');
assert.ok(study.includes('automaticUpload: false'), 'study export must state no automatic upload');
assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(study), 'study runtime must not contain network-upload calls');
assert.ok(!/dateOfBirth\s*:\s*[^f]/.test(study), 'study runtime must not collect date of birth');

assert.strictEqual(schema.properties.iqEstimate.type, 'null', 'pooled schema must keep IQ estimate locked');
for (const forbidden of ['name','email','account','ip','location','dateOfBirth','birthday']) {
  assert.ok(!Object.prototype.hasOwnProperty.call(schema.properties, forbidden), `schema must not collect ${forbidden}`);
}
assert.strictEqual(policy.safety.autoRewrite, false, 'psychometric flags must not auto-rewrite questions');
assert.strictEqual(policy.safety.autoChangeAnswerKey, false, 'psychometric flags must not auto-change answer keys');

const lowN = classifyItem({ itemId: 'low-n', n: 12, accuracy: 0.7, discrimination: 0.4 });
assert.strictEqual(lowN.action, 'WATCH');

const weak = classifyItem({ itemId: 'weak', n: 240, accuracy: 0.62, discrimination: 0.05 });
assert.strictEqual(weak.action, 'REWRITE');
assert.strictEqual(weak.autoMutationAllowed, false);

const dif = classifyItem({
  itemId: 'dif', n: 300, accuracy: 0.6, discrimination: 0.35,
  difFlag: true, difDeltaR2: 0.04, unresolvedFairness: true, difReplications: 2
});
assert.strictEqual(dif.action, 'RETIRE');

const queue = buildReviewQueue([
  { itemId: 'ok', n: 220, accuracy: 0.65, discrimination: 0.4 },
  { itemId: 'hard', n: 220, accuracy: 0.10, discrimination: 0.3 },
  { itemId: 'watch', n: 40, accuracy: 0.5, discrimination: 0.3 }
]);
assert.strictEqual(queue.counts.KEEP, 1);
assert.strictEqual(queue.counts.REWRITE, 1);
assert.strictEqual(queue.counts.WATCH, 1);
assert.strictEqual(queue.safety.autoRewrite, false);

const csvRows = parseCsv('itemId,n,accuracy,discrimination\nA,200,0.6,0.3\n');
assert.deepStrictEqual(csvRows, [{ itemId: 'A', n: '200', accuracy: '0.6', discrimination: '0.3' }]);

for (const file of [
  'calibration/analysis/install-packages.R',
  'calibration/analysis/common.R',
  'calibration/analysis/reliability.R',
  'calibration/analysis/irt_mirt.R',
  'calibration/analysis/age_dif.R',
  'calibration/analysis/cfa_invariance.R',
  'calibration/analysis/norming.R'
]) {
  assert.ok(fs.existsSync(file), `missing calibration analysis tool: ${file}`);
}

assert.ok(read('calibration/analysis/reliability.R').includes('psych::omega'), 'reliability pipeline must include omega');
assert.ok(read('calibration/analysis/irt_mirt.R').includes('mirt('), 'IRT pipeline must use mirt');
assert.ok(read('calibration/analysis/age_dif.R').includes('lordif('), 'DIF pipeline must use lordif');
assert.ok(read('calibration/analysis/cfa_invariance.R').includes('cfa('), 'validity pipeline must use lavaan CFA');
assert.ok(read('calibration/analysis/norming.R').includes('productIqUnlocked = FALSE'), 'norming script must not unlock IQ');
assert.ok(readme.includes('must never silently change an answer key'), 'closed-loop documentation must preserve answer-key safety');

console.log('Calibration psychometric toolchain validation PASS');
console.log('Age-aware local export + psych/mirt/lordif/lavaan pipeline + guarded item review queue are present; product IQ remains locked.');
