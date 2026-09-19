// Cognitive IQ Lab — Spatial Reliability Integrity v1
// Final production pass: spatial questions must be visually grounded, internally consistent,
// and independently checkable from the diagram rather than decorative arithmetic prose.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;
  const VERSION='SRI-2026.09.1';
  const report={version:VERSION,total:0,families:{}};
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=(inner,label='空間推理圖',viewBox='0 0 360 220')=>{
    const [, , width, height]=viewBox.split(' ').map(Number);
    return `<svg class="qb5-spatial-svg" viewBox="${viewBox}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  };
  function install(q,correct,wrong,reason,data,visual,diagramType){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const c=String(correct),seen=new Set([c]),clean=[];
    for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);clean.push(s);}}
    if(clean.length<3)throw new Error(`spatial reliability: insufficient distractors for ${q.id}`);
    const out=[];let wi=0;for(let i=0;i<4;i++)out.push(i===target?c:clean[wi++]);
    q.o=out;q.a=target;q.correctContent=c;q.spatialReliability=VERSION;q.spatialIntegrityReason=reason;
    q.spatialIntegrityData=data;q.visual=visual;q.diagramType=diagramType;q.presentationMode='spatial-diagram';q.type='normal';q.limit=null;
    report.total++;report.families[q.taskFamily]=(report.families[q.taskFamily]||0)+1;
  }
  function line(x1,y1,x2,y2){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="3"/>`;}
  function arrow(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,px=-uy,py=ux,ax=x2-ux*10,ay=y2-uy*10;return `${line(x1,y1,x2,y2)}<polygon points="${x2},${y2} ${ax+px*6},${ay+py*6} ${ax-px*6},${ay-py*6}" fill="currentColor"/>`;}

  function gridDisplacement(q,n,v,t){
    const s18=mod(n,18),N=12+t,sx=1+mod(s18,6),sy=1+Math.floor(s18/6),a=1+mod(s18+v,3),b=1+mod(Math.floor(s18/3)+v,2);
    const patterns=[[[a,0],[0,b+1]],[[0,b+1],[a+1,0]],[[a+1,0],[0,b+1],[-1,0]],[[0,a+1],[b+1,0],[0,-1]],[[a+1,0],[0,2],[-b,0]],[[0,a+1],[2,0],[0,-b]],[[a+1,0],[0,b+1],[-1,0],[0,1]],[[0,a+1],[b+1,0],[0,-1],[1,0]]];
    const moves=patterns[v];let x=sx,y=sy;const pts=[[x,y]];for(const [dx,dy] of moves){x+=dx;y+=dy;pts.push([x,y]);}
    const ex=x,ey=y,cell=16,ox=72,oy=188;
    let z='';for(let k=0;k<N;k++){const X=ox+k*cell,Y=oy-k*cell;z+=`<line x1="${X}" y1="${oy}" x2="${X}" y2="${oy-(N-1)*cell}" stroke="currentColor" stroke-opacity=".14"/><line x1="${ox}" y1="${Y}" x2="${ox+(N-1)*cell}" y2="${Y}" stroke="currentColor" stroke-opacity=".14"/>`;if(k%2===0){z+=`<text x="${X}" y="207" text-anchor="middle" font-size="12">${k}</text><text x="55" y="${Y+3}" text-anchor="end" font-size="12">${k}</text>`;}}
    z+=`<text x="${ox+(N-1)*cell+16}" y="${oy+4}" font-size="13">x</text><text x="${ox-4}" y="${oy-(N-1)*cell-10}" font-size="13">y</text>`;
    for(let i=0;i<pts.length-1;i++){const [x1,y1]=pts[i],[x2,y2]=pts[i+1];z+=arrow(ox+x1*cell,oy-y1*cell,ox+x2*cell,oy-y2*cell);}
    z+=`<circle cx="${ox+sx*cell}" cy="${oy-sy*cell}" r="6" fill="currentColor"/><text x="${ox+sx*cell-10}" y="${oy-sy*cell+20}" font-size="13">S</text><circle cx="${ox+ex*cell}" cy="${oy-ey*cell}" r="7" fill="none" stroke="currentColor" stroke-width="3"/><text x="${ox+ex*cell+9}" y="${oy-ey*cell+4}" font-size="13">E</text>`;
    q.q='依右側座標圖的箭頭從 S 移動到 E。E 的座標是？';q.e=`沿圖中路徑讀取終點，E 位於 (${ex}, ${ey})。`;
    install(q,`(${ex}, ${ey})`,[`(${ex+1}, ${ey})`,`(${ex-1}, ${ey})`,`(${ex}, ${ey+1})`,`(${ex}, ${ey-1})`,`(${ey}, ${ex})`],'spatial-grid-visual-path',{kind:'grid-displacement',start:[sx,sy],end:[ex,ey],moves},svg(z,'座標路徑圖','32 -46 300 272'),'grid-displacement');
  }

  const DIRS=['北','東北','東','東南','南','西南','西','西北'];
  function compassSvg(start,steps) {
    const cx=180,cy=108,r=70,ang=i=>(i*45-90)*Math.PI/180;
    let z=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".45"/>`;
    DIRS.forEach((d,i)=>{
      const a=ang(i),x=cx+Math.cos(a)*92,y=cy+Math.sin(a)*92+5;
      z+=`<text x="${x}" y="${y}" text-anchor="middle" font-size="14">${d}</text>`;
    });
    const a=ang(start);
    z+=arrow(cx,cy,cx+Math.cos(a)*58,cy+Math.sin(a)*58);
    const lines=steps.split('，');
    lines.forEach((text,i)=>{z+=`<text x="180" y="${234+i*22}" text-anchor="middle" font-size="14">${esc(text)}</text>`;});
    return svg(z,'羅盤心像旋轉圖',`25 -4 310 ${lines.length>1?278:256}`);
  }
  function viewpoint(q,n,v,t){const s18=mod(n,18),start=mod(s18,8),a=1+Math.floor(s18/8),b=1+mod(Math.floor(s18/4)+v,2);let delta,desc;
    const deg=steps=>steps*45;
    if(v===0){delta=a;desc=`順時針旋轉 ${deg(a)}°`;}
    else if(v===1){delta=-a;desc=`逆時針旋轉 ${deg(a)}°`;}
    else if(v===2){delta=a+1-b;desc=`先順時針旋轉 ${deg(a+1)}°，再逆時針旋轉 ${deg(b)}°`;}
    else if(v===3){delta=2*a;desc=`順時針旋轉 ${a} 次，每次 90°（共 ${a*90}°）`;}
    else if(v===4){delta=4+(a-1);desc=a===1?'旋轉到正後方（180°）':`先旋轉到正後方（180°），再順時針旋轉 ${deg(a-1)}°`;}
    else if(v===5){delta=-2*a;desc=`逆時針旋轉 ${a} 次，每次 90°（共 ${a*90}°）`;}
    else if(v===6){delta=a+2-b;desc=`先順時針旋轉 ${deg(a+3)}°，再逆時針旋轉 ${deg(b+1)}°`;}
    else {delta=-(a+2)+b;desc=`先逆時針旋轉 ${deg(a+2)}°，再順時針旋轉 ${deg(b)}°`;}
    const end=mod(start+delta,8),correct=DIRS[end],wrong=[DIRS[mod(end+1,8)],DIRS[mod(end-1,8)],DIRS[mod(end+4,8)]];
    q.q=`觀察羅盤。箭頭目前指向「${DIRS[start]}」。依照圖中的旋轉角度操作後，最後指向哪個方向？`;q.e=`從 ${DIRS[start]} 依序按標示角度旋轉，最後指向 ${correct}。`;
    install(q,correct,wrong,'spatial-heading-mental-rotation',{kind:'viewpoint-heading',start,delta,end,steps:desc},compassSvg(start,desc),'heading-rotation');
  }

  function heightMap(n,v,t){const s18=mod(n,18),R=t===0?2:3,C=t===2?4:3;const g=[];for(let r=0;r<R;r++){const row=[];for(let c=0;c<C;c++)row.push(1+mod(s18*3+v*7+r*3+c*5+r*c,4+t));g.push(row);}g[0][0]=1+mod(s18,5);if(C>1)g[0][1]=1+Math.floor(s18/5);if(new Set(g.flat()).size===1)g[R-1][C-1]=g[R-1][C-1]%5+1;return g;}
  function stackSvg(g) {
    const R=g.length,C=g[0].length,cell=56,width=Math.max(240,C*cell+24);
    const ox=(width-C*cell)/2,oy=12,bottom=oy+R*cell;
    let z='';
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){
      const x=ox+c*cell,y=oy+r*cell;
      z+=`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="${x+cell/2}" y="${y+cell/2+8}" text-anchor="middle" font-size="24" font-weight="600">${g[r][c]}</text>`;
    }
    z+=`<text x="${width/2}" y="${bottom+28}" text-anchor="middle" font-size="15">前方 ↑ 看入圖中</text><text x="${width/2}" y="${bottom+54}" text-anchor="middle" font-size="14">數字＝該位置堆疊高度</text>`;
    return svg(z,'方塊柱投影高度圖',`0 0 ${width} ${bottom+68}`);
  }
  function stackHidden(q,n,v,t){const g=heightMap(n,v,t),front=v%2===0;let skyline;
    if(front){skyline=Array.from({length:g[0].length},(_,c)=>Math.max(...g.map(r=>r[c])));}
    else {skyline=[...g].reverse().map(r=>Math.max(...r));}
    const correct=skyline.join('–');const candidates=[];for(let i=0;i<skyline.length;i++){for(const d of [-1,1]){const z=[...skyline];z[i]=Math.max(1,z[i]+d);const s=z.join('–');if(s!==correct&&!candidates.includes(s))candidates.push(s);}}const rev=[...skyline].reverse().join('–');if(rev!==correct&&!candidates.includes(rev))candidates.push(rev);
    q.q=front?'依俯視高度圖，從圖下方「前方」朝上看，輪廓由左到右的高度是哪一列？':'依俯視高度圖，從右側觀看，輪廓由前到後的高度是哪一列？';q.e=`每個視線方向取可遮蔽後的最高柱，得到 ${correct}。`;
    install(q,correct,candidates,'spatial-stack-projection',{kind:'stack-projection',grid:g,view:front?'front':'right',skyline},stackSvg(g),'stack-projection');
  }

  function perimeter(grid){const R=grid.length,C=grid[0].length;let p=0;for(let r=0;r<R;r++)for(let c=0;c<C;c++)if(grid[r][c])for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=R||cc>=C||!grid[rr][cc])p++;}return p;}
  function cutGrid(n,v,t){const s18=mod(n,18),R=5+t,C=7+t,g=Array.from({length:R},()=>Array(C).fill(1));const c1=mod(s18+v,C),c2=mod(Math.floor(s18/C)+v*2,C);g[0][c1]=0;g[R-1][c2]=0;const notchLen=1+Math.floor(v/3),notchStart=1+mod(v,3);for(let j=0;j<notchLen&&notchStart+j<C-1;j++)g[0][notchStart+j]=0;const extra=1+t+(v>=3?1:0)+(v>=6?1:0);for(let i=0;i<extra;i++){const side=mod(v+i,2);const pos=1+mod(s18+v*3+i*2,R-2);if(side===0)g[pos][0]=0;else g[pos][C-1]=0;}return g;}
  function cutSvg(g) {
    const R=g.length,C=g[0].length,cell=28,width=Math.max(250,C*cell+24),ox=(width-C*cell)/2,oy=12,bottom=oy+R*cell;
    let z='';
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){
      z+=`<rect x="${ox+c*cell}" y="${oy+r*cell}" width="${cell}" height="${cell}" fill="${g[r][c]?'none':'currentColor'}" fill-opacity="${g[r][c]?'0':'.65'}" stroke="currentColor" stroke-opacity=".65"/>`;
    }
    z+=`<text x="${width/2}" y="${bottom+27}" text-anchor="middle" font-size="14">深色格＝已裁除</text><text x="${width/2}" y="${bottom+49}" text-anchor="middle" font-size="14">每格邊長 1</text>`;
    return svg(z,'單位方格裁切圖',`0 0 ${width} ${bottom+64}`);
  }
  function rectangleCut(q,n,v,t){const g=cutGrid(n,v,t),p=perimeter(g);q.q='觀察右側單位方格裁切圖。深色格已移除；剩餘白色圖形所有外露邊界的總長度是多少？';q.e=`逐邊沿著剩餘圖形外框計數，總長度為 ${p}。`;
    install(q,p,[p-2,p+2,p+4],'spatial-cut-boundary-trace',{kind:'rectangle-cut',grid:g,perimeter:p},cutSvg(g),'rectangle-cut');}

  function scaleSvg2(w,h,sx,sy,tx,ty) {
    const cell=25,ox=62,oy=220;
    let z='';
    for(let i=0;i<=8;i++)z+=`<line x1="${ox+i*cell}" y1="${oy}" x2="${ox+i*cell}" y2="${oy-5*cell}" stroke="currentColor" stroke-opacity=".2"/>`;
    for(let i=0;i<=5;i++)z+=`<line x1="${ox}" y1="${oy-i*cell}" x2="${ox+8*cell}" y2="${oy-i*cell}" stroke="currentColor" stroke-opacity=".2"/>`;
    z+=`<rect x="${ox}" y="${oy-h*cell}" width="${w*cell}" height="${h*cell}" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="${ox+w*cell/2}" y="${oy+24}" text-anchor="middle" font-size="15">寬 ${w}</text><text x="${ox-18}" y="${oy-h*cell/2}" text-anchor="middle" font-size="15" transform="rotate(-90 ${ox-18} ${oy-h*cell/2})">高 ${h}</text><text x="160" y="30" text-anchor="middle" font-size="15">水平 ×${sx} · 垂直 ×${sy}</text>`;
    if(tx||ty)z+=`<text x="160" y="56" text-anchor="middle" font-size="15">再平移 (${tx}, ${ty})</text>`;
    return svg(z,'座標縮放圖','20 4 280 258');
  }
  function scaleDrawing(q,n,v,t){const s18=mod(n,18),w=2+mod(s18,6),h=2+Math.floor(s18/6);const transforms=[[2,2,0,0],[3,3,0,0],[2,3,0,0],[3,2,0,0],[2,2,1,0],[1,3,0,1],[2,3,1+mod(s18,2),1+mod(Math.floor(s18/2),2)],[3,2,1+mod(s18,2),1+mod(Math.floor(s18/2)+1,2)]],tr=transforms[v],sx=tr[0],sy=tr[1],tx=tr[2],ty=tr[3],ex=w*sx+tx,ey=h*sy+ty;
    q.q='依右側圖示，矩形左下角固定在原點；完成標示的縮放與平移後，右上角座標是多少？';q.e=`原右上角為 (${w}, ${h})；完成變換後為 (${ex}, ${ey})。`;
    install(q,`(${ex}, ${ey})`,[`(${ex+1}, ${ey})`,`(${ex-1}, ${ey})`,`(${ex}, ${ey+1})`,`(${ex}, ${ey-1})`,`(${ey}, ${ex})`],'spatial-scale-coordinate-transform',{kind:'scale-drawing',w,h,sx,sy,tx,ty,end:[ex,ey]},scaleSvg2(w,h,sx,sy,tx,ty),'scale-drawing');
  }

  function axesSvg(x,y,mode,c){const sx=a=>180+a*18,sy=a=>110-a*18;let z='<line x1="25" y1="110" x2="335" y2="110" stroke="currentColor" stroke-opacity=".2"/><line x1="180" y1="18" x2="180" y2="202" stroke="currentColor" stroke-opacity=".2"/>';
    if(mode==='y')z+='<line x1="180" y1="18" x2="180" y2="202" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/>';
    if(mode==='x')z+='<line x1="25" y1="110" x2="335" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/>';
    if(mode==='yx')z+='<line x1="90" y1="200" x2="270" y2="20" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/>';
    if(mode==='ynx')z+='<line x1="90" y1="20" x2="270" y2="200" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/>';
    if(mode==='xc')z+=`<line x1="${sx(c)}" y1="18" x2="${sx(c)}" y2="202" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/><text x="${sx(c)+5}" y="30" font-size="12">x=${c}</text>`;
    if(mode==='yc')z+=`<line x1="25" y1="${sy(c)}" x2="335" y2="${sy(c)}" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/><text x="30" y="${sy(c)-5}" font-size="12">y=${c}</text>`;
    z+=`<circle cx="${sx(x)}" cy="${sy(y)}" r="6" fill="currentColor"/><text x="${sx(x)+(x>=5?-8:8)}" y="${sy(y)-10}" text-anchor="${x>=5?'end':'start'}" font-size="14">P(${x},${y})</text>`;return svg(z,'座標鏡射圖','12 0 336 220');}
  function mirrorCoordinate(q,n,v,t){const s18=mod(n,18);let x=2+mod(s18,6),y=1+Math.floor(s18/6),c=1+mod(s18+v,2),a,mode,rule;
    if(v===0){a=[-x,y];mode='y';rule='對 y 軸鏡射';}
    else if(v===1){a=[x,-y];mode='x';rule='對 x 軸鏡射';}
    else if(v===2){a=[-x,-y];mode='origin';rule='以原點旋轉 180°';}
    else if(v===3){a=[y,x];mode='yx';rule='對 y=x 鏡射';}
    else if(v===4){a=[-y,-x];mode='ynx';rule='對 y=−x 鏡射';}
    else if(v===5){a=[2*c-x,y];mode='xc';rule=`對 x=${c} 鏡射`;}
    else if(v===6){const yy=2*c-y;a=[-x,yy];mode='yc';rule=`先對 y=${c} 鏡射，再對 y 軸鏡射`;}
    else {a=[-y,-x];mode='y';rule='先對 y 軸鏡射，再順時針旋轉 90°';}
    q.q=`依右側座標圖，將點 P「${rule}」。最後座標是？`;q.e=`逐步執行圖示幾何變換，最後得到 (${a[0]}, ${a[1]})。`;
    install(q,`(${a[0]}, ${a[1]})`,[`(${-a[0]}, ${a[1]})`,`(${a[0]}, ${-a[1]})`,`(${a[1]}, ${a[0]})`,`(${a[0]+1}, ${a[1]})`,`(${a[0]}, ${a[1]+1})`],'spatial-mirror-diagram-grounded',{kind:'mirror-coordinate',point:[x,y],rule,answer:a,mode,c},axesSvg(x,y,mode,c),'mirror-coordinate');
  }

  function bfs(N,S,T,B){const q=[[...S,0]],seen=new Set([S.join(',')]);for(let i=0;i<q.length;i++){const [r,c,d]=q[i];if(r===T[0]&&c===T[1])return d;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc,k=`${rr},${cc}`;if(rr<0||cc<0||rr>=N||cc>=N||B.has(k)||seen.has(k))continue;seen.add(k);q.push([rr,cc,d+1]);}}return null;}
  function pathGridSvg(N,S,T,B) {
    const cell=24,width=N*cell+24,ox=12,oy=12,bottom=oy+N*cell;
    let z='';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const b=B.has(`${r},${c}`);
      z+=`<rect x="${ox+c*cell}" y="${oy+r*cell}" width="${cell}" height="${cell}" fill="${b?'currentColor':'none'}" fill-opacity="${b?'.65':'0'}" stroke="currentColor" stroke-opacity=".45"/>`;
    }
    // Put each endpoint inside its own cell: offset labels can imply a
    // different starting square. No solution path is drawn.
    for(const [point,label] of [[S,'S'],[T,'E']]){
      z+=`<text x="${ox+point[1]*cell+cell/2}" y="${oy+point[0]*cell+cell/2+5}" text-anchor="middle" font-size="15" font-weight="700">${label}</text>`;
    }
    z+=`<text x="${width/2}" y="${bottom+26}" text-anchor="middle" font-size="14">只能上下左右移動</text><text x="${width/2}" y="${bottom+48}" text-anchor="middle" font-size="14">深色格不可通行</text>`;
    return svg(z,'受阻最短路徑圖',`0 0 ${width} ${bottom+64}`);
  }
  function shortestPath(q,n,v,t){const s18=mod(n,18),N=10+t,row=1+mod(v,N-2),S=[row,1],T=[row,N-2],slots=N-4,wall=2+mod(s18,slots);let gap=mod(Math.floor(s18/slots),N-3);if(gap===row)gap=mod(gap+2,N);const B=new Set();for(let r=0;r<N;r++)if(r!==gap)B.add(`${r},${wall}`);B.delete(S.join(','));B.delete(T.join(','));const c=bfs(N,S,T,B),man=Math.abs(S[0]-T[0])+Math.abs(S[1]-T[1]);if(c==null||c<=man)throw new Error(`spatial reliability: obstacle failed to force detour ${q.id}`);
    q.q='從 S 走到 E，每次只能上下左右移動 1 格，深色方格不可通行。最少需要走幾步？';q.e=`障礙牆迫使路徑繞行；最短可行路徑為 ${c} 步（直接距離 ${man} 步已被阻擋）。`;
    install(q,c,[c-1,c+1,c+2],'spatial-shortest-forced-detour',{kind:'shortest-grid-path',size:N,start:S,end:T,blocked:[...B],shortest:c,manhattan:man},pathGridSvg(N,S,T,B),'grid-shortest-path');q.diagramData={size:N,start:S,end:T,blocked:[...B],shortest:c,manhattan:man};
  }

  const handlers={'grid-displacement':gridDisplacement,'mirror-coordinate':mirrorCoordinate,'viewpoint-heading':viewpoint,'rectangle-cut':rectangleCut,'stack-hidden':stackHidden,'scale-drawing':scaleDrawing,'shortest-grid-path':shortestPath};
  const seen=new Set();for(const collection of [bank,selected])for(const q of collection){if(!q||seen.has(q)||q.d!=='視覺空間')continue;seen.add(q);const fn=handlers[q.taskFamily];if(!fn)throw new Error(`spatial reliability: uncovered family ${q.taskFamily}`);fn(q,idx(q),variant(q),tier(q));}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_SPATIAL_RELIABILITY=report;if(window.IQ_BANK_META)window.IQ_BANK_META.spatialReliability=VERSION;
})();
