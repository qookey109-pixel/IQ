const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const compactCode = fs.readFileSync('matrix-cluster-items.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const store = {};

const window = { addEventListener() {} };
const context = {
  window,
  localStorage: {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = value; }
  },
  console, Math, JSON, Set, Map, Array, Number, String, Object, Date, RegExp
};
vm.createContext(context);
vm.runInContext(bankCode, context);
vm.runInContext(compactCode, context);

const policy = window.IQ_MATRIX_CLUSTER_POLICY;
assert.ok(policy, 'matrix compact-glyph policy must be active');
assert.strictEqual(policy.internalMarkers, false, 'internal marker strings must be disabled');
assert.strictEqual(policy.compactVisibleGlyphs, true, 'compact visible glyph mode must be active');

const items = window.IQ_QUESTION_BANK.filter(q => q.model === 'matrix-symbol-addition');
assert.strictEqual(items.length, 20, 'expected 20 symbol-addition matrix items');

let compactCells = 0;
let denseCells = 0;
for (const q of items) {
  assert.strictEqual(q.matrixCellEncoding, 'compact-glyph-v2', `${q.id}: compact encoding missing`);
  for (const cell of q.cells) {
    if (cell === '?') continue;
    const text = String(cell);
    const count = Array.from(text).length;
    assert.strictEqual(text.includes('@@cluster'), false, `${q.id}: internal marker leaked into question data`);
    assert.ok(count >= 1 && count <= 6, `${q.id}: unexpected symbol count ${text}`);
    compactCells += 1;
    if (count >= 4) denseCells += 1;
  }
}
assert.ok(compactCells >= 100, 'expected visible compact matrix cells');
assert.ok(denseCells > 0, 'expected dense 4–6 symbol cells to be covered');

const compactAt = html.indexOf('matrix-cluster-items.js');
const appAt = html.indexOf('app.js');
assert.ok(compactAt > -1 && compactAt < appAt, 'compact matrix normalization must run before app binding');

console.log('Marker-free compact matrix glyph validation PASS');
console.log(`${compactCells} cells checked; ${denseCells} dense cells use direct compact glyphs with no @@cluster markers.`);