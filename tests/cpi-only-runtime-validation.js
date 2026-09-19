'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const timing = fs.readFileSync('timeout-lock.js', 'utf8');
const quality = fs.readFileSync('assessment-quality.js', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');
const scoring = fs.readFileSync('scoring-v2.js', 'utf8');

for (const [file, source] of [['app.js', app], ['timeout-lock.js', timing], ['assessment-quality.js', quality]]) {
  for (const forbidden of [
    'Math.max(70',
    'Math.min(130',
    '70 + overall * 0.6',
    'index >= 120',
    'index >= 110',
    'index < 90'
  ]) {
    assert.ok(!source.includes(forbidden), file + ': legacy pseudo-IQ mapping must be absent: ' + forbidden);
  }
}
assert.ok(timing.includes('const timingBaseFinishTest = finishTest;'), 'timing layer must delegate result rendering to the CPI-only base fallback');
assert.ok(timing.includes('return timingBaseFinishTest();'), 'timing layer must not maintain an independent result scorer');

assert.ok(app.includes('scale: "0-100-experimental"'));
assert.ok(app.includes('iqEstimate: null'));
assert.ok(app.includes('iqStatus: "disabled-cpi-only"'));
assert.ok(app.includes('不代表 IQ、人口百分位或同齡排名'));

assert.ok(quality.includes('CPI ONLY'));
assert.ok(quality.includes('不提供 IQ、百分位或同齡排名'));
assert.ok(!/performanceIndex\s*(?:>=|<=|>|<)\s*\d+/.test(quality), 'uncalibrated CPI thresholds must not drive qualitative labels');
assert.ok(quality.includes("productMode: 'cpi-only'"));
assert.ok(quality.includes('iqConversionEnabled: false'));
assert.ok(quality.includes('populationPercentileAvailable: false'));

assert.ok(readme.includes('Product mainline — CPI only'));
assert.ok(readme.includes('IRB／真人常模送審當作目前產品開發的前置條件'));
assert.ok(readme.includes('productIqUnlocked=false'));

const window = {};
const context = {window, console, Math, Number, Object, Array, Set};
vm.createContext(context);
vm.runInContext(scoring, context, {filename:'scoring-v2.js'});
const S = window.IQ_SCORING_V2;
const q = [
  {d:'A', difficulty:'easy', a:0},
  {d:'A', difficulty:'hard', a:1},
  {d:'B', difficulty:'medium', a:0}
];
const report = S.scoreAssessment(q,[0,1,1],[1,1,1]);
assert.strictEqual(report.scale,'0-100-experimental');
assert.strictEqual(report.calibrated,false);
assert.ok(report.performanceIndex >= 0 && report.performanceIndex <= 100);

console.log('CPI-only runtime measurement hardening PASS');
console.log('No legacy 70-130 fallback; no uncalibrated qualitative thresholds; IQ conversion remains disabled.');
