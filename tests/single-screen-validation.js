const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('single-screen.css', 'utf8');
const js = fs.readFileSync('single-screen.js', 'utf8');

for (const id of ['start','quiz','result','startBtn','aboutBtn','counter','domain','timer','totalTimer','question','options','prevBtn','skipBtn','indexScore','metrics','reviewBtn']) {
  assert.ok(html.includes(`id="${id}"`), `required UI id missing: ${id}`);
}

assert.ok(html.includes('single-screen.css'), 'single-screen.css must be linked');
assert.ok(html.includes('single-screen.js'), 'single-screen.js must be loaded');
assert.ok(html.includes('不構成任何標準，好玩就好。'), 'playful non-standard disclaimer must be visible');
assert.ok(html.includes('內容僅供參考；若有出入，以你的想像力為準。'), 'reference/imagination tagline must be visible');

assert.ok(css.includes('height: 100dvh'), 'viewport stage must use dynamic viewport height');
assert.ok(css.includes('overflow: hidden'), 'document-level page scrolling should be locked');
assert.ok(css.includes('@media (max-width: 760px)'), 'mobile layout breakpoint missing');
assert.ok(css.includes('@media (max-height: 680px)'), 'short viewport safety breakpoint missing');
assert.ok(css.includes('#itemQaPanel:not(.hidden)'), 'QA panel must be converted to viewport overlay');
assert.ok(js.includes('detailPanelsUseViewportModal'), 'single-screen runtime metadata missing');

console.log('Single-screen layout validation PASS');
console.log('Required controls, mobile/short-height rules, disclaimer, and modal detail surfaces are present.');
