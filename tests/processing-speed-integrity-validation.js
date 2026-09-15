const fs=require('fs');const vm=require('vm');const assert=require('assert');
const store={},window={addEventListener(){}};const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js'];for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK,speed=bank.filter(q=>q.d==='處理速度');assert.strictEqual(bank.length,5124);assert.strictEqual(speed.length,1008);assert.strictEqual(window.IQ_PROCESSING_SPEED_INTEGRITY?.version,'PSI-2026.09.1');assert.strictEqual(window.IQ_PROCESSING_SPEED_INTEGRITY?.total,1008);assert.strictEqual(window.IQ_BANK_META?.processingSpeedIntegrity,'PSI-2026.09.1');
for(const fam of ['speed-exact','speed-count','speed-pair-equality','speed-parity','speed-order','speed-boundary','speed-missing'])assert.strictEqual(window.IQ_PROCESSING_SPEED_INTEGRITY.families[fam],144,`${fam}: 144 rewritten items`);
const forbidden=/依序重複|每次加|每次乘|差值依序|運算依序|除以\s*[347]|各位數字和|反向數字的差|可被\s*[347]|×2|−3/;assert.ok(speed.every(q=>Number(q.limit)===18),'only genuine speed items keep the 18-second clock');assert.ok(speed.every(q=>!forbidden.test(String(q.q||''))),'no sequence-rule leakage or arithmetic-load wording remains');assert.ok(speed.every(q=>q.processingSpeedIntegrityReason),'all speed items covered by PSI');
const timedOutsideSpeed=bank.filter(q=>q.d!=='處理速度'&&Number.isFinite(Number(q.limit))&&Number(q.limit)>0);assert.strictEqual(timedOutsideSpeed.length,0,'only processing-speed response items may have a hard countdown');
const missingSpeed=speed.filter(q=>q.taskFamily==='speed-missing');assert.ok(missingSpeed.every(q=>q.taskLabel==='缺漏比對'&&!/找缺項|依序重複|×2|−3/.test(String(q.q||''))),'speed-missing must remain a reference-scan task, not a revealed sequence puzzle');
function splitRow(x){return String(x).split('·').map(s=>s.trim());}function exactlyOne(q,pred){const hits=q.o.map((x,i)=>pred(String(x),q,i)).filter(Boolean);return hits.length===1&&pred(String(q.o[q.a]),q,q.a);}
for(const q of speed){
  assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: unique options`);assert.strictEqual(String(q.o[q.a]),String(q.correctContent),`${q.id}: answer binding`);
  const v=Number(q.constructVariant);
  if(q.taskFamily==='speed-exact'){
    const m=q.q.match(/「([^」]+)」/);assert.ok(m,`${q.id}: target code`);assert.strictEqual(String(q.o[q.a]),m[1],`${q.id}: exact target`);assert.ok(exactlyOne(q,x=>x===m[1]),`${q.id}: unique exact match`);
  }else if(q.taskFamily==='speed-count'){
    const m=q.q.match(/「(.+?)」共有幾個：(.+)$/);assert.ok(m,`${q.id}: count parse`);const count=m[2].trim().split(/\s+/).filter(x=>x===m[1]).length;assert.strictEqual(Number(q.o[q.a]),count,`${q.id}: independent count`);
  }else if(q.taskFamily==='speed-pair-equality'){
    const same=x=>{const [a,b]=x.split('/').map(s=>s.trim());return a===b;};assert.ok(exactlyOne(q,same),`${q.id}: one equal pair`);
  }else if(q.taskFamily==='speed-parity'){
    let pred;if(q.q.includes('末位是奇數'))pred=x=>Number(x.at(-1))%2===1;else if(q.q.includes('末位是偶數'))pred=x=>Number(x.at(-1))%2===0;else {let m=q.q.match(/個位數是 (\d)/);if(m)pred=x=>x.endsWith(m[1]);else {m=q.q.match(/末兩位是 (\d{2})/);assert.ok(m,`${q.id}: suffix parse`);pred=x=>x.endsWith(m[1]);}}assert.ok(exactlyOne(q,pred),`${q.id}: unique suffix target`);
  }else if(q.taskFamily==='speed-order'){
    const pred=x=>{const a=splitRow(x);if(q.q.includes('字母'))return a.every((z,i)=>i===0||a[i-1]<z);const nums=a.map(Number);if(q.q.includes('小到大'))return nums.every((z,i)=>i===0||nums[i-1]<z);return nums.every((z,i)=>i===0||nums[i-1]>z);};assert.ok(exactlyOne(q,pred),`${q.id}: unique ordered row`);
  }else if(q.taskFamily==='speed-boundary'){
    const pred=x=>{if(v===1)return x.startsWith('M')&&x.endsWith('T');if(v===2)return x.startsWith('K')&&x.endsWith('7');if(v===3)return x[1]==='Q';if(v===4)return x.includes('X')&&x.endsWith('5');if(v===5)return x[0]===x.at(-1);if(v===6)return /^\d/.test(x)&&/[A-Z]$/.test(x);if(v===7)return x.startsWith('M')&&x.endsWith('M')&&x.slice(1,-1).includes('X');return x[1]!=='Q'&&x.at(-2)==='Q';};assert.ok(exactlyOne(q,pred),`${q.id}: unique positional match`);
  }else if(q.taskFamily==='speed-missing'){
    const m=q.q.match(/標準集合為 (.+?)；畫面列出 (.+?)。少了哪一項？$/);assert.ok(m,`${q.id}: omission parse`);const ref=m[1].split('、'),shown=new Set(m[2].split('、')),diff=ref.filter(x=>!shown.has(x));assert.deepStrictEqual(diff,[String(q.o[q.a])],`${q.id}: independent missing item`);
  }
}
const tiers=['easy','medium','hard'];function avg(fam,metric,d){const xs=speed.filter(q=>q.taskFamily===fam&&q.difficulty===d);return xs.reduce((s,q)=>s+metric(q),0)/xs.length;}
const exactLen=q=>(q.q.match(/「([^」]+)」/)||['',''])[1].length;const pairLen=q=>String(q.o[q.a]).split('/')[0].trim().length;const orderLen=q=>splitRow(q.o[q.a]).length;const missingLen=q=>(q.q.match(/標準集合為 (.+?)；/)||['',''])[1].split('、').filter(Boolean).length;const countLen=q=>String(q.q).split('：').at(-1).trim().split(/\s+/).length;const parityLen=q=>String(q.o[q.a]).length;
for(const [fam,metric] of [['speed-exact',exactLen],['speed-pair-equality',pairLen],['speed-order',orderLen],['speed-missing',missingLen],['speed-count',countLen],['speed-parity',parityLen]]){const vals=tiers.map(d=>avg(fam,metric,d));assert.ok(vals[0]<vals[1]&&vals[1]<vals[2],`${fam}: difficulty must increase scan load (${vals.join(' < ')})`);}
const positions=[0,0,0,0];for(const q of bank)positions[q.a]++;assert.deepStrictEqual(positions,[1281,1281,1281,1281]);const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);assert.strictEqual(new Set(bank.map(sig)).size,5124,'final signatures remain unique');assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT?.cueRiskItems,0,'final option audit clean');
console.log('Processing Speed Integrity v1 PASS');console.log(JSON.stringify(window.IQ_PROCESSING_SPEED_INTEGRITY));
