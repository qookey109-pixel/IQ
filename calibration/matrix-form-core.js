(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.IQ_CALIBRATION_MATRIX_CORE=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  const VERSION='CIL-MATRIX-2026.09.1';
  const CYCLE_LENGTH=56;
  const DOMAINS=['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const TIERS=['easy','medium','hard'];
  const TIER_QUOTA={easy:2,medium:3,hard:2};

  function hash32(value){
    let h=0x811c9dc5;
    const s=String(value??'');
    for(let i=0;i<s.length;i++){
      h^=s.charCodeAt(i);
      h=Math.imul(h,0x01000193)>>>0;
    }
    return h>>>0;
  }

  function ordered(xs){
    return [...xs].sort((a,b)=>{
      const ka=[a.semanticKey||'',String(a.surfaceVariant??''),a.id||''].join('|');
      const kb=[b.semanticKey||'',String(b.surfaceVariant??''),b.id||''].join('|');
      return ka.localeCompare(kb,'en');
    });
  }

  function enumerateAssignments(families,pools){
    const out=[];
    const current=[];
    const counts={easy:0,medium:0,hard:0};
    function walk(i){
      if(i===families.length){
        if(TIERS.every(t=>counts[t]===TIER_QUOTA[t]))out.push([...current]);
        return;
      }
      const family=families[i];
      for(const tier of TIERS){
        if(counts[tier]>=TIER_QUOTA[tier])continue;
        if(!(pools[family]?.[tier]?.length))continue;
        counts[tier]+=1;current.push(tier);walk(i+1);current.pop();counts[tier]-=1;
      }
    }
    walk(0);
    return out;
  }

  function assignmentScore({assignment,families,pools,usage,slot}){
    let score=0;
    const seen=slot+1;
    for(let i=0;i<families.length;i++){
      const family=families[i],chosen=assignment[i];
      const total=TIERS.reduce((sum,t)=>sum+(pools[family][t]?.length||0),0)||1;
      for(const tier of TIERS){
        const before=usage[family][tier]||0;
        const after=before+(tier===chosen?1:0);
        const target=seen*((pools[family][tier]?.length||0)/total);
        const delta=after-target;
        score+=(delta*delta)/(target+0.75);
      }
    }
    const key=assignment.join('|');
    return score+(hash32(`${VERSION}|${slot}|${key}`)/0xffffffff)*1e-7;
  }

  function buildDomainCycle(bank,domain,{reservedIds=[],cycleLength=CYCLE_LENGTH,epoch=0}={}){
    const reserved=new Set(reservedIds||[]);
    const group=(Array.isArray(bank)?bank:[]).filter(q=>q.d===domain&&!reserved.has(q.id));
    const families=[...new Set(group.map(q=>q.taskFamily))].sort();
    if(families.length!==7)throw new Error(`${domain}: expected seven task families, got ${families.length}`);

    const pools={};
    const usage={};
    const itemExposure=new Map();
    for(const family of families){
      pools[family]={};usage[family]={easy:0,medium:0,hard:0};
      for(const tier of TIERS)pools[family][tier]=ordered(group.filter(q=>q.taskFamily===family&&q.difficulty===tier));
    }
    const assignments=enumerateAssignments(families,pools);
    if(!assignments.length)throw new Error(`${domain}: no legal 2/3/2 family-tier assignment`);

    const forms=[];
    const tierAssignments=[];
    for(let slot=0;slot<cycleLength;slot++){
      let best=null;
      for(const assignment of assignments){
        const score=assignmentScore({assignment,families,pools,usage,slot});
        if(!best||score<best.score)best={assignment,score};
      }
      const picks=[];
      for(let i=0;i<families.length;i++){
        const family=families[i],tier=best.assignment[i],candidates=pools[family][tier];
        const occurrence=usage[family][tier];
        const offset=(hash32(`${VERSION}|${domain}|${family}|${tier}`)+Math.max(0,Number(epoch)||0)*17)%candidates.length;
        const q=candidates[(offset+occurrence)%candidates.length];
        if(!q)throw new Error(`${domain}/${family}/${tier}: missing matrix candidate`);
        picks.push(q);
        usage[family][tier]+=1;
        itemExposure.set(q.id,(itemExposure.get(q.id)||0)+1);
      }
      forms.push(picks);
      tierAssignments.push([...best.assignment]);
    }

    return {
      domain,families,forms,tierAssignments,usage,
      uniqueItems:itemExposure.size,
      itemExposure:Object.fromEntries([...itemExposure.entries()].sort((a,b)=>a[0].localeCompare(b[0],'en')))
    };
  }

  function validateForm(form,{reservedIds=[]}={}){
    const errors=[];
    const reserved=new Set(reservedIds||[]);
    const xs=Array.isArray(form)?form:[];
    if(xs.length!==42)errors.push(`form must contain 42 items, got ${xs.length}`);
    if(new Set(xs.map(q=>q.id)).size!==xs.length)errors.push('form item IDs must be unique');
    if(xs.some(q=>reserved.has(q.id)))errors.push('matrix form contains reserved anchor item');
    for(const domain of DOMAINS){
      const group=xs.filter(q=>q.d===domain);
      if(group.length!==7)errors.push(`${domain}: expected 7 items`);
      if(new Set(group.map(q=>q.taskFamily)).size!==7)errors.push(`${domain}: all 7 families must appear once`);
      for(const tier of TIERS){
        const n=group.filter(q=>q.difficulty===tier).length;
        if(n!==TIER_QUOTA[tier])errors.push(`${domain}/${tier}: expected ${TIER_QUOTA[tier]}, got ${n}`);
      }
    }
    return {ok:errors.length===0,errors};
  }

  function buildCycle(bank,{reservedIds=[],cycleLength=CYCLE_LENGTH,epoch=0}={}){
    const byDomain=DOMAINS.map(domain=>buildDomainCycle(bank,domain,{reservedIds,cycleLength,epoch}));
    const forms=[];
    for(let slot=0;slot<cycleLength;slot++){
      const form=byDomain.flatMap(row=>row.forms[slot]);
      const validation=validateForm(form,{reservedIds});
      if(!validation.ok)throw new Error(`slot ${slot}: ${validation.errors.join('; ')}`);
      forms.push(form);
    }
    const exposure=new Map();
    for(const form of forms)for(const q of form)exposure.set(q.id,(exposure.get(q.id)||0)+1);
    const counts=[...exposure.values()];
    return {
      version:VERSION,cycleLength,epoch,forms,byDomain,
      coverage:{
        uniqueItems:exposure.size,
        totalResponses:forms.length*42,
        minExposure:counts.length?Math.min(...counts):0,
        maxExposure:counts.length?Math.max(...counts):0,
        meanExposure:counts.length?counts.reduce((a,b)=>a+b,0)/counts.length:0
      }
    };
  }

  function slotForSource(sourceKey){
    return hash32(`${VERSION}|${String(sourceKey||'')}`)%CYCLE_LENGTH;
  }

  function buildForm(bank,{sourceKey='',slot=null,epoch=0,reservedIds=[]}={}){
    const resolvedSlot=Number.isInteger(slot)?((slot%CYCLE_LENGTH)+CYCLE_LENGTH)%CYCLE_LENGTH:slotForSource(sourceKey);
    const cycle=buildCycle(bank,{reservedIds,cycleLength:CYCLE_LENGTH,epoch});
    return {
      version:VERSION,
      formId:`matrix:${VERSION}:epoch-${epoch}:slot-${String(resolvedSlot).padStart(2,'0')}`,
      slot:resolvedSlot,
      epoch,
      form:cycle.forms[resolvedSlot],
      validation:validateForm(cycle.forms[resolvedSlot],{reservedIds}),
      coverage:cycle.coverage
    };
  }

  return {VERSION,CYCLE_LENGTH,DOMAINS:[...DOMAINS],TIERS:[...TIERS],TIER_QUOTA:{...TIER_QUOTA},hash32,enumerateAssignments,buildDomainCycle,buildCycle,buildForm,validateForm,slotForSource};
});
