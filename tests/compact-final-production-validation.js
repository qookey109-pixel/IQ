const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js','presentation-clarity.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK,form=window.IQ_QUESTIONS,meta=window.IQ_BANK_META;
assert.strictEqual(bank.length,1764,'final production bank must contain exactly 1,764 items');
assert.strictEqual(meta.totalItems,1764);
assert.strictEqual(meta.semanticTemplates,294);
assert.strictEqual(meta.surfaceVariantsPerConstruct,6);
assert.strictEqual(meta.bankTopology,'294x6=1764');
assert.strictEqual(window.IQ_COMPACT_BANK.total,1764);
assert.strictEqual(window.IQ_COMPACT_BANK.semanticConstructs,294);
assert.strictEqual(window.IQ_COMPACT_BANK.surfacesPerConstruct,6);

const semanticCounts=new Map();
for(const q of bank)semanticCounts.set(q.semanticKey,(semanticCounts.get(q.semanticKey)||0)+1);
assert.strictEqual(semanticCounts.size,294);
assert.ok([...semanticCounts.values()].every(n=>n===6),'every semantic construct must retain exactly six concrete surfaces');

const domainExpected=new Map([['語文理解',84],['流體推理',336],['視覺空間',336],['工作記憶',336],['處理速度',336],['量化推理',336]]);
for(const [domain,count] of domainExpected)assert.strictEqual(bank.filter(q=>q.d===domain).length,count,`${domain}: final item count`);
const families=[...new Set(bank.map(q=>q.taskFamily))];
assert.strictEqual(families.length,42);
for(const family of families){
  const items=bank.filter(q=>q.taskFamily===family);
  assert.strictEqual(items.length,items[0].d==='語文理解'?12:48,`${family}: balanced family count`);
}

const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);
assert.strictEqual(new Set(bank.map(sig)).size,1764,'all final concrete item signatures must be unique');
const positions=[0,0,0,0],bad=[];
const marker=/·\d+$/,floatArtifact=/-?\d+\.\d{6,}/,invalid=/\b(?:NaN|Infinity|undefined|null)\b/;
for(const q of bank){
  if(!Array.isArray(q.o)||q.o.length!==4||new Set(q.o.map(String)).size!==4)bad.push(`${q.id}:choices`);
  if(!Number.isInteger(q.a)||q.a<0||q.a>3)bad.push(`${q.id}:answer-index`);
  else {positions[q.a]++;if(String(q.o[q.a])!==String(q.correctContent))bad.push(`${q.id}:binding`);}
  const text=[q.q,q.e,q.stim||'',...(q.o||[])].join(' ');
  if(marker.test(String(q.correctContent))||(q.o||[]).some(x=>marker.test(String(x))))bad.push(`${q.id}:synthetic-marker`);
  if(floatArtifact.test(text))bad.push(`${q.id}:float-artifact`);
  if(invalid.test(text))bad.push(`${q.id}:invalid-literal`);
}
assert.deepStrictEqual(bad,[],'final production hygiene must remain clean');
assert.deepStrictEqual(positions,[441,441,441,441],'1,764-item bank must balance A/B/C/D exactly');

const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,336);
assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')&&String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"')&&q.spatialReliability==='SRI-2026.09.1'));
const memory=bank.filter(q=>q.d==='工作記憶');
assert.strictEqual(memory.length,336);
assert.ok(memory.every(q=>q.type==='memory'&&String(q.stim||'').trim().length>0&&q.limit==null));
assert.ok(memory.every(q=>!/\d{3,}/.test(String(q.stim||''))),'working-memory stimuli must stay at low reading/numeric burden');
const speed=bank.filter(q=>q.d==='處理速度');
assert.strictEqual(speed.length,336);
assert.ok(speed.every(q=>Number(q.limit)===18&&q.processingSpeedIntegrity==='PSI-2026.09.1'));

assert.strictEqual(meta.memoryIntegrity,'WMI-2026.09.1');
assert.strictEqual(meta.hardConstructIntegrity,'HCI-2026.09.1');
assert.strictEqual(meta.processingSpeedIntegrity,'PSI-2026.09.1');
assert.strictEqual(meta.memoryUsability,'MUI-2026.09.2');
assert.strictEqual(meta.spatialReliability,'SRI-2026.09.1');
assert.strictEqual(meta.fullBankSweep,'FBQ-2026.09.1');
assert.strictEqual(meta.fullBankPolish,'FBP-2026.09.1');
assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT.totalItems,1764);
assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT.cueRiskItems,0);
assert.deepStrictEqual(Array.from(window.IQ_OPTION_QUALITY_REPORT.correctPositionCounts),positions);
assert.strictEqual(window.IQ_FULL_BANK_SWEEP.totalItems,1764);

assert.strictEqual(form.length,30);
assert.strictEqual(new Set(form.map(q=>q.id)).size,30);
const bankIds=new Set(bank.map(q=>q.id));
assert.ok(form.every(q=>bankIds.has(q.id)),'every selected form item must belong to the compact final bank');
for(const domain of domainExpected.keys()){
  const group=form.filter(q=>q.d===domain);
  assert.strictEqual(group.length,5,`${domain}: form quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='easy').length,2,`${domain}: easy quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='medium').length,2,`${domain}: medium quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='hard').length,1,`${domain}: hard quota`);
  assert.strictEqual(new Set(group.map(q=>q.taskFamily)).size,5,`${domain}: family diversity`);
}
assert.strictEqual(window.IQ_DIVERSITY.validateForm(form).ok,true);
assert.ok(window.IQ_FORM_EQUIVALENCE_LAST&&window.IQ_FORM_EQUIVALENCE_LAST.maxAbsPct<=20);

console.log('QB5 compact final-production validation PASS');
console.log('1,764 = 294 constructs × 6 surfaces; 42 families; A/B/C/D = 441/441/441/441; spatial=336; memory=336; speed=336; final production hygiene/integrity/form gates PASS.');