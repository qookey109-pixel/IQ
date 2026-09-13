const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=[
  'question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js',
  'qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js',
  'natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','presentation-clarity.js'
];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,5124);
assert.strictEqual(window.IQ_FULL_BANK_SWEEP?.version,'FBQ-2026.09.1');
assert.strictEqual(window.IQ_BANK_META?.fullBankSweep,'FBQ-2026.09.1');

const marker=/·\d+$/;
const floatArtifact=/-?\d+\.\d{6,}/;
const badLiteral=/\b(?:NaN|Infinity|undefined|null)\b/;
const artificial=/這組資料為情境|的這個案例中|快速掃描組中|規則機器|的紀錄中，句子/;
const positions=[0,0,0,0];
const compact=v=>Array.from(String(v).replace(/\s/g,'')).length;
let uniqueLongest=0,uniqueShortest=0;
const familyCue={};

for(const q of bank){
  assert.ok(Array.isArray(q.o)&&q.o.length===4,`${q.id}: exactly four options required`);
  assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: options must be unique`);
  assert.ok(Number.isInteger(q.a)&&q.a>=0&&q.a<4,`${q.id}: valid answer index required`);
  assert.strictEqual(String(q.o[q.a]),String(q.correctContent),`${q.id}: visible answer must match correctContent`);
  positions[q.a]++;

  const allText=[q.q,q.e,q.stim||'',...(q.o||[])].map(x=>String(x??''));
  assert.ok(!q.o.some(x=>marker.test(String(x))),`${q.id}: synthetic ·N dedupe marker leaked to an option`);
  assert.ok(!allText.some(x=>floatArtifact.test(x)),`${q.id}: floating-point artifact leaked to user-facing text`);
  assert.ok(!allText.some(x=>badLiteral.test(x)),`${q.id}: invalid program literal leaked to user-facing text`);
  assert.ok(!artificial.test(String(q.q||'')),`${q.id}: artificial template wrapper returned`);

  const lens=q.o.map(compact),ci=q.a,wrong=lens.filter((_,i)=>i!==ci);
  const longest=lens[ci]>Math.max(...wrong),shortest=lens[ci]<Math.min(...wrong);
  if(longest)uniqueLongest++;
  if(shortest)uniqueShortest++;
  const rec=familyCue[q.taskFamily]||(familyCue[q.taskFamily]={n:0,longest:0,shortest:0});
  rec.n++;if(longest)rec.longest++;if(shortest)rec.shortest++;
}
assert.deepStrictEqual(positions,[1281,1281,1281,1281],'A/B/C/D answer-position balance must remain exact');

const reported=familyCue['reported-vs-fact'];
assert.strictEqual(reported.longest,0,'reported-vs-fact must not reveal the key through the longest option');
const evidence=familyCue['evidence-strength'];
assert.strictEqual(evidence.longest,0,'evidence-strength must not reveal the key through option length');
const speedOrder=bank.filter(q=>q.taskFamily==='speed-order');
assert.ok(speedOrder.every(q=>new Set(q.o.map(compact)).size===1),'speed-order options must use the same token/length envelope');
const memoryRecognition=bank.filter(q=>q.taskFamily==='memory-recognition');
assert.ok(memoryRecognition.every(q=>new Set(q.o.map(compact)).size===1),'memory-recognition options must have equal visible width');
const speedParity=bank.filter(q=>q.taskFamily==='speed-parity');
assert.ok(speedParity.every(q=>new Set(q.o.map(x=>String(Math.abs(Math.trunc(Number(x)))).length)).size===1),'speed-parity options must use the same digit width');
const memoryReorder=bank.filter(q=>q.taskFamily==='memory-reorder');
assert.ok(memoryReorder.every(q=>q.q.startsWith('將剛才的序列依照「')),'memory-reorder wording should be direct and natural');

const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,1008);
assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')),'all spatial items must retain a diagram');
assert.ok(spatial.every(q=>String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"')),'all final spatial SVGs must be aspect-safe');

assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT?.cueRiskItems,0,'final option audit must have zero flagged cue-risk items');
console.log('Full-bank sweep validation PASS');
console.log('Items:',bank.length,'Unique-longest keys:',uniqueLongest,'Unique-shortest keys:',uniqueShortest);
console.log('Repairs:',JSON.stringify(window.IQ_FULL_BANK_SWEEP));
