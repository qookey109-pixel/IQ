const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const runtime = ['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js','qb5-verbal-surface-expansion.js','qb5-42-form.js'];
const store = {};
const domains = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
const historyKey = 'cognitive-iq-lab:form-history:QB-2026.09.5:42';

function runForm() {
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
  for (const file of runtime) vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename:file});
  return window;
}

const first = runForm();
assert.strictEqual(first.IQ_BANK_VALIDATION.ok, true, first.IQ_BANK_VALIDATION.errors.join('\n'));
assert.strictEqual(first.IQ_BANK_META.version, 'QB-2026.09.5');
assert.strictEqual(first.IQ_BANK_META.revision, '5.0');
assert.strictEqual(first.IQ_BANK_META.taskFamilies, 42);
assert.strictEqual(first.IQ_BANK_META.semanticTemplates, 294);
assert.strictEqual(first.IQ_BANK_META.totalItems, 2058);
assert.strictEqual(first.IQ_BANK_META.spatialSvgItems, 392);
assert.strictEqual(first.IQ_BANK_META.memoryItems, 392);
assert.strictEqual(first.IQ_BANK_META.surfaceVariantsPerConstruct, 7);
assert.strictEqual(first.IQ_BANK_META.bankTopology, '294x7=2058');
assert.strictEqual(first.IQ_QUESTION_BANK.length, 2058);
assert.strictEqual(first.IQ_QUESTIONS.length, 42);
assert.strictEqual(first.IQ_BANK_VALIDATION.semanticTemplates, 294);
assert.ok(first.IQ_FORM_EQUIVALENCE_LAST);
assert.strictEqual(first.IQ_COMPACT_BANK.total,2058);
assert.strictEqual(first.IQ_COMPACT_BANK.semanticConstructs,294);
assert.strictEqual(first.IQ_COMPACT_BANK.surfacesPerConstruct,7);
assert.strictEqual(first.IQ_42_FORM.items,42);
assert.strictEqual(first.IQ_42_FORM.itemsPerDomain,7);

function signature(q){return JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].sort()]);}
const duplicateByFamily={};
for(const family of new Set(first.IQ_QUESTION_BANK.map(q=>q.taskFamily))){
  const items=first.IQ_QUESTION_BANK.filter(q=>q.taskFamily===family),sigs=new Set(items.map(signature));
  const dup=items.length-sigs.size;if(dup)duplicateByFamily[family]={items:items.length,unique:sigs.size,duplicates:dup};
}
if(first.IQ_BANK_VALIDATION.uniqueTaskSignatures!==2058)console.error('QB5 duplicate signatures by family:',JSON.stringify(duplicateByFamily,null,2));
assert.strictEqual(first.IQ_BANK_VALIDATION.uniqueTaskSignatures,2058,'QB5 production bank must not emit exact duplicate items');

for (const domain of domains) {
  const bank = first.IQ_QUESTION_BANK.filter(q => q.d === domain);
  const expectedSemantics = domain === '語文理解' ? 14 : 56;
  assert.strictEqual(new Set(bank.map(q => q.semanticKey)).size, expectedSemantics, `${domain}: semantic template count`);
  assert.strictEqual(bank.length, domain === '語文理解' ? 98 : 392, `${domain}: bank size`);
  const bySemantic=new Map();
  for(const q of bank)bySemantic.set(q.semanticKey,(bySemantic.get(q.semanticKey)||0)+1);
  assert.ok([...bySemantic.values()].every(n=>n===7),`${domain}: exactly seven concrete surfaces per semantic construct`);

  const form = first.IQ_QUESTIONS.filter(q => q.d === domain);
  assert.strictEqual(form.length,7,`${domain}: form count`);
  assert.strictEqual(form.filter(q => q.difficulty === 'easy').length,2,`${domain}: form easy`);
  assert.strictEqual(form.filter(q => q.difficulty === 'medium').length,3,`${domain}: form medium`);
  assert.strictEqual(form.filter(q => q.difficulty === 'hard').length,2,`${domain}: form hard`);
  assert.strictEqual(new Set(form.map(q => q.taskFamily)).size,7,`${domain}: all seven task families represented`);
}

assert.strictEqual(new Set(first.IQ_QUESTIONS.map(q => q.id)).size,42,'form must contain 42 unique item IDs');
assert.strictEqual(new Set(first.IQ_QUESTIONS.map(q => q.semanticKey)).size,42,'form must contain 42 unique semantic templates');
assert.strictEqual(first.IQ_DIVERSITY.validateForm(first.IQ_QUESTIONS).ok,true,'selected form must pass 42-item validation');

let spatial=0,memory=0,speed=0;
for (const q of first.IQ_QUESTION_BANK) {
  assert.strictEqual(q.bankVersion,'QB-2026.09.5',`${q.id}: version`);
  assert.strictEqual(q.bankRevision,'5.0',`${q.id}: revision`);
  assert.ok(q.taskFamily&&q.semanticKey&&q.taskLabel,`${q.id}: semantic metadata`);
  assert.match(q.semanticKey,new RegExp(`^${q.taskFamily}:v\\d+$`),`${q.id}: variant semantic key`);
  assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: options must be unique`);
  assert.ok(Number.isInteger(q.a)&&q.a>=0&&q.a<=3,`${q.id}: answer index`);
  assert.strictEqual(Number(q.complexityScore),q.difficulty==='hard'?3:q.difficulty==='medium'?2:1,`${q.id}: complexity tier`);
  assert.ok(Number.isFinite(Number(q.formLoad))&&q.formLoad>0,`${q.id}: form-equivalence load`);
  const timed=Number.isFinite(Number(q.limit))&&Number(q.limit)>0;
  assert.strictEqual(timed,q.d==='處理速度',`${q.id}: timing policy`);
  if(q.d==='視覺空間'){spatial++;assert.ok(String(q.visual||'').includes('<svg'),`${q.id}: spatial SVG`);}
  if(q.d==='工作記憶'){memory++;assert.strictEqual(q.type,'memory',`${q.id}: memory type`);assert.ok(q.stim,`${q.id}: memory stimulus`);}
  if(q.d==='處理速度')speed++;
  if(q.type==='matrix')assert.strictEqual(q.cells.length,9,`${q.id}: matrix cell count`);
}
assert.strictEqual(spatial,392);
assert.strictEqual(memory,392);
assert.strictEqual(speed,392);

for(let run=2;run<=12;run++){
  const w=runForm(),form=w.IQ_QUESTIONS;
  assert.strictEqual(w.IQ_DIVERSITY.validateForm(form).ok,true,`form ${run}: validation`);
  assert.strictEqual(new Set(form.map(q=>q.id)).size,42,`form ${run}: unique IDs`);
  assert.ok(w.IQ_FORM_EQUIVALENCE_LAST&&w.IQ_FORM_EQUIVALENCE_LAST.maxAbsPct<=20,`form ${run}: equivalence guardrail`);
  for(const d of domains)assert.strictEqual(new Set(form.filter(q=>q.d===d).map(q=>q.taskFamily)).size,7,`form ${run}/${d}: complete family coverage`);
}
const history=JSON.parse(store[historyKey]||'[]');
assert.strictEqual(history.length,8,'history must retain only the most recent eight QB5 42-item forms');
assert.ok(history.every(form=>Array.isArray(form)&&form.length===42));

console.log('Question Bank QB5 42-item production validation PASS');
console.log('2,058 items = 294 semantic constructs × 7 concrete surfaces; 42 families; 392 spatial SVG items; 392 working-memory items; 42-item forms cover all seven families per domain.');