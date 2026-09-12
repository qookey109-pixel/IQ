const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const qualityCode = fs.readFileSync('answer-quality.js', 'utf8');
const balanceCode = fs.readFileSync('answer-position-balance.js', 'utf8');
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

const selectedIdsBefore = window.IQ_QUESTIONS.map(q => q.id);
const sampleBefore = new Map(window.IQ_QUESTION_BANK.slice(0,60).map(q => [q.id, {q:q.q, o:[...q.o], e:q.e, revision:q.bankRevision}]));
vm.runInContext(qualityCode, context);
vm.runInContext(balanceCode, context);

assert.strictEqual(window.IQ_BANK_META.version, 'QB-2026.09.4');
assert.strictEqual(window.IQ_BANK_META.revision, '4.0');
assert.strictEqual(window.IQ_BANK_META.optionQualityMode, 'audit-only-no-item-rewrite');
assert.strictEqual(window.IQ_QUESTION_BANK.length, 5124);
assert.strictEqual(window.IQ_QUESTIONS.length, 30);
assert.deepStrictEqual(Array.from(window.IQ_QUESTIONS, q => q.id), Array.from(selectedIdsBefore), 'quality layers must not change selected item IDs');

for (const [id, before] of sampleBefore) {
  const q = window.IQ_QUESTION_BANK.find(item => item.id === id);
  assert.strictEqual(q.q, before.q, `${id}: audit must not rewrite prompt`);
  assert.strictEqual(q.e, before.e, `${id}: audit must not rewrite explanation`);
  assert.strictEqual(q.bankRevision, before.revision, `${id}: audit must preserve QB4 revision`);
  assert.strictEqual(new Set(q.o.map(String)).size, 4, `${id}: options remain unique`);
}

const positions = [0,0,0,0];
let cueRisk = 0;
for (const q of window.IQ_QUESTION_BANK) {
  assert.strictEqual(q.bankRevision, '4.0', `${q.id}: revision`);
  assert.strictEqual(q.answerPositionBalanced, true, `${q.id}: balanced position marker`);
  assert.ok(Array.isArray(q.optionCueFlags), `${q.id}: option audit flags`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id}: answer key`);
  positions[q.a] += 1;
  if (q.optionCueFlags.length) cueRisk += 1;
}

assert.deepStrictEqual(positions, [1281,1281,1281,1281], `QB4 answer positions must be exactly balanced: ${positions.join('/')}`);
const report = window.IQ_OPTION_QUALITY_REPORT;
assert.strictEqual(report.totalItems, 5124);
assert.strictEqual(report.revision, '4.0');
assert.strictEqual(report.answerPositionStrategy, 'hash-quota-balanced');
assert.deepStrictEqual(Array.from(report.correctPositionCounts), positions);
assert.strictEqual(window.IQ_OPTION_AUDIT.version, '4.0');

console.log('QB4 option-quality audit validation PASS');
console.log(`cue-risk=${cueRisk}; answer positions=${positions.join('/')}; item text remains unchanged by audit.`);
