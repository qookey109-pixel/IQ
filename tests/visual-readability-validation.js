const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const store = {};
const window = {addEventListener() {}};
const context = {
  window, console,
  document: {getElementById() {return null;}},
  localStorage: {
    getItem(k) {return store[k] ?? null;},
    setItem(k, v) {store[k] = v;},
    removeItem(k) {delete store[k];}
  }
};
vm.createContext(context);
// Follow the real page, not a separately maintained list of bank layers.
const html = fs.readFileSync('index.html', 'utf8');
const bankScripts = html.split('<script src="app.js">')[0];
for (const [, file] of bankScripts.matchAll(/<script src="([^"]+)"/g)) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
const bank = window.IQ_QUESTION_BANK;
const stable = bank.map(q => [
  q.id, q.d, q.type, q.q, q.o, q.a, q.correctContent, q.limit,
  q.stim, q.cells, q.semanticKey, q.spatialIntegrityData
]);
// Baseline: 2b219f1, final 2,058-item runtime. A presentation-only change
// must preserve prompts, choices, keys, timing, stimuli and spatial models.
const digest = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
assert.strictEqual(digest, 'b1944074d7ec856893338a4e83ffe19fc0145ac0ba17b8bed1180a4e0f2fc4f0',
  'readability changes must not alter assessment content or timing');

const spatial = bank.filter(q => q.d === '視覺空間');
assert.strictEqual(spatial.length, 392);
for (const q of spatial) {
  const opening = q.visual.match(/^<svg[^>]+>/)[0];
  const [, , width, height] = opening.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  assert.ok(width > 0 && height > 0, q.id + ': valid canvas');
  assert.ok(opening.includes('width="' + width + '"') && opening.includes('height="' + height + '"'),
    q.id + ': intrinsic aspect ratio must match the drawing canvas');
  assert.ok(opening.includes('role="img"') && opening.includes('aria-label='), q.id + ': accessible image');
  assert.ok(opening.includes('preserveAspectRatio="xMidYMid meet"'), q.id + ': no distortion');
  if (q.taskFamily === 'shortest-grid-path') {
    assert.strictEqual((q.visual.match(/<rect /g) || []).length, q.spatialIntegrityData.size ** 2);
    assert.strictEqual((q.visual.match(/>S<\/text>/g) || []).length, 1);
    assert.strictEqual((q.visual.match(/>E<\/text>/g) || []).length, 1);
    assert.ok(!q.visual.includes('<circle'), q.id + ': endpoints use centered cell labels');
  }
  if (q.taskFamily === 'stack-hidden') {
    const g = q.spatialIntegrityData.grid;
    assert.strictEqual((q.visual.match(/<rect /g) || []).length, g.length * g[0].length);
    assert.ok(q.visual.includes('font-size="24"'), q.id + ': enlarged height numerals');
  }
}
const css = fs.readFileSync('spatial-visual-fix.css', 'utf8');
assert.ok(css.includes('repeat(6, max-content)'), 'mobile rows must grow with diagrams');
assert.ok(css.includes('overflow-y: auto'), 'small screens must remain scrollable');
assert.ok(!/transform:\s*scale\(/.test(css), 'no overflow-prone visual zoom hack');
assert.ok(!css.includes('118px'), 'no tiny mobile diagram cap');
const nav = fs.readFileSync('navigation-layout-fix.js', 'utf8');
assert.ok(nav.includes('card.scrollTop = 0'), 'new questions start at the prompt');
console.log('Visual readability PASS: 2,058 content/timing records unchanged; 392 aspect-safe SVGs.');
