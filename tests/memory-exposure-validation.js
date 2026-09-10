const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const bankCode = fs.readFileSync('question-bank.js', 'utf8');
const memoryCode = fs.readFileSync('memory-exposure.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
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
vm.runInContext(bankCode, context);
vm.runInContext(memoryCode, context);

const policy = window.IQ_MEMORY_EXPOSURE_POLICY;
assert.ok(policy, 'memory exposure policy must be exported');
assert.strictEqual(policy.singleExposure, true, 'memory stimulus must remain one-shot');
assert.strictEqual(policy.answerUntimed, true, 'memory answer phase must remain untimed');
assert.strictEqual(policy.minimumSeconds, 4);
assert.strictEqual(policy.maximumSeconds, 6);

const memoryItems = window.IQ_QUESTION_BANK.filter(q => q.d === '工作記憶');
assert.strictEqual(memoryItems.length, 50, 'expected 50 working-memory items');

const expected = { easy: 4, medium: 5, hard: 6 };
const counts = { easy: 0, medium: 0, hard: 0 };
for (const q of memoryItems) {
  counts[q.difficulty] += 1;
  assert.strictEqual(
    policy.getSeconds(q),
    expected[q.difficulty],
    `${q.id}: memory exposure must follow difficulty policy`
  );
}

assert.deepStrictEqual(counts, { easy: 20, medium: 20, hard: 10 });

const timeoutAt = html.indexOf('timeout-lock.js');
const memoryAt = html.indexOf('memory-exposure.js');
const qualityAt = html.indexOf('assessment-quality.js');
assert.ok(timeoutAt > -1 && memoryAt > timeoutAt, 'memory exposure layer must load after timing layer');
assert.ok(qualityAt > memoryAt, 'single-exposure safeguard must wrap the adaptive memory layer');
assert.ok(html.includes('記憶刺激 4–6 秒，只看一次'), 'home copy must explain adaptive memory exposure');

console.log('Adaptive memory exposure validation PASS');
console.log('Working memory uses 4s easy / 5s medium / 6s hard, one exposure, untimed response.');
