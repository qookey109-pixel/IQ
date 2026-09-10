const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const qualityCode = fs.readFileSync('answer-quality.js', 'utf8');
const balanceCode = fs.readFileSync('answer-position-balance.js', 'utf8');
const clarityCode = fs.readFileSync('presentation-clarity.js', 'utf8');
const css = fs.readFileSync('clarity-theme.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const store = {};

const window = { addEventListener() {} };
const context = {
  window,
  document: { getElementById() { return null; } },
  localStorage: {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = value; }
  },
  console, Math, JSON, Set, Map, Array, Number, String, Object, Date, RegExp
};
vm.createContext(context);
vm.runInContext(bankCode, context);
vm.runInContext(qualityCode, context);
vm.runInContext(balanceCode, context);

const spatialBefore = new Map(
  window.IQ_QUESTION_BANK
    .filter(q => q.d === '視覺空間')
    .map(q => [q.id, { q: q.q, o: [...q.o], e: q.e }])
);

vm.runInContext(clarityCode, context);

const bank = window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length, 300, 'presentation layer must not change bank size');

const arrows = /[↑↗→↘↓↙←↖]/;
const spatial = bank.filter(q => q.d === '視覺空間');
assert.strictEqual(spatial.length, 50, 'expected 50 spatial items');
for (const q of spatial) {
  const before = spatialBefore.get(q.id);
  assert.strictEqual(q.visual, null, `${q.id}: redundant spatial visual must be removed`);
  assert.strictEqual(q.presentationMode, 'text-only', `${q.id}: spatial presentation mode`);
  assert.strictEqual(q.q, before.q, `${q.id}: authored prompt text, including arrows, must be preserved`);
  assert.deepStrictEqual([...q.o], before.o, `${q.id}: authored answer choices, including arrows, must be preserved`);
  assert.strictEqual(q.e, before.e, `${q.id}: explanation text must be preserved`);
}
assert.ok(spatial.some(q => arrows.test(q.q)), 'spatial prompts should retain arrow glyphs');
assert.ok(spatial.some(q => q.o.some(opt => arrows.test(String(opt)))), 'spatial answer choices should retain arrow glyphs');

const speed = bank.filter(q => q.d === '處理速度');
assert.strictEqual(speed.length, 50, 'expected 50 speed items');
assert.ok(speed.every(q => q.presentationMode === 'direct-speed'), 'speed items must use direct answer presentation');
assert.ok(speed.every(q => q.visual === null), 'speed items must not keep a duplicate visual candidate layer');
assert.ok(speed.every(q => q.o.length === 4 && new Set(q.o.map(String)).size === 4), 'speed answer controls must remain four unique choices');
assert.ok(speed.every(q => Number.isInteger(q.a) && q.a >= 0 && q.a < 4), 'speed answer keys must remain valid');

const targetMatch = speed.filter(q => q.model === 'speed-target-match');
assert.strictEqual(targetMatch.length, 25, 'expected 25 target-match items');
assert.ok(targetMatch.every(q => /^目標：.+。找出完全相同的字串。$/.test(q.q)), 'target-match prompt should contain the target exactly once');
assert.ok(targetMatch.every(q => q.o.every(opt => !/^第\s*[1-4]\s*個$/.test(String(opt)))), 'target-match options should be candidate strings, not ordinal labels');
assert.ok(targetMatch.every(q => q.o[q.a] === q.q.match(/^目標：(.+)。找出/)[1]), 'target-match answer content must still equal the target');

const oddGroup = speed.filter(q => q.model === 'speed-odd-group');
assert.strictEqual(oddGroup.length, 25, 'expected 25 odd-group items');
assert.ok(oddGroup.every(q => q.o.every(opt => /^[1-4] · .+/.test(String(opt)))), 'odd-group options should show compact ordinal plus the actual group');

const matrix = bank.filter(q => q.type === 'matrix');
assert.ok(matrix.length > 0, 'matrix items should remain available');
assert.ok(matrix.every(q => Array.isArray(q.cells) && q.cells.length === 9), 'matrix essentials must be preserved');

assert.ok(css.includes('--clarity-white:#ffffff'), 'white palette token missing');
assert.ok(css.includes('--clarity-blue:#2f6fe4'), 'blue palette token missing');
assert.ok(css.includes('--clarity-orange:#f28a3d'), 'orange palette token missing');
assert.ok(css.includes('.btn:active'), 'press feedback missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion support missing');

const clarityCssAt = html.indexOf('clarity-theme.css');
const viewportCssAt = html.indexOf('viewport-stability.css');
assert.ok(clarityCssAt > viewportCssAt, 'clarity theme must load after viewport safety');
const presentationAt = html.indexOf('presentation-clarity.js');
const appAt = html.indexOf('app.js');
assert.ok(presentationAt > -1 && presentationAt < appAt, 'presentation rewrite must run before app binds questions');

assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialTextOnly, true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialArrowsPreserved, true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.directSpeedOptions, true);

console.log('Presentation clarity validation PASS');
console.log('50 spatial items keep arrow text while removing duplicate visuals; 50 speed items use direct answer choices; matrix visuals preserved; white/blue/orange palette verified.');
