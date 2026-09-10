const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const files = [
  'question-bank.js',
  'answer-quality.js',
  'answer-position-balance.js',
  'memory-answer-quality.js'
];
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
for (const file of files) vm.runInContext(fs.readFileSync(file, 'utf8'), context);

const bank = window.IQ_QUESTION_BANK;
const meta = window.IQ_MEMORY_OPTION_QUALITY;
assert.ok(meta, 'memory option quality metadata missing');
assert.strictEqual(meta.version, '2.0');
assert.strictEqual(meta.upgradedItems, 50, 'all 50 memory items should be upgraded');

const memory = bank.filter(q => q.d === '工作記憶');
assert.strictEqual(memory.length, 50);

const split = value => String(value).trim().split(/\s+/).filter(Boolean);
const isAscending = arr => arr.every((x,i) => i === 0 || Number(arr[i-1]) < Number(x));
const isDescending = arr => arr.every((x,i) => i === 0 || Number(arr[i-1]) > Number(x));
const overlap = (a,b) => {
  const left = [...a];
  let count = 0;
  for (const x of b) {
    const i = left.indexOf(x);
    if (i >= 0) { count++; left.splice(i,1); }
  }
  return count;
};

for (const q of memory) {
  assert.strictEqual(q.memoryOptionQuality, 'task-consistent-near-miss-v2', `${q.id}: quality flag`);
  assert.strictEqual(q.o.length, 4, `${q.id}: four options`);
  assert.strictEqual(new Set(q.o.map(String)).size, 4, `${q.id}: unique options`);

  const correct = Array.from(meta.deriveCorrect(q));
  const correctText = correct.join(' ');
  assert.strictEqual(q.o[q.a], correctText, `${q.id}: answer content must match stimulus transformation`);

  for (let i = 0; i < q.o.length; i++) {
    const option = split(q.o[i]);
    assert.strictEqual(option.length, correct.length, `${q.id}: option length must match correct response`);

    if (q.model === 'memory-sort' || q.model === 'memory-select-sort') {
      assert.ok(isAscending(option), `${q.id}: every choice must already be ascending`);
    }
    if (q.model === 'memory-extract-sort') {
      assert.ok(isDescending(option), `${q.id}: every choice must already be descending`);
    }

    if (i !== q.a) {
      assert.ok(
        overlap(correct, option) >= correct.length - 1,
        `${q.id}: distractor should be a near-memory miss, not an obviously unrelated answer`
      );
    }
  }
}

const sortExample = memory.find(q => q.model === 'memory-sort');
assert.ok(sortExample, 'expected ascending memory-sort items');
assert.ok(sortExample.o.every(opt => isAscending(split(opt))), 'memory-sort should require recall, not spotting the only sorted choice');

const html = fs.readFileSync('index.html', 'utf8');
const balanceAt = html.indexOf('answer-position-balance.js');
const memoryQualityAt = html.indexOf('memory-answer-quality.js');
const appAt = html.indexOf('app.js');
assert.ok(memoryQualityAt > balanceAt && memoryQualityAt < appAt, 'memory answer quality must run after answer balancing and before app binding');

console.log('Memory answer quality validation PASS');
console.log('50 memory items use task-consistent near-miss distractors; sorted tasks show four already-sorted choices.');
