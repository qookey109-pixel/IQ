const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('question-bank.js', 'utf8');
const store = {};
const domainOrder = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];

function runForm() {
  const window = { addEventListener() {} };
  const context = {
    window,
    document: { getElementById() { return null; } },
    localStorage: {
      getItem(key) { return store[key] ?? null; },
      setItem(key, value) { store[key] = value; }
    },
    console,
    Math,
    JSON,
    Set,
    Array,
    Number,
    String,
    Object
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return window;
}

const first = runForm();
assert.strictEqual(first.IQ_BANK_VALIDATION.ok, true, first.IQ_BANK_VALIDATION.errors.join('\n'));
assert.strictEqual(first.IQ_BANK_VALIDATION.total, 300);
assert.strictEqual(first.IQ_BANK_VALIDATION.uniqueTaskSignatures, 300);
assert.strictEqual(first.IQ_QUESTION_BANK.length, 300);
assert.strictEqual(first.IQ_QUESTIONS.length, 30);

for (const domain of domainOrder) {
  const bank = first.IQ_QUESTION_BANK.filter(q => q.d === domain);
  assert.strictEqual(bank.length, 50, `${domain}: bank size`);
  assert.strictEqual(bank.filter(q => q.difficulty === 'easy').length, 20, `${domain}: easy count`);
  assert.strictEqual(bank.filter(q => q.difficulty === 'medium').length, 20, `${domain}: medium count`);
  assert.strictEqual(bank.filter(q => q.difficulty === 'hard').length, 10, `${domain}: hard count`);

  const form = first.IQ_QUESTIONS.filter(q => q.d === domain);
  assert.strictEqual(form.length, 5, `${domain}: form count`);
  assert.strictEqual(form.filter(q => q.difficulty === 'easy').length, 2, `${domain}: form easy`);
  assert.strictEqual(form.filter(q => q.difficulty === 'medium').length, 2, `${domain}: form medium`);
  assert.strictEqual(form.filter(q => q.difficulty === 'hard').length, 1, `${domain}: form hard`);
}

for (const q of first.IQ_QUESTION_BANK) {
  const timed = Number.isFinite(Number(q.limit)) && Number(q.limit) > 0;
  if (q.d === '處理速度') assert.strictEqual(timed, true, `${q.id}: speed must be timed`);
  else assert.strictEqual(timed, false, `${q.id}: non-speed must be untimed`);
  assert.strictEqual(new Set(q.o.map(String)).size, 4, `${q.id}: options must be unique`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a <= 3, `${q.id}: answer index`);
}

const seen = new Set(first.IQ_QUESTIONS.map(q => q.id));
for (let run = 2; run <= 10; run++) {
  const form = runForm().IQ_QUESTIONS;
  for (const q of form) {
    assert.strictEqual(seen.has(q.id), false, `item repeated before 300-item coverage completed: ${q.id}`);
    seen.add(q.id);
  }
}
assert.strictEqual(seen.size, 300, 'first 10 forms should cover all 300 items exactly once');

console.log('Question Bank v3.1 validation PASS');
console.log('300 unique task signatures; 6×50 bank; balanced 30-item forms; 10-form full coverage cycle.');
