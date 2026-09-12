const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js'];
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

for(const q of bank.filter(q=>q.taskFamily==='matrix-difference')){
  assert.ok(!/第三格等於|相加|相減|相乘|平均/.test(q.q),`${q.id}: matrix stem must not reveal rule`);
  assert.ok(q.e.length>q.q.length/4,`${q.id}: solution belongs in explanation`);
}

console.log('QB5 difficulty / construct-expansion validation PASS');
console.log('Production runtime: 294 templates; construct-linked tiers; increasing memory/search load; 1,008 spatial SVG items.');
