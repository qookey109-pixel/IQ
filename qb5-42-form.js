// Cognitive IQ Lab — 42-item production form selector
// 6 domains × 7 task families = 42 items; each domain uses all seven families once.
// Calibration anchor items are reserved from scored forms so the post-test anchor block stays stable.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(bank.length!==2058)return;
  const DOMAINS=['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const TIERS=['easy','easy','medium','medium','medium','hard','hard'];
  const shuffle=(xs,random=Math.random)=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const load=q=>Number.isFinite(Number(q?.formLoad))?Number(q.formLoad):(q?.difficulty==='hard'?3:q?.difficulty==='medium'?2:1);

  const anchorCore=window.IQ_CALIBRATION_ANCHOR_CORE||null;
  const reservedCalibrationAnchors=anchorCore?anchorCore.selectAnchorSet(bank):[];
  const reservedCalibrationAnchorIds=new Set(reservedCalibrationAnchors.map(x=>x.id));
  const productionPool=bank.filter(q=>!reservedCalibrationAnchorIds.has(q.id));

  const targets={};
  for(const domain of DOMAINS){
    const group=productionPool.filter(q=>q.d===domain);
    const mean=level=>{const xs=group.filter(q=>q.difficulty===level).map(load);return xs.reduce((a,b)=>a+b,0)/(xs.length||1);};
    const easy=mean('easy'),medium=mean('medium'),hard=mean('hard');
    targets[domain]={easy,medium,hard,total:2*easy+3*medium+2*hard};
  }

  function evaluate(form){
    let squared=0,maxAbsPct=0;const domains={};
    for(const domain of DOMAINS){
      const total=form.filter(q=>q.d===domain).reduce((sum,q)=>sum+load(q),0);
      const target=targets[domain].total||1,delta=total-target,pct=delta/target;
      squared+=pct*pct;maxAbsPct=Math.max(maxAbsPct,Math.abs(pct));
      domains[domain]={total:+total.toFixed(3),target:+target.toFixed(3),delta:+delta.toFixed(3),deltaPct:+(pct*100).toFixed(2)};
    }
    return {rmsPct:+(Math.sqrt(squared/DOMAINS.length)*100).toFixed(2),maxAbsPct:+(maxAbsPct*100).toFixed(2),domains};
  }

  function validateForm(form){
    const errors=[];
    if(!Array.isArray(form)||form.length!==42)errors.push('form must contain 42 items');
    const ids=new Set((form||[]).map(q=>q.id));if(ids.size!==42)errors.push('form must contain 42 unique item IDs');
    if((form||[]).some(q=>reservedCalibrationAnchorIds.has(q.id)))errors.push('formal form must not contain reserved calibration anchors');
    for(const domain of DOMAINS){
      const group=(form||[]).filter(q=>q.d===domain);
      if(group.length!==7)errors.push(`domain quota: ${domain}`);
      if(new Set(group.map(q=>q.taskFamily)).size!==7)errors.push(`family coverage: ${domain}`);
      for(const [level,count] of Object.entries({easy:2,medium:3,hard:2}))if(group.filter(q=>q.difficulty===level).length!==count)errors.push(`difficulty quota: ${domain}/${level}`);
    }
    return {ok:errors.length===0,errors};
  }

  function generateCandidate({history=[],random=Math.random,pool=productionPool}={}){
    const recent=new Set(history.slice(-8).flat());
    const activePool=(Array.isArray(pool)?pool:productionPool).filter(q=>!reservedCalibrationAnchorIds.has(q.id));
    for(let attempt=0;attempt<160;attempt++){
      const selected=[];let failed=false;
      for(const domain of DOMAINS){
        const families=shuffle([...new Set(activePool.filter(q=>q.d===domain).map(q=>q.taskFamily))],random);
        if(families.length!==7){failed=true;break;}
        let assigned=null;
        for(let assignTry=0;assignTry<80&&!assigned;assignTry++){
          const tiers=shuffle(TIERS,random),picks=[];let ok=true;
          for(let i=0;i<families.length;i++){
            const candidates=activePool.filter(q=>q.d===domain&&q.taskFamily===families[i]&&q.difficulty===tiers[i]);
            if(!candidates.length){ok=false;break;}
            const fresh=candidates.filter(q=>!recent.has(q.id));
            picks.push(shuffle(fresh.length?fresh:candidates,random)[0]);
          }
          if(ok)assigned=picks;
        }
        if(!assigned){failed=true;break;}
        selected.push(...assigned);
      }
      if(!failed&&validateForm(selected).ok)return selected;
    }
    throw new Error('Unable to construct legal 42-item QB5 form');
  }

  function selectForm({history=[],random=Math.random,pool=productionPool}={}){
    let best=null;
    for(let i=0;i<64;i++){
      const form=generateCandidate({history,random,pool}),metrics=evaluate(form),score=metrics.maxAbsPct*10+metrics.rmsPct;
      if(!best||score<best.score)best={form,metrics,score};
    }
    const form=shuffle(best.form,random),report=validateForm(form);
    if(!report.ok)throw new Error(report.errors.join('; '));
    window.IQ_FORM_EQUIVALENCE_LAST={...best.metrics,trials:64,blueprint:'6x7 / 2 easy + 3 medium + 2 hard'};
    return form;
  }

  const historyKey=`cognitive-iq-lab:form-history:${window.IQ_BANK_META?.version||'QB-2026.09.5'}:42`;
  let history=[];
  try{const raw=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(raw))history=raw.filter(x=>Array.isArray(x)&&x.length===42).slice(-8);}catch{}
  const form=selectForm({history});
  try{localStorage.setItem(historyKey,JSON.stringify([...history,form.map(q=>q.id)].slice(-8)));}catch{}
  window.IQ_QUESTIONS=form;
  if(window.QB5E)window.QB5E.selected=form;
  window.IQ_DIVERSITY={...(window.IQ_DIVERSITY||{}),selectForm,generateCandidate,validateForm,evaluate,productionPool,reservedCalibrationAnchorIds:[...reservedCalibrationAnchorIds],productionFormSize:42,familyDistinctPerDomain:true};
  window.IQ_BANK_META={...(window.IQ_BANK_META||{}),totalItems:2058,activeProductionItems:productionPool.length,reservedCalibrationAnchors:reservedCalibrationAnchors.length,selectedItems:42,surfaceVariantsPerConstruct:7,bankTopology:'294x7=2058',formBlueprint:'6 domains x 7 families; 2 easy + 3 medium + 2 hard'};
  window.IQ_42_FORM={version:'F42-2026.09.2',items:42,domains:6,itemsPerDomain:7,familiesPerDomain:7,difficulty:{easy:2,medium:3,hard:2},targets,anchorReserve:{version:anchorCore?.VERSION||null,count:reservedCalibrationAnchors.length,ids:reservedCalibrationAnchors.map(x=>x.id),fingerprints:reservedCalibrationAnchors.map(x=>x.fingerprint)}};
})();
