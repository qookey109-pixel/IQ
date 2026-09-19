const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');
const { getProductionRuntimeSources, getProductionStyleSources } = require('./runtime-bundle-helper');

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
const scriptFiles = getProductionRuntimeSources(html);
getProductionStyleSources(html);
const appIndex = scriptFiles.indexOf('app.js');
assert.ok(appIndex > 0, 'app.js must remain after the question-bank construction layers');
for (const file of scriptFiles.slice(0, appIndex)) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
const bank = window.IQ_QUESTION_BANK;
const stable = bank.map(q => [
  q.id, q.d, q.type, q.q, q.o, q.a, q.correctContent, q.limit,
  q.stim, q.cells, q.semanticKey, q.spatialIntegrityData
]);
// Reviewed baseline refreshed after intentional 2026-09-15 Safari screenshot QA.
// Changes reviewed before accepting this digest: all matrix-difference items now
// provide three complete example rows; scale-drawing items explicitly distinguish
// scaling-only from scale-then-translate and expose every translation vector;
// speed-boundary and full-box packing wording is explicit; transfer-system boundaries,
// one-to-one matching assumptions and reserved-capacity wording are now unambiguous;
// viewpoint-heading instructions use explicit degree values instead of ambiguous "格" counts;
// stack-height tasks now count unit cubes directly instead of requiring front/side projection;
// mirror-coordinate tasks are restricted to explicit x-axis / y-axis reflection only;
// production grid-displacement surfaces are static S/E relative-position questions with no route arrows;
// hard matrix surfaces now use multi-attribute relations or XOR+orientation composition instead of one-step arithmetic;
// hard fluid-reasoning surfaces now also use reverse/branch inference, multi-constraint ordering, and equation elimination;
// quant-average update items explicitly state that the new value is added to the previous observations.
// Before this baseline
// is accepted, independent oracle, option-quality, full-bank sweep, spatial v2,
// screenshot QA, final 2,058-item / 42-form runtime and age/practice gates all pass.
// Future presentation-only changes must preserve this reviewed content, answer keys,
// timing, stimuli and spatial models.
const digest = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
assert.strictEqual(digest, '779f7a3cb97de3511e79c3e6d91fca7756d6403245e40dc8c8618ce50e9d1be7',
  'readability changes must not alter reviewed assessment content or timing');

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
console.log('Visual readability PASS: reviewed 2,058-item content/timing baseline locked; 392 aspect-safe SVGs.');
