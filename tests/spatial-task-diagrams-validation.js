const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

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
for (const file of ['question-bank.js','answer-quality.js','answer-position-balance.js','presentation-clarity.js','spatial-task-diagrams.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}

const items = window.IQ_QUESTION_BANK.filter(q => q.taskFamily === 'shortest-grid-path');
assert.strictEqual(items.length, 144, 'QB4 should contain 144 shortest-grid-path variants');
assert.strictEqual(window.IQ_SPATIAL_DIAGRAMS.upgradedItems, 144, 'all shortest-grid-path variants should receive diagrams');

for (const q of items) {
  assert.strictEqual(q.presentationMode, 'spatial-diagram', `${q.id}: presentation mode`);
  assert.strictEqual(q.diagramType, 'grid-shortest-path', `${q.id}: diagram type`);
  assert.ok(q.visual.includes('<svg'), `${q.id}: inline SVG missing`);
  assert.ok(q.visual.includes('起點 (0,0)'), `${q.id}: start label missing`);
  assert.ok(q.visual.includes(`向東 ${q.diagramData.east} 格`), `${q.id}: east label missing`);
  assert.ok(q.visual.includes(`向北 ${q.diagramData.north} 格`), `${q.id}: north label missing`);
  assert.ok(q.q.includes('起點座標視為 (0,0)'), `${q.id}: coordinate anchor wording missing`);
  assert.ok(q.q.includes('每次只能沿格線水平或垂直移動 1 格'), `${q.id}: step wording missing`);
  assert.ok(q.e.includes('起點本身不算一次移動'), `${q.id}: ambiguity clarification missing`);
  const expected = String(q.diagramData.east + q.diagramData.north);
  assert.strictEqual(String(q.o[q.a]), expected, `${q.id}: answer key must remain Manhattan distance`);
}

console.log('Spatial task diagram validation PASS');
console.log('144 shortest-grid-path variants use responsive SVG diagrams with unambiguous movement wording.');
