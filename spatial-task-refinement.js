// Cognitive IQ Lab — Spatial Task Refinement v3
// Follow-up to SRI v1 for coordinate and transform families reported in real Safari use.
// Grid displacement is converted into a static S/E relative-position task; no route-following arrows remain in production.
// Mirror diagrams expose explicit axes/ticks. Scale/translation wording now states every operation.
(() => {
  'use strict';

  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const VERSION='STR-2026.09.3';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=(inner,label,viewBox='0 0 360 270')=>{
    const [, , width, height]=viewBox.split(' ').map(Number);
    return `<svg class="qb5-spatial-svg refined-spatial-svg" viewBox="${viewBox}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  };

  const REL_DIRS=[
    {dx:1,dy:0,label:'右方'},
    {dx:1,dy:1,label:'右上方'},
    {dx:0,dy:1,label:'上方'},
    {dx:-1,dy:1,label:'左上方'},
    {dx:-1,dy:0,label:'左方'},
    {dx:-1,dy:-1,label:'左下方'},
    {dx:0,dy:-1,label:'下方'},
    {dx:1,dy:-1,label:'右下方'}
  ];

  const relativePositionUsed=new Set();
  const relativePositionById=new Map();

  function setFourOptions(q,correct,wrong){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const clean=[],seen=new Set([String(correct)]);
    for(const value of wrong){
      const s=String(value);
      if(!seen.has(s)){seen.add(s);clean.push(s);}
    }
    if(clean.length<3)throw new Error('spatial refinement: insufficient relative-position distractors for '+q.id);
    const out=[];let wi=0;
    for(let i=0;i<4;i++)out.push(i===target?String(correct):clean[wi++]);
    q.o=out;q.a=target;q.correctContent=String(correct);
  }

  function relativePositionData(q,salt=0){
    const match=String(q.id||'').match(/-(\d{3})$/);
    const n=Math.max(0,(match?Number(match[1]):1)-1);
    const variant=Math.max(0,Number(q.constructVariant||1)-1);
    const tier=q.difficulty==='hard'?2:(q.difficulty==='medium'?1:0);
    const dirIndex=(n+variant*3+tier*5)%REL_DIRS.length;
    const dir=REL_DIRS[dirIndex];
    const distance=2+((Math.floor(n/8)+variant+tier)%3);
    const seedX=Math.floor(n/8)+variant*7+tier*11+salt*3;
    const seedY=Math.floor(n/4)+variant*5+tier*13+salt*5;
    const chooseStart=(seed,delta)=>{
      if(delta>0){const span=10-distance;return 1+(seed%span);}
      if(delta<0){const span=10-distance;return distance+1+(seed%span);}
      return 1+(seed%10);
    };
    const sx=chooseStart(seedX,dir.dx),sy=chooseStart(seedY,dir.dy);
    const ex=sx+dir.dx*distance,ey=sy+dir.dy*distance;
    return {kind:'relative-position',start:[sx,sy],end:[ex,ey],direction:dir.label,directionIndex:dirIndex,distance,measurement:'static-relative-position'};
  }

  function relativePositionVisual(data){
    const [sx,sy]=data.start,[ex,ey]=data.end;
    const cell=22,ox=58,oy=244,N=10,right=ox+N*cell,top=oy-N*cell;
    let z='';
    for(let k=0;k<=N;k++){
      const X=ox+k*cell,Y=oy-k*cell;
      z+=`<line x1="${X}" y1="${oy}" x2="${X}" y2="${top}" stroke="currentColor" stroke-opacity=".14"/>`;
      z+=`<line x1="${ox}" y1="${Y}" x2="${right}" y2="${Y}" stroke="currentColor" stroke-opacity=".14"/>`;
    }
    const px=x=>ox+x*cell,py=y=>oy-y*cell;
    z+=`<circle cx="${px(sx)}" cy="${py(sy)}" r="7" fill="currentColor"/>`;
    z+=`<rect x="${px(sx)-13}" y="${py(sy)+10}" width="26" height="20" rx="7" fill="white" fill-opacity=".94"/>`;
    z+=`<text x="${px(sx)}" y="${py(sy)+25}" text-anchor="middle" font-size="14" font-weight="700">S</text>`;
    z+=`<circle cx="${px(ex)}" cy="${py(ey)}" r="8" fill="white" stroke="currentColor" stroke-width="3"/>`;
    const eAbove=py(ey)>top+34;
    z+=`<rect x="${px(ex)-13}" y="${eAbove?py(ey)-32:py(ey)+10}" width="26" height="20" rx="7" fill="white" fill-opacity=".94"/>`;
    z+=`<text x="${px(ex)}" y="${eAbove?py(ey)-17:py(ey)+25}" text-anchor="middle" font-size="14" font-weight="700">E</text>`;
    return svg(z,'S 與 E 的相對位置圖','0 0 340 280');
  }

  function refineRelativePosition(q){
    let data=relativePositionById.get(q.id);
    if(!data){
      let salt=0,key='';
      do{
        data=relativePositionData(q,salt++);
        key=JSON.stringify([data.start,data.end,data.direction]);
      }while(relativePositionUsed.has(key)&&salt<200);
      if(relativePositionUsed.has(key))throw new Error('spatial refinement: unable to allocate unique relative-position layout for '+q.id);
      relativePositionUsed.add(key);
      relativePositionById.set(q.id,data);
    }
    const correct=data.direction;
    const i=data.directionIndex;
    setFourOptions(q,correct,[
      REL_DIRS[(i+4)%8].label,
      REL_DIRS[(i+2)%8].label,
      REL_DIRS[(i+6)%8].label
    ]);
    q.q='觀察圖中 S 與 E 的位置。E 位於 S 的哪個方向？';
    q.e=`由 S 看向 E，E 位於 S 的${correct}。`;
    q.visual=relativePositionVisual(data);
    q.diagramType='relative-position';
    q.spatialIntegrityReason='spatial-static-relative-position';
    q.spatialIntegrityData=data;
    q.spatialTaskRefinement=VERSION;
  }

  function mirrorVisual(data){
    const [x,y]=data.point,c=Number(data.c)||0,mode=data.mode;
    const scale=15,cx=180,cy=140,sx=a=>cx+a*scale,sy=a=>cy-a*scale;
    let z='';

    for(let n=-8;n<=8;n+=2){
      const X=sx(n),Y=sy(n);
      z+=`<line x1="${X}" y1="20" x2="${X}" y2="260" stroke="currentColor" stroke-opacity="${n===0?'.34':'.11'}" stroke-width="${n===0?2:1}"/>`;
      z+=`<line x1="60" y1="${Y}" x2="300" y2="${Y}" stroke="currentColor" stroke-opacity="${n===0?'.34':'.11'}" stroke-width="${n===0?2:1}"/>`;
      if(n!==0){
        z+=`<text x="${X}" y="${cy+18}" text-anchor="middle" font-size="11">${n}</text>`;
        z+=`<text x="${cx-9}" y="${Y+4}" text-anchor="end" font-size="11">${n}</text>`;
      }
    }
    z+=`<text x="${cx+6}" y="${cy+18}" font-size="11">0</text>`;
    z+=`<text x="310" y="${cy+5}" font-size="15" font-weight="700">x</text>`;
    z+=`<text x="${cx-5}" y="17" font-size="15" font-weight="700">y</text>`;

    const highlight=(x1,y1,x2,y2,label,lx,ly)=>{
      z+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/>`;
      if(label)z+=`<text x="${lx}" y="${ly}" font-size="12" font-weight="700">${esc(label)}</text>`;
    };
    if(mode==='y')highlight(cx,20,cx,260,'y 軸',cx+7,34);
    else if(mode==='x')highlight(60,cy,300,cy,'x 軸',278,cy-8);
    else if(mode==='yx')highlight(sx(-7),sy(-7),sx(7),sy(7),'y = x',sx(5.4),sy(5.4)-8);
    else if(mode==='ynx')highlight(sx(-7),sy(7),sx(7),sy(-7),'y = −x',sx(4.4),sy(-4.4)-8);
    else if(mode==='xc')highlight(sx(c),20,sx(c),260,`x = ${c}`,sx(c)+7,34);
    else if(mode==='yc')highlight(60,sy(c),300,sy(c),`y = ${c}`,68,sy(c)-8);
    else if(mode==='origin'){
      z+=`<circle cx="${cx}" cy="${cy}" r="6" fill="white" stroke="currentColor" stroke-width="2"/>`;
      z+=`<text x="${cx+9}" y="${cy-9}" font-size="12" font-weight="700">原點</text>`;
    }

    const px=sx(x),py=sy(y),labelLeft=px>260;
    z+=`<circle cx="${px}" cy="${py}" r="6" fill="currentColor"/>`;
    z+=`<text x="${px+(labelLeft?-10:10)}" y="${py-11}" text-anchor="${labelLeft?'end':'start'}" font-size="14" font-weight="700">P(${x}, ${y})</text>`;
    return svg(z,'含座標刻度與鏡射基準線的座標圖','0 0 360 280');
  }

  function clarifyScaleTransform(q,data){
    const {w,h,sx,sy,tx,ty}=data;
    const translated=Boolean(Number(tx)||Number(ty));
    if(translated){
      q.q=`原矩形左下角位於原點，寬 ${w}、高 ${h}。先以原點為基準做水平 ×${sx}、垂直 ×${sy} 的縮放，再將整個圖形平移 (${tx}, ${ty})。變換後右上角座標是多少？`;
      q.e=`原右上角為 (${w}, ${h})；縮放後為 (${w*sx}, ${h*sy})；再平移 (${tx}, ${ty})，得到 (${w*sx+tx}, ${h*sy+ty})。`;
    }else{
      q.q=`原矩形左下角位於原點，寬 ${w}、高 ${h}。只做水平 ×${sx}、垂直 ×${sy} 的縮放（不做平移）。縮放後右上角座標是多少？`;
      q.e=`原右上角為 (${w}, ${h})；水平與垂直分別乘上 ${sx}、${sy}，得到 (${w*sx}, ${h*sy})。`;
    }
    q.spatialIntegrityData={...data,transformationSequence:translated?['scale','translate']:['scale'],translationExplicit:true};
    q.spatialTaskRefinement=VERSION;
  }

  const report={version:VERSION,total:0,gridDisplacement:0,mirrorCoordinate:0,scaleDrawing:0};
  const seen=new Set();
  for(const collection of [bank,selected]){
    for(const q of collection){
      if(!q||seen.has(q)||q.d!=='視覺空間')continue;
      seen.add(q);
      const data=q.spatialIntegrityData;
      if(q.taskFamily==='grid-displacement'){
        refineRelativePosition(q);
        report.total++;report.gridDisplacement++;
      }else if(q.taskFamily==='mirror-coordinate'&&data?.kind==='mirror-coordinate'){
        q.visual=mirrorVisual(data);
        q.spatialIntegrityData={...data,axesLabeled:true,tickRange:[-8,8],tickStep:2};
        q.spatialTaskRefinement=VERSION;
        report.total++;report.mirrorCoordinate++;
      }else if(q.taskFamily==='scale-drawing'&&data?.kind==='scale-drawing'){
        clarifyScaleTransform(q,data);
        report.total++;report.scaleDrawing++;
      }
    }
  }

  if(window.IQ_BANK_META)window.IQ_BANK_META.spatialTaskRefinement=VERSION;
  window.IQ_SPATIAL_TASK_REFINEMENT=report;
})();
