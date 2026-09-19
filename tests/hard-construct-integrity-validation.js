const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK,report=window.IQ_HARD_CONSTRUCT_INTEGRITY;
assert.strictEqual(bank.length,5124);assert.strictEqual(report?.version,'HCI-2026.09.2');assert.strictEqual(window.IQ_BANK_META?.hardConstructIntegrity,'HCI-2026.09.2');
const expected={'machine-composition':36,'ordering-constraints':36,'code-deduction':36,'set-overlap':36,'invariant-transfer':36,'pairing-capacity':36,'speed-parity':36,'speed-order':36,'speed-boundary':36,'speed-missing':36,'quant-remainder':36,'scale-drawing':18,'mirror-coordinate':18};
assert.strictEqual(report.total,432);for(const [f,n] of Object.entries(expected))assert.strictEqual(report.families[f],n,`${f}: rewritten hard count`);
const answer=q=>String(q.o[q.a]);const wrong=q=>q.o.filter((_,i)=>i!==q.a).map(String);const mod=(n,m)=>((n%m)+m)%m;const dsum=x=>String(Math.abs(Number(x))).split('').reduce((s,d)=>s+Number(d),0);

for(const q of bank.filter(q=>q.taskFamily==='machine-composition'&&q.difficulty==='hard')){
  assert.ok(/已知最後/.test(q.q),`${q.id}: hard machine must require reverse/branch inference`);
  const x=Number(answer(q));
  if(q.constructVariant===7){
    const m=q.q.match(/Y = (\d+)X \+ (\d+).*Z = 2Y − (\d+).*Z = (\d+)/);
    assert.ok(m,`${q.id}: reverse two-stage wording`);
    const a=Number(m[1]),b=Number(m[2]),d=Number(m[3]),z=Number(m[4]),y=(z+d)/2;
    assert.strictEqual((y-b)/a,x,`${q.id}: reverse two-stage answer`);
  }else{
    const m=q.q.match(/Y = X \+ (\d+)；若 Y 為偶數，結果為 Y ÷ 2 \+ (\d+)；若 Y 為奇數，結果為 2Y − (\d+)。已知最後結果是 (\d+)/);
    assert.ok(m,`${q.id}: branch inference wording`);
    const b=Number(m[1]),d=Number(m[2]),d2=Number(m[3]),z=Number(m[4]);assert.strictEqual(d,d2);
    const y=x+b,out=y%2===0?y/2+d:2*y-d;
    assert.strictEqual(out,z,`${q.id}: branch-inference answer`);
    assert.ok(wrong(q).every(v=>{const xx=Number(v),yy=xx+b;return (yy%2===0?yy/2+d:2*yy-d)!==z;}),`${q.id}: distractors must fail branch output`);
  }
}

const permutations=xs=>xs.length<=1?[xs]:xs.flatMap((x,i)=>permutations([...xs.slice(0,i),...xs.slice(i+1)]).map(rest=>[x,...rest]));
for(const q of bank.filter(q=>q.taskFamily==='ordering-constraints'&&q.difficulty==='hard')){
  const m=q.q.match(/^([A-Z](?:、[A-Z]){4}) 要排成/);assert.ok(m,`${q.id}: five labels`);
  const labels=m[1].split('、'),[A,B,C,D,E]=labels,solutions=[];
  for(const p of permutations(labels)){
    const pos=Object.fromEntries(p.map((x,i)=>[x,i]));
    const ok=q.constructVariant===7
      ? pos[B]===pos[A]+1&&pos[D]===pos[C]+1&&pos[C]===2
      : pos[A]<pos[B]&&Math.abs(pos[A]-pos[C])===2&&Math.abs(pos[A]-pos[D])!==1&&Math.abs(pos[C]-pos[E])===2;
    if(ok)solutions.push(p.join(' → '));
  }
  assert.deepStrictEqual(solutions,[answer(q)],`${q.id}: hard ordering constraints must have one global solution`);
  assert.ok(q.constructVariant===7?/緊接.*正中間/.test(q.q):/恰好隔 1 個位置.*不與.*相鄰/.test(q.q),`${q.id}: multi-relation wording`);
}

