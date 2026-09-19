'use strict';

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html','utf8');
const quality = fs.readFileSync('assessment-quality.js','utf8');
const css = fs.readFileSync('single-screen.css','utf8');
const readme = fs.readFileSync('README.md','utf8');
const titleEngine = fs.readFileSync('result-title-engine.js','utf8');
const replay = fs.readFileSync('replay-history.js','utf8');

for (const id of [
  'resultShareCard','playfulTitle','brainConstellation','restartBtn','reviewBtn'
]) {
  assert.ok(html.includes(`id="${id}"`), 'missing qualitative result UI id: ' + id);
}

assert.ok(html.includes('沒有分數，只有這次作答的趣味輪廓。'));
assert.ok(html.includes('六個頂點代表六個構面；圖形只呈現這次的相對輪廓，不以距離、長短或數字表示分數。'));
assert.ok(!html.includes('id="resultSignature"')&&!html.includes('id="profileHighlights"'),'public clue/signature blocks must stay removed');
assert.ok(!html.includes('id="replayPrompt"')&&!html.includes('id="recentModes"'),'public replay strip must stay removed');
assert.ok(!html.includes('id="copyResultBtn"')&&!html.includes('id="shareResultBtn"'),'public copy/share controls must stay removed');
assert.ok(html.includes('publicResultActions'),'result footer must use the minimal public action row');

for (const marker of [
  'renderBrainConstellation',
  'resultShareText',
  'bindResultSharing',
  'publicDomainVisualization: "qualitative-hexagon-no-scale"',
  'resultShareEnabled: false',
  'shareIncludesNumericScore: false',
  'replayHistoryEnabled: true',
  'replayHistoryVisible: false',
  'replayHistoryStoresNumericScores: false',
  'replayHistoryStoresAnswers: false',
  'replayHistoryUploadsAutomatically: false'
]) {
  assert.ok(quality.includes(marker), 'missing result-experience guard: ' + marker);
}

const shareStart = quality.indexOf('function resultShareText');
const shareEnd = quality.indexOf('async function copyResultText', shareStart);
assert.ok(shareStart >= 0 && shareEnd > shareStart, 'share-text function must remain inspectable');
const shareSource = quality.slice(shareStart, shareEnd);
for (const forbidden of ['performanceIndex','rawAccuracy','weightedAccuracy','speedEfficiency','iqEstimate','populationPercentile',' / 100']) {
  assert.ok(!shareSource.includes(forbidden), 'shared result text must not include internal metric token: ' + forbidden);
}

for (const marker of [
  '.brainConstellation',
  '.brainHexagonMap',
  '.brainHexPrimary',
  '.brainHexSecondary',
  '@keyframes resultCardIn',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert.ok(css.includes(marker), 'missing result-experience CSS marker: ' + marker);
}

assert.ok(css.includes('.internalResultDiagnostics') && css.includes('display: none !important'),
  'internal quantitative diagnostics must stay hidden');
assert.ok(readme.includes('Result Experience v1（RC-2026.09.19-4）'));
assert.ok(readme.includes('Combination Title Engine v1（RC-2026.09.19-5）'));
assert.ok(titleEngine.includes("combinationCount: Object.keys(COMBINATIONS).length"));
assert.ok(quality.includes('titleEngineMode: "deterministic-30-directional-combinations"'));
assert.ok(quality.includes('const correctAnswer = q.o[q.a]'));
assert.ok(quality.includes('正確答案：</b>${correctAnswer}'));
assert.ok(quality.includes('解析：</b>${q.e}'));
assert.ok(quality.includes('class="brainHexagonMap"'));
assert.ok(!quality.includes('class="brainHexRole"'),'hexagon must not print main/secondary role labels');
assert.ok(!quality.includes('brainHexValue'), 'qualitative hexagon must not render numeric domain values');
assert.ok(replay.includes("MAX_ENTRIES = 4"));
assert.ok(replay.includes("storesNumericScores: false"));
assert.ok(replay.includes("storesAnswers: false"));
assert.ok(replay.includes("uploadsAutomatically: false"));
assert.ok(readme.includes('不包含任何內部 CPI 或作答分數'));

console.log('Result Experience v1 validation PASS');
console.log('Minimal qualitative card, no-scale six-domain hexagon, explicit answer review, and reduced-motion support are protected.');
