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
assert.ok(timing.includes('const timingBaseFinishTest = finishTest;'), 'timing layer must delegate result rendering');
assert.ok(timing.includes('return timingBaseFinishTest();'), 'timing layer must not maintain an independent result scorer');

assert.ok(app.includes('scale: "0-100-experimental"'), 'internal fallback scoring may remain for engineering');
assert.ok(app.includes('iqEstimate: null'));
assert.ok(app.includes('publicScoreVisible: false'));
assert.ok(app.includes('公開結果不顯示總分、IQ、百分比、排名或同齡換算'));

for (const marker of [
  '文字解碼師','規律捕手','空間導航員','記憶收藏家','閃電掃描員','數字拆解師','多線探索者'
]) assert.ok(quality.includes(marker), 'missing playful result profile: ' + marker);

assert.ok(quality.includes("productMode: 'qualitative-playful'") || quality.includes('productMode: "qualitative-playful"'));
assert.ok(quality.includes('internalScoringMode: "cpi-only"'));
assert.ok(quality.includes('publicScoreVisible: false'));
assert.ok(quality.includes('publicQuantitativeStandard: false'));
assert.ok(quality.includes('ageInputRequired: false'));
assert.ok(quality.includes('iqConversionEnabled: false'));
assert.ok(quality.includes('populationPercentileAvailable: false'));
assert.ok(readme.includes('Product mainline — playful qualitative result'));
assert.ok(readme.includes('不用填年齡'));
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

console.log('Qualitative public-result / internal-CPI guard PASS');
console.log('Internal CPI remains available for engineering; public result exposes no quantitative score, IQ, percentile, age rank, or norm.');