for(const q of bank.filter(q=>q.taskFamily==='code-deduction'&&q.difficulty==='hard')){
  if(q.constructVariant===7){
    const m=q.q.match(/「山河」=(\d+).*「河風」=(\d+).*「山風」=(\d+)/);assert.ok(m,`${q.id}: pair-sum system`);
    const ab=Number(m[1]),bc=Number(m[2]),ac=Number(m[3]),wind=(bc+ac-ab)/2;
    assert.strictEqual(String(wind),answer(q),`${q.id}: pair-sum elimination`);
  }else{
    const m=q.q.match(/「山河風」=(\d+).*「河風月」=(\d+).*「山月」=(\d+)/);assert.ok(m,`${q.id}: triple-sum system`);
    const s1=Number(m[1]),s2=Number(m[2]),s3=Number(m[3]),target=(s1+s2-s3)/2;
    assert.strictEqual(String(target),answer(q),`${q.id}: triple-sum elimination`);
  }
}
for(const q of bank.filter(q=>q.taskFamily==='set-overlap'&&q.difficulty==='hard')){
  if(q.constructVariant===7){const m=q.q.match(/至少選一項的共有 (\d+) 人；選 B 的有 (\d+) 人，其中兩項都選的有 (\d+) 人/);assert.ok(m);assert.strictEqual(String(Number(m[1])-Number(m[2])+Number(m[3])),answer(q),`${q.id}: inverse inclusion-exclusion`);}
  else {const m=q.q.match(/共有 (\d+) 人。(\d+) 人兩項都沒選；選 A 的有 (\d+) 人；兩項都選的有 (\d+) 人/);assert.ok(m);const union=Number(m[1])-Number(m[2]),onlyB=union-Number(m[3]);assert.strictEqual(String(onlyB),answer(q),`${q.id}: neither + overlap inverse`);}
}
for(const q of bank.filter(q=>q.taskFamily==='invariant-transfer'&&q.difficulty==='hard')){
  let expectedAns;
  assert.ok(q.q.includes('丁'),`${q.id}: external transfer actor must be explicit`);
  assert.ok(q.q.includes('不再放回'),`${q.id}: removed objects must explicitly leave the counted system`);
  assert.ok(q.q.includes('之外'),`${q.id}: newly added objects must explicitly come from outside the counted system`);
  if(q.constructVariant===7){
    const m=q.q.match(/甲盒原有 (\d+) 顆、乙盒原有 (\d+) 顆。甲先把 (\d+) 顆移到乙盒。接著丁從乙盒拿走 (\d+) 顆[\s\S]*另外拿 (\d+) 顆新的/);
    assert.ok(m,`${q.id}: two-box transfer wording must remain structurally parseable`);
    const [,A,B,,removed,added]=m.map(Number);
    expectedAns=A+B-removed+added;
  }else{
    const m=q.q.match(/甲、乙、丙三盒原本分別有 (\d+)、(\d+)、(\d+) 顆。甲把 (\d+) 顆移到乙盒，乙再把 (\d+) 顆移到丙盒。之後丁從丙盒拿走 (\d+) 顆[\s\S]*另外拿 (\d+) 顆新的/);
    assert.ok(m,`${q.id}: three-box transfer wording must remain structurally parseable`);
    const [,A,B,C,,,removed,added]=m.map(Number);
    expectedAns=A+B+C-removed+added;
  }
  assert.strictEqual(String(expectedAns),answer(q),`${q.id}: internal transfers must cancel; external net change remains`);
}
for(const q of bank.filter(q=>q.taskFamily==='pairing-capacity'&&q.difficulty==='hard')){
  const nums=(q.q.match(/\d+/g)||[]).map(Number);assert.ok(nums.length>=6);let c;
  if(q.constructVariant===7){const R=nums.at(-3),B=nums.at(-2),C=nums.at(-1);c=Math.min(Math.floor(R/2),B,C);}else{const A=nums.at(-3),B=nums.at(-2),S=nums.at(-1);c=Math.min(Math.floor(A/2),Math.floor(B/3),S);}
  assert.strictEqual(String(c),answer(q),`${q.id}: multi-resource bottleneck`);
}
for(const q of bank.filter(q=>q.taskFamily==='speed-parity'&&q.difficulty==='hard')){
  const c=Number(answer(q));assert.ok(Number.isInteger(c)&&c>=10&&c<100);
  if(q.constructVariant===7){const s=Number(q.q.match(/＝(\d+)/)?.[1]);const pred=x=>x%2===1&&dsum(x)===s;assert.ok(pred(c));assert.ok(wrong(q).every(x=>!pred(Number(x))),`${q.id}: only correct passes dual filter`);}
  else {const d=Number(q.q.match(/＝(\d+)/)?.[1]);const pred=x=>x%4===0&&Math.abs(Math.floor(x/10)-x%10)===d;assert.ok(pred(c));assert.ok(wrong(q).every(x=>!pred(Number(x))),`${q.id}: only correct passes divisibility filter`);}
}
for(const q of bank.filter(q=>q.taskFamily==='speed-order'&&q.difficulty==='hard')){
  const tokens=answer(q).split(' · ');assert.strictEqual(tokens.length,4);if(q.constructVariant===7){const sorted=[...tokens].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))||a[0].localeCompare(b[0]));assert.deepStrictEqual(tokens,sorted,`${q.id}: number then letter order`);}else{const sorted=[...tokens].sort((a,b)=>a[0].localeCompare(b[0])||Number(b.slice(1))-Number(a.slice(1)));assert.deepStrictEqual(tokens,sorted,`${q.id}: letter then descending number order`);}
}
for(const q of bank.filter(q=>q.taskFamily==='speed-boundary'&&q.difficulty==='hard')){
  const c=answer(q);if(q.constructVariant===7){const m=c.match(/^M(\d+)M$/);assert.ok(m&&dsum(m[1])%2===0);assert.ok(wrong(q).every(x=>{const z=x.match(/^M(\d+)M$/);return !(z&&dsum(z[1])%2===0);}),`${q.id}: conjunction unique`);}else{assert.ok(!c.includes('R')&&c[0]===c.at(-1));assert.ok(wrong(q).every(x=>x.includes('R')||x[0]!==x.at(-1)),`${q.id}: conjunction unique`);}
}
for(const q of bank.filter(q=>q.taskFamily==='speed-missing'&&q.difficulty==='hard')){
  const nums=(q.q.match(/\d+/g)||[]).map(Number);if(q.constructVariant===7)assert.strictEqual(String(nums[0]+8),answer(q));else assert.strictEqual(String(4*nums[0]-9),answer(q));
}
for(const q of bank.filter(q=>q.taskFamily==='quant-remainder'&&q.difficulty==='hard')){
  const m=q.q.match(/除以 (\d+) 餘 (\d+)/);assert.ok(m);const d=Number(m[1]),r=Number(m[2]),c=q.constructVariant===7?mod(3*r+2,d):mod((r+1)*(r+1),d);assert.strictEqual(String(c),answer(q));assert.ok(q.o.every(x=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<d),`${q.id}: legal residues only`);
}
for(const q of bank.filter(q=>q.taskFamily==='scale-drawing'&&q.constructVariant===7)){
  const m=q.q.match(/原圖長 (\d+)、寬 (\d+).*長放大 2 倍、寬放大 3 倍/);assert.ok(m);assert.strictEqual(String(Number(m[1])*2*Number(m[2])*3),answer(q));assert.ok(String(q.visual).includes('面積 ?')&&String(q.visual).includes('長×2／寬×3'));}
