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
for (const file of ['question-bank.js','answer-quality.js','answer-position-balance.js','presentation-clarity.js','spatial-task-diagrams.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}

const before = new Map(window.IQ_QUESTION_BANK.map(q => [q.id, JSON.parse(JSON.stringify(q))]));
vm.runInContext(fs.readFileSync('clarity-v2.js', 'utf8'), context);

const meta = window.IQ_CLARITY_V2;
assert.ok(meta, 'Clarity v2 metadata should be exposed');
assert.strictEqual(meta.modifiedItems, 2532, 'Clarity v2 should rewrite exactly 2,532 bank items');
assert.strictEqual(meta.modifiedFamilies, 24, 'Clarity v2 should cover exactly 24 task families');
assert.strictEqual(window.IQ_QUESTION_BANK.length, 5124, 'bank size must stay 5,124');

const expectedCounts = {
  'necessary-condition':12,'reported-vs-fact':12,'contrast-focus':12,'scope-negation':12,
  'instruction-exception':12,'pronoun-reference':12,'evidence-strength':12,
  'ordering-constraints':144,'set-overlap':144,'code-deduction':144,'invariant-transfer':144,
  'pairing-capacity':144,'grid-displacement':144,'mirror-coordinate':144,'viewpoint-heading':144,
  'rectangle-cut':144,'stack-hidden':144,'scale-drawing':144,'shortest-grid-path':144,
  'speed-parity':144,'quant-discount':144,'quant-average':144,'quant-probability':144,'quant-balance':144
};
assert.deepStrictEqual(JSON.parse(JSON.stringify(meta.counts)), expectedCounts, 'family rewrite counts must match approved Clarity v2 scope');

const allowed = new Set(['q','e','clarityRevision']);
let changed = 0;
for (const q of window.IQ_QUESTION_BANK) {
  const prev = before.get(q.id);
  assert.ok(prev, `${q.id}: item existed before clarity pass`);
  const keys = new Set([...Object.keys(prev), ...Object.keys(q)]);
  const diffs = [...keys].filter(k => JSON.stringify(prev[k]) !== JSON.stringify(q[k]));
  if (diffs.length) changed += 1;
  for (const field of diffs) assert.ok(allowed.has(field), `${q.id}: Clarity v2 must not change ${field}`);
}
assert.strictEqual(changed, 2532, 'only the approved 2,532 items may change');

const shortest = window.IQ_QUESTION_BANK.filter(q => q.taskFamily === 'shortest-grid-path');
assert.strictEqual(shortest.length, 144);
for (const q of shortest) {
  assert.ok(q.q.includes('不能斜著抄對角線捷徑'), `${q.id}: diagonal rule should be explicit`);
  assert.ok(q.e.includes('東西方向與南北方向的步數要分開累計'), `${q.id}: Manhattan reasoning should be explicit`);
  assert.ok(q.visual && q.visual.includes('<svg'), `${q.id}: existing SVG diagram must remain intact`);
  assert.strictEqual(String(q.o[q.a]), String(q.diagramData.east + q.diagramData.north), `${q.id}: answer key must be unchanged`);
}

const positions = [0,0,0,0];
for (const q of window.IQ_QUESTION_BANK) positions[q.a] += 1;
assert.deepStrictEqual(positions, [1281,1281,1281,1281], 'A/B/C/D answer balance must remain exact');

console.log('QB4 Clarity v2 validation PASS');
console.log('2,532 items / 24 families rewrite q+e only; keys, options, diagrams, timing and answer balance remain unchanged.');
