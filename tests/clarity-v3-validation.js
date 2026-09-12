const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

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
for (const file of ['question-bank.js','option-quality-v3.js','answer-position-balance.js','answer-quality.js','presentation-clarity.js','spatial-task-diagrams.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}

const before = new Map(window.IQ_QUESTION_BANK.map(q => [q.id, JSON.parse(JSON.stringify(q))]));
vm.runInContext(fs.readFileSync('clarity-v3.js', 'utf8'), context);

const meta = window.IQ_CLARITY_V3;
assert.ok(meta, 'Clarity v3 metadata should be exposed');
assert.strictEqual(meta.version, '3.0');
assert.strictEqual(meta.modifiedItems, 3252, 'Clarity v3 should rewrite exactly 3,252 items');
assert.strictEqual(meta.modifiedFamilies, 29, 'Clarity v3 should cover exactly 29 families');
assert.strictEqual(window.IQ_QUESTION_BANK.length, 5124, 'bank size must stay 5,124');

const allowed = new Set(['q','e','clarityRevision']);
let changed = 0;
for (const q of window.IQ_QUESTION_BANK) {
  const prev = before.get(q.id);
  assert.ok(prev, `${q.id}: item existed before clarity pass`);
  const keys = new Set([...Object.keys(prev), ...Object.keys(q)]);
  const diffs = [...keys].filter(k => JSON.stringify(prev[k]) !== JSON.stringify(q[k]));
  if (diffs.length) changed += 1;
  for (const field of diffs) assert.ok(allowed.has(field), `${q.id}: Clarity v3 must not change ${field}`);
}
assert.strictEqual(changed, 3252, 'only approved Clarity v3 items may change');

const family = key => window.IQ_QUESTION_BANK.filter(q => q.taskFamily === key);

for (const q of family('invariant-transfer')) {
  assert.ok(!q.q.includes('沒有新增') && !q.q.includes('沒有取走') && !q.q.includes('沒有遺失'), `${q.id}: prompt must not teach conservation`);
  assert.ok(q.e.includes('總數沒有改變'), `${q.id}: conservation reasoning belongs in explanation`);
}
for (const q of family('evidence-strength')) {
  assert.ok(!q.q.includes('不外推') && !q.q.includes('不推論因果'), `${q.id}: prompt must not announce the solution rule`);
  assert.ok(q.e.includes('不能據此推論'), `${q.id}: scope limitation belongs in explanation`);
}
for (const q of family('matrix-difference')) {
  assert.ok(!q.q.includes('第三格等於第一格減第二格'), `${q.id}: matrix rule must not be stated in prompt`);
  assert.ok(q.q.includes('同一個簡單算術規則'), `${q.id}: induction convention should remain explicit`);
}
for (const q of family('pronoun-reference')) {
  assert.ok(q.q.includes('「你」'), `${q.id}: pronoun-reference family should contain an actual pronoun`);
}
for (const q of family('quant-remainder')) {
  assert.ok(q.q.includes('盡量裝成完整'), `${q.id}: packing-to-capacity convention must be explicit`);
}
for (const q of family('memory-update')) {
  assert.ok(q.q.includes('依照剛才顯示的順序') && q.q.includes('依序執行'), `${q.id}: update order must be explicit`);
}
for (const q of family('memory-relative')) {
  assert.ok(q.q.includes('單獨的「2」'), `${q.id}: standalone item 2 must be disambiguated`);
}
for (const q of family('set-overlap')) {
  assert.ok(q.q.includes('或兩課都選'), `${q.id}: inclusive union wording must be explicit`);
}
for (const q of family('quant-time')) {
  assert.ok(q.q.includes('24 小時制'), `${q.id}: time format convention must be explicit`);
}
for (const q of family('shortest-grid-path')) {
  assert.ok(!q.q.includes('抄對角線捷徑'), `${q.id}: redundant coaching should be removed`);
  assert.ok(q.q.includes('每次只能沿格線水平或垂直移動 1 格'), `${q.id}: movement rule remains explicit`);
  assert.ok(q.visual && q.visual.includes('<svg'), `${q.id}: SVG diagram must remain intact`);
}

const positions = [0,0,0,0];
for (const q of window.IQ_QUESTION_BANK) positions[q.a] += 1;
assert.deepStrictEqual(positions, [1281,1281,1281,1281], 'Clarity v3 must not disturb balanced answer positions');

console.log('QB4 Clarity v3 validation PASS');
console.log('Construct-preserving clarity verified: ambiguity fixed, solution coaching removed, keys/options untouched.');