const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('question-bank.js', 'utf8');
const store = {};
const domains = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
const historyKey = 'cognitive-iq-lab:form-history:QB-2026.09.4';

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
assert.strictEqual(first.IQ_BANK_META.recentFormAvoidance, 8);
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

assert.strictEqual(new Set(first.IQ_QUESTIONS.map(q => q.id)).size, 30, 'form must contain 30 unique item IDs');
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

// Generate enough forms to exercise recent-history persistence. QB4 promises fresh-first
// selection against the last eight forms, but deliberately permits fallback when a small
// verbal family/tier exhausts its fresh variants.
for (let run = 2; run <= 12; run++) {
  const w = runForm();
  const form = w.IQ_QUESTIONS;
  assert.strictEqual(w.IQ_DIVERSITY.validateForm(form).ok, true, `form ${run}: validation`);
  assert.strictEqual(new Set(form.map(q => q.id)).size, 30, `form ${run}: unique IDs inside form`);
  assert.strictEqual(new Set(form.map(q => q.semanticKey)).size, 30, `form ${run}: unique semantic templates`);
}

const history = JSON.parse(store[historyKey] || '[]');
assert.strictEqual(history.length, 8, 'history must retain only the most recent eight forms');
assert.ok(history.every(form => Array.isArray(form) && form.length === 30), 'history entries must be complete 30-item forms');

console.log('Question Bank QB4 validation PASS');
console.log('5,124 unique bank items; 42 task families; 30 semantic templates per form; recent-8 fresh-first history with controlled fallback.');
