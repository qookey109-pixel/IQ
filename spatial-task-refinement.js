// Cognitive IQ Lab — Spatial Task Refinement v2
// Follow-up to SRI v1 for coordinate and transform families reported in real Safari use.
// Grid displacement measures path integration from a known start instead of direct endpoint reading.
// Mirror diagrams expose explicit axes/ticks. Scale/translation wording now states every operation.
(() => {
  'use strict';

  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const VERSION='STR-2026.09.2';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=(inner,label,viewBox='0 0 360 270')=>{
    const [, , width, height]=viewBox.split(' ').map(Number);
    return `<svg class="qb5-spatial-svg refined-spatial-svg" viewBox="${viewBox}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  };

  function arrowSegment(x1,y1,x2,y2){
    const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,px=-uy,py=ux;
    const sx=x1+ux*7,sy=y1+uy*7,tipX=x2-ux*8,tipY=y2-uy*8,baseX=tipX-ux*9,baseY=tipY-uy*9;
    return `<line x1="${sx}" y1="${sy}" x2="${tipX}" y2="${tipY}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`+
      `<polygon points="${tipX},${tipY} ${baseX+px*5.5},${baseY+py*5.5} ${baseX-px*5.5},${baseY-py*5.5}" fill="currentColor"/>`;
  }

  function gridPathVisual(data){
    const [sx0,sy0]=data.start,[ex,ey]=data.end;
    let x=sx0,y=sy0;
    const pts=[[x,y]];
    for(const [dx,dy] of data.moves){x+=dx;y+=dy;pts.push([x,y]);}
    const maxCoord=Math.max(6,...pts.flat());
    const N=maxCoord+2;
    const cell=Math.max(14,Math.min(26,Math.floor(178/Math.max(1,N-1))));
    const ox=66,oy=216,right=ox+(N-1)*cell,top=oy-(N-1)*cell;
    let z='';

    for(let k=0;k<N;k++){
      const X=ox+k*cell,Y=oy-k*cell;
      z+=`<line x1="${X}" y1="${oy}" x2="${X}" y2="${top}" stroke="currentColor" stroke-opacity=".16"/>`;
      z+=`<line x1="${ox}" y1="${Y}" x2="${right}" y2="${Y}" stroke="currentColor" stroke-opacity=".16"/>`;
    }
    z+=`<line x1="${ox}" y1="${oy}" x2="${right+16}" y2="${oy}" stroke="currentColor" stroke-width="2"/>`;
    z+=`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${top-16}" stroke="currentColor" stroke-width="2"/>`;
    z+=`<text x="${right+22}" y="${oy+5}" font-size="15" font-weight="700">x</text>`;
    z+=`<text x="${ox-5}" y="${top-22}" font-size="15" font-weight="700">y</text>`;
    z+=`<text x="${ox}" y="250" font-size="13" fill="currentColor" opacity=".72">每格 = 1；座標數字不直接標在終點旁</text>`;

    for(let i=0;i<pts.length-1;i++){
      const [x1,y1]=pts[i],[x2,y2]=pts[i+1];
      z+=arrowSegment(ox+x1*cell,oy-y1*cell,ox+x2*cell,oy-y2*cell);
    }

    const startX=ox+sx0*cell,startY=oy-sy0*cell,endX=ox+ex*cell,endY=oy-ey*cell;
    z+=`<circle cx="${startX}" cy="${startY}" r="6" fill="currentColor"/>`;
    z+=`<rect x="${startX-28}" y="${startY+9}" width="25" height="20" rx="7" fill="white" fill-opacity=".9"/>`;
    z+=`<text x="${startX-15}" y="${startY+24}" text-anchor="middle" font-size="14" font-weight="700">S</text>`;
    z+=`<circle cx="${endX}" cy="${endY}" r="7" fill="white" stroke="currentColor" stroke-width="3"/>`;
    const eLeft=endX>right-30;
    z+=`<rect x="${eLeft?endX-35:endX+9}" y="${Math.max(top+2,endY-25)}" width="26" height="20" rx="7" fill="white" fill-opacity=".92"/>`;
    z+=`<text x="${eLeft?endX-22:endX+22}" y="${Math.max(top+17,endY-10)}" text-anchor="middle" font-size="14" font-weight="700">E</text>`;
    return svg(z,'座標路徑整合圖','0 0 360 270');
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
      if(q.taskFamily==='grid-displacement'&&data?.kind==='grid-displacement'){
        const [sx,sy]=data.start,[ex,ey]=data.end;
        q.q=`起點 S = (${sx}, ${sy})。依圖中的箭頭逐段移動，每格代表 1 單位。最後 E 的座標是？`;
        q.e=`從已知起點 (${sx}, ${sy}) 依箭頭逐段更新位置，最後得到 (${ex}, ${ey})。`;
        q.visual=gridPathVisual(data);
        q.spatialIntegrityReason='spatial-grid-path-integration';
        q.spatialIntegrityData={...data,measurement:'path-integration-from-known-start',endpointCoordinatesShown:false,gridUnit:1};
        q.spatialTaskRefinement=VERSION;
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
