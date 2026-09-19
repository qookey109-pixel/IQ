const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('single-screen.css', 'utf8');
assert.ok(css.includes('container-type: inline-size'), 'dial must size text against its own circle');
assert.ok(css.includes('font-size: 24cqw'), 'bank count must fit compact and landscape dials');
const js = fs.readFileSync('single-screen.js', 'utf8');

for (const id of ['start','quiz','result','startBtn','aboutBtn','counter','domain','timer','totalTimer','question','options','prevBtn','skipBtn','resultShareCard','resultSignature','playfulTitle','profileHighlights','brainConstellation','indexScore','metrics','restartBtn','reviewBtn']) {
  assert.ok(html.includes(`id="${id}"`), `required UI id missing: ${id}`);
}

assert.ok(html.includes('single-screen.css'), 'single-screen.css must be linked');
assert.ok(html.includes('single-screen.js'), 'single-screen.js must be loaded');
assert.ok(html.includes('不構成任何標準，好玩就好。'), 'playful non-standard disclaimer must be visible');
assert.ok(html.includes('這是今天的作答模式，不是你的固定標籤。'), 'attempt-specific playful tagline must be visible');
assert.ok(html.includes('沒有分數，只有這次作答的趣味輪廓。'), 'result must explicitly avoid a public score');
assert.ok(css.includes('.internalResultDiagnostics') && css.includes('display: none !important'), 'internal quantitative diagnostics must be hidden');
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'result motion must respect reduced-motion preference');
assert.ok(css.includes('.brainConstellation') && css.includes('.brainHexagonMap') && css.includes('.brainHexPrimary'), 'qualitative six-domain hexagon must be styled');
assert.ok(!html.includes('id="replayPrompt"')&&!html.includes('id="recentModes"'), 'public replay strip must stay removed');
assert.ok(!html.includes('id="copyResultBtn"')&&!html.includes('id="shareResultBtn"'), 'public copy/share controls must stay removed');
assert.ok(html.includes('publicResultActions'), 'minimal public result action row must be present');

assert.ok(css.includes('height: 100dvh'), 'viewport stage must use dynamic viewport height');
assert.ok(css.includes('overflow: hidden'), 'document-level page scrolling should be locked');
assert.ok(css.includes('@media (max-width: 760px)'), 'mobile layout breakpoint missing');
assert.ok(css.includes('@media (max-height: 680px)'), 'short viewport safety breakpoint missing');
assert.ok(css.includes('#itemQaPanel:not(.hidden)'), 'QA panel must be converted to viewport overlay');
assert.ok(js.includes('detailPanelsUseViewportModal'), 'single-screen runtime metadata missing');
assert.ok(js.includes('modalFocusManagement: true'), 'modal focus management metadata missing');
assert.ok(js.includes('modalFocusTrap: true'), 'modal focus trap metadata missing');
assert.ok(js.includes('restoresOpenerFocus: true'), 'modal opener-focus restoration metadata missing');

console.log('Single-screen layout validation PASS');
console.log('Required controls, mobile/short-height rules, disclaimer, and modal detail surfaces are present.');
