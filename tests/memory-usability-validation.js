const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store={},window={addEventListener(){}};const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js'];for(const f of runtime)vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const bank=window.IQ_QUESTION_BANK,memory=bank.filter(q=>q.d==='工作記憶');const covered=['memory-position','memory-pair','memory-filter','memory-relative','memory-reorder'];
assert.strictEqual(window.IQ_MEMORY_USABILITY?.version,'MUI-2026.09.2');assert.strictEqual(window.IQ_MEMORY_USABILITY?.total,720);assert.strictEqual(window.IQ_BANK_META?.memoryUsability,'MUI-2026.09.2');for(const f of covered)assert.strictEqual(window.IQ_MEMORY_USABILITY.families[f],144,`${f}: 144 rewritten items`);
assert.ok(memory.every(q=>q.limit==null),'working-memory answers must remain untimed');assert.ok(memory.every(q=>!/\d{3,}/.test(String(q.stim||''))),'no 3+ digit reading load in memory stimuli');
const expected={
  'memory-position':{easy:4,medium:5,hard:6},
  'memory-pair':{easy:3,medium:4,hard:5},
  'memory-filter':{easy:3,medium:4,hard:5},
  'memory-relative':{easy:5,medium:6,hard:7},
  'memory-reorder':{easy:4,medium:5,hard:6}
};
function two(s){return /^\d{2}$/.test(String(s));}function arrow(s){return String(s).split('→').map(x=>x.trim());}
function applyRule(vals,rule){if(rule==='把第一個移到最後')return [...vals.slice(1),vals[0]];if(rule==='把最後一個移到最前')return [vals.at(-1),...vals.slice(0,-1)];if(rule==='整列反轉')return [...vals].reverse();if(rule==='交換前兩個')return [vals[1],vals[0],...vals.slice(2)];if(rule==='交換第二個與倒數第二個'){const out=[...vals],j=out.length-2;[out[1],out[j]]=[out[j],out[1]];return out;}if(rule==='把前兩個整組移到最後')return [...vals.slice(2),...vals.slice(0,2)];if(rule==='第一個不動，其餘反轉')return [vals[0],...vals.slice(1).reverse()];if(rule==='把最後兩個整組移到最前')return [...vals.slice(-2),...vals.slice(0,-2)];throw new Error(`unknown rule ${rule}`);}
for(const q of memory.filter(x=>covered.includes(x.taskFamily))){
  assert.strictEqual(q.memoryUsability,'MUI-2026.09.2',`${q.id}: v2 marker`);assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: unique options`);assert.strictEqual(String(q.o[q.a]),String(q.correctContent),`${q.id}: answer binding`);
  if(q.taskFamily==='memory-position'){
    const seq=String(q.stim).trim().split(/\s+/);assert.strictEqual(seq.length,expected[q.taskFamily][q.difficulty]);assert.ok(seq.every(two));assert.strictEqual(new Set(seq).size,seq.length);const m=q.q.match(/第 (\d+) 個項目/);assert.ok(m);assert.strictEqual(String(q.correctContent),seq[Number(m[1])-1]);assert.ok(q.o.every(two));
  }else if(q.taskFamily==='memory-pair'){
    const chunks=String(q.stim).split('　').map(x=>x.trim()),map=new Map();assert.strictEqual(chunks.length,expected[q.taskFamily][q.difficulty]);for(const c of chunks){const m=c.match(/^(\S+)\s+(\d{2})$/);assert.ok(m,`${q.id}: pair token`);map.set(m[1],m[2]);}const t=q.q.match(/「([^」]+)」/);assert.ok(t);assert.strictEqual(String(q.correctContent),map.get(t[1]));assert.ok(q.o.every(two));
  }else if(q.taskFamily==='memory-filter'){
    const tok=String(q.stim).split('　').map(x=>x.trim()),nums=tok.filter(two),names=tok.filter(x=>!two(x));assert.strictEqual(nums.length,expected[q.taskFamily][q.difficulty]);assert.strictEqual(names.length,nums.length);let kept;if(q.q.startsWith('忽略數字'))kept=names;else{assert.ok(q.q.startsWith('忽略地點'));kept=nums;}assert.strictEqual(String(q.correctContent),kept.join(' → '));if(q.q.startsWith('忽略地點'))for(const x of arrow(q.correctContent))assert.ok(two(x));
  }else if(q.taskFamily==='memory-relative'){
    const seq=String(q.stim).trim().split(/\s+/);assert.strictEqual(seq.length,expected[q.taskFamily][q.difficulty]);assert.ok(seq.every(two));const m=q.q.match(/「(\d{2})」(左|右)邊第 (\d+) 個/);assert.ok(m);const at=seq.indexOf(m[1]),dist=Number(m[3]),pos=at+(m[2]==='右'?dist:-dist);assert.ok(pos>=0&&pos<seq.length);assert.strictEqual(String(q.correctContent),seq[pos]);assert.ok(q.o.every(two));
  }else if(q.taskFamily==='memory-reorder'){
    const seq=String(q.stim).trim().split(/\s+/);assert.strictEqual(seq.length,expected[q.taskFamily][q.difficulty]);assert.ok(seq.every(two));const m=q.q.match(/「([^」]+)」/);assert.ok(m);const out=applyRule(seq,m[1]);assert.strictEqual(String(q.correctContent),out.join(' → '));for(const opt of q.o)assert.ok(arrow(opt).every(two));
  }
}
const positions=[0,0,0,0];for(const q of bank)positions[q.a]++;assert.deepStrictEqual(positions,[1281,1281,1281,1281]);const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);assert.strictEqual(new Set(bank.map(sig)).size,5124,'final concrete signatures unique');
console.log('Memory Usability Integrity v2 PASS');console.log('720 working-memory items across five families use low-reading-load two-digit stimuli; difficulty grows through span/manipulation, not digit length.');
