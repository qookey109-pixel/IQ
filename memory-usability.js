// Cognitive IQ Lab — Memory Usability Integrity v2
// Keep working-memory difficulty in span/manipulation, not long-number reading load.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;
  const VERSION='MUI-2026.09.2';
  const report={version:VERSION,total:0,families:{}};
  const places=['竹林','港口','書店','花園','車站','山屋','劇院','工坊','市集','燈塔','茶館','畫廊'];
  const usedStimuli=new Map();
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  function shuffle(values,seed){const out=[...values];let s=((seed+1)*2654435761)>>>0;for(let i=out.length-1;i>0;i--){s=(Math.imul(s,1664525)+1013904223)>>>0;const j=s%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
  function twoDigits(q,n,len,salt){
    const v=variant(q),seen=usedStimuli.get(q.taskFamily)||new Set();let attempt=0,seq,key;
    do{
      const seed=n*19+v*37+salt+attempt*149;
      const vals=Array.from({length:len},(_,i)=>10+mod(seed+i*(11+2*mod(v,5)),80));
      seq=shuffle(vals,seed*97+v*13);
      const asc=seq.every((x,i)=>i===0||seq[i-1]<x),desc=seq.every((x,i)=>i===0||seq[i-1]>x);if((asc||desc)&&seq.length>2)[seq[0],seq[1]]=[seq[1],seq[0]];
      key=seq.join('|');attempt++;
    }while(seen.has(key)&&attempt<80);
    seen.add(key);usedStimuli.set(q.taskFamily,seen);return seq;
  }
  function installOptions(q,correct,wrong,reason){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0,c=String(correct),seen=new Set([c]),clean=[];
    for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);clean.push(s);}}
    if(clean.length<3)throw new Error(`memory usability: insufficient distractors for ${q.id}`);
    const out=[];let wi=0;for(let i=0;i<4;i++)out.push(i===target?c:clean[wi++]);
    q.o=out;q.a=target;q.correctContent=c;q.memoryUsability=VERSION;q.memoryUsabilityReason=reason;q.presentationMode='single-stimulus';q.type='memory';q.limit=null;
    report.total++;report.families[q.taskFamily]=(report.families[q.taskFamily]||0)+1;
  }
  function seqDistractors(arr){
    const correct=arr.join(' → '),out=[],seen=new Set([correct]);
    const candidates=[[...arr].reverse(),[...arr.slice(1),arr[0]],[arr[1],arr[0],...arr.slice(2)],[...arr.slice(-1),...arr.slice(0,-1)]];
    for(const x of candidates){const s=x.join(' → ');if(!seen.has(s)){seen.add(s);out.push(s);}if(out.length===3)break;}
    return out;
  }
  function position(q,n){const len=[4,5,6][tier(q)],seq=twoDigits(q,n,len,101),pos=mod(n*5+Number(q.constructVariant||1),len),correct=String(seq[pos]);q.stim=seq.join('　');q.q=`剛才序列中，第 ${pos+1} 個項目是什麼？`;q.e=`第 ${pos+1} 個項目是 ${correct}。`;installOptions(q,correct,seq.filter((_,i)=>i!==pos).map(String),'two-digit-position-recall');}
  function pair(q,n){const count=[3,4,5][tier(q)],v=variant(q),order=shuffle(Array.from({length:count},(_,i)=>mod(v*2+i,places.length)),n*31+v*17),names=order.map(i=>places[i]),vals=twoDigits(q,n,count,211),k=mod(n+v,count),correct=String(vals[k]);q.stim=names.map((name,i)=>`${name} ${vals[i]}`).join('　');q.q=`剛才「${names[k]}」配對的編號是？`;q.e=`${names[k]} 配對 ${correct}。`;const wrong=vals.filter((_,i)=>i!==k).map(String);for(let x=10;wrong.length<3&&x<100;x++)if(String(x)!==correct&&!wrong.includes(String(x)))wrong.push(String(x));installOptions(q,correct,wrong,'two-digit-pair-recall');}
  function filter(q,n){const count=[3,4,5][tier(q)],v=variant(q),names=shuffle(Array.from({length:count},(_,i)=>places[mod(v*2+i,places.length)]),n*43+v*11),nums=twoDigits(q,n,count,307),tokens=[];for(let i=0;i<count;i++)tokens.push(String(nums[i]),names[i]);q.stim=tokens.join('　');const answerPlaces=v%2===0,arr=answerPlaces?names:nums.map(String),correct=arr.join(' → ');q.q=answerPlaces?'忽略數字，只回憶剛才出現的地點，保持原順序。':'忽略地點，只回憶剛才出現的數字，保持原順序。';q.e=`${answerPlaces?'地點':'數字'}依序為 ${correct}。`;installOptions(q,correct,seqDistractors(arr),'low-reading-load-selective-recall');}
  function relative(q,n){const len=[5,6,7][tier(q)],v=variant(q),seq=twoDigits(q,n,len,401),right=v%2===1,dist=tier(q)===2&&v>=4?2:1,span=Math.max(1,len-2*dist),k=dist+mod(n+v,span),target=seq[k],ans=seq[k+(right?dist:-dist)];q.stim=seq.join('　');q.q=`剛才序列中，「${target}」${right?'右':'左'}邊第 ${dist} 個項目是什麼？`;q.e=`從 ${target} 往${right?'右':'左'}數 ${dist} 格，得到 ${ans}。`;installOptions(q,String(ans),seq.filter(x=>x!==ans).slice(0,3).map(String),'two-digit-relative-position-recall');}
  function reorder(q,n){const len=[4,5,6][tier(q)],v=variant(q),vals=twoDigits(q,n,len,503);let out,rule;if(v===0){out=[...vals.slice(1),vals[0]];rule='把第一個移到最後';}else if(v===1){out=[vals.at(-1),...vals.slice(0,-1)];rule='把最後一個移到最前';}else if(v===2){out=[...vals].reverse();rule='整列反轉';}else if(v===3){out=[vals[1],vals[0],...vals.slice(2)];rule='交換前兩個';}else if(v===4){out=[...vals];const j=out.length-2;[out[1],out[j]]=[out[j],out[1]];rule='交換第二個與倒數第二個';}else if(v===5){out=[...vals.slice(2),...vals.slice(0,2)];rule='把前兩個整組移到最後';}else if(v===6){out=[vals[0],...vals.slice(1).reverse()];rule='第一個不動，其餘反轉';}else{out=[...vals.slice(-2),...vals.slice(0,-2)];rule='把最後兩個整組移到最前';}const correct=out.join(' → ');q.stim=vals.join('　');q.q=`將剛才的序列依照「${rule}」重排。結果是哪一列？`;q.e=`依規則重排後得到 ${correct}。`;installOptions(q,correct,seqDistractors(out).concat([vals.join(' → ')]),'two-digit-sequence-manipulation');}
  const handlers={'memory-position':position,'memory-pair':pair,'memory-filter':filter,'memory-relative':relative,'memory-reorder':reorder};
  const seen=new Set();for(const collection of [bank,selected])for(const q of collection){if(!q||seen.has(q))continue;const fn=handlers[q.taskFamily];if(!fn)continue;seen.add(q);fn(q,idx(q));}
  for(const q of bank.filter(x=>x.d==='工作記憶')){if(Number.isFinite(Number(q.limit))&&Number(q.limit)>0)throw new Error(`memory usability: ${q.id} answer must be untimed`);if(/\d{3,}/.test(String(q.stim||'')))throw new Error(`memory usability: long numeric token remains in ${q.id}`);}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);window.IQ_MEMORY_USABILITY=report;if(window.IQ_BANK_META)window.IQ_BANK_META.memoryUsability=VERSION;
})();
