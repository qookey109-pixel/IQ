const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js','qb5-verbal-surface-expansion.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js','spatial-task-refinement.js','presentation-clarity.js','qb5-42-form.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK,form=window.IQ_QUESTIONS,meta=window.IQ_BANK_META;
assert.strictEqual(bank.length,2058,'final production bank must contain exactly 2,058 items');
assert.strictEqual(meta.totalItems,2058);
assert.strictEqual(meta.semanticTemplates,294);
assert.strictEqual(meta.surfaceVariantsPerConstruct,7);
assert.strictEqual(meta.bankTopology,'294x7=2058');
assert.strictEqual(meta.selectedItems,42);
assert.strictEqual(window.IQ_COMPACT_BANK.total,2058);
assert.strictEqual(window.IQ_COMPACT_BANK.semanticConstructs,294);
assert.strictEqual(window.IQ_COMPACT_BANK.surfacesPerConstruct,7);
assert.strictEqual(window.IQ_42_FORM.items,42);

const semanticCounts=new Map();
for(const q of bank)semanticCounts.set(q.semanticKey,(semanticCounts.get(q.semanticKey)||0)+1);
assert.strictEqual(semanticCounts.size,294);
assert.ok([...semanticCounts.values()].every(n=>n===7),'every semantic construct must retain exactly seven concrete surfaces');

const domainExpected=new Map([['語文理解',98],['流體推理',392],['視覺空間',392],['工作記憶',392],['處理速度',392],['量化推理',392]]);
for(const [domain,count] of domainExpected)assert.strictEqual(bank.filter(q=>q.d===domain).length,count,`${domain}: final item count`);
const families=[...new Set(bank.map(q=>q.taskFamily))];
assert.strictEqual(families.length,42);
for(const family of families){
  const items=bank.filter(q=>q.taskFamily===family);
  assert.strictEqual(items.length,items[0].d==='語文理解'?14:56,`${family}: balanced family count`);
}

const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);
assert.strictEqual(new Set(bank.map(sig)).size,2058,'all final concrete item signatures must be unique');
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
assert.strictEqual(positions.reduce((a,b)=>a+b,0),2058);
assert.ok(Math.max(...positions)-Math.min(...positions)<=1,`2,058-item bank answer positions must be near-even: ${positions.join('/')}`);

const pairing=bank.filter(q=>q.taskFamily==='pairing-capacity');
const pairingV1=pairing.filter(q=>Number(q.constructVariant)===1);
assert.ok(pairingV1.every(q=>q.q.includes('每把鎖也最多配一把鑰匙')),
  'production one-to-one pairing must state the lock-side uniqueness constraint');
const pairingV2=pairing.filter(q=>Number(q.constructVariant)===2);
assert.ok(pairingV2.every(q=>q.q.includes('其餘鑰匙可各自配到不同的鎖')&&q.q.includes('每把鎖與每把鑰匙都只能用一次')),
  'production unusable-key items must make distinct matching assumptions explicit');
const pairingV3=pairing.filter(q=>Number(q.constructVariant)===3);
assert.ok(pairingV3.every(q=>q.q.includes('每把鎖與每把鑰匙都只能用一次')),
  'production typed matching items must state that both sides are single-use');
const pairingV5=pairing.filter(q=>Number(q.constructVariant)===5);
assert.ok(pairingV5.every(q=>q.q.includes('每件只能放入一個')),
  'production capacity items must state that objects cannot be counted twice');
const pairingV6=pairing.filter(q=>Number(q.constructVariant)===6);
assert.ok(pairingV6.every(q=>q.q.includes('保留席')&&q.q.includes('不開放給現場一般觀眾')),
  'production reserved-seat items must state who cannot use reserved capacity');


const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,392);
assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')&&String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"')&&q.spatialReliability==='SRI-2026.09.1'));
assert.strictEqual(meta.spatialTaskRefinement,'STR-2026.09.2');
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT.total,168);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT.gridDisplacement,56);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT.mirrorCoordinate,56);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT.scaleDrawing,56);
assert.ok(bank.filter(q=>q.taskFamily==='grid-displacement').every(q=>q.spatialTaskRefinement==='STR-2026.09.2'&&q.spatialIntegrityData?.endpointCoordinatesShown===false));
assert.ok(bank.filter(q=>q.taskFamily==='mirror-coordinate').every(q=>q.spatialTaskRefinement==='STR-2026.09.2'&&q.spatialIntegrityData?.axesLabeled===true));
assert.ok(bank.filter(q=>q.taskFamily==='scale-drawing').every(q=>q.spatialTaskRefinement==='STR-2026.09.2'&&q.spatialIntegrityData?.translationExplicit===true));
const memory=bank.filter(q=>q.d==='工作記憶');
assert.strictEqual(memory.length,392);
assert.ok(memory.every(q=>q.type==='memory'&&String(q.stim||'').trim().length>0&&q.limit==null));
assert.ok(memory.every(q=>!/\d{3,}/.test(String(q.stim||''))),'working-memory stimuli must stay at low reading/numeric burden');
const speed=bank.filter(q=>q.d==='處理速度');
assert.strictEqual(speed.length,392);
assert.ok(speed.every(q=>Number(q.limit)===18&&q.processingSpeedIntegrity==='PSI-2026.09.1'));

assert.strictEqual(meta.memoryIntegrity,'WMI-2026.09.1');
assert.strictEqual(meta.hardConstructIntegrity,'HCI-2026.09.1');
assert.strictEqual(meta.processingSpeedIntegrity,'PSI-2026.09.1');
assert.strictEqual(meta.memoryUsability,'MUI-2026.09.2');
assert.strictEqual(meta.spatialReliability,'SRI-2026.09.1');
assert.strictEqual(meta.fullBankSweep,'FBQ-2026.09.1');
assert.strictEqual(meta.fullBankPolish,'FBP-2026.09.2');
assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT.totalItems,2058);
assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT.cueRiskItems,0);

const matrices=bank.filter(q=>q.taskFamily==='matrix-difference');
assert.strictEqual(matrices.length,56);
assert.ok(matrices.every(q=>q.matrixClarityVersion==='MC-2026.09.1'&&q.cells?.length===12&&q.cells[11]==='?'));

assert.strictEqual(form.length,42);
assert.strictEqual(new Set(form.map(q=>q.id)).size,42);
const bankIds=new Set(bank.map(q=>q.id));
assert.ok(form.every(q=>bankIds.has(q.id)),'every selected form item must belong to the final bank');
for(const domain of domainExpected.keys()){
  const group=form.filter(q=>q.d===domain);
  assert.strictEqual(group.length,7,`${domain}: form quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='easy').length,2,`${domain}: easy quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='medium').length,3,`${domain}: medium quota`);
  assert.strictEqual(group.filter(q=>q.difficulty==='hard').length,2,`${domain}: hard quota`);
  assert.strictEqual(new Set(group.map(q=>q.taskFamily)).size,7,`${domain}: complete family coverage`);
}
assert.strictEqual(window.IQ_DIVERSITY.validateForm(form).ok,true);
assert.ok(window.IQ_FORM_EQUIVALENCE_LAST&&window.IQ_FORM_EQUIVALENCE_LAST.maxAbsPct<=20);

console.log('QB5 42-item final-production validation PASS');
console.log(`2,058 = 294 constructs × 7 surfaces; 42 families; answer positions=${positions.join('/')}; spatial=392; coordinate/transform refinement=168; matrix clarity=56; memory=392; speed=392; production form=42 with all seven families/domain.`);
