'use strict';

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html','utf8');
const quality = fs.readFileSync('assessment-quality.js','utf8');
const css = fs.readFileSync('single-screen.css','utf8');
const readme = fs.readFileSync('README.md','utf8');

for (const id of [
  'resultShareCard','resultSignature','playfulTitle','profileHighlights',
  'brainConstellation','copyResultBtn','shareResultBtn','shareStatus'
]) {
  assert.ok(html.includes(`id="${id}"`), 'missing qualitative result UI id: ' + id);
}

assert.ok(html.includes('沒有分數，只有這次作答的趣味輪廓。'));
assert.ok(html.includes('只標示這次的主線與副線，不顯示分數、等級或人口排名。'));

for (const marker of [
  'renderBrainConstellation',
  'resultShareText',
  'bindResultSharing',
  'publicDomainVisualization: "role-only-no-scale"',
  'resultShareEnabled: true',
  'shareIncludesNumericScore: false'
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
  '.resultSignature',
  '.brainConstellation',
  '.brainNodePrimary',
  '.brainNodeSecondary',
  '.shareStatus',
  '@keyframes resultCardIn',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert.ok(css.includes(marker), 'missing result-experience CSS marker: ' + marker);
}

assert.ok(css.includes('.internalResultDiagnostics') && css.includes('display: none !important'),
  'internal quantitative diagnostics must stay hidden');
assert.ok(readme.includes('Result Experience v1（RC-2026.09.19-4）'));
assert.ok(readme.includes('不包含任何內部 CPI 或作答分數'));

console.log('Result Experience v1 validation PASS');
console.log('Share-friendly qualitative card, role-only six-domain view, no-score share text, and reduced-motion support are protected.');
