// Cognitive IQ Lab — final user-facing polish after the full-bank hygiene sweep.
// Presentation/choice wording only: preserve answer index, construct semantics and scoring.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const report={version:'FBP-2026.09.1',scopeBalanced:0,necessaryBalanced:0,fractionDisplayFixed:0,wordingFixed:0};
  const correctOf=q=>String(q.o?.[q.a]??q.correctContent??'');
  const install=(q,correct,wrong,reason)=>{
    const target=q.a,out=[];let wi=0;
    const cleanWrong=[...new Set(wrong.map(String))].filter(x=>x!==String(correct));
    if(cleanWrong.length<3)throw new Error(`full-bank polish: insufficient distractors for ${q.id}`);
    for(let i=0;i<4;i++)out.push(i===target?String(correct):cleanWrong[wi++]);
    q.o=out;q.correctContent=String(correct);q.fullBankPolishReason=reason;
  };

  for(const q of bank){
    if(q.taskFamily==='scope-negation'&&correctOf(q)==='至少有完成 A 的人沒有完成 B'){
      install(q,correctOf(q),[
        '所有完成 A 的人都沒有完成 B',
        '至少有完成 B 的人沒有完成 A',
        '所有完成 B 的人也都完成了 A'
      ],'scope-options-equal-length');
      report.scopeBalanced++;
    }

    if(q.taskFamily==='necessary-condition'){
      const c=correctOf(q),m=c.match(/^這位(.+?)(目前)?不具備(.+?)資格$/);
      if(m){
        const who=m[1],act=m[3];
        install(q,c,[
          `這位${who}已具備${act}資格`,
          `這位${who}一定會取得${act}資格`,
          `所有${who}都不具備${act}資格`
        ],'necessary-condition-balanced-detail');
        report.necessaryBalanced++;
      }
    }

    // Canonical probability display: 0 and 1 are clearer than 0/1 and 1/1.
    if(q.taskFamily==='quant-probability'){
      q.o=q.o.map(x=>{
        const s=String(x);
        if(s==='0/1'){report.fractionDisplayFixed++;return '0';}
        if(s==='1/1'){report.fractionDisplayFixed++;return '1';}
        return s;
      });
      q.correctContent=String(q.o[q.a]);
      q.e=String(q.e||'').replace(/\b0\/1\b/g,'0').replace(/\b1\/1\b/g,'1');
    }

    if(q.taskFamily==='invariant-transfer'&&String(q.q).includes('移動若干次後')){
      q.q=String(q.q).replace('移動若干次後','經過多次移動後');
      report.wordingFixed++;
    }
  }

  // Re-run the final option audit flags after polish so the report reflects what users actually see.
  if(window.IQ_OPTION_AUDIT?.optionCueFlags){
    let cueRiskItems=0;
    for(const q of bank){q.optionCueFlags=window.IQ_OPTION_AUDIT.optionCueFlags(q);if(q.optionCueFlags.length)cueRiskItems++;}
    if(window.IQ_OPTION_QUALITY_REPORT)window.IQ_OPTION_QUALITY_REPORT.cueRiskItems=cueRiskItems;
  }

  const byId=new Map(bank.map(q=>[q.id,q]));
  window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_FULL_BANK_POLISH=report;
  if(window.IQ_BANK_META)window.IQ_BANK_META.fullBankPolish=report.version;
})();