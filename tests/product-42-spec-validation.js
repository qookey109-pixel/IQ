'use strict';

const fs = require('fs');
const assert = require('assert');

const read = path => fs.readFileSync(path, 'utf8');
const readme = read('README.md');
const equivalence = read('qb5-form-equivalence.js');
const finalize = read('qb5-finalize.js');
const compact = read('qb5-compact-bank.js');
const production = read('qb5-42-form.js');
const index = read('index.html');

for (const [file, source] of [
  ['qb5-form-equivalence.js', equivalence],
  ['qb5-finalize.js', finalize],
  ['qb5-compact-bank.js', compact],
  ['qb5-42-form.js', production]
]) {
  assert.ok(!/selectedItems\s*:\s*30\b/.test(source), file + ': legacy selectedItems=30 must stay removed');
  assert.ok(!/form\.length\s*!==\s*30\b/.test(source), file + ': legacy 30-item validator must stay removed');
}

assert.ok(equivalence.includes('6×7 / 2 easy + 3 medium + 2 hard'));
assert.ok(equivalence.includes('2 * easy + 3 * medium + 2 * hard'));
assert.ok(finalize.includes("form must contain 42 items"));
assert.ok(finalize.includes('group.length!==7'));
assert.ok(finalize.includes('{easy:2,medium:3,hard:2}'));
assert.ok(finalize.includes('selectedItems:42'));
assert.ok(compact.includes('form.length===42'));
assert.ok(compact.includes('selectedItems:42'));
assert.ok(production.includes("blueprint:'6x7 / 2 easy + 3 medium + 2 hard'"));
assert.ok(production.includes('selectedItems:42'));
assert.ok(index.includes('每次抽 42 題'));
assert.ok(index.includes('每個構面固定 7 題'));
assert.ok(readme.includes('正式 production form 固定 6 構面 × 7 題 = 42 題'));
assert.ok(readme.includes('每構面 2 easy + 3 medium + 2 hard'));
assert.ok(!readme.includes('固定 6 構面 × 5 題'));
assert.ok(!readme.includes('30-item form quota'));

console.log('42-item product specification guard PASS');
console.log('Active product authority is 42 items = 6 domains × 7 families, with 2 easy + 3 medium + 2 hard per domain.');
