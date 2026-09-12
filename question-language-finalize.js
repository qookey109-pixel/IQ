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

  for(const q of bank){
    const n=itemIndex(q),v=variant(q),s=surface(q);

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
