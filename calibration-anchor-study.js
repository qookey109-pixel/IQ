// Cognitive IQ Lab — optional six-item post-test calibration anchor block.
// The formal assessment remains exactly 42 scored items. Anchors are unscored, opt-in,
// local-only, and are appended to the existing calibration-study session for linking.
(() => {
  'use strict';

  const core=window.IQ_CALIBRATION_ANCHOR_CORE;
  if(!core)return;
  const OPT_IN_KEY='cognitive-iq-lab:calibration-anchor-optin:v1';
  const BLOCK_VERSION='CAS-2026.09.1';
  let launched=false;
  let anchors=[];
  let index=0;
  let rows=[];
  let answerStartedAt=0;
  let intervalId=null;
  let revealTimer=null;
  let deadline=null;
  let blockId=null;
  let persisted=false;

  function readOptIn(){
    try{return localStorage.getItem(OPT_IN_KEY)==='1';}catch{return false;}
  }
  function writeOptIn(value){
    try{localStorage.setItem(OPT_IN_KEY,value?'1':'0');}catch{}
  }
  function clearTimers(){
    if(intervalId)clearInterval(intervalId);
    if(revealTimer)clearTimeout(revealTimer);
    intervalId=null;revealTimer=null;deadline=null;
  }
  function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function sourceSession(){
    const study=window.IQ_CALIBRATION_STUDY;
    if(!study?.loadStore)return null;
    const store=study.loadStore();
    const sessions=Array.isArray(store.sessions)?store.sessions:[];
    const session=sessions[sessions.length-1]||null;
    return session?{study,store,session}:null;
  }

  function installOptIn(){
    const age=document.getElementById('pretestAge');
    const actions=age?.querySelector('.pretestActions');
    if(!age||!actions||document.getElementById('calibrationAnchorOptIn'))return;
    const box=document.createElement('div');
    box.id='calibrationAnchorOptIn';
    box.className='calibrationAnchorOptIn';
    box.innerHTML=`
      <label class="calibrationAnchorChoice">
        <input id="calibrationAnchorCheckbox" type="checkbox" ${readOptIn()?'checked':''}>
        <span><strong>自願參與校準研究</strong><small>完成 42 題正式測驗後，再做 6 題不計分 Anchor。用途是讓不同題組能連到同一量尺；不影響 CPI，也不會自動上傳。</small></span>
      </label>`;
    actions.insertAdjacentElement('beforebegin',box);
    document.getElementById('calibrationAnchorCheckbox')?.addEventListener('change',e=>writeOptIn(Boolean(e.target.checked)));
  }

  function buildPanel(){
    if(document.getElementById('calibrationAnchorPanel'))return;
    const result=document.getElementById('result');
    if(!result)return;
    const panel=document.createElement('section');
    panel.id='calibrationAnchorPanel';
    panel.className='card screenPanel hidden calibrationAnchorPanel';
    panel.innerHTML=`
      <div class="anchorHeader">
        <div><div class="sectionKicker">CALIBRATION STUDY · UNSCORED</div><div id="anchorProgress" class="counter">校準 1 / 6</div></div>
        <div id="anchorBadge" class="practiceBadge">不計分</div>
      </div>
      <p class="anchorIntro">這 6 題是跨題組共同 Anchor，只用於未來 IRT／常模研究。答案不會改變你剛完成的 42 題 CPI，也不會顯示正解回饋。</p>
      <div id="anchorVisual" class="anchorVisual"></div>
      <div id="anchorStimulus" class="practiceStimulus hidden"></div>
      <h2 id="anchorQuestion"></h2>
      <p id="anchorHelp" class="pretestLead"></p>
      <div id="anchorOptions" class="practiceOptions"></div>
      <div class="pretestActions"><button id="anchorSkipBtn" class="btn secondary">跳過研究題，查看結果</button></div>`;
    result.insertAdjacentElement('beforebegin',panel);
    document.getElementById('anchorSkipBtn')?.addEventListener('click',()=>finishAnchorBlock('skipped'));
  }

  function hideAllButAnchor(){
    for(const id of ['start','pretestAge','pretestIntro','pretestPractice','quiz','result'])document.getElementById(id)?.classList.add('hidden');
    document.getElementById('calibrationAnchorPanel')?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showResult(){
    clearTimers();
    document.getElementById('calibrationAnchorPanel')?.classList.add('hidden');
    document.getElementById('result')?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function matrixHtml(cells){
    if(!Array.isArray(cells)||!cells.length)return '';
    return `<div class="matrixGrid">${cells.map(cell=>`<div class="matrixCell${cell==='?'?' missing':''}">${esc(cell)}</div>`).join('')}</div>`;
  }

  function renderVisual(q){
    const holder=document.getElementById('anchorVisual');
    if(!holder)return;
    holder.innerHTML='';
    if(Array.isArray(q.cells)&&q.cells.length)holder.innerHTML=matrixHtml(q.cells);
    else if(q.visual)holder.innerHTML=`<div class="visual">${q.visual}</div>`;
  }

  function renderOptions(anchor){
    const q=anchor.question;
    const holder=document.getElementById('anchorOptions');
    holder.innerHTML='';
    q.o.forEach((opt,choice)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='option anchorOption';
      button.innerHTML=`<span style="opacity:.55;margin-right:8px">${String.fromCharCode(65+choice)}.</span>${esc(opt)}`;
      button.addEventListener('click',()=>submitAnchor(choice,false));
      holder.appendChild(button);
    });
    answerStartedAt=Date.now();
  }

  function startTimedAnchor(seconds){
    deadline=Date.now()+seconds*1000;
    const badge=document.getElementById('anchorBadge');
    const tick=()=>{
      const left=Math.max(0,deadline-Date.now());
      if(badge)badge.textContent=`不計分 · 倒數 ${Math.ceil(left/1000)} 秒`;
      if(left<=0){clearTimers();submitAnchor(null,true);}
    };
    tick();
    intervalId=setInterval(tick,120);
  }

  function showQuestion(anchor){
    const q=anchor.question;
    document.getElementById('anchorQuestion').textContent=q.q;
    const timed=Number(q.limit)>0;
    document.getElementById('anchorHelp').textContent=timed?'此 Anchor 沿用正式題的 18 秒操作規則，但完全不計 CPI。':'請依題目作答；此 Anchor 不計 CPI。';
    renderOptions(anchor);
    if(timed)startTimedAnchor(Number(q.limit));
    else document.getElementById('anchorBadge').textContent='不計分 · 作答不限時';
  }

  function renderAnchor(){
    clearTimers();
    const anchor=anchors[index];
    if(!anchor){finishAnchorBlock('completed');return;}
    const q=anchor.question;
    document.getElementById('anchorProgress').textContent=`校準 ${index+1} / ${anchors.length} · ${anchor.domain}`;
    document.getElementById('anchorOptions').innerHTML='';
    document.getElementById('anchorQuestion').textContent='';
    document.getElementById('anchorHelp').textContent='';
    document.getElementById('anchorStimulus').classList.add('hidden');
    renderVisual(q);

    if(q.type==='memory'){
      const seconds=window.IQ_MEMORY_EXPOSURE_POLICY?.getSeconds?.(q)||5;
      const stim=document.getElementById('anchorStimulus');
      stim.textContent=String(q.stim||'');
      stim.classList.remove('hidden');
      document.getElementById('anchorQuestion').textContent='先記住以下內容';
      document.getElementById('anchorHelp').textContent=`內容顯示 ${seconds} 秒，只呈現一次；之後作答不限時。`;
      document.getElementById('anchorBadge').textContent=`不計分 · 記憶 ${seconds} 秒`;
      revealTimer=setTimeout(()=>{
        stim.textContent='••••••';
        showQuestion(anchor);
      },seconds*1000);
    }else showQuestion(anchor);
  }

  function submitAnchor(choice,timedOut){
    const anchor=anchors[index];
    if(!anchor)return;
    if(deadline!=null&&!timedOut&&Date.now()>=deadline){clearTimers();return submitAnchor(null,true);}
    const q=anchor.question;
    const spent=answerStartedAt?Math.max(0,(Date.now()-answerStartedAt)/1000):0;
    clearTimers();
    rows.push({
      itemId:String(q.id||''),domain:String(q.d||''),family:q.taskFamily||null,semanticKey:q.semanticKey||null,
      difficulty:q.difficulty||null,selectedOption:Number.isInteger(choice)?choice:null,correctOption:q.a,
      correct:Number.isInteger(choice)&&choice===q.a?1:0,skipped:Number.isInteger(choice)?0:1,timeout:timedOut?1:0,
      seconds:Math.round(spent*10)/10,anchorVersion:core.VERSION,anchorRole:anchor.role,anchorFingerprint:anchor.fingerprint,
      primaryAnchorId:anchor.primaryId,primaryAnchorFingerprint:anchor.primaryFingerprint
    });
    index+=1;
    setTimeout(renderAnchor,140);
  }

  function persist(status){
    if(persisted)return;
    persisted=true;
    const source=sourceSession();
    if(!source)return;
    const {study,store,session}=source;
    if(session.anchorStudy?.blockId===blockId)return;
    const formalIds=new Set((session.rows||[]).filter(r=>!String(r.formId||'').startsWith('anchor:')).map(r=>r.itemId));
    const anchorRows=rows.map(row=>({
      schemaVersion:1,sourceKey:session.sourceKey,sessionId:session.sessionId,ageYears:session.ageYears,ageBand:session.ageBand,
      bankVersion:session.bankVersion,bankRevision:session.bankRevision,scoringVersion:session.scoringVersion,
      formId:`anchor:${core.VERSION}`,recordType:'anchor',...row,cpi:session.cpi,iqEstimate:null
    }));
    session.rows=Array.isArray(session.rows)?session.rows:[];
    session.rows.push(...anchorRows);
    session.anchorStudy={
      version:BLOCK_VERSION,anchorVersion:core.VERSION,blockId,status,optIn:true,
      completed:status==='completed',answeredRows:anchorRows.length,plannedAnchors:anchors.length,
      formalItemOverlap:anchorRows.filter(r=>formalIds.has(r.itemId)).length,
      anchors:anchors.map(a=>({id:a.id,domain:a.domain,role:a.role,fingerprint:a.fingerprint,primaryId:a.primaryId}))
    };
    store.updatedAt=new Date().toISOString();
    try{localStorage.setItem(study.storageKey,JSON.stringify(store));}catch(error){console.warn('Unable to persist anchor calibration block',error);}
  }

  function resultNotice(status){
    const result=document.getElementById('result');
    if(!result)return;
    let note=document.getElementById('anchorStudyResultNotice');
    if(!note){
      note=document.createElement('div');
      note.id='anchorStudyResultNotice';
      note.className='anchorStudyResultNotice';
      result.querySelector('.resultHeading')?.insertAdjacentElement('afterend',note);
    }
    note.textContent=status==='completed'?'校準研究：6 題 Anchor 已完成；不影響 CPI。':'校準研究：已跳過或部分完成；不影響 CPI。';
  }

  function finishAnchorBlock(status){
    clearTimers();
    persist(status);
    resultNotice(status);
    showResult();
  }

  function beginAnchorBlock(){
    if(launched||!readOptIn())return;
    const source=sourceSession();
    if(!source)return;
    const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
    const formalIds=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS.map(q=>q.id):[];
    try{
      anchors=core.selectAnchorSet(bank,{excludeIds:formalIds});
      const validation=core.validateAnchorSet(anchors,{excludeIds:formalIds});
      if(!validation.ok)throw new Error(validation.errors.join('; '));
    }catch(error){console.error('Calibration anchor selection failed',error);return;}
    launched=true;index=0;rows=[];persisted=false;blockId=`anchor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    buildPanel();hideAllButAnchor();renderAnchor();
  }

  function installStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .calibrationAnchorOptIn{margin:16px 0 8px;padding:16px 18px;border:1px solid var(--line);border-radius:18px;background:rgba(255,252,244,.86)}
      .calibrationAnchorChoice{display:flex;gap:12px;align-items:flex-start;cursor:pointer}.calibrationAnchorChoice input{margin-top:5px;transform:scale(1.2)}
      .calibrationAnchorChoice span{display:grid;gap:4px}.calibrationAnchorChoice strong{color:var(--navy)}.calibrationAnchorChoice small{font-size:13px;line-height:1.55;color:var(--muted)}
      .calibrationAnchorPanel{max-width:1100px;margin-inline:auto;padding:clamp(24px,4vw,44px);overflow:auto}
      .anchorHeader{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.anchorIntro{line-height:1.65;color:var(--muted);max-width:820px}
      .anchorVisual{display:flex;justify-content:center;margin:12px 0}.anchorVisual .visual{max-width:min(100%,620px);width:100%}.anchorVisual svg{max-width:100%;height:auto}
      .calibrationAnchorPanel h2{font-size:clamp(28px,4vw,44px);line-height:1.18;color:var(--navy)}
      .anchorStudyResultNotice{margin:0 0 18px;padding:12px 15px;border-radius:14px;border:1px solid var(--line);background:#f7fbf8;color:#41614d;font-weight:800}
      @media(max-width:700px){.anchorHeader{flex-direction:column}.calibrationAnchorPanel .practiceOptions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  installOptIn();buildPanel();installStyles();
  if(typeof initState==='function'){
    const previousInit=initState;
    initState=function(){launched=false;persisted=false;clearTimers();return previousInit();};
  }
  if(typeof finishTest==='function'){
    const previousFinish=finishTest;
    finishTest=function(){
      const value=previousFinish();
      if(readOptIn())setTimeout(beginAnchorBlock,0);
      return value;
    };
  }

  window.IQ_CALIBRATION_ANCHOR_STUDY={
    version:BLOCK_VERSION,anchorVersion:core.VERSION,optInStorageKey:OPT_IN_KEY,plannedAnchors:6,
    isOptedIn:readOptIn,setOptIn:writeOptIn,beginAnchorBlock
  };
})();
