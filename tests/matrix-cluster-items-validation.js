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
for (const q of items) {
  assert.strictEqual(q.matrixCellEncoding, 'compact-glyph-v2', `${q.id}: compact encoding missing`);
  for (const cell of q.cells) {
    if (cell === '?') continue;
    const text = String(cell);
    assert.strictEqual(text.includes('@@cluster'), false, `${q.id}: internal marker leaked into question data`);
    assert.ok(Array.from(text).length >= 2 && Array.from(text).length <= 6, `${q.id}: unexpected symbol count ${text}`);
    compactCells += 1;
  }
}
assert.ok(compactCells >= 100, 'expected repeated-symbol matrix cells to remain visible compact glyph groups');

const clusterAt = html.indexOf('matrix-cluster-items.js');
const appAt = html.indexOf('app.js');
assert.ok(clusterAt > -1 && clusterAt < appAt, 'compact matrix normalization must run before app binding');
assert.strictEqual(html.includes('matrix-cluster-renderer-v2.js'), false, 'obsolete marker renderer must not be loaded');

console.log('Marker-free compact matrix glyph validation PASS');
console.log(`${compactCells} matrix cells render as direct visible symbols with no @@cluster markers.`);