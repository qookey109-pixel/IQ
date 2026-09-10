const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
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
vm.runInContext(clarityCode, context);

const bank = window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length, 300, 'presentation layer must not change bank size');

const arrows = /[↑↗→↘↓↙←↖]/;
const spatial = bank.filter(q => q.d === '視覺空間');
assert.strictEqual(spatial.length, 50, 'expected 50 spatial items');
for (const q of spatial) {
  assert.strictEqual(q.visual, null, `${q.id}: redundant spatial visual must be removed`);
  assert.strictEqual(q.presentationMode, 'text-only', `${q.id}: spatial presentation mode`);
  assert.strictEqual(arrows.test(q.q), false, `${q.id}: prompt must use direction words, not arrow glyphs`);
  assert.strictEqual(q.o.some(opt => arrows.test(String(opt))), false, `${q.id}: answers must use direction words`);
}

const speed = bank.filter(q => q.d === '處理速度');
assert.strictEqual(speed.length, 50, 'expected 50 speed items');
assert.ok(speed.every(q => q.presentationMode === 'structured-speed'), 'speed items must use structured presentation');
assert.ok(speed.every(q => String(q.visual).includes('speedChoiceGrid')), 'speed visuals must be grouped into candidate cells');

const matrix = bank.filter(q => q.type === 'matrix');
assert.ok(matrix.length > 0, 'matrix items should remain available');
assert.ok(matrix.every(q => Array.isArray(q.cells) && q.cells.length === 9), 'matrix essentials must be preserved');

assert.ok(css.includes('--clarity-white:#ffffff'), 'white palette token missing');
assert.ok(css.includes('--clarity-blue:#2f6fe4'), 'blue palette token missing');
assert.ok(css.includes('--clarity-orange:#f28a3d'), 'orange palette token missing');
assert.ok(css.includes('.speedChoiceGrid'), 'structured speed styling missing');
assert.ok(css.includes('.btn:active'), 'press feedback missing');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion support missing');

const clarityCssAt = html.indexOf('clarity-theme.css');
const viewportCssAt = html.indexOf('viewport-stability.css');
assert.ok(clarityCssAt > viewportCssAt, 'clarity theme must load after viewport safety');
const presentationAt = html.indexOf('presentation-clarity.js');
const appAt = html.indexOf('app.js');
assert.ok(presentationAt > -1 && presentationAt < appAt, 'presentation rewrite must run before app binds questions');

assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialTextOnly, true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.structuredSpeed, true);

console.log('Presentation clarity validation PASS');
console.log('50 spatial items are text-only; 50 speed items are structured; matrix visuals preserved; white/blue/orange palette verified.');
