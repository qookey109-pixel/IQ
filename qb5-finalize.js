// QB5 finalizer: apply registered construct variants, validate bank, and build a fresh QB5 form.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {bank,VERSION,REVISION,mod}=E;
  E.apply();

  const domains=['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const errors=[],ids=new Set(),signatures=new Set(),semantics=new Set();
  for(const q of bank){
    if(ids.has(q.id))errors.push(`duplicate ID: ${q.id}`);ids.add(q.id);
    if(!q.q||!q.e||!q.taskFamily||!q.semanticKey)errors.push(`missing content: ${q.id}`);
    if(!Array.isArray(q.o)||q.o.length!==4||new Set(q.o.map(String)).size!==4)errors.push(`invalid choices: ${q.id}`);
    if(!Number.isInteger(q.a)||q.a<0||q.a>3)errors.push(`invalid answer key: ${q.id}`);
    if((q.d==='處理速度')!==(Number(q.limit)>0))errors.push(`timing mismatch: ${q.id}`);
    if(q.d==='視覺空間'&&!String(q.visual||'').includes('<svg'))errors.push(`missing spatial SVG: ${q.id}`);
    if(q.type==='memory'&&!q.stim)errors.push(`missing memory stimulus: ${q.id}`);
    if(q.type==='matrix'&&q.cells?.length!==9)errors.push(`invalid matrix: ${q.id}`);
    signatures.add(JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].sort()]));
    semantics.add(q.semanticKey);
  }
  if(bank.length!==5124)errors.push(`expected 5124 items, got ${bank.length}`);
  if(semantics.size!==294)errors.push(`expected 294 semantic templates, got ${semantics.size}`);
  if(bank.filter(q=>q.d==='視覺空間'&&String(q.visual||'').includes('<svg')).length!==1008)errors.push('all 1008 spatial items must have SVG diagrams');
  if(errors.length)throw new Error(errors.slice(0,40).join('; '));

  function shuffle(xs,random=Math.random){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function validateForm(form){
    const out=[];if(form.length!==30)out.push('form must contain 30 items');
    const ids=new Set();
    for(const q of form){if(ids.has(q.id))out.push(`duplicate item: ${q.id}`);ids.add(q.id);}
    for(const d of domains){
      const group=form.filter(q=>q.d===d);if(group.length!==5)out.push(`domain quota: ${d}`);
      if(new Set(group.map(q=>q.taskFamily)).size!==5)out.push(`family diversity: ${d}`);
      for(const [level,count] of Object.entries({easy:2,medium:2,hard:1}))if(group.filter(q=>q.difficulty===level).length!==count)out.push(`difficulty quota: ${d}/${level}`);
    }
    return {ok:!out.length,errors:out};
  }
  function selectForm({history=[],random=Math.random,pool=bank}={}){
    const recent=new Set(history.slice(-8).flat()),selected=[];
    for(const d of shuffle(domains,random)){
      const families=shuffle([...new Set(pool.filter(q=>q.d===d).map(q=>q.taskFamily))],random).slice(0,5);
      const tiers=shuffle(['easy','easy','medium','medium','hard'],random);
      families.forEach((family,i)=>{
        const variants=shuffle([...new Set(pool.filter(q=>q.d===d&&q.taskFamily===family).map(q=>q.semanticKey))],random);
        let candidates=[];
        for(const key of variants){
          const c=pool.filter(q=>q.d===d&&q.taskFamily===family&&q.semanticKey===key&&q.difficulty===tiers[i]);
          if(c.length){candidates=c;break;}
        }
        const fresh=candidates.filter(q=>!recent.has(q.id)),q=shuffle(fresh.length?fresh:candidates,random)[0];
        if(!q)throw new Error(`No eligible QB5 item: ${d}/${family}/${tiers[i]}`);selected.push(q);
      });
    }
    const form=shuffle(selected,random),report=validateForm(form);if(!report.ok)throw new Error(report.errors.join('; '));return form;
  }

  const historyKey=`cognitive-iq-lab:form-history:${VERSION}`;let history=[];
  try{const raw=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(raw))history=raw.filter(Array.isArray).slice(-8);}catch{}
  const form=selectForm({history});
  try{localStorage.setItem(historyKey,JSON.stringify([...history,form.map(q=>q.id)].slice(-8)));}catch{}
  window.IQ_QUESTIONS=form;
  window.IQ_BANK_VALIDATION={ok:true,errors:[],total:bank.length,uniqueTaskSignatures:signatures.size,semanticTemplates:semantics.size};
  window.IQ_DIVERSITY={...(window.IQ_DIVERSITY||{}),selectForm,validateForm,semanticTemplates:semantics.size,familyDistinctPerDomain:true};
  window.IQ_BANK_META={
    ...(window.IQ_BANK_META||{}),version:VERSION,revision:REVISION,totalItems:bank.length,selectedItems:30,domains:6,taskFamilies:42,
    semanticTemplates:semantics.size,spatialSvgItems:1008,verbalArchetypesPerFamily:2,otherArchetypesPerFamily:8,
    generation:'84-verbal-items-plus-5040-controlled-construct-variants',constructExpansion:'QB5',
    difficultyPolicy:'tier-specific span, operation count and constraint load',calibrationStatus:'uncalibrated',recentFormAvoidance:8
  };
  window.IQ_QB5={version:REVISION,semanticTemplates:semantics.size,uniqueTaskSignatures:signatures.size,spatialSvgItems:1008,
    principle:'construct diversity first; psychometric calibration still pending'};
})();