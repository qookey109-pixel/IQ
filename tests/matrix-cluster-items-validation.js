const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const clusterCode = fs.readFileSync('matrix-cluster-items.js', 'utf8');
const css = fs.readFileSync('viewport-stability.css', 'utf8');
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
vm.runInContext(clusterCode, context);

const policy = window.IQ_MATRIX_CLUSTER_POLICY;
assert.ok(policy && policy.structuredQuestionBankCells, 'cluster question-bank policy must be active');

const items = window.IQ_QUESTION_BANK.filter(q => q.model === 'matrix-symbol-addition');
assert.strictEqual(items.length, 20, 'expected 20 symbol-addition matrix items');

let encodedCells = 0;
for (const q of items) {
  assert.strictEqual(q.matrixCellEncoding, 'symbol-cluster-v1', `${q.id}: structured encoding missing`);
  for (const cell of q.cells) {
    if (cell === '?') continue;
    const text = String(cell);
    const raw = Array.from(text);
    const rawRepeated = raw.length >= 2 && raw.every(ch => ch === raw[0]);
    assert.strictEqual(rawRepeated, false, `${q.id}: raw repeated glyph string must not remain: ${text}`);
    if (text.startsWith('@@cluster:')) {
      const match = text.match(/^@@cluster:(.+):(\d)$/u);
      assert.ok(match, `${q.id}: invalid cluster marker ${text}`);
      const count = Number(match[2]);
      assert.ok(count >= 2 && count <= 6, `${q.id}: invalid cluster count ${count}`);
      encodedCells += 1;
    }
  }
}
assert.ok(encodedCells >= 100, 'expected repeated symbol cells to be normalized into clusters');

assert.ok(css.includes('.matrixSymbolCluster.count-4'), 'CSS must render four symbols as a compact cluster');
assert.ok(css.includes('grid-template-columns: repeat(2, max-content)'), 'four-symbol cluster must use a 2-column mini-grid');
assert.ok(css.includes('.matrixSymbolGlyph'), 'cluster glyph sizing must be explicit');

const clusterAt = html.indexOf('matrix-cluster-items.js');
const appAt = html.indexOf('app.js');
assert.ok(clusterAt > -1 && clusterAt < appAt, 'question-bank cluster normalization must run before app binding');

console.log('Structured matrix symbol-cluster validation PASS');
console.log(`${encodedCells} repeated-symbol matrix cells use structured cluster encoding.`);
