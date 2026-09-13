// Cognitive IQ Lab — Processing Speed Integrity v1
// Final production pass after Hard Construct Integrity.
// Keeps timed items perceptual: difficulty comes from scan length / visual similarity,
// not hidden mathematical induction or multi-step arithmetic.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const VERSION='PSI-2026.09.1';
  const report={version:VERSION,total:0,families:{},removedRuleLeakage:0,removedArithmeticLoad:0};
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;

  function shuffle(values,seed){
    const out=[...values];let state=(((seed+1)*2654435761)>>>0);
    for(let i=out.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function install(q,correct,wrong,reason){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const c=String(correct),seen=new Set([c]),clean=[];
    for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);clean.push(s);}}
    if(clean.length<3)throw new Error(`processing-speed integrity: insufficient distractors for ${q.id}`);
    const out=[];let wi=0;for(let i=0;i<4;i++)out.push(i===target?c:clean[wi++]);
    q.o=out;q.a=target;q.correctContent=c;q.processingSpeedIntegrityReason=reason;
    q.limit=18;q.type='normal';q.presentationMode='text-first';
    report.total++;report.families[q.taskFamily]=(report.families[q.taskFamily]||0)+1;
  }
  function mutateAt(s,pos,next){return s.slice(0,pos)+next+s.slice(pos+1);}
  function code(seed,len,mode=0){
    const letters='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='23456789',mixed='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out='';
    for(let i=0;i<len;i++){
      const pool=mode===1?(i%2===0?letters:digits):mixed;
      out+=pool[mod(seed*11+i*7+mode*13,pool.length)];
    }
    return out;
  }
  function nearMisses(target,seed){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',len=target.length,out=[],seen=new Set([target]);
    for(let k=0;out.length<3&&k<len*3;k++){
      const p=mod(seed+k*3,len),at=chars.indexOf(target[p]),next=chars[mod((at<0?0:at)+1+k+mod(seed,5),chars.length)],candidate=mutateAt(target,p,next);
      if(!seen.has(candidate)){seen.add(candidate);out.push(candidate);}
    }
    for(let k=0;out.length<3&&k<len-1;k++){
      const p=mod(seed+k,len-1),candidate=target.slice(0,p)+target[p+1]+target[p]+target.slice(p+2);
      if(!seen.has(candidate)){seen.add(candidate);out.push(candidate);}
    }
    return out;
  }

  function exact(q,n,v,t){
    const len=4+t*2+(v===7?1:0),mode=(v===1||v===4||v===7)?1:0,target=code(n+v*31,len,mode);
    q.taskLabel='精確比對';
    q.q=`快速比對：哪個選項與「${target}」完全相同？`;
    q.e=`逐字比對即可；完全相同的是 ${target}。`;
    install(q,target,nearMisses(target,n+v*17),'speed-exact-visual-match');
  }

  function count(q,n,v,t){
    const groups=[['●','○','◆'],['■','□','▲'],['▲','△','◆'],['◆','◇','●'],['★','☆','■'],['○','●','□'],['□','■','△'],['△','▲','◇']];
    const [target,...others]=groups[v];
    const len=[12,14,16][t]+mod(v,3)*2,count=[3,5,7][t]+mod(n,2),seq=[];
    for(let i=0;i<count;i++)seq.push(target);
    for(let i=count;i<len;i++)seq.push(others[mod(i+n+v,others.length)]);
    const mixed=shuffle(seq,n*97+v*13);
    q.taskLabel='符號計數';q.q=`快速數出「${target}」共有幾個：${mixed.join(' ')}`;q.e=`目標符號「${target}」共有 ${count} 個。`;
    install(q,count,[count-1,count+1,count+2],'speed-count-visual-scan');
  }

  function pairEquality(q,n,v,t){
    const len=4+t*2+(v===7?1:0),base=code(n+v*29,len,v%2),pairs=[];
    const rightMiss=nearMisses(base,n+v*19);
    const correct=`${base} / ${base}`;
    for(let i=0;i<3;i++)pairs.push(`${base} / ${rightMiss[i]}`);
    q.taskLabel='左右比對';q.q='快速比對：哪一組左右代碼完全一致？';q.e='逐字比較左右兩側；只有一組完全相同。';
    install(q,correct,pairs,'speed-pair-pure-equality');
  }

  function parity(q,n,v,t){
    const digits=2+t,s18=mod(n,18),base=10**(digits-1)+s18*(t===0?4:t===1?7:37)+v*(t===0?1:t===1?3:11);
    let c,prompt,wrong;
    if(v%4===0){c=base%2===1?base:base+1;prompt='哪一個數字的末位是奇數？';wrong=[c+1,c+3,c+5].map(x=>x%2===0?x:x+1);}
    else if(v%4===1){c=base%2===0?base:base+1;prompt='哪一個數字的末位是偶數？';wrong=[c+1,c+3,c+5].map(x=>x%2===1?x:x+1);}
    else if(v%4===2){const d=mod(n+v,10);c=Math.floor(base/10)*10+d;prompt=`哪一個數字的個位數是 ${d}？`;wrong=[mod(d+1,10),mod(d+2,10),mod(d+3,10)].map(x=>Math.floor(base/10)*10+x);}
    else {const suffix=10+mod(n*7+v,80);c=Math.floor(base/100)*100+suffix;prompt=`哪一個數字的末兩位是 ${String(suffix).padStart(2,'0')}？`;wrong=[suffix+1,suffix+2,suffix+3].map(s=>Math.floor(base/100)*100+mod(s,100));}
    q.taskLabel='末位掃描';q.q=`快速掃描：${prompt}`;q.e=`只需要看末位／末兩位；正解是 ${c}。`;
    install(q,c,wrong,'speed-numeric-suffix-scan');
  }

  function order(q,n,v,t){
    const len=3+t,s18=mod(n,18),base=20+s18*7+v*180,step=1+mod(v,3);let correct,wrong,prompt;
    if(v%3===2){
      const start=65+s18,arr=Array.from({length:len},(_,i)=>String.fromCharCode(start+i));
      correct=arr.join(' · ');prompt='哪一列字母依英文字母順序排列？';
      const w1=[...arr];[w1[1],w1[2]]=[w1[2],w1[1]];const w2=[...arr].reverse();const w3=[...arr.slice(1),arr[0]];wrong=[w1,w2,w3].map(x=>x.join(' · '));
    }else{
      const arr=Array.from({length:len},(_,i)=>base+i*step),asc=v%3===0,ordered=asc?arr:[...arr].reverse();
      correct=ordered.join(' · ');prompt=`哪一列數字嚴格由${asc?'小到大':'大到小'}？`;
      const w1=[...ordered];[w1[1],w1[2]]=[w1[2],w1[1]];const w2=[...ordered];[w2[0],w2[1]]=[w2[1],w2[0]];const w3=[...ordered.slice(1),ordered[0]];wrong=[w1,w2,w3].map(x=>x.join(' · '));
    }
    q.taskLabel='順序掃描';q.q=prompt;q.e='只要快速比較相鄰項目的順序即可。';
    install(q,correct,wrong,'speed-order-single-rule');
  }

  function boundary(q,n,v,t){
    const num=String(100+mod(n*17+v*23,800)),mid=code(n+v*11,2+t,0);let correct,wrong,prompt;
    if(v===0){correct=`M${num}T`;prompt='哪個代碼以 M 開頭、T 結尾？';wrong=[`T${num}M`,`M${num}R`,`R${num}T`];}
    else if(v===1){correct=`K${mid}7`;prompt='哪個代碼以 K 開頭、數字 7 結尾？';wrong=[`7${mid}K`,`K${mid}8`,`R${mid}7`];}
    else if(v===2){correct=`AQ${mid}`;prompt='哪個代碼第二個字元是 Q？';wrong=[`QA${mid}`,`AR${mid}`,`A${mid}Q`];}
    else if(v===3){correct=`B${mid}X5`;prompt='哪個代碼同時包含 X 且以 5 結尾？';wrong=[`B${mid}X6`,`B${mid}Y5`,`X${mid}B6`];}
    else if(v===4){correct=`R${mid}R`;prompt='哪個代碼首尾字母相同？';wrong=[`R${mid}T`,`T${mid}R`,`Q${mid}P`];}
    else if(v===5){correct=`7${mid}K`;prompt='哪個代碼以數字開頭、字母結尾？';wrong=[`K${mid}7`,`K${mid}R`,`R${mid}8`];}
    else if(v===6){correct=`M${mid}XM`;prompt='哪個代碼同時符合「首尾都是 M」且「中間含 X」？';wrong=[`M${mid}XN`,`N${mid}XM`,`M${mid}YM`];}
    else {correct=`A${mid}QB`;prompt='哪個代碼同時符合「第二個字元不是 Q」且「倒數第二個字元是 Q」？';wrong=[`AQ${mid}B`,`A${mid}RB`,`Q${mid}QA`];}
    q.taskLabel='位置掃描';q.q=`快速掃描：${prompt}`;q.e='只檢查指定位置／字元，不需要做算術運算。';
    install(q,correct,wrong,'speed-boundary-visual-conditions');
  }

  function missing(q,n,v,t){
    const size=[6,8,10][t]+(v===7?2:0),kind=v%3,universe=[];
    if(kind===0){const start=10+mod(n*3+v*5,70-size);for(let i=0;i<size;i++)universe.push(String(start+i));}
    else if(kind===1){const start=65+mod(n+v,26-size);for(let i=0;i<size;i++)universe.push(String.fromCharCode(start+i));}
    else {for(let i=0;i<size;i++)universe.push(`K${String(10+mod(n*7+v*11+i,80)).padStart(2,'0')}`);}
    const missingIndex=mod(n*5+v*3,size),correct=universe[missingIndex],shown=shuffle(universe.filter((_,i)=>i!==missingIndex),n*101+v*17);
    const wrong=[];for(let k=1;wrong.length<3;k++){const x=universe[mod(missingIndex+k,size)];if(x!==correct&&!wrong.includes(x))wrong.push(x);}
    q.taskLabel='缺漏比對';q.q=`快速比對：標準集合為 ${universe.join('、')}；畫面列出 ${shown.join('、')}。少了哪一項？`;q.e=`把標準集合和畫面逐項比對，缺少的是 ${correct}。`;
    install(q,correct,wrong,'speed-missing-reference-scan');
  }

  const handlers={
    'speed-exact':exact,'speed-count':count,'speed-pair-equality':pairEquality,'speed-parity':parity,
    'speed-order':order,'speed-boundary':boundary,'speed-missing':missing
  };
  const seen=new Set();
  for(const collection of [bank,selected])for(const q of collection){
    if(!q||seen.has(q)||q.d!=='處理速度')continue;seen.add(q);
    const fn=handlers[q.taskFamily];if(!fn)continue;
    const before=String(q.q||'');
    if(/依序重複|每次加|每次乘|差值|運算依序/.test(before))report.removedRuleLeakage++;
    if(/除以|各位數字和|反向數字|可被\s*[347]|百位數.*個位數/.test(before))report.removedArithmeticLoad++;
    fn(q,idx(q),variant(q),tier(q));
    q.processingSpeedIntegrity=VERSION;
  }

  const forbidden=/依序重複|每次加|每次乘|差值依序|運算依序|除以\s*[347]|各位數字和|反向數字的差|可被\s*[347]|×2|−3/;
  for(const q of bank.filter(x=>x.d==='處理速度')){
    if(Number(q.limit)!==18)throw new Error(`processing-speed integrity: ${q.id} must keep 18-second speed timing`);
    if(forbidden.test(String(q.q||'')))throw new Error(`processing-speed integrity: reasoning leakage in ${q.id}`);
    if(!q.processingSpeedIntegrityReason)throw new Error(`processing-speed integrity: uncovered item ${q.id}`);
  }

  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_PROCESSING_SPEED_INTEGRITY=report;
  if(window.IQ_BANK_META)window.IQ_BANK_META.processingSpeedIntegrity=VERSION;
})();
