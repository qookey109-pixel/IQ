const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const qualityCode = fs.readFileSync('answer-quality.js', 'utf8');
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
vm.runInContext(qualityCode, context);

assert.strictEqual(window.IQ_BANK_META.revision, '3.2');
assert.strictEqual(window.IQ_QUESTION_BANK.length, 300);
assert.strictEqual(window.IQ_QUESTIONS.length, 30);
assert.deepStrictEqual(Array.from(window.IQ_QUESTIONS, q => q.id), Array.from(selectedIdsBefore), 'option pass must not change selected items');

let curatedAnalogies = 0;
let nearMissItems = 0;
let cueRisk = 0;
const positions = [0, 0, 0, 0];

for (const q of window.IQ_QUESTION_BANK) {
  assert.strictEqual(q.bankRevision, '3.2', `${q.id}: revision`);
  assert.strictEqual(q.o.length, 4, `${q.id}: four options`);
  assert.strictEqual(new Set(Array.from(q.o, String)).size, 4, `${q.id}: options unique`);
  assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id}: answer key`);
  assert.ok(['original-aig', 'original-research-informed'].includes(q.source), `${q.id}: source must remain original`);
  positions[q.a] += 1;

  if (q.model === 'verbal-analogy') {
    assert.strictEqual(q.distractorDesign, 'curated-peer-near-miss', `${q.id}: analogy distractors`);
    curatedAnalogies += 1;
  }
  if (String(q.distractorDesign).includes('near-miss')) nearMissItems += 1;
  if (q.optionCueFlags?.length) cueRisk += 1;
}

assert.strictEqual(curatedAnalogies, 20, 'all 20 analogy items must use curated distractors');
assert.ok(nearMissItems >= 60, `expected broad near-miss coverage, got ${nearMissItems}`);
assert.ok(Math.max(...positions) - Math.min(...positions) <= 12, `answer positions too imbalanced: ${positions.join('/')}`);
assert.ok(cueRisk <= 12, `too many static option cue risks: ${cueRisk}`);

const report = window.IQ_OPTION_QUALITY_REPORT;
assert.strictEqual(report.totalItems, 300);
assert.strictEqual(report.revision, '3.2');
assert.deepStrictEqual(Array.from(report.correctPositionCounts), positions);

console.log('Option Quality v3.2 validation PASS');
console.log(`curated analogies=${curatedAnalogies}; near-miss items=${nearMissItems}; cue-risk=${cueRisk}; answer positions=${positions.join('/')}`);
