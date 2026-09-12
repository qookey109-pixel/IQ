const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const qualityCode = fs.readFileSync('answer-quality.js', 'utf8');
const balanceCode = fs.readFileSync('answer-position-balance.js', 'utf8');
const clarityCode = fs.readFileSync('presentation-clarity.js', 'utf8');
const css = fs.readFileSync('heritage-theme.css', 'utf8');
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

const snapshots = new Map(window.IQ_QUESTION_BANK.slice(0,120).map(q => [q.id, {q:q.q,e:q.e,a:q.a,o:[...q.o]}]));
vm.runInContext(clarityCode, context);

const bank = window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length, 5124, 'presentation layer must not change QB4 bank size');

const spatial = bank.filter(q => q.d === '視覺空間');
assert.strictEqual(spatial.length, 1008, 'expected 1008 spatial QB4 items');
assert.ok(spatial.every(q => q.visual == null), 'spatial items must not keep duplicate visual panels');
assert.ok(spatial.every(q => q.presentationMode === 'text-only'), 'spatial items must be text-first');

const speed = bank.filter(q => q.d === '處理速度');
assert.strictEqual(speed.length, 1008, 'expected 1008 speed QB4 items');
assert.ok(speed.every(q => q.presentationMode === 'direct-speed'), 'speed items must use direct presentation');
assert.ok(speed.every(q => q.visual == null), 'speed items must not keep duplicate visual panels');
assert.ok(speed.every(q => q.o.length === 4 && new Set(q.o.map(String)).size === 4), 'speed answer controls must remain four unique choices');

const memory = bank.filter(q => q.d === '工作記憶');
assert.strictEqual(memory.length, 1008, 'expected 1008 memory QB4 items');
assert.ok(memory.every(q => q.presentationMode === 'single-stimulus'), 'memory items must keep one focused stimulus surface');

const matrix = bank.filter(q => q.type === 'matrix');
assert.strictEqual(matrix.length, 144, 'QB4 matrix-difference family should provide 144 variants');
assert.ok(matrix.every(q => Array.isArray(q.cells) && q.cells.length === 9), 'matrix essentials must be preserved');
assert.ok(matrix.every(q => q.presentationMode === 'essential-visual'), 'matrix items remain essential visual content');

for (const [id, before] of snapshots) {
  const q = bank.find(item => item.id === id);
  assert.strictEqual(q.q, before.q, `${id}: presentation must preserve prompt`);
  assert.strictEqual(q.e, before.e, `${id}: presentation must preserve explanation`);
  assert.strictEqual(q.a, before.a, `${id}: presentation must preserve answer key`);
  assert.deepStrictEqual([...q.o], before.o, `${id}: presentation must preserve answer options`);
}

assert.ok(css.includes('--bg:#e9dfcf'), 'warm ivory background token missing');
assert.ok(css.includes('--text:#241f1a'), 'ink-brown text token missing');
assert.ok(css.includes('--gold:#a96f3e'), 'bronze accent token missing');
assert.ok(css.includes('.timer.memoryTimer'), 'warm memory timer styling missing');

const heritageCssAt = html.indexOf('heritage-theme.css');
const viewportCssAt = html.indexOf('viewport-stability.css');
assert.ok(heritageCssAt > viewportCssAt, 'heritage theme must load after viewport safety');
assert.strictEqual(html.includes('clarity-theme.css'), false, 'white/blue/orange clarity theme must not be loaded');
const presentationAt = html.indexOf('presentation-clarity.js');
const appAt = html.indexOf('app.js');
assert.ok(presentationAt > -1 && presentationAt < appAt, 'presentation layer must run before app binds questions');

assert.strictEqual(window.IQ_PRESENTATION_CLARITY.version, '2.0-qb4');
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialTextOnly, true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.directSpeedOptions, true);
assert.deepStrictEqual(Array.from(window.IQ_PRESENTATION_CLARITY.palette), ['warm-ivory','ink-brown','bronze']);

console.log('QB4 presentation clarity validation PASS');
console.log('5,124-item bank preserved; spatial/speed remain low-fatigue; warm editorial palette active.');
