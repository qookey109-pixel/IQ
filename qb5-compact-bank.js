// Cognitive IQ Lab — compact bank topology
// 294 semantic constructs × 6 concrete surface variants = 1,764 final bank items.
(() => {
  'use strict';
  const source=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(!source.length)return;
  const idIndex=q=>{const m=String(q?.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:-1;};
  const keep=q=>q?.d==='語文理解'||(idIndex(q)>=0&&idIndex(q)%18<6);
  const bank=source.filter(keep);
  const expected=1764;
  if(bank.length!==expected)throw new Error(`QB5 compact topology expected ${expected} items, got ${bank.length}`);

  const semanticCounts=new Map();
  for(const q of bank)semanticCounts.set(q.semanticKey,(semanticCounts.get(q.semanticKey)||0)+1);
  if(semanticCounts.size!==294)throw new Error(`QB5 compact topology expected 294 semantic constructs, got ${semanticCounts.size}`);
  const uneven=[...semanticCounts].filter(([,count])=>count!==6);
  if(uneven.length)throw new Error(`QB5 compact topology requires 6 surfaces per construct: ${uneven.slice(0,8).map(([k,c])=>`${k}=${c}`).join(', ')}`);

  window.IQ_QUESTION_BANK=bank;
  if(window.QB5E){window.QB5E.bank=bank;window.QB5E.selected=[];}

  const originalSelect=window.IQ_DIVERSITY?.selectForm;
  if(typeof originalSelect==='function'){
    const selectCompact=(options={})=>originalSelect({...options,pool:options.pool||bank});
    window.IQ_DIVERSITY.selectForm=selectCompact;
    let history=[];
    const key=`cognitive-iq-lab:form-history:${window.IQ_BANK_META?.version||'QB-2026.09.5'}`;
    const ids=new Set(bank.map(q=>q.id));
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'[]');
      if(Array.isArray(raw))history=raw.filter(form=>Array.isArray(form)&&form.length===30&&form.every(id=>ids.has(id))).slice(-7);
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
    ...(window.IQ_BANK_META||{}),totalItems:bank.length,selectedItems:30,semanticTemplates:semanticCounts.size,
    spatialSvgItems:spatial,memoryItems:memory,surfaceVariantsPerConstruct:6,
    generation:'294-semantic-constructs-times-6-controlled-surfaces',bankTopology:'294x6=1764'
  };
  window.IQ_QB5={...(window.IQ_QB5||{}),semanticTemplates:semanticCounts.size,uniqueTaskSignatures:signatures.size,spatialSvgItems:spatial,bankTopology:'294x6=1764'};
  window.IQ_COMPACT_BANK={version:'CBT-2026.09.1',total:bank.length,semanticConstructs:semanticCounts.size,surfacesPerConstruct:6,spatialItems:spatial,memoryItems:memory};
})();