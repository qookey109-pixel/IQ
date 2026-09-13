const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(window.IQ_BANK_META.semanticTemplates,294);
assert.strictEqual(window.IQ_BANK_META.formEquivalence,'64-candidate-design-load-matching');

const families=[...new Set(bank.map(q=>q.taskFamily))];
assert.strictEqual(families.length,42);
for(const family of families){
  const items=bank.filter(q=>q.taskFamily===family);
  const semantics=new Set(items.map(q=>q.semanticKey));
  const domain=items[0].d;
  assert.strictEqual(semantics.size,domain==='語文理解'?2:8,`${family}: construct archetype count`);
  if(domain!=='語文理解'){
    for(const q of items){
      const v=Number(q.constructVariant);
      const expected=v<=3?'easy':v<=6?'medium':'hard';
      assert.strictEqual(q.difficulty,expected,`${q.id}: difficulty must follow construct variant`);
      assert.strictEqual(q.complexityScore,expected==='easy'?1:expected==='medium'?2:3,`${q.id}: complexity score`);
    }
  }
}

for(const family of ['memory-position','memory-pair','memory-recognition','memory-relative','memory-reorder']){
  const groups={easy:[],medium:[],hard:[]};
  for(const q of bank.filter(x=>x.taskFamily===family)){
    const tokens=String(q.stim||'').split(/　+/).filter(Boolean);
    groups[q.difficulty].push(tokens.length);
  }
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  assert.ok(mean(groups.medium)>=mean(groups.easy),`${family}: medium span/load should not be below easy`);
  assert.ok(mean(groups.hard)>=mean(groups.medium),`${family}: hard span/load should not be below medium`);
}

const order=bank.filter(q=>q.taskFamily==='ordering-constraints');
const orderSize=q=>String(q.correctContent||'').split(' → ').filter(Boolean).length;
const easyOrder=order.filter(q=>q.difficulty==='easy').map(orderSize);
const medOrder=order.filter(q=>q.difficulty==='medium').map(orderSize);
const hardOrder=order.filter(q=>q.difficulty==='hard').map(orderSize);
assert.ok(Math.min(...medOrder)>Math.max(...easyOrder),'ordering medium must use more elements than easy');
assert.ok(Math.min(...hardOrder)>Math.max(...medOrder),'ordering hard must use more elements than medium');

const shortest=bank.filter(q=>q.taskFamily==='shortest-grid-path');
for(const q of shortest){
  assert.ok(q.diagramData && Number.isInteger(q.diagramData.size),`${q.id}: grid diagram data`);
  const expected=q.difficulty==='easy'?6:q.difficulty==='medium'?7:8;
  assert.strictEqual(q.diagramData.size,expected,`${q.id}: shortest-path grid size`);
}
const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,1008);
assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')));

const exact=bank.filter(q=>q.taskFamily==='speed-exact');
for(const q of exact){const m=q.q.match(/「([^」]+)」/);assert.ok(m);const expected=q.difficulty==='easy'?4:q.difficulty==='medium'?5:6;assert.strictEqual(m[1].length,expected,`${q.id}: speed-exact length`);}

// Pair-equality used to be eight renamed copies of the same exact-match task.
// Keep eight genuinely different scanning/filter operations and require the hard tier
// to combine conditions rather than merely lengthen the code.
const pairEq=bank.filter(q=>q.taskFamily==='speed-pair-equality');
const pairRules=[
  /左右代碼完全一致/,
  /尾字母/,
  /個位數/,
  /奇數|偶數/,
  /除以 3 餘/,
  /各位數字和/,
  /同時符合.*百位數＋個位數/,
  /同時符合.*反向數字/
];
for(let v=1;v<=8;v++){
  const items=pairEq.filter(q=>Number(q.constructVariant)===v);
  assert.strictEqual(items.length,18,`speed-pair-equality v${v}: item count`);
  assert.ok(items.every(q=>pairRules[v-1].test(String(q.q))),`speed-pair-equality v${v}: distinct rule wording`);
}
assert.ok(pairEq.every(q=>new Set(q.o.map(x=>String(x).replace(/\s/g,'').length)).size===1),'speed-pair-equality options must keep an equal visual envelope');

// Hard quantitative variants must carry real multi-step/inference load. These gates
// deliberately inspect the final production wording so a later language pass cannot
// silently collapse a hard construct back into a one-step exercise.
const hardUnit=bank.filter(q=>q.taskFamily==='quant-unit-rate'&&q.difficulty==='hard');
assert.ok(hardUnit.filter(q=>Number(q.constructVariant)===7).every(q=>/固定費/.test(q.q)&&/每公里費用/.test(q.q)&&((q.q.match(/行駛/g)||[]).length>=2)),'quant-unit-rate v7 must infer variable rate from two fixed-fee observations');
assert.ok(hardUnit.filter(q=>Number(q.constructVariant)===8).every(q=>/公尺/.test(q.q)&&/成正比/.test(q.q)),'quant-unit-rate v8 must combine proportional reasoning with unit conversion');

const hardTime=bank.filter(q=>q.taskFamily==='quant-time'&&q.difficulty==='hard');
assert.ok(hardTime.filter(q=>Number(q.constructVariant)===7).every(q=>/第一階段/.test(q.q)&&/休息/.test(q.q)&&/第二階段/.test(q.q)),'quant-time v7 must integrate multiple time segments');
assert.ok(hardTime.filter(q=>Number(q.constructVariant)===8).every(q=>/準備/.test(q.q)&&/休息/.test(q.q)&&/最後一階段/.test(q.q)),'quant-time v8 must infer an unknown segment from elapsed time');

const hardProb=bank.filter(q=>q.taskFamily==='quant-probability'&&q.difficulty==='hard');
assert.ok(hardProb.every(q=>/不放回/.test(q.q)),'hard probability variants must require without-replacement reasoning');
assert.ok(hardProb.filter(q=>Number(q.constructVariant)===8).every(q=>/第二顆/.test(q.q)),'quant-probability v8 must use positional symmetry rather than a one-draw complement');

const hardBalance=bank.filter(q=>q.taskFamily==='quant-balance'&&q.difficulty==='hard');
for(const q of hardBalance.filter(q=>Number(q.constructVariant)===7)){
  const eq=String(q.q).split('=');
  assert.strictEqual(eq.length,2,`${q.id}: quant-balance v7 equation shape`);
  assert.ok(/[A-Z]/.test(eq[0])&&/[A-Z]/.test(eq[1]),`${q.id}: quant-balance v7 must keep the unknown on both sides`);
}
assert.ok(hardBalance.filter(q=>Number(q.constructVariant)===8).every(q=>/÷/.test(q.q)&&/方程/.test(q.q)),'quant-balance v8 must require inverse operations through a grouped expression');

for(const q of bank.filter(q=>q.taskFamily==='matrix-difference')){
  assert.ok(!/第三格等於|相加|相減|相乘|平均/.test(q.q),`${q.id}: matrix stem must not reveal rule`);
  assert.ok(q.e.length>q.q.length/4,`${q.id}: solution belongs in explanation`);
}

console.log('QB5 difficulty / construct-expansion validation PASS');
console.log('Production runtime: 294 templates; construct-linked tiers; hard-construct regression gates; increasing memory/search load; 1,008 spatial SVG items.');
