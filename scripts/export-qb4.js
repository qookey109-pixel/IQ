const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'qb4-export');
fs.mkdirSync(OUT, { recursive: true });

const store = {};
const window = { addEventListener() {} };
const context = {
  window,
  localStorage: {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = value; },
    removeItem(key) { delete store[key]; }
  },
  document: { getElementById() { return null; } },
  console, Math, JSON, Set, Map, Array, Number, String, Object, Date, RegExp
};
vm.createContext(context);

const runtimeFiles = [
  'question-bank.js',
  'option-quality-v3.js',
  'answer-position-balance.js',
  'answer-quality.js',
  'presentation-clarity.js',
  'spatial-task-diagrams.js',
  'clarity-v3.js'
];
for (const file of runtimeFiles) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const bank = window.IQ_QUESTION_BANK;
const meta = window.IQ_BANK_META;
const validation = window.IQ_BANK_VALIDATION;
const clarity = window.IQ_CLARITY_V3;
const optionQuality = window.IQ_OPTION_QUALITY_V3;
assert.ok(Array.isArray(bank), 'IQ_QUESTION_BANK missing');
assert.strictEqual(bank.length, 5124, `expected 5124 items, got ${bank.length}`);
assert.strictEqual(meta.version, 'QB-2026.09.4');
assert.strictEqual(meta.revision, '4.0');
assert.ok(clarity && clarity.version === '3.0', 'Clarity v3 runtime layer missing');
assert.strictEqual(clarity.modifiedItems, 3252, 'Clarity v3 must update 3,252 items');
assert.strictEqual(clarity.modifiedFamilies, 29, 'Clarity v3 must cover 29 task families');
assert.ok(optionQuality && optionQuality.version === '3.0', 'Option Quality v3 layer missing');
assert.strictEqual(optionQuality.modifiedItems, 192, 'Option Quality v3 must repair 192 items');
assert.strictEqual(optionQuality.modifiedFamilies, 5, 'Option Quality v3 must cover 5 task families');

const positions = [0, 0, 0, 0];
for (const q of bank) positions[q.a] += 1;
assert.deepStrictEqual(positions, [1281, 1281, 1281, 1281], 'answer positions must remain balanced');

const spatialDiagrams = bank.filter(q => q.taskFamily === 'shortest-grid-path');
assert.strictEqual(spatialDiagrams.length, 144, 'shortest-grid-path family must contain 144 variants');
assert.ok(spatialDiagrams.every(q => q.diagramType === 'grid-shortest-path' && String(q.visual || '').includes('<svg')), 'all shortest-grid-path items must include SVG diagrams');
assert.ok(spatialDiagrams.every(q => q.q.includes('每次只能沿格線水平或垂直移動 1 格')), 'Clarity v3 shortest-grid-path movement wording missing');

const remainderItems = bank.filter(q => q.taskFamily === 'quant-remainder');
assert.ok(remainderItems.every(q => q.o.every(opt => Number(opt) >= 0 && Number(opt) <= 6)), 'remainder options must stay within legal residue range');

const exportedAt = new Date().toISOString();
const exportMeta = {
  ...meta,
  exportedAt,
  sourceBranch: 'feature/cognitive-iq-lab-v6',
  runtimeOrder: runtimeFiles,
  answerPositionCounts: positions,
  spatialDiagramItems: spatialDiagrams.length,
  clarityRevision: clarity.version,
  clarityModifiedItems: clarity.modifiedItems,
  clarityModifiedFamilies: clarity.modifiedFamilies,
  optionQualityRevision: optionQuality.version,
  optionQualityModifiedItems: optionQuality.modifiedItems,
  optionQualityModifiedFamilies: optionQuality.modifiedFamilies,
  note: 'Fully expanded QB4 bank after targeted option repair, answer-position balancing, spatial diagrams, and construct-preserving Clarity v3.'
};

const payload = {
  meta: exportMeta,
  validation,
  clarity,
  optionQuality,
  items: bank
};

fs.writeFileSync(path.join(OUT, 'QB4-5124-clarity-v3.json'), JSON.stringify(payload, null, 2));
fs.writeFileSync(path.join(OUT, 'QB4-5124-items-clarity-v3.json'), JSON.stringify(bank, null, 2));

function csvCell(value) {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${s.replaceAll('"', '""')}"`;
}

const headers = [
  'id','bankVersion','bankRevision','clarityRevision','optionQualityRevision','domain','difficulty','taskFamily','taskLabel','semanticKey','model','type','limit',
  'question','optionA','optionB','optionC','optionD','answerIndex','answerLetter','correctAnswer','explanation','stimulus','cells','visual','diagramType','diagramData','source'
];
const rows = [headers.map(csvCell).join(',')];
for (const q of bank) {
  const values = [
    q.id,q.bankVersion,q.bankRevision,q.clarityRevision ?? '',q.optionQualityRevision ?? '',q.d,q.difficulty,q.taskFamily,q.taskLabel,q.semanticKey,q.model,q.type,q.limit ?? '',
    q.q,q.o?.[0] ?? '',q.o?.[1] ?? '',q.o?.[2] ?? '',q.o?.[3] ?? '',q.a,String.fromCharCode(65 + q.a),q.o?.[q.a] ?? '',q.e,
    q.stim ?? '',q.cells ?? '',q.visual ?? '',q.diagramType ?? '',q.diagramData ?? '',q.source ?? ''
  ];
  rows.push(values.map(csvCell).join(','));
}
fs.writeFileSync(path.join(OUT, 'QB4-5124-clarity-v3.csv'), rows.join('\n'));

const readme = `Cognitive IQ Lab — QB4 Clarity v3 Export\n\nVersion: ${meta.version}\nBank revision: ${meta.revision}\nClarity revision: ${clarity.version}\nOption Quality revision: ${optionQuality.version}\nItems: ${bank.length}\nTask families: ${meta.taskFamilies}\nClarity-updated items: ${clarity.modifiedItems}\nClarity-updated families: ${clarity.modifiedFamilies}\nOption-repaired items: ${optionQuality.modifiedItems}\nOption-repaired families: ${optionQuality.modifiedFamilies}\nAnswer positions A/B/C/D: ${positions.join(' / ')}\nSpatial shortest-grid-path diagrams: ${spatialDiagrams.length}\nExported: ${exportedAt}\n\nFiles:\n- QB4-5124-clarity-v3.json       : metadata + validation + all 5,124 fully expanded items\n- QB4-5124-items-clarity-v3.json : bare array of all 5,124 items\n- QB4-5124-clarity-v3.csv        : spreadsheet-friendly flat export\n\nClarity v3 follows construct-preserving clarity: clarify conventions that prevent legitimate alternate readings, but keep the reasoning step out of the prompt. Option Quality v3 repairs only targeted option flaws, then answer positions are rebalanced exactly.\n\nThis export reflects the website runtime order:\n${runtimeFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nImportant: easy / medium / hard are design targets, not population-calibrated psychometric parameters.\n`;
fs.writeFileSync(path.join(OUT, 'README.txt'), readme);

console.log(`QB4 Clarity v3 export PASS: ${bank.length} items`);
console.log(`Clarity: ${clarity.modifiedItems} items / ${clarity.modifiedFamilies} families`);
console.log(`Option Quality: ${optionQuality.modifiedItems} items / ${optionQuality.modifiedFamilies} families`);
console.log(`A/B/C/D: ${positions.join('/')}`);
console.log(`Spatial SVG items: ${spatialDiagrams.length}`);
console.log(`Output: ${OUT}`);
