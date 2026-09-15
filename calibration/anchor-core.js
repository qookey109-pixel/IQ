(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.IQ_CALIBRATION_ANCHOR_CORE=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  const VERSION='CIL-ANCHOR-2026.09.1';
  const DOMAINS=['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];

  function hash32(value){
    let h=0x811c9dc5;
    const s=String(value??'');
    for(let i=0;i<s.length;i++){
      h^=s.charCodeAt(i);
      h=Math.imul(h,0x01000193)>>>0;
    }
    return h>>>0;
  }

  function canonicalQuestion(q){
    return JSON.stringify([
      String(q?.id||''),String(q?.d||''),String(q?.taskFamily||''),String(q?.semanticKey||''),
      String(q?.difficulty||''),String(q?.q||''),String(q?.stim||''),String(q?.visual||''),
      Array.isArray(q?.cells)?q.cells:[],Array.isArray(q?.o)?q.o.map(String):[],Number.isInteger(q?.a)?q.a:null
    ]);
  }

  function fingerprint(q){
    return hash32(canonicalQuestion(q)).toString(16).padStart(8,'0');
  }

  function eligible(q,domain){
    return q&&q.d===domain&&q.difficulty==='medium'&&q.id&&Array.isArray(q.o)&&q.o.length===4&&Number.isInteger(q.a)&&q.a>=0&&q.a<4;
  }

  function orderedCandidates(bank,domain){
    const xs=(Array.isArray(bank)?bank:[]).filter(q=>eligible(q,domain)).sort((a,b)=>{
      const ka=[a.taskFamily||'',a.semanticKey||'',a.id||''].join('|');
      const kb=[b.taskFamily||'',b.semanticKey||'',b.id||''].join('|');
      return ka.localeCompare(kb,'en');
    });
    if(!xs.length)return [];
    const start=hash32(`${VERSION}|${domain}|core`)%xs.length;
    return xs.slice(start).concat(xs.slice(0,start));
  }

  function selectAnchorSet(bank,{excludeIds=[]}={}){
    const excluded=new Set(excludeIds||[]);
    const anchors=[];
    for(const domain of DOMAINS){
      const ordered=orderedCandidates(bank,domain);
      if(!ordered.length)throw new Error(`No eligible medium anchor candidates for ${domain}`);
      const primary=ordered[0];
      let picked=null;
      let offset=0;
      for(let i=0;i<ordered.length;i++){
        if(!excluded.has(ordered[i].id)){picked=ordered[i];offset=i;break;}
      }
      if(!picked)throw new Error(`All anchor candidates excluded for ${domain}`);
      anchors.push({
        id:picked.id,
        domain,
        role:offset===0?'core':'bridge-fallback',
        fallbackOffset:offset,
        primaryId:primary.id,
        fingerprint:fingerprint(picked),
        primaryFingerprint:fingerprint(primary),
        question:picked
      });
      excluded.add(picked.id);
    }
    return anchors;
  }

  function validateAnchorSet(anchors,{excludeIds=[]}={}){
    const errors=[];
    if(!Array.isArray(anchors)||anchors.length!==DOMAINS.length)errors.push('anchor block must contain exactly six items');
    const xs=Array.isArray(anchors)?anchors:[];
    if(new Set(xs.map(x=>x.id)).size!==xs.length)errors.push('anchor IDs must be unique');
    if(new Set(xs.map(x=>x.domain)).size!==DOMAINS.length)errors.push('anchor block must cover all six domains');
    for(const domain of DOMAINS)if(!xs.some(x=>x.domain===domain))errors.push(`missing anchor domain: ${domain}`);
    const excluded=new Set(excludeIds||[]);
    for(const x of xs){
      if(excluded.has(x.id))errors.push(`anchor repeats formal item: ${x.id}`);
      if(x.question?.difficulty!=='medium')errors.push(`anchor must be medium difficulty: ${x.id}`);
      if(x.fingerprint!==fingerprint(x.question))errors.push(`anchor fingerprint mismatch: ${x.id}`);
    }
    return {ok:errors.length===0,errors};
  }

  return {VERSION,DOMAINS:[...DOMAINS],hash32,fingerprint,orderedCandidates,selectAnchorSet,validateAnchorSet};
});