for(const q of bank.filter(q=>q.taskFamily==='mirror-coordinate'&&q.constructVariant===7)){
  const m=q.q.match(/點 \((-?\d+), (-?\d+)\).*y=(\d+).*y 軸/);assert.ok(m);const x=Number(m[1]),y=Number(m[2]),line=Number(m[3]),yy=2*line-y;assert.strictEqual(`(${-x}, ${yy})`,answer(q));assert.ok(String(q.visual).includes(`y=${line}`)&&String(q.visual).includes('再對 y 軸鏡射'));}

const positions=[0,0,0,0];for(const q of bank){positions[q.a]++;assert.strictEqual(String(q.o[q.a]),String(q.correctContent));assert.strictEqual(new Set(q.o.map(String)).size,4);}
assert.deepStrictEqual(positions,[1281,1281,1281,1281]);assert.strictEqual(window.IQ_OPTION_QUALITY_REPORT?.cueRiskItems,0,'hard integrity must leave option audit clean');
const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);assert.strictEqual(new Set(bank.map(sig)).size,5124,'final hard rewrites must retain concrete uniqueness');
const spatial=bank.filter(q=>q.d==='視覺空間');assert.strictEqual(spatial.length,1008);assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')&&String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"')));
console.log('Hard Construct Integrity v2 PASS');console.log('432 hard items strengthened across 13 targeted families/variants; all seven fluid-reasoning families now have hard-specific production surfaces.');