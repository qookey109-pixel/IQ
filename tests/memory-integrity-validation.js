const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,5124);
assert.strictEqual(window.IQ_MEMORY_INTEGRITY?.version,'WMI-2026.09.1');
assert.strictEqual(window.IQ_BANK_META?.memoryIntegrity,'WMI-2026.09.1');
for(const key of ['position','pair','filter','recognition','relative','reorder'])assert.strictEqual(window.IQ_MEMORY_INTEGRITY[key],144,`${key}: expected 144 rewritten items`);

const split=q=>String(q.stim||'').trim().split(/[\s　]+/).filter(Boolean);
const monotonic=vals=>vals.length>1&&(vals.every((x,i)=>i===0||x>vals[i-1])||vals.every((x,i)=>i===0||x<vals[i-1]));
const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);

for(const q of bank.filter(q=>q.taskFamily==='memory-position')){
  const vals=split(q).map(Number),m=String(q.q).match(/第\s*(\d+)\s*個/);assert.ok(m);assert.ok(!monotonic(vals),`${q.id}: position stimulus must not reveal order by magnitude`);
  assert.strictEqual(String(vals[Number(m[1])-1]),String(q.correctContent),`${q.id}: position answer`);
}
for(const q of bank.filter(q=>q.taskFamily==='memory-pair')){
  const pairs=String(q.stim).split('　').map(x=>{const m=x.match(/^(.+?)\s+(\d+)$/);assert.ok(m,`${q.id}: pair format`);return [m[1],m[2]];}),target=String(q.q).match(/「([^」]+)」/)?.[1];
  const found=pairs.find(x=>x[0]===target);assert.ok(found,`${q.id}: pair target`);assert.strictEqual(found[1],String(q.correctContent),`${q.id}: paired value`);
}
for(const q of bank.filter(q=>q.taskFamily==='memory-filter')){
  const tok=split(q),nums=[],locs=[];for(let i=0;i<tok.length;i+=2){nums.push(Number(tok[i]));locs.push(tok[i+1]);}
  assert.ok(!monotonic(nums),`${q.id}: filter numbers must not advertise the correct order`);
  const asksPlaces=String(q.q).startsWith('忽略數字，只回憶剛才出現的地點'),asksNumbers=String(q.q).startsWith('忽略地點，只回憶剛才出現的數字');
  assert.notStrictEqual(asksPlaces,asksNumbers,`${q.id}: filter instruction must unambiguously name the retained stream`);
  const expected=(asksPlaces?locs:nums.map(String)).join(' → ');assert.strictEqual(String(q.correctContent),expected,`${q.id}: filter answer must follow the retained stream, not a shared keyword heuristic`);
}
for(const q of bank.filter(q=>q.taskFamily==='memory-recognition')){
  const stim=split(q),correct=String(q.correctContent),wrong=q.o.filter((_,i)=>i!==q.a).map(String);
  assert.ok(q.o.every(x=>/^[A-T]\d$/.test(String(x))),`${q.id}: recognition options must share the same plausible code alphabet`);
  if(String(q.q).includes('沒有出現')){assert.ok(!stim.includes(correct),`${q.id}: novel answer must be absent`);assert.ok(wrong.every(x=>stim.includes(x)),`${q.id}: recognition distractors must be seen items`);}
  else {assert.ok(stim.includes(correct),`${q.id}: seen answer must be present`);assert.ok(wrong.every(x=>!stim.includes(x)),`${q.id}: seen-item distractors must be plausible unseen codes`);}
}
for(const q of bank.filter(q=>q.taskFamily==='memory-relative')){
  const vals=split(q).map(Number),m=String(q.q).match(/「(\d+)」.*?(左|右)邊第\s*(\d+)\s*個/);assert.ok(m,`${q.id}: relative stem`);assert.ok(!monotonic(vals),`${q.id}: relative stimulus must not reveal direction by magnitude`);
  const target=Number(m[1]),dir=m[2],dist=Number(m[3]),k=vals.indexOf(target);assert.ok(k>=0);const ai=k+(dir==='右'?dist:-dist);assert.ok(ai>=0&&ai<vals.length);assert.strictEqual(String(vals[ai]),String(q.correctContent),`${q.id}: relative answer`);
}
function reorder(vals,v){if(v===0)return [...vals.slice(1),vals[0]];if(v===1)return [vals.at(-1),...vals.slice(0,-1)];if(v===2)return [...vals].reverse();if(v===3)return [vals[1],vals[0],...vals.slice(2)];if(v===4){const out=[...vals],j=out.length-2;[out[1],out[j]]=[out[j],out[1]];return out;}if(v===5)return [...vals.slice(2),...vals.slice(0,2)];if(v===6)return [vals[0],...vals.slice(1).reverse()];return [...vals.slice(-2),...vals.slice(0,-2)];}
for(const q of bank.filter(q=>q.taskFamily==='memory-reorder')){
  const vals=split(q).map(Number);assert.ok(!monotonic(vals),`${q.id}: reorder stimulus must not disclose transformation by sorted shape`);assert.strictEqual(reorder(vals,variant(q)).join(' → '),String(q.correctContent),`${q.id}: reorder answer`);
}
const positions=[0,0,0,0];for(const q of bank)positions[q.a]++;assert.deepStrictEqual(positions,[1281,1281,1281,1281],'memory integrity must preserve exact A/B/C/D balance');
assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT?.cueRiskItems,0,'memory integrity must leave zero option-audit cue flags');
console.log('Working Memory Integrity v1 PASS');
console.log('864 final memory items rewritten; 144 filter items independently parse retained stream semantics; no monotonic/outlier shortcuts remain.');