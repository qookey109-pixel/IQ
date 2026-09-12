// Cognitive IQ Lab — Question Language Finalizer
// Last-mile cleanup after Natural Language v3, before answer-position balancing.
(() => {
  'use strict';
  const bank=window.IQ_QUESTION_BANK;
  if(!Array.isArray(bank)||!bank.length)return;
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const surface=q=>Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
  const correctOf=q=>String(q.correctContent??q.o?.[q.a]??'');
  const setChoices=(q,wrong)=>{const correct=correctOf(q),choices=[correct,...wrong.map(String)];if(new Set(choices).size!==4)throw new Error(`language finalizer duplicate choices: ${q.id}`);q.o=choices;q.a=0;q.correctContent=correct;};
  const svg=(inner,label)=>`<svg class="qb5-spatial-svg" viewBox="0 0 360 220" width="360" height="220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const scaleVisual=(v,a,b,s)=>{
    if(v===0||v===5){
      const original=v===5?'?':a,scaled=v===5?a*s:'?';
      return svg(`<text x="68" y="42" text-anchor="middle" font-size="13">原圖</text><line x1="28" y1="82" x2="108" y2="82" stroke="currentColor" stroke-width="5"/><text x="68" y="108" text-anchor="middle" font-size="15">原長 ${original}</text><line x1="135" y1="82" x2="218" y2="82" stroke="currentColor" stroke-width="2"/><polygon points="218,82 207,76 207,88" fill="currentColor"/><text x="176" y="67" text-anchor="middle" font-size="15">× ${s}</text><text x="286" y="42" text-anchor="middle" font-size="13">放大後</text><line x1="236" y1="82" x2="336" y2="82" stroke="currentColor" stroke-width="5"/><text x="286" y="108" text-anchor="middle" font-size="15">長 ${scaled}</text>`,'比例縮放線段圖');
    }
    const target=v===1?'長 ?':v===2?'寬 ?':v===3?'周長 ?':v===4||v===7?'面積 ?':'長＋寬 ?';
    const action=v===6?'平移':`× ${s}`;
    return svg(`<text x="82" y="32" text-anchor="middle" font-size="13">原圖</text><rect x="34" y="52" width="96" height="76" fill="none" stroke="currentColor" stroke-width="3"/><text x="82" y="151" text-anchor="middle" font-size="14">長 ${a}</text><text x="18" y="90" text-anchor="middle" font-size="14" transform="rotate(-90 18 90)">寬 ${b}</text><line x1="148" y1="90" x2="214" y2="90" stroke="currentColor" stroke-width="2"/><polygon points="214,90 203,84 203,96" fill="currentColor"/><text x="181" y="73" text-anchor="middle" font-size="15">${action}</text><text x="284" y="32" text-anchor="middle" font-size="13">結果</text><rect x="233" y="47" width="102" height="86" fill="none" stroke="currentColor" stroke-width="3"/><text x="284" y="157" text-anchor="middle" font-size="15">${target}</text>`,'比例縮放矩形圖');
  };

  for(const q of bank){
    const n=itemIndex(q),v=variant(q),s=surface(q);

    if(q.taskFamily==='scale-drawing'){
      const a=3+mod(n,7),b=2+mod(n*2,5);
      let factor=2+mod(v,3);
      if(v===0){q.q=`線段原長 ${a} 格，放大 ${factor} 倍後長多少格？`;q.e=`${a} × ${factor} = ${correctOf(q)}。`;}
      else if(v===1){q.q=`矩形長 ${a}、寬 ${b}，等比例放大 ${factor} 倍。放大後的長是多少？`;q.e=`長度同樣放大 ${factor} 倍：${a} × ${factor} = ${correctOf(q)}。`;}
      else if(v===2){q.q=`矩形長 ${a}、寬 ${b}，等比例放大 ${factor} 倍。放大後的寬是多少？`;q.e=`寬度同樣放大 ${factor} 倍：${b} × ${factor} = ${correctOf(q)}。`;}
      else if(v===3){q.q=`矩形長 ${a}、寬 ${b}，等比例放大 ${factor} 倍。放大後周長是多少？`;q.e=`原周長是 2 × (${a} + ${b})，再乘 ${factor}，得到 ${correctOf(q)}。`;}
      else if(v===4){q.q=`矩形長 ${a}、寬 ${b}，等比例放大 ${factor} 倍。放大後面積是多少？`;q.e=`面積會乘上倍率的平方：${a} × ${b} × ${factor}² = ${correctOf(q)}。`;}
      else if(v===5){q.q=`線段放大 ${factor} 倍後長 ${a*factor} 格。原長是多少格？`;q.e=`用放大後長度除以倍率：${a*factor} ÷ ${factor} = ${correctOf(q)}。`;}
      else if(v===6){factor=1;q.q=`矩形長 ${a}、寬 ${b}。只把圖形平移，不縮放。平移後長與寬的和是多少？`;q.e=`平移不改變尺寸，所以 ${a} + ${b} = ${correctOf(q)}。`;}
      else {q.q=`矩形長 ${a}、寬 ${b}，長和寬都放大成 ${factor} 倍。放大後面積是多少？`;q.e=`新面積為 (${a} × ${factor}) × (${b} × ${factor}) = ${correctOf(q)}。`;}
      q.visual=scaleVisual(v,a,b,factor);
      q.diagramType='scale-drawing';
      q.presentationMode='spatial-diagram';
    }

    if(q.taskFamily==='quant-unit-rate'&&q.q.includes('封信件')){
      q.q=q.q
        .replace('平均每個多少元？','平均每封多少元？')
        .replace('每盒有幾個？','每盒有幾封？')
        .replace('每分鐘製作幾個？','每分鐘製作幾封？');
    }

    if(q.taskFamily==='speed-parity'){
      const c=Number(correctOf(q));let wrong;
      if(v===0||v===1)wrong=[c+1+2*s,c+3+2*s,c+5+2*s];
      else if(v===2)wrong=[c+1+3*s,c+2+3*s,c+4+3*s];
      else if(v===3)wrong=[c+1+5*s,c+2+5*s,c+3+5*s];
      else if(v===4){const base=c-2;wrong=[base+4*(s+1),base+4*(s+2),base+4*(s+3)];}
      else if(v===5)wrong=[c+1+7*s,c+2+7*s,c+3+7*s];
      else if(v===6)wrong=[c+1+10*s,c+2+10*s,c+4+10*s];
      else {const base=c-9;wrong=[base,base+1+mod(s,3),base+4+mod(s,4)];}
      setChoices(q,wrong);
      q.q=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'').replace(/^快速判斷：/,'');
    }

    if(q.taskFamily==='speed-order'){
      const z=100+s*7;let wrong;
      if(v%4===0)wrong=[`${z+2} · ${z} · ${z+5}`,`${z} · ${z+5} · ${z+2}`,`${z+5} · ${z+2} · ${z}`];
      else if(v%4===1)wrong=[`${z} · ${z+2} · ${z+5}`,`${z+5} · ${z} · ${z+2}`,`${z+2} · ${z+5} · ${z}`];
      else if(v%4===2){const x=String.fromCharCode(65+mod(s,10)),y=String.fromCharCode(x.charCodeAt(0)+2),zz=String.fromCharCode(x.charCodeAt(0)+4);wrong=[`${y} · ${x} · ${zz}`,`${zz} · ${y} · ${x}`,`${x} · ${zz} · ${y}`];}
      else wrong=[`${z+2} · ${z} · ${z+5}`,`${z+5} · ${z} · ${z+2}`,`${z} · ${z+5} · ${z+2}`];
      setChoices(q,wrong);
      q.q=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'').replace(/^快速判斷：/,'');
    }

    if(q.taskFamily==='speed-missing'){
      const correct=correctOf(q);let wrong;
      if(v===2){const code=correct.charCodeAt(0)-65;const mk=off=>String.fromCharCode(65+mod(code+off,26));wrong=[mk(1+mod(s,5)),mk(6+mod(s,5)),mk(11+mod(s,5))];}
      else {const c=Number(correct);wrong=[c-(1+mod(s,3)),c+(1+mod(Math.floor(s/3),3)),c+(4+mod(s,5))];}
      setChoices(q,wrong);
      q.q=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'').replace(/^快速找缺項：/,'');
    }
  }

  const signature=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const signatures=new Set(bank.map(signature));
  if(signatures.size!==bank.length)throw new Error(`Question language finalizer broke uniqueness: ${signatures.size}/${bank.length}`);

  const artificial=/這組資料為情境|的這個案例中|快速掃描組中|規則機器|的紀錄中，句子/;
  const lengths=bank.map(q=>String(q.q||'').length).sort((a,b)=>a-b);
  const report=window.IQ_NATURAL_LANGUAGE||(window.IQ_NATURAL_LANGUAGE={});
  report.version='NL-2026.09.3';
  report.finalized=true;
  report.scaleDrawingVisualGuard='unknown-target-must-use-question-mark';
  report.metrics={
    items:bank.length,
    avgStemChars:Number((lengths.reduce((a,b)=>a+b,0)/lengths.length).toFixed(1)),
    p95StemChars:lengths[Math.floor(lengths.length*.95)],
    maxStemChars:lengths.at(-1),
    artificialWrapperCount:bank.filter(q=>artificial.test(String(q.q))).length
  };
  if(window.IQ_BANK_VALIDATION){window.IQ_BANK_VALIDATION.uniqueTaskSignatures=signatures.size;window.IQ_BANK_VALIDATION.naturalLanguageRevision=report.version;}
  if(window.IQ_BANK_META){window.IQ_BANK_META.naturalLanguageRevision=report.version;window.IQ_BANK_META.languageStyle='direct-taiwan-zh-hant';}
  if(window.IQ_QB5)window.IQ_QB5.naturalLanguageRevision=report.version;
})();
