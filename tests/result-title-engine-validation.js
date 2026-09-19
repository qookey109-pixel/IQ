'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('result-title-engine.js','utf8');
const window = {};
const context = {window, console, Math, Number, Object, Array, Set, Map};
vm.createContext(context);
vm.runInContext(source, context, {filename:'result-title-engine.js'});

const E = window.IQ_RESULT_TITLE_ENGINE;
assert.ok(E, 'title engine must export window.IQ_RESULT_TITLE_ENGINE');
assert.strictEqual(E.version, '1.0');
assert.strictEqual(E.domainOrder.length, 6);
assert.strictEqual(E.combinationCount, 30);

const expectedKeys = [];
for (const primary of E.domainOrder) {
  for (const secondary of E.domainOrder) {
    if (primary !== secondary) expectedKeys.push(`${primary}→${secondary}`);
  }
}
assert.strictEqual(expectedKeys.length, 30);
assert.deepStrictEqual(
  [...Object.keys(E.combinations)].sort(),
  [...expectedKeys].sort(),
  'all 6×5 directional domain combinations must exist exactly once'
);

const titles = Object.values(E.combinations).map(row => row.title);
assert.strictEqual(new Set(titles).size, 30, 'all 30 combination titles must be unique');

for (const key of expectedKeys) {
  const [primary, secondary] = key.split('→');
  const stats = Object.fromEntries(E.domainOrder.map(domain => [domain, {score: 10}]));
  stats[primary].score = 100;
  stats[secondary].score = 90;

  const a = E.buildProfile(E.domainOrder, stats);
  const b = E.buildProfile(E.domainOrder, stats);

  assert.deepStrictEqual(a, b, key + ': title selection must be deterministic');
  assert.strictEqual(a.variantId, key, key + ': variant id');
  assert.strictEqual(a.title, E.combinations[key].title, key + ': mapped title');
  assert.strictEqual(a.primaryDomain, primary, key + ': primary domain');
  assert.strictEqual(a.secondaryDomain, secondary, key + ': secondary domain');
  assert.strictEqual(a.coLead, false, key + ': non-tie profile');

  const publicText = [a.title,a.signature,a.summary,a.strategy,a.description].join(' ');
  for (const forbidden of ['IQ','CPI','百分','分數','排名',' / 100','%']) {
    assert.ok(!publicText.includes(forbidden), key + ': public title text leaked forbidden metric term: ' + forbidden);
  }
}

// Reverse direction must produce a distinct title for every unordered pair.
for (let i=0;i<E.domainOrder.length;i++) {
  for (let j=i+1;j<E.domainOrder.length;j++) {
    const a = E.combinations[`${E.domainOrder[i]}→${E.domainOrder[j]}`].title;
    const b = E.combinations[`${E.domainOrder[j]}→${E.domainOrder[i]}`].title;
    assert.notStrictEqual(a,b,'reverse directions must have distinct titles');
  }
}

// Exact ties are stable and disclosed as co-leading rather than randomized.
const tiedStats = Object.fromEntries(E.domainOrder.map(domain => [domain,{score:10}]));
tiedStats['語文理解'].score = 80;
tiedStats['流體推理'].score = 80;
const tie = E.buildProfile(E.domainOrder,tiedStats);
assert.strictEqual(tie.primaryDomain,'語文理解');
assert.strictEqual(tie.secondaryDomain,'流體推理');
assert.strictEqual(tie.coLead,true);
assert.ok(tie.signature.startsWith('雙主線 · '));

console.log('Result title engine validation PASS');
console.log('30 unique deterministic directional titles cover every 6×5 domain pair; public text remains qualitative.');
