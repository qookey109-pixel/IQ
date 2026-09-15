// Cognitive IQ Lab — optional 56-slot matrix-sampled calibration form runtime.
// Default users keep the standard randomized 42-item form. Research mode is opt-in via URL/UI.
(() => {
  'use strict';

  const core=window.IQ_CALIBRATION_MATRIX_CORE;
  const anchorCore=window.IQ_CALIBRATION_ANCHOR_CORE;
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  if(!core||!anchorCore||bank.length!==2058)return;

  const SOURCE_KEY_STORAGE='cognitive-iq-lab:calibration-source-key';
  const EPOCH_KEY=`cognitive-iq-lab:matrix-epoch:${window.IQ_BANK_META?.version||'QB5'}`;

  function sourceKey(){
    try{
      let key=localStorage.getItem(SOURCE_KEY_STORAGE);
      if(!key){
        key=globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():`local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(SOURCE_KEY_STORAGE,key);
      }
      return key;
    }catch{return 'local-unavailable';}
  }

  function currentEpoch(){
    try{
      const n=Number(localStorage.getItem(EPOCH_KEY)||'0');
      return Number.isInteger(n)&&n>=0?n:0;
    }catch{return 0;}
  }

  function isMatrixMode(){
    try{
      const params=new URLSearchParams(window.location.search||'');
      return params.get('calibration')==='matrix';
    }catch{return false;}
  }

  function setMatrixMode(enabled){
    const url=new URL(window.location.href);
    if(enabled)url.searchParams.set('calibration','matrix');
    else url.searchParams.delete('calibration');
    window.location.assign(url.toString());
  }

  const anchors=anchorCore.selectAnchorSet(bank);
  const reservedIds=anchors.map(x=>x.id);
  let meta={
    version:core.VERSION,
    mode:'production-random',
    active:false,
    cycleLength:core.CYCLE_LENGTH,
    reservedAnchorIds:[...reservedIds],
    formId:null,
    slot:null,
    epoch:null,
    coverage:null
  };

  if(isMatrixMode()){
    const key=sourceKey();
    const epoch=currentEpoch();
    const built=core.buildForm(bank,{sourceKey:key,epoch,reservedIds});
    if(!built.validation.ok)throw new Error(built.validation.errors.join('; '));
    window.IQ_QUESTIONS=built.form;
    if(window.QB5E)window.QB5E.selected=built.form;
    window.IQ_FORM_EQUIVALENCE_LAST=window.IQ_DIVERSITY?.evaluate?window.IQ_DIVERSITY.evaluate(built.form):window.IQ_FORM_EQUIVALENCE_LAST;
    window.QB5_FORM_META={
      formId:built.formId,
      mode:'calibration-matrix',
      matrixVersion:core.VERSION,
      matrixSlot:built.slot,
      matrixEpoch:built.epoch,
      sourceSlotMethod:'hash(sourceKey) mod 56',
      anchorReserveVersion:anchorCore.VERSION,
      reservedAnchorIds:[...reservedIds]
    };
    meta={...meta,active:true,mode:'calibration-matrix',formId:built.formId,slot:built.slot,epoch:built.epoch,coverage:built.coverage};
  }else if(!window.QB5_FORM_META){
    window.QB5_FORM_META={formId:null,mode:'production-random',anchorReserveVersion:anchorCore.VERSION,reservedAnchorIds:[...reservedIds]};
  }

  function hasBrowserDom(){
    return typeof document!=='undefined'&&typeof document.querySelector==='function'&&typeof document.createElement==='function';
  }

  function installUi(){
    if(!hasBrowserDom())return;
    const actions=document.querySelector('#start .actions');
    if(!actions||document.getElementById('matrixCalibrationModeBtn'))return;
    const btn=document.createElement('button');
    btn.id='matrixCalibrationModeBtn';
    btn.type='button';
    btn.className='btn ghost';
    btn.textContent=meta.active?'退出校準研究模式':'校準研究模式';
    btn.title=meta.active?'返回一般隨機 42 題模式':'使用 56 槽位 matrix sampling 的 42 題研究卷；CPI 計分規則不變。';
    btn.addEventListener('click',()=>setMatrixMode(!meta.active));
    actions.appendChild(btn);

    if(meta.active){
      const note=document.createElement('div');
      note.id='matrixCalibrationModeNotice';
      note.style.cssText='margin:14px 0 0;padding:12px 14px;border:1px solid rgba(78,111,92,.24);border-radius:14px;background:rgba(244,251,246,.88);font-size:13px;line-height:1.6;color:#40594a';
      note.innerHTML=`<strong>校準研究模式已開啟</strong> · Matrix slot ${meta.slot+1}/${core.CYCLE_LENGTH}。正式測驗仍是 42 題、CPI 計分不變；若在年齡頁勾選自願校準研究，完成後會再做 6 題固定 Anchor。`;
      actions.insertAdjacentElement('afterend',note);
    }
  }

  window.IQ_CALIBRATION_MATRIX={...meta,setMatrixMode,isMatrixMode,sourceKey,currentEpoch};
  if(hasBrowserDom()){
    if(document.readyState==='loading'&&typeof document.addEventListener==='function')document.addEventListener('DOMContentLoaded',installUi,{once:true});
    else installUi();
  }
})();
