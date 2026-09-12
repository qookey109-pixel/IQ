const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

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
vm.runInContext(fs.readFileSync('question-bank.js', 'utf8'), context);

const selectedIdsBefore = window.IQ_QUESTIONS.map(q => q.id);
vm.runInContext(fs.readFileSync('option-quality-v3.js', 'utf8'), context);

const repair = window.IQ_OPTION_QUALITY_V3;
assert.ok(repair, 'Option Quality v3 metadata missing');
assert.strictEqual(repair.version, '3.0');
assert.strictEqual(repair.modifiedItems, 192, 'targeted repair should modify 192 items');
assert.strictEqual(repair.modifiedFamilies, 5, 'targeted repair should cover 5 families');
assert.deepStrictEqual(JSON.parse(JSON.stringify(repair.counts)), {
  'necessary-condition':12,
  'reported-vs-fact':12,
  'scope-negation':12,
  'evidence-strength':12,
  'quant-remainder':144
});

for (const q of window.IQ_QUESTION_BANK) {
  assert.strictEqual(new Set(q.o.map(String)).size, 4, `${q.id}: options must remain unique`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id}: answer key must remain valid`);
}

for (const q of window.IQ_QUESTION_BANK.filter(q => q.taskFamily === 'necessary-condition')) {
  assert.ok(String(q.o[q.a]).includes('不具備') && String(q.o[q.a]).includes('資格'), `${q.id}: correct choice should match qualification wording`);
}
for (const q of window.IQ_QUESTION_BANK.filter(q => q.taskFamily === 'reported-vs-fact')) {
  assert.ok(String(q.o[q.a]).includes('表示打算'), `${q.id}: correct choice must preserve reported wording`);
}
for (const q of window.IQ_QUESTION_BANK.filter(q => q.taskFamily === 'quant-remainder')) {
  const values = q.o.map(Number);
  assert.ok(values.every(v => Number.isInteger(v) && v >= 0 && v <= 6), `${q.id}: remainder distractors must all be legal residues 0..6`);
  assert.ok(!values.includes(7), `${q.id}: divisor 7 must never appear as a remainder option`);
}

vm.runInContext(fs.readFileSync('answer-position-balance.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('answer-quality.js', 'utf8'), context);

assert.deepStrictEqual(Array.from(window.IQ_QUESTIONS, q => q.id), Array.from(selectedIdsBefore), 'quality layers must not change selected item IDs');
const positions = [0,0,0,0];
for (const q of window.IQ_QUESTION_BANK) positions[q.a] += 1;
assert.deepStrictEqual(positions, [1281,1281,1281,1281], 'A/B/C/D must remain exactly balanced after repair');

for (const family of ['scope-negation','evidence-strength']) {
  const items = window.IQ_QUESTION_BANK.filter(q => q.taskFamily === family);
  assert.strictEqual(items.length, 12);
  for (const q of items) assert.ok(!q.optionCueFlags.includes('length-cue'), `${q.id}: repaired verbal options must not expose a length cue`);
}

const report = window.IQ_OPTION_QUALITY_REPORT;
assert.strictEqual(window.IQ_BANK_META.optionQualityMode, 'targeted-repair-then-audit');
assert.strictEqual(window.IQ_OPTION_AUDIT.version, '4.0-v3');
assert.strictEqual(report.answerPositionStrategy, 'hash-quota-balanced');
assert.deepStrictEqual(Array.from(report.correctPositionCounts), positions);

console.log('QB4 Option Quality v3 validation PASS');
console.log(`targeted=${repair.modifiedItems} items / ${repair.modifiedFamilies} families; positions=${positions.join('/')}`);