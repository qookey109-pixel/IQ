'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('replay-history.js','utf8');
const store = {};
const localStorage = {
  getItem(key){ return Object.prototype.hasOwnProperty.call(store,key) ? store[key] : null; },
  setItem(key,value){ store[key] = String(value); },
  removeItem(key){ delete store[key]; }
};
const window = {};
const context = {window, localStorage, console, JSON, Object, Array, String, Boolean};
vm.createContext(context);
vm.runInContext(source, context, {filename:'replay-history.js'});

const H = window.IQ_REPLAY_HISTORY;
assert.ok(H, 'replay history must export window.IQ_REPLAY_HISTORY');
assert.strictEqual(H.version, '1.0');
assert.strictEqual(H.maxEntries, 4);
assert.strictEqual(H.storesNumericScores, false);
assert.strictEqual(H.storesAnswers, false);
assert.strictEqual(H.uploadsAutomatically, false);
assert.deepStrictEqual(
  Array.from(H.storedFields),
  ['title','emoji','variantId','primaryDomain','secondaryDomain'],
  'only qualitative public title identity may be stored'
);

function profile(n, title='模式'+n){
  return {
    title,
    emoji:'✨',
    variantId:'A→B-'+n,
    primaryDomain:'語文理解',
    secondaryDomain:'流體推理',
    performanceIndex:99,
    rawAccuracy:100,
    correct:42,
    answers:[0,1,2,3]
  };
}

let r = H.record(profile(1,'第一模式'));
assert.strictEqual(r.entries.length,1);
assert.strictEqual(r.previous,null);
assert.ok(H.describe(r).includes('第一次'));

r = H.record(profile(2,'第二模式'));
assert.strictEqual(r.entries.length,2);
assert.strictEqual(r.previous.title,'第一模式');
assert.ok(H.describe(r).includes('上次是「第一模式」'));

const same = H.record({...profile(2,'第二模式')});
assert.strictEqual(same.previous.variantId,same.current.variantId);
assert.ok(H.describe(same).includes('同一種主副線組合'));

H.record(profile(3));
H.record(profile(4));
H.record(profile(5));
const entries = H.read();
assert.strictEqual(entries.length,4,'history must keep only the most recent four attempts');
assert.strictEqual(entries.at(-1).title,'模式5');

for (const entry of entries) {
  assert.deepStrictEqual(
    Object.keys(entry).sort(),
    ['emoji','primaryDomain','secondaryDomain','title','variantId'].sort(),
    'stored entry must contain only qualitative title fields'
  );
  for (const forbidden of ['performanceIndex','rawAccuracy','correct','answers','score','CPI','IQ']) {
    assert.ok(!Object.prototype.hasOwnProperty.call(entry,forbidden), 'stored entry leaked forbidden field: '+forbidden);
  }
}

const raw = store[H.storageKey];
for (const forbidden of ['performanceIndex','rawAccuracy','answers','"correct"','CPI','"IQ"']) {
  assert.ok(!raw.includes(forbidden),'serialized local history leaked forbidden token: '+forbidden);
}

assert.strictEqual(H.clear(),true);
assert.deepStrictEqual(Array.from(H.read()),[]);

console.log('Replay motivation validation PASS');
console.log('Local history keeps at most four qualitative title identities; no score, answer, timing, demographic, or upload data is stored.');
