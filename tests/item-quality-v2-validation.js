const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = {};
const window = { addEventListener() {}, confirm() { return true; } };
const document = {
  readyState: 'complete',
  head: { appendChild() {} },
  createElement() { return { textContent: '' }; },
  getElementById() { return null; }
};
const context = {
  window, document,
  localStorage: {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = value; },
    removeItem(key) { delete store[key]; }
  },
  console, Math, JSON, Set, Map, Array, Number, String, Object, Date, RegExp,
  setTimeout() { return 0; }, clearTimeout() {},
  finishTest() {}, initState() {},
  questions: [], answers: [], elapsedTimes: [], expiredQuestionsLock: []
};
vm.createContext(context);

const runtime = ['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-finalize.js','answer-position-balance.js','answer-quality.js'];
for (const file of runtime) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename:file });
context.questions = window.IQ_QUESTIONS;
context.answers = Array(context.questions.length).fill(null);
context.elapsedTimes = Array(context.questions.length).fill(0);
context.expiredQuestionsLock = Array(context.questions.length).fill(false);
vm.runInContext(fs.readFileSync('item-quality-v2.js', 'utf8'), context);

const qa = window.IQ_ITEM_QA_V2;
assert.ok(qa, 'QA v2 API should be exposed');
assert.strictEqual(window.IQ_BANK_META.version, 'QB-2026.09.5');

const preflight = qa.bankPreflight(window.IQ_QUESTION_BANK);
assert.deepStrictEqual(Array.from(preflight.positions), [1281,1281,1281,1281], 'QB5 A/B/C/D must be exactly balanced');
assert.ok(preflight.positionEntropy > 0.999, `position entropy should be ~1, got ${preflight.positionEntropy}`);
assert.ok(Array.isArray(preflight.cueItems), 'cue item list');
assert.ok(Array.isArray(preflight.repeatedStems), 'repeated stem list');
assert.ok(preflight.repeatedStems.length > 0, 'controlled families should remain visible as repeated stem groups');

const q = window.IQ_QUESTION_BANK.find(item => item.taskFamily === 'necessary-condition') || window.IQ_QUESTION_BANK[0];
assert.ok(q, 'need a QB5 fixture');
const correctText = String(q.o[q.a]);
const wrongTexts = q.o.map(String).filter((_, i) => i !== q.a);
const entry = {
  exposures: 40,
  correct: 24,
  skipped: 0,
  timeouts: 0,
  totalSeconds: 480,
  totalSecondsSq: 6400,
  sumRest: 24,
  sumRestSq: 16,
  sumXRest: 17.6,
  choiceCounts: {
    [correctText]: 24,
    [wrongTexts[0]]: 8,
    [wrongTexts[1]]: 7,
    [wrongTexts[2]]: 1
  },
  timed: false,
  limit: null
};

const item = qa.evaluateItem(q, entry);
assert.strictEqual(item.n, 40);
assert.strictEqual(Math.round(item.accuracy * 100), 60);
assert.ok(item.discrimination > 0.3, `expected positive item-rest discrimination, got ${item.discrimination}`);
assert.strictEqual(item.weakDistractors, 1, 'one distractor selected by <5% should be weak');
assert.strictEqual(Math.round(item.distractorEfficiency * 100), 67, 'two of three distractors should function');
assert.ok(item.flags.some(flag => flag.includes('1 個干擾選項 <5%')), 'weak distractor flag should appear');

const smallSample = qa.evaluateItem(q, { ...entry, exposures: 9, correct: 6 });
assert.strictEqual(smallSample.qualityScore, null, 'N<10 should not receive a quality score');
assert.ok(smallSample.flags.includes('樣本不足'));

console.log('Item Quality QA v2 / QB5 validation PASS');
console.log(`answer positions=${preflight.positions.join('/')}; templates=${window.IQ_BANK_META.semanticTemplates}; item-rest r=${item.discrimination.toFixed(2)}; distractor efficiency=${Math.round(item.distractorEfficiency*100)}%`);