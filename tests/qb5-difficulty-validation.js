const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','processing-speed-integrity.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(window.IQ_BANK_META.semanticTemplates,294);
assert.strictEqual(window.IQ_BANK_META.formEquivalence,'64-candidate-design-load-matching');
assert.strictEqual(window.IQ_BANK_META.processingSpeedIntegrity,'PSI-2026.09.1');

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

// Processing speed must become harder through scan length / visual similarity,
// not hidden sequence induction, divisibility, digit-sum arithmetic, or multi-step math.
const speed=bank.filter(q=>q.d==='處理速度');
assert.strictEqual(speed.length,1008);
assert.ok(speed.every(q=>Number(q.limit)===18&&q.processingSpeedIntegrity==='PSI-2026.09.1'));
const leak=/依序重複|每次加|每次乘|差值依序|運算依序|除以\s*[347]|各位數字和|反向數字的差|可被\s*[347]|×2|−3/;
assert.ok(speed.every(q=>!leak.test(String(q.q||''))),'speed items must not require hidden induction or arithmetic shortcuts');
const avg=(family,difficulty,measure)=>{const xs=speed.filter(q=>q.taskFamily===family&&q.difficulty===difficulty);return xs.reduce((s,q)=>s+measure(q),0)/xs.length;};
const tiers=['easy','medium','hard'];
const measures={
  'speed-exact':q=>(q.q.match(/「([^」]+)」/)||['',''])[1].length,
  'speed-pair-equality':q=>String(q.o[q.a]).split('/')[0].trim().length,
  'speed-order':q=>String(q.o[q.a]).split('·').length,
  'speed-missing':q=>(q.q.match(/標準集合為 (.+?)；/)||['',''])[1].split('、').filter(Boolean).length,
  'speed-count':q=>String(q.q).split('：').at(-1).trim().split(/\s+/).length,
  'speed-parity':q=>String(q.o[q.a]).length
};
for(const [family,measure] of Object.entries(measures)){
  const vals=tiers.map(d=>avg(family,d,measure));
  assert.ok(vals[0]<vals[1]&&vals[1]<vals[2],`${family}: scan load must increase with tier (${vals.join(' < ')})`);
}
for(const q of bank.filter(q=>q.taskFamily==='speed-pair-equality')){
  const hits=q.o.filter(x=>{const [a,b]=String(x).split('/').map(s=>s.trim());return a===b;});
  assert.strictEqual(hits.length,1,`${q.id}: exactly one identical pair`);
}

// Hard quantitative variants must carry real multi-step/inference load. These gates
// deliberately inspect the production wording so a later language pass cannot
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
console.log('Production runtime: 294 templates; construct-linked tiers; perceptual speed-load gates; increasing memory/search load; 1,008 spatial SVG items.');