const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store={},window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js'];
for(const f of runtime)vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const bank=window.IQ_QUESTION_BANK,spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(bank.length,5124);assert.strictEqual(spatial.length,1008);assert.strictEqual(window.IQ_SPATIAL_RELIABILITY?.version,'SRI-2026.09.1');assert.strictEqual(window.IQ_SPATIAL_RELIABILITY?.total,1008);assert.strictEqual(window.IQ_BANK_META?.spatialReliability,'SRI-2026.09.1');
const families=['grid-displacement','mirror-coordinate','viewpoint-heading','rectangle-cut','stack-hidden','scale-drawing','shortest-grid-path'];for(const fam of families)assert.strictEqual(window.IQ_SPATIAL_RELIABILITY.families[fam],144,`${fam}: 144 rewritten items`);
const mod=(n,m)=>((n%m)+m)%m,DIRS=['北','東北','東','東南','南','西南','西','西北'];
const sameArray=(a,b)=>JSON.stringify(Array.from(a))===JSON.stringify(Array.from(b));
function perimeter(g){let p=0,R=g.length,C=g[0].length;for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(g[r][c])for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=R||cc>=C||!g[rr][cc])p++;}return p;}
function bfs(N,S,T,blocked){const B=new Set(blocked),q=[[...S,0]],seen=new Set([S.join(',')]);for(let i=0;i<q.length;i++){const [r,c,d]=q[i];if(r===T[0]&&c===T[1])return d;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc,k=`${rr},${cc}`;if(rr<0||cc<0||rr>=N||cc>=N||B.has(k)||seen.has(k))continue;seen.add(k);q.push([rr,cc,d+1]);}}return null;}
for(const q of spatial){
  assert.strictEqual(q.spatialReliability,'SRI-2026.09.1',`${q.id}: final spatial version`);assert.ok(q.spatialIntegrityReason,`${q.id}: integrity reason`);assert.ok(String(q.visual||'').includes('<svg'),`${q.id}: SVG`);assert.ok(String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"'),`${q.id}: aspect-safe SVG`);assert.ok(q.spatialIntegrityData,`${q.id}: independent data`);assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: unique options`);assert.strictEqual(String(q.o[q.a]),String(q.correctContent),`${q.id}: answer binding`);assert.ok(q.limit==null,`${q.id}: spatial must be untimed`);
  const d=q.spatialIntegrityData,v=Number(q.constructVariant);
  if(q.taskFamily==='grid-displacement'){
    let [x,y]=d.start;for(const [dx,dy] of d.moves){x+=dx;y+=dy;}assert.ok(sameArray([x,y],d.end),`${q.id}: path endpoint`);assert.strictEqual(q.correctContent,`(${x}, ${y})`,`${q.id}: endpoint answer`);assert.ok(!/向右|向左|向上|向下/.test(q.q),`${q.id}: moves belong in diagram, not prose`);
  }else if(q.taskFamily==='viewpoint-heading'){
    const end=mod(d.start+d.delta,8);assert.strictEqual(end,d.end,`${q.id}: heading index`);assert.strictEqual(q.correctContent,DIRS[end],`${q.id}: heading answer`);assert.ok(!/方位角以正北|最後方位角/.test(q.q),`${q.id}: no arithmetic-angle framing`);
  }else if(q.taskFamily==='stack-hidden'){
    const g=d.grid;let skyline;if(d.view==='front')skyline=Array.from({length:g[0].length},(_,c)=>Math.max(...g.map(r=>r[c])));else skyline=[...g].reverse().map(r=>Math.max(...r));assert.ok(sameArray(skyline,d.skyline),`${q.id}: skyline`);assert.strictEqual(q.correctContent,skyline.join('–'),`${q.id}: projection answer`);assert.ok(!/外露面/.test(q.q),`${q.id}: no surface-area formula task`);
  }else if(q.taskFamily==='rectangle-cut'){
    const p=perimeter(d.grid);assert.strictEqual(p,d.perimeter,`${q.id}: perimeter`);assert.strictEqual(Number(q.correctContent),p,`${q.id}: perimeter answer`);
  }else if(q.taskFamily==='scale-drawing'){
    const end=[d.w*d.sx+d.tx,d.h*d.sy+d.ty];assert.ok(sameArray(end,d.end),`${q.id}: scale transform`);assert.strictEqual(q.correctContent,`(${end[0]}, ${end[1]})`,`${q.id}: scale answer`);
  }else if(q.taskFamily==='mirror-coordinate'){
    const [x,y]=d.point,c=d.c;let a;if(v===1)a=[-x,y];else if(v===2)a=[x,-y];else if(v===3)a=[-x,-y];else if(v===4)a=[y,x];else if(v===5)a=[-y,-x];else if(v===6)a=[2*c-x,y];else if(v===7)a=[-x,2*c-y];else a=[-y,-x];assert.ok(sameArray(a,d.answer),`${q.id}: mirror transform`);assert.strictEqual(q.correctContent,`(${a[0]}, ${a[1]})`,`${q.id}: mirror answer`);
  }else if(q.taskFamily==='shortest-grid-path'){
    const c=bfs(d.size,d.start,d.end,d.blocked),man=Math.abs(d.start[0]-d.end[0])+Math.abs(d.start[1]-d.end[1]);assert.strictEqual(c,d.shortest,`${q.id}: BFS shortest`);assert.strictEqual(Number(q.correctContent),c,`${q.id}: shortest answer`);assert.ok(c>man,`${q.id}: obstacles must force real detour`);assert.ok(d.shortest>d.manhattan,`${q.id}: stored detour proof`);
  }
}
const oldWeird=/方位角以正北|整個造型共有多少個外露面|登山客從|棋子從 \(/;assert.ok(spatial.every(q=>!oldWeird.test(String(q.q))), 'old arithmetic/decorative spatial wording must be absent');
const positions=[0,0,0,0];for(const q of bank)positions[q.a]++;assert.deepStrictEqual(positions,[1281,1281,1281,1281]);const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].map(String).sort()]);assert.strictEqual(new Set(bank.map(sig)).size,5124,'final concrete signatures unique');
console.log('Spatial Reliability Integrity v1 PASS');console.log('1,008 spatial items are diagram-grounded; all final answers independently recomputed; shortest-path obstacles force detours; old screenshot failure modes absent.');
