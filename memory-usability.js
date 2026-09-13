// Cognitive IQ Lab — Memory Usability Integrity v1
// Keep position-recall focused on working memory rather than reading dense three-digit values.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;
  const VERSION='MUI-2026.09.1';
  const report={version:VERSION,total:0};const usedStimuli=new Set();
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  function shuffle(values,seed){const out=[...values];let s=((seed+1)*2654435761)>>>0;for(let i=out.length-1;i>0;i--){s=(Math.imul(s,1664525)+1013904223)>>>0;const j=s%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
  function install(q,n){
    const t=tier(q),len=[4,5,6][t];let salt=0,seq;do{const seed=n+salt*149,base=12+mod(seed*7+Number(q.constructVariant||1)*5,68),vals=[];for(let i=0;i<len;i++)vals.push(10+mod(base+i*11+seed*3,80));seq=shuffle([...new Set(vals)],seed*97+Number(q.constructVariant||1)*13);while(seq.length<len){const x=10+mod(base+seq.length*17+seed,80);if(!seq.includes(x))seq.push(x);}salt++;}while(usedStimuli.has(seq.join('|'))&&salt<50);usedStimuli.add(seq.join('|'));
    const pos=mod(n*5+Number(q.constructVariant||1),len),correct=String(seq[pos]),target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const wrong=seq.filter((_,i)=>i!==pos).map(String);for(let k=1;wrong.length<3;k++){const x=String(10+mod(Number(correct)+k*7,80));if(x!==correct&&!wrong.includes(x))wrong.push(x);}
    const opts=[];let wi=0;for(let i=0;i<4;i++)opts.push(i===target?correct:wrong[wi++]);
    q.stim=seq.join('　');q.q=`剛才序列中，第 ${pos+1} 個項目是什麼？`;q.e=`第 ${pos+1} 個項目是 ${correct}。`;q.o=opts;q.a=target;q.correctContent=correct;
    q.memoryUsability=VERSION;q.memoryUsabilityReason='two-digit-position-recall';q.presentationMode='single-stimulus';q.type='memory';q.limit=null;report.total++;
  }
  const seen=new Set();for(const collection of [bank,selected])for(const q of collection){if(!q||seen.has(q)||q.taskFamily!=='memory-position')continue;seen.add(q);install(q,idx(q));}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_MEMORY_USABILITY=report;if(window.IQ_BANK_META)window.IQ_BANK_META.memoryUsability=VERSION;
})();
