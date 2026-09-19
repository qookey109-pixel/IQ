// Cognitive IQ Lab — compact bank topology stage
// Keeps seven source surfaces for every non-verbal construct; verbal receives its seventh surface in the next production stage.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(!bank.length)return;
  const idIndex=q=>{const m=String(q?.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:-1;};
  const keep=q=>q?.d==='語文理解'||(idIndex(q)>=0&&idIndex(q)%18<7);
  for(let i=bank.length-1;i>=0;i--)if(!keep(bank[i]))bank.splice(i,1);
  const expected=2044;
  if(bank.length!==expected)throw new Error(`QB5 compact stage expected ${expected} items, got ${bank.length}`);

  const semanticCounts=new Map();
  for(const q of bank)semanticCounts.set(q.semanticKey,(semanticCounts.get(q.semanticKey)||0)+1);
  if(semanticCounts.size!==294)throw new Error(`QB5 compact stage expected 294 semantic constructs, got ${semanticCounts.size}`);
  const bad=[...semanticCounts].filter(([key,count])=>{
    const sample=bank.find(q=>q.semanticKey===key);
    return count!==(sample?.d==='語文理解'?6:7);
  });
  if(bad.length)throw new Error(`QB5 compact stage surface mismatch: ${bad.slice(0,8).map(([k,c])=>`${k}=${c}`).join(', ')}`);

  window.IQ_QUESTION_BANK=bank;
  if(window.QB5E)window.QB5E.bank=bank;

  const originalSelect=window.IQ_DIVERSITY?.selectForm;
  if(typeof originalSelect==='function'){
    const selectCompact=(options={})=>originalSelect({...options,pool:options.pool||bank});
    window.IQ_DIVERSITY.selectForm=selectCompact;
    let history=[];
    const key=`cognitive-iq-lab:form-history:${window.IQ_BANK_META?.version||'QB-2026.09.5'}`;
    const ids=new Set(bank.map(q=>q.id));
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'[]');
      if(Array.isArray(raw))history=raw.filter(form=>Array.isArray(form)&&form.length===42&&form.every(id=>ids.has(id))).slice(-7);
    }catch{}
    const form=selectCompact({history});
    window.IQ_QUESTIONS=form;
    if(window.QB5E)window.QB5E.selected=form;
    try{localStorage.setItem(key,JSON.stringify([...history,form.map(q=>q.id)].slice(-8)));}catch{}
  }

  const signature=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const signatures=new Set(bank.map(signature));
  const spatial=bank.filter(q=>q.d==='視覺空間'&&String(q.visual||'').includes('<svg')).length;
  const memory=bank.filter(q=>q.d==='工作記憶').length;
  window.IQ_BANK_VALIDATION={...(window.IQ_BANK_VALIDATION||{}),ok:true,errors:[],total:bank.length,uniqueTaskSignatures:signatures.size,semanticTemplates:semanticCounts.size};
  window.IQ_BANK_META={
    ...(window.IQ_BANK_META||{}),totalItems:bank.length,selectedItems:42,semanticTemplates:semanticCounts.size,
    spatialSvgItems:spatial,memoryItems:memory,
    generation:'compact-stage-14x6-verbal-plus-280x7-nonverbal',bankTopologyStage:'2044-before-verbal-seventh-surface'
  };
  window.IQ_QB5={...(window.IQ_QB5||{}),semanticTemplates:semanticCounts.size,uniqueTaskSignatures:signatures.size,spatialSvgItems:spatial,bankTopologyStage:'2044-before-verbal-seventh-surface'};
  window.IQ_COMPACT_BANK={version:'CBT-2026.09.2',stageTotal:bank.length,semanticConstructs:semanticCounts.size,verbalSurfaces:6,nonVerbalSurfaces:7,spatialItems:spatial,memoryItems:memory};
})();