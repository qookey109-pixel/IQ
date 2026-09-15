// Cognitive IQ Lab — final user-facing polish after the full-bank hygiene sweep.
// Preserve construct semantics and scoring while improving wording, option balance,
// and screenshot-reported clarity problems before the final production form is built.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const report={
    version:'FBP-2026.09.2',
    scopeBalanced:0,
    necessaryBalanced:0,
    fractionDisplayFixed:0,
    wordingFixed:0,
    matrixClarityRebuilt:0,
    speedBoundaryWordingFixed:0,
    packingWordingFixed:0
  };
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const correctOf=q=>String(q.o?.[q.a]??q.correctContent??'');
  const install=(q,correct,wrong,reason)=>{
    const target=q.a,out=[];let wi=0;
    const cleanWrong=[...new Set(wrong.map(String))].filter(x=>x!==String(correct));
    if(cleanWrong.length<3)throw new Error(`full-bank polish: insufficient distractors for ${q.id}`);
    for(let i=0;i<4;i++)out.push(i===target?String(correct):cleanWrong[wi++]);
    q.o=out;q.correctContent=String(correct);q.fullBankPolishReason=reason;
  };

  function matrixRule(v){
    if(v===0)return {fn:(a,b)=>a-b,desc:'第一格減第二格'};
    if(v===1)return {fn:(a,b)=>a+b,desc:'前兩格相加'};
    if(v===2)return {fn:(a,b)=>2*a-b,desc:'第一格兩倍再減第二格'};
    if(v===3)return {fn:(a,b)=>a+2*b,desc:'第一格加第二格兩倍'};
    if(v===4)return {fn:(a,b)=>a*b,desc:'前兩格相乘'};
    if(v===5)return {fn:(a,b)=>Math.abs(a-b),desc:'前兩格差的絕對值'};
    if(v===6)return {fn:(a,b)=>Math.max(a,b)+1,desc:'較大者再加 1'};
    return {fn:(a,b)=>(a+b)/2,desc:'前兩格的平均'};
  }

  function rebuildMatrixClarity(q){
    const n=itemIndex(q);
    const v=Math.max(0,Number(q.constructVariant||1)-1);
    const surface=mod(n,18);
    const x=6+surface*2+v,y=2+mod(surface+v,5);
    const {fn,desc}=matrixRule(v);
    const rows=[];
    for(let r=0;r<4;r++){
      let a=x+r*2,b=y+r;
      if(v===7&&(a+b)%2!==0)a++;
      rows.push([a,b,fn(a,b)]);
    }
    const c=rows[3][2];
    const wrong=[c-2,c-1,c+1,c+2].filter(x=>x!==c);
    install(q,c,wrong,'matrix-three-complete-examples');
    q.q='觀察 4×3 數字矩陣。前三列完整顯示同一個規則；最後一列也遵循相同規則。問號應填多少？';
    q.type='matrix';
    q.cells=[...rows[0],...rows[1],...rows[2],rows[3][0],rows[3][1],'?'].map(String);
    q.e=`前三列都符合「${desc}」。把同一規則套到最後一列，缺失格為 ${c}。`;
    q.matrixClarityVersion='MC-2026.09.1';
    q.matrixClarityData={examples:3,targetRow:[rows[3][0],rows[3][1]],ruleVariant:v};
    report.matrixClarityRebuilt++;
  }

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

    // Safari screenshot QA: two complete rows were not enough evidence for a unique
    // intended matrix relationship. Keep the same rule archetype but show three
    // completed examples before asking for the fourth-row result.
    if(q.taskFamily==='matrix-difference'){
      rebuildMatrixClarity(q);
    }

    // "首尾" is concise but can be read as "the ends" rather than explicit positions.
    if(q.taskFamily==='speed-boundary'&&String(q.q).includes('首尾字母相同')){
      q.q=String(q.q).replace(/首尾字母相同/g,'第一個字母與最後一個字母相同');
      report.speedBoundaryWordingFixed++;
    }

    // Make floor-division packing intent explicit: only completely filled boxes count.
    if(String(q.q).includes('每箱放')&&String(q.q).includes('最多能裝滿幾箱？')){
      q.q=String(q.q).replace(
        '最多能裝滿幾箱？',
        '只計算完全裝滿的箱子（剩餘不足一箱不計），最多能裝滿幾箱？'
      );
      report.packingWordingFixed++;
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
