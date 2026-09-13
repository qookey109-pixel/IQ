// Cognitive IQ Lab — Working Memory Integrity v1
// Final production pass after answer-quality: remove ordinal / monotonic / outlier shortcuts
// so working-memory items require remembering the stimulus rather than exploiting option structure.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const report={version:'WMI-2026.09.1',position:0,pair:0,filter:0,recognition:0,relative:0,reorder:0};
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const splitStim=q=>String(q.stim||'').trim().split(/[\s　]+/).filter(Boolean);
  const isStrictMonotonic=vals=>vals.length>1&&(vals.every((x,i)=>i===0||x>vals[i-1])||vals.every((x,i)=>i===0||x<vals[i-1]));

  function seededShuffle(values,seed){
    const out=[...values];
    let state=(((seed+1)*2654435761)>>>0);
    for(let i=out.length-1;i>0;i--){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      const j=state%(i+1);[out[i],out[j]]=[out[j],out[i]];
    }
    if(isStrictMonotonic(out)&&out.length>2)[out[0],out[1]]=[out[1],out[0]];
    return out;
  }

  function makeNumbers(q,len,salt=0){
    const n=itemIndex(q),v=variant(q),seed=n*97+v*31+salt*17;
    const base=120+n*19+v*7+salt*3;
    const pool=Array.from({length:len},(_,i)=>base+i*13+mod(seed+i*5,7));
    return seededShuffle(pool,seed);
  }

  function install(q,correct,wrong,reason){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const c=String(correct),seen=new Set([c]),clean=[];
    for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);clean.push(s);}}
    if(clean.length<3)throw new Error(`memory integrity: insufficient distractors for ${q.id}`);
    const out=[];let wi=0;
    for(let i=0;i<4;i++)out.push(i===target?c:clean[wi++]);
    q.o=out;q.a=target;q.correctContent=c;q.memoryIntegrityReason=reason;
  }

  function sequenceDistractors(correct,arrays){
    const c=correct.join(' → '),out=[],seen=new Set([c]);
    for(const arr of arrays){const s=arr.join(' → ');if(!seen.has(s)){seen.add(s);out.push(s);}}
    return out;
  }

  function rewritePosition(q){
    const old=splitStim(q),len=old.length;if(len<4)return;
    const m=String(q.q).match(/第\s*(\d+)\s*個/);if(!m)return;
    const pos=Math.max(0,Math.min(len-1,Number(m[1])-1)),vals=makeNumbers(q,len,11),correct=vals[pos];
    q.stim=vals.join('　');q.e=`第 ${pos+1} 個項目是 ${correct}。`;
    install(q,correct,vals.filter((_,i)=>i!==pos),'memory-position-nonmonotonic');report.position++;
  }

  function rewritePair(q){
    const raw=String(q.stim||'').split('　').filter(Boolean),pairs=raw.map(x=>{const m=String(x).match(/^(.+?)\s+(\d+)$/);return m?[m[1],Number(m[2])]:null;}).filter(Boolean);
    if(pairs.length<3)return;
    const target=String(q.q).match(/「([^」]+)」/)?.[1];if(!target)return;
    const vals=makeNumbers(q,pairs.length,23),names=pairs.map(x=>x[0]),idx=names.indexOf(target);if(idx<0)return;
    q.stim=names.map((name,i)=>`${name} ${vals[i]}`).join('　');q.e=`${target} 配對 ${vals[idx]}。`;
    const wrong=vals.filter((_,i)=>i!==idx);let decoy=vals[idx]+7;while(vals.includes(decoy))decoy+=3;wrong.push(decoy);
    install(q,vals[idx],wrong,'memory-pair-nonordinal-values');report.pair++;
  }

  function rewriteFilter(q){
    const tok=splitStim(q);if(tok.length<6||tok.length%2!==0)return;
    const locs=[],count=tok.length/2;for(let i=0;i<count;i++)locs.push(tok[i*2+1]);
    const nums=makeNumbers(q,count,37);let order=seededShuffle(Array.from({length:count},(_,i)=>i),itemIndex(q)*43+variant(q)*11+5);
    let L=order.map(i=>locs[i]),N=order.map(i=>nums[i]);
    if(isStrictMonotonic(N)&&order.length>2){[order[0],order[1]]=[order[1],order[0]];L=order.map(i=>locs[i]);N=order.map(i=>nums[i]);}
    const stim=[];for(let i=0;i<count;i++)stim.push(String(N[i]),L[i]);q.stim=stim.join('　');
    const answerPlaces=String(q.q).includes('地點'),correct=answerPlaces?L.map(String):N.map(String);
    const rev=[...correct].reverse(),swap=[...correct];[swap[0],swap[1]]=[swap[1],swap[0]];const rotate=[...correct.slice(1),correct[0]];
    const wrong=sequenceDistractors(correct,[rev,swap,rotate,[correct.at(-1),...correct.slice(0,-1)]]);
    q.e=answerPlaces?`地點依序為 ${correct.join(' → ')}。`:`數字依序為 ${correct.join(' → ')}。`;
    install(q,correct.join(' → '),wrong,'memory-filter-scrambled-stimulus');report.filter++;
  }

  function nearCode(token,letterShift,digitShift){
    const m=String(token).match(/^([A-T])(\d)$/);if(!m)return null;
    const letter=String.fromCharCode(65+mod(m[1].charCodeAt(0)-65+letterShift,20));
    const digit=1+mod(Number(m[2])-1+digitShift,9);return `${letter}${digit}`;
  }

  function novelCodes(stim,seed,count){
    const out=[],used=new Set(stim);
    for(let pass=1;out.length<count&&pass<20;pass++){
      const base=stim[mod(seed+pass,stim.length)];
      for(const [ls,ds] of [[0,pass],[pass,0],[pass,pass],[pass+1,pass]]){
        const c=nearCode(base,ls,ds);if(c&&!used.has(c)){used.add(c);out.push(c);if(out.length===count)break;}
      }
    }
    return out;
  }

  function rewriteRecognition(q){
    const stim=splitStim(q);if(stim.length<4)return;
    const seed=itemIndex(q)+variant(q)*13;
    if(String(q.q).includes('沒有出現')){
      const novel=novelCodes(stim,seed,1)[0];if(!novel)return;
      q.e=`${novel} 沒有出現在剛才的序列中。`;install(q,novel,seededShuffle(stim,seed).slice(0,3),'memory-recognition-plausible-novel');
    }else if(String(q.q).includes('有出現')){
      const current=String(q.correctContent||q.o?.[q.a]||''),correct=stim.includes(current)?current:stim[mod(seed,stim.length)],wrong=novelCodes(stim,seed,3);
      q.e=`${correct} 出現在剛才的序列中。`;install(q,correct,wrong,'memory-recognition-plausible-decoys');
    }else return;
    report.recognition++;
  }

  function rewriteRelative(q){
    const old=splitStim(q),len=old.length;if(len<5)return;
    const right=String(q.q).includes('右邊'),m=String(q.q).match(/第\s*(\d+)\s*個/),dist=m?Number(m[1]):1;
    const span=Math.max(1,len-2*dist),k=dist+mod(itemIndex(q)+variant(q),span),vals=makeNumbers(q,len,53),ansIdx=k+(right?dist:-dist),target=vals[k],ans=vals[ansIdx];
    q.stim=vals.join('　');q.q=String(q.q).replace(/「[^」]+」/,`「${target}」`);q.e=`從 ${target} 往${right?'右':'左'}數 ${dist} 格，得到 ${ans}。`;
    const wrong=seededShuffle(vals.filter((_,i)=>i!==ansIdx),itemIndex(q)+71);
    install(q,ans,wrong,'memory-relative-nonmonotonic');report.relative++;
  }

  function rewriteReorder(q){
    const old=splitStim(q),len=old.length;if(len<4)return;
    const vals=makeNumbers(q,len,67),v=variant(q);let out;
    if(v===0)out=[...vals.slice(1),vals[0]];
    else if(v===1)out=[vals.at(-1),...vals.slice(0,-1)];
    else if(v===2)out=[...vals].reverse();
    else if(v===3)out=[vals[1],vals[0],...vals.slice(2)];
    else if(v===4){out=[...vals];const j=out.length-2;[out[1],out[j]]=[out[j],out[1]];}
    else if(v===5)out=[...vals.slice(2),...vals.slice(0,2)];
    else if(v===6)out=[vals[0],...vals.slice(1).reverse()];
    else out=[...vals.slice(-2),...vals.slice(0,-2)];
    q.stim=vals.join('　');const correct=out.join(' → '),rev=[...out].reverse(),rot=[...out.slice(1),out[0]],swap=[...out];[swap[0],swap[1]]=[swap[1],swap[0]];
    const wrong=sequenceDistractors(out,[vals,rev,rot,swap,[out.at(-1),...out.slice(0,-1)]]);
    q.e=`依指定重排規則，得到 ${correct}。`;install(q,correct,wrong,'memory-reorder-nonmonotonic');report.reorder++;
  }

  for(const q of bank){
    if(q.taskFamily==='memory-position')rewritePosition(q);
    else if(q.taskFamily==='memory-pair')rewritePair(q);
    else if(q.taskFamily==='memory-filter')rewriteFilter(q);
    else if(q.taskFamily==='memory-recognition')rewriteRecognition(q);
    else if(q.taskFamily==='memory-relative')rewriteRelative(q);
    else if(q.taskFamily==='memory-reorder')rewriteReorder(q);
  }

  let cueRiskItems=0;
  if(window.IQ_OPTION_AUDIT?.optionCueFlags){for(const q of bank){q.optionCueFlags=window.IQ_OPTION_AUDIT.optionCueFlags(q);if(q.optionCueFlags.length)cueRiskItems++;}if(window.IQ_OPTION_QUALITY_REPORT)window.IQ_OPTION_QUALITY_REPORT.cueRiskItems=cueRiskItems;}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_MEMORY_INTEGRITY=report;
  if(window.IQ_BANK_META){window.IQ_BANK_META.memoryIntegrity=report.version;window.IQ_BANK_META.memoryIntegrityMode='anti-shortcut-final-pass';}
})();