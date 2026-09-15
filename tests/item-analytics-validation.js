const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('item-analytics.js', 'utf8');
const store = {};

const context = {
  window: {
    IQ_BANK_META: { version: 'QB-2026.09.3', revision: '3.1' },
    IQ_QUESTION_BANK: [],
    confirm() { return true; }
  },
  document: {
    readyState: 'loading',
    addEventListener() {},
    createElement() { return { textContent: '', className: '', appendChild() {}, addEventListener() {} }; },
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById() { return null; },
    querySelector() { return null; }
  },
  localStorage: {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = value; },
    removeItem(key) { delete store[key]; }
  },
  questions: [],
  answers: [],
  elapsedTimes: [],
  expiredQuestionsLock: [],
  initState() {},
  finishTest() {},
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Blob: function Blob() {},
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
};

vm.createContext(context);
vm.runInContext(code, context);
const api = context.window.IQ_ITEM_QA;
assert.ok(api, 'IQ_ITEM_QA should be exposed');

const q = { id: 'qb3-test-001', d: '流體推理', difficulty: 'easy', model: 'test', a: 0 };

let result = api.evaluateItem(q, {
  exposures: 5, correct: 4, skipped: 0, timeouts: 0,
  totalSeconds: 20, optionCounts: [4, 1, 0, 0], timed: false, limit: null
});
assert.ok(result.flags.includes('樣本不足'));
assert.strictEqual(result.qualityScore, null);

result = api.evaluateItem(q, {
  exposures: 10, correct: 9, skipped: 0, timeouts: 0,
  totalSeconds: 40, optionCounts: [9, 1, 0, 0], timed: false, limit: null
});
assert.ok(result.flags.includes('可能過易'));
assert.ok(result.qualityScore < 100);

result = api.evaluateItem(q, {
  exposures: 10, correct: 3, skipped: 0, timeouts: 0,
  totalSeconds: 90, optionCounts: [3, 3, 2, 2], timed: false, limit: null
});
assert.ok(result.flags.includes('可能過難／規則不清'));

result = api.evaluateItem(q, {
  exposures: 30, correct: 12, skipped: 0, timeouts: 0,
  totalSeconds: 180, optionCounts: [12, 16, 1, 1], timed: false, limit: null
});
assert.ok(result.flags.some(flag => flag.includes('干擾選項偏弱')));

const speedQ = { id: 'qb3-speed-001', d: '處理速度', difficulty: 'medium', model: 'speed', a: 1 };
result = api.evaluateItem(speedQ, {
  exposures: 10, correct: 7, skipped: 0, timeouts: 3,
  totalSeconds: 105, optionCounts: [1, 7, 1, 1], timed: true, limit: 12
});
assert.ok(result.flags.includes('逾時率偏高'));
assert.ok(result.flags.includes('平均作答接近時限'));

console.log('Local item analytics validation PASS');
console.log('sample gating, difficulty signals, distractor checks, and timed-item flags verified.');
