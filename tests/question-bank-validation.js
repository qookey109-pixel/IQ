const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('question-bank.js', 'utf8');
const store = {};
const domains = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];

function runForm() {
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
  vm.runInContext(code, context);
  return window;
}

const first = runForm();
assert.strictEqual(first.IQ_BANK_VALIDATION.ok, true, first.IQ_BANK_VALIDATION.errors.join('\n'));
assert.strictEqual(first.IQ_BANK_META.version, 'QB-2026.09.4');
assert.strictEqual(first.IQ_BANK_META.revision, '4.0');
assert.strictEqual(first.IQ_BANK_META.taskFamilies, 42);
assert.strictEqual(first.IQ_BANK_META.totalItems, 5124);
assert.strictEqual(first.IQ_BANK_VALIDATION.total, 5124);
assert.strictEqual(first.IQ_BANK_VALIDATION.uniqueTaskSignatures, 5124);
assert.strictEqual(first.IQ_QUESTION_BANK.length, 5124);
assert.strictEqual(first.IQ_QUESTIONS.length, 30);
assert.strictEqual(first.IQ_DIVERSITY.families.length, 42);

for (const domain of domains) {
  const bank = first.IQ_QUESTION_BANK.filter(q => q.d === domain);
  const familyCount = new Set(bank.map(q => q.semanticKey)).size;
  assert.strictEqual(familyCount, 7, `${domain}: expected seven semantic families`);
  assert.strictEqual(bank.length, domain === '語文理解' ? 84 : 1008, `${domain}: bank size`);

  const form = first.IQ_QUESTIONS.filter(q => q.d === domain);
  assert.strictEqual(form.length, 5, `${domain}: form count`);
  assert.strictEqual(form.filter(q => q.difficulty === 'easy').length, 2, `${domain}: form easy`);
  assert.strictEqual(form.filter(q => q.difficulty === 'medium').length, 2, `${domain}: form medium`);
  assert.strictEqual(form.filter(q => q.difficulty === 'hard').length, 1, `${domain}: form hard`);
  assert.strictEqual(new Set(form.map(q => q.semanticKey)).size, 5, `${domain}: semantic diversity`);
}

assert.strictEqual(new Set(first.IQ_QUESTIONS.map(q => q.semanticKey)).size, 30, 'form must contain 30 unique semantic templates');
assert.strictEqual(first.IQ_DIVERSITY.validateForm(first.IQ_QUESTIONS).ok, true, 'selected form must pass QB4 form validation');

for (const q of first.IQ_QUESTION_BANK) {
  assert.strictEqual(q.bankVersion, 'QB-2026.09.4', `${q.id}: version`);
  assert.strictEqual(q.bankRevision, '4.0', `${q.id}: revision`);
  assert.ok(q.taskFamily && q.semanticKey && q.taskLabel, `${q.id}: semantic metadata`);
  assert.strictEqual(q.taskFamily, q.semanticKey, `${q.id}: semantic key must identify the task family`);
  assert.strictEqual(new Set(q.o.map(String)).size, 4, `${q.id}: options must be unique`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a <= 3, `${q.id}: answer index`);
  const timed = Number.isFinite(Number(q.limit)) && Number(q.limit) > 0;
  assert.strictEqual(timed, q.d === '處理速度', `${q.id}: timing policy`);
  if (q.d === '工作記憶') {
    assert.strictEqual(q.type, 'memory', `${q.id}: memory type`);
    assert.ok(q.stim, `${q.id}: memory stimulus`);
  }
  if (q.type === 'matrix') assert.strictEqual(q.cells.length, 9, `${q.id}: matrix cell count`);
}

// The last eight forms are excluded by item ID. With this bank size, nine consecutive
// forms should therefore have no repeated item IDs even though task families may recur.
const seen = new Set(first.IQ_QUESTIONS.map(q => q.id));
for (let run = 2; run <= 9; run++) {
  const form = runForm().IQ_QUESTIONS;
  assert.strictEqual(new Set(form.map(q => q.semanticKey)).size, 30, `form ${run}: semantic templates`);
  for (const q of form) {
    assert.strictEqual(seen.has(q.id), false, `item repeated inside recent-eight avoidance window: ${q.id}`);
    seen.add(q.id);
  }
}
assert.strictEqual(seen.size, 270, 'nine consecutive forms should expose 270 unique item IDs');

console.log('Question Bank QB4 validation PASS');
console.log('5,124 unique bank items; 42 task families; six-domain 30-item forms; 30 unique semantic templates per form.');
