// Cognitive IQ Lab — final-bank option-quality audit + full-bank hygiene sweep.
(() => {
  'use strict';

  const sweep={
    version:'FBQ-2026.09.1',
    numericArtifactRepairs:0,
    syntheticMarkerRepairs:0,
    choiceSetRepairs:0,
    verbalCueRepairs:0,
    speedCueRepairs:0,
    memoryCueRepairs:0,
    wordingRepairs:0
  };

  const itemIndex=q=>{const m=String(q?.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const fmtNumber=value=>{
    const n=Number(value);
    if(!Number.isFinite(n))return String(value);
    const rounded=Math.round(n*1e9)/1e9;
    return String(Object.is(rounded,-0)?0:rounded);
  };
  const cleanNumericText=value=>String(value??'').replace(/-?\d+\.\d{6,}/g,m=>{const out=fmtNumber(m);if(out!==m)sweep.numericArtifactRepairs++;return out;});
  const cleanDisplay=value=>{
    const s=String(value??'').trim();
    if(/^-?\d+(?:\.\d+)?$/.test(s)){
      const out=fmtNumber(s);if(out!==s)sweep.numericArtifactRepairs++;return out;
    }
    return s;
  };
  const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1;};
  const fraction=(a,b)=>{if(!Number.isInteger(a)||!Number.isInteger(b)||b<=0)return null;const g=gcd(a,b);return `${a/g}/${b/g}`;};
  const artificialMarker=/·\d+$/;

  function semanticFallbacks(q,correct){
    const out=[];
    const push=x=>{if(x!=null){x=cleanDisplay(x);if(x!==correct&&!out.includes(x))out.push(x);}};
    let m;
    if((m=correct.match(/^\((-?\d+)\s*,\s*(-?\d+)\)$/))){
      const x=Number(m[1]),y=Number(m[2]);
      [[x+1,y],[x-1,y],[x,y+1],[x,y-1],[y,x],[x+2,y]].forEach(([a,b])=>push(`(${a}, ${b})`));
    }else if((m=correct.match(/^(\d+)\/(\d+)$/))){
      const a=Number(m[1]),b=Number(m[2]);
      const pairs=[[a+1,b],[Math.max(1,a-1),b],[b-a,b],[a,b+1],[a+1,b+1],[Math.max(1,a-1),b+1]];
      for(const [x,y] of pairs){if(x>=0&&x<=y){const f=fraction(x,y);if(f&&f!=='0/1')push(f);}}
    }else if(correct.includes(' → ')){
      const p=correct.split(' → ');
      if(p.length>=3){
        push([...p].reverse().join(' → '));
        push([...p.slice(1),p[0]].join(' → '));
        push([p.at(-1),...p.slice(0,-1)].join(' → '));
        const a=[...p];[a[0],a[1]]=[a[1],a[0]];push(a.join(' → '));
        const b=[...p];[b[b.length-2],b[b.length-1]]=[b[b.length-1],b[b.length-2]];push(b.join(' → '));
      }
    }else if(/^-?\d+(?:\.\d+)?$/.test(correct)){
      const n=Number(correct),step=Math.abs(n)<2?0.5:1;
      [n-step,n+step,n-2*step,n+2*step,n+10*step].forEach(x=>push(fmtNumber(x)));
    }else if(/^[A-Z0-9]{2,10}$/.test(correct)){
      const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const next=ch=>chars[(Math.max(0,chars.indexOf(ch))+1)%chars.length];
      push(correct.slice(0,-1)+next(correct.at(-1)));
      push(next(correct[0])+correct.slice(1));
      push(correct.slice(1)+correct[0]);
      push([...correct].reverse().join(''));
    }
    return out;
  }

  function installChoices(q,correct,wrongCandidates,reason='choice-set'){
    correct=cleanDisplay(correct);
    const wrong=[];
    const add=x=>{
      if(x==null)return;
      x=cleanDisplay(x);
      if(artificialMarker.test(x)){sweep.syntheticMarkerRepairs++;return;}
      if(x!==correct&&!wrong.includes(x))wrong.push(x);
    };
    for(const x of wrongCandidates||[])add(x);
    for(const x of semanticFallbacks(q,correct))add(x);
    if(wrong.length<3)throw new Error(`full-bank hygiene: insufficient natural distractors for ${q.id}`);
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    const out=[];let wi=0;
    for(let i=0;i<4;i++)out.push(i===target?correct:wrong[wi++]);
    q.o=out;q.a=target;q.correctContent=correct;
    sweep.choiceSetRepairs++;
    q.qualitySweepReason=reason;
  }

  function currentCorrect(q){
    const a=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    return cleanDisplay(q.o?.[a]??q.correctContent??'');
  }

  function repairReported(q){
    const c=currentCorrect(q);let m,wrong;
    if((m=c.match(/^這幾位(.+?)表示打算(.+)$/))){
      const who=m[1],act=m[2];
      wrong=[`這幾位${who}表示已經${act}`,`這幾位${who}表示一定會${act}`,`所有${who}都表示打算${act}`];
    }else if(c.startsWith('主辦方預測明天可能有')){
      const tail=c.slice('主辦方預測明天可能有'.length);
      wrong=[`主辦方表示明天確定有${tail}`,`主辦方記錄今天已經有${tail}`,`主辦方宣稱明天一定會有${tail}`];
    }else{
      // New evidence-language items deliberately paraphrase the source instead of
      // copying it. Keep one concise semantic error, one comparable statement and
      // one deliberately overconfident evidence claim. The correct paraphrase then
      // sits inside the option-length envelope instead of being uniquely longest.
      const currentWrong=(q.o||[]).filter((_,i)=>i!==q.a).map(x=>cleanDisplay(x));
      const compact=v=>Array.from(String(v).replace(/\s/g,'')).length;
      const cLen=compact(c);
      const sorted=[...currentWrong].sort((a,b)=>compact(a)-compact(b));
      const short=sorted[0];
      const midBase=sorted[1];
      const longBase=sorted[2];
      const mid=compact(midBase)>=Math.max(1,cLen-3)?midBase:`依這份文字可推定，${midBase}`;
      let long=`只根據這份文字，就足以斷定：${longBase}`;
      if(compact(long)<=cLen)long=`只根據這份文字，就足以斷定且不需其他證據：${longBase}`;
      wrong=[short,mid,long];
    }
    if(wrong&&wrong.length>=3){installChoices(q,c,wrong,'reported-evidence-balanced');sweep.verbalCueRepairs++;}
  }

  function repairScope(q){
    const c=currentCorrect(q);
    if(c==='至少有完成 A 的人沒有完成 B'){
      installChoices(q,c,[
        '所有完成 A 的人最後都沒有完成 B',
        '恰好只有一位完成 A 的人也完成了 B',
        '所有完成 B 的人最後也都完成了 A'
      ],'scope-negation-balanced');
      sweep.verbalCueRepairs++;
    }
    q.q=String(q.q||'').replace(/」(?=(以下|下列|哪))/,'」。');
  }

  function repairEvidence(q){
    const c=currentCorrect(q),m=c.match(/^這批資料中(.+)與(.+)呈現關聯$/);
    if(!m)return;
    const a=m[1],b=m[2];
    installChoices(q,c,[
      `這批資料證明${a}一定造成${b}改變`,
      `這批資料證明${b}一定是${a}造成`,
      '這批資料排除了其他因素同時影響兩者'
    ],'evidence-strength-balanced');
    sweep.verbalCueRepairs++;
  }

  function repairSpeedOrder(q){
    const c=currentCorrect(q),p=c.split(' · ');
    if(p.length!==3)return;
    const [a,b,d]=p;
    installChoices(q,c,[`${b} · ${a} · ${d}`,`${a} · ${d} · ${b}`,`${d} · ${b} · ${a}`],'speed-order-same-token-set');
    sweep.speedCueRepairs++;
  }

  function repairMemoryRecognition(q){
    const stim=String(q.stim||'').trim().split(/[\s　]+/).filter(Boolean);
    if(!stim.length)return;
    if(String(q.q).includes('沒有出現')){
      let novel=`Z${1+(itemIndex(q)%9)}`;
      while(stim.includes(novel))novel=`Y${1+(itemIndex(q)%9)}`;
      installChoices(q,novel,stim.slice(0,6),'memory-recognition-equal-width');
      q.e=`${novel} 沒有出現在剛才的序列中。`;
      sweep.memoryCueRepairs++;
    }else if(String(q.q).includes('有出現')){
      const c=currentCorrect(q),m=c.match(/^([A-Z])(\d)$/);
      if(!m)return;
      const letter=m[1],digit=Number(m[2]);
      const nextLetter=String.fromCharCode(65+((letter.charCodeAt(0)-65+1)%20));
      installChoices(q,c,[`${letter}${(digit%9)+1}`,`Z${digit}`,`${nextLetter}${digit}`],'memory-recognition-equal-width');
      sweep.memoryCueRepairs++;
    }
  }

  function repairSpeedParity(q){
    const c=Number(currentCorrect(q));if(!Number.isFinite(c))return;
    const v=Math.max(0,Number(q.constructVariant||1)-1),digits=String(Math.abs(Math.trunc(c))).length;
    const sameWidth=n=>n>0&&String(Math.abs(Math.trunc(n))).length===digits;
    let validWrong;
    if(v===0)validWrong=n=>n%2===0;
    else if(v===1)validWrong=n=>Math.abs(n%2)===1;
    else if(v===2)validWrong=n=>n%3!==0;
    else if(v===3)validWrong=n=>n%5!==0;
    else if(v===4)validWrong=n=>n%4===0;
    else if(v===5)validWrong=n=>n%7!==0;
    else if(v===6)validWrong=n=>Math.abs(n)%10!==3;
    else validWrong=n=>n<c;
    const wrong=[];
    for(let delta=1;delta<=30&&wrong.length<3;delta++){
      for(const n of [c-delta,c+delta]){
        if(n!==c&&sameWidth(n)&&validWrong(n)&&!wrong.includes(String(n)))wrong.push(String(n));
        if(wrong.length===3)break;
      }
    }
    if(wrong.length===3){installChoices(q,String(c),wrong,'speed-parity-equal-width');sweep.speedCueRepairs++;}
  }

  function repairWording(q){
    let before=String(q.q||'');
    if(q.taskFamily==='memory-reorder'){
      before=before
        .replace(/^把剛才的序列「([^」]+)」。結果是哪一列？$/,'將剛才的序列依照「$1」重排。結果是哪一列？')
        .replace(/^對剛才序列做以下操作：「([^」]+)」。結果是哪一列？$/,'將剛才的序列依照「$1」重排。結果是哪一列？');
    }
    if(before!==q.q){q.q=before;sweep.wordingRepairs++;}
  }

  function repairGenericOptions(q){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0;
    let correct=cleanDisplay(q.o?.[target]??q.correctContent??'');
    const existing=[];let needs=false;
    (q.o||[]).forEach((value,i)=>{
      const raw=String(value??'').trim(),clean=cleanDisplay(raw);
      if(i===target)return;
      if(artificialMarker.test(raw)){sweep.syntheticMarkerRepairs++;needs=true;return;}
      if(clean!==raw)needs=true;
      if(clean!==correct&&!existing.includes(clean))existing.push(clean);else needs=true;
    });
    if(cleanDisplay(q.correctContent??correct)!==correct)needs=true;
    q.e=cleanNumericText(q.e||'');
    q.q=cleanNumericText(q.q||'');
    if(needs||existing.length<3||String(q.correctContent??'')!==correct){
      installChoices(q,correct,existing,'generic-final-hygiene');
    }else{
      q.correctContent=correct;
      q.o[target]=correct;
    }
  }

  function classifyOption(value) {
    const s=String(value??'').trim();
    if(/^-?\d+(?:\.\d+)?$/.test(s))return 'number';
    if(/^\d+\s*:\s*\d+$/.test(s))return 'ratio';
    if(/^[↑↗→↘↓↙←↖]+$/.test(s))return 'direction';
    if(/^[●■▲◆○□△◇★✦◆◇□■▲△•◦]+$/u.test(s))return 'symbol';
    if(/^\(?-?\d+\s*,\s*-?\d+\)?$/.test(s))return 'coordinate';
    return 'text';
  }

  function optionCueFlags(q) {
    const flags=[],opts=Array.isArray(q.o)?q.o.map(String):[];
    if(opts.length!==4||new Set(opts).size!==4)flags.push('option-uniqueness');
    if(opts.some(x=>artificialMarker.test(x)))flags.push('synthetic-dedupe-marker');
    if(opts.some(x=>/-?\d+\.\d{6,}/.test(x)))flags.push('floating-artifact');
    if(!Number.isInteger(q.a)||q.a<0||q.a>=opts.length)return [...flags,'invalid-key'];
    const correct=opts[q.a],wrong=opts.filter((_,i)=>i!==q.a),types=opts.map(classifyOption),counts=new Map();
    types.forEach(type=>counts.set(type,(counts.get(type)||0)+1));
    const majority=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(majority&&classifyOption(correct)!==majority)flags.push('format-cue');
    const compact=v=>Array.from(String(v).replace(/\s/g,'')).length,clen=compact(correct),wlens=wrong.map(compact).sort((a,b)=>a-b),median=wlens[1]||1;
    if(Math.abs(clen-median)>=5&&(clen>median*1.9||clen<median*.48))flags.push('length-cue');
    return flags;
  }

  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[],selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  for(const q of bank){
    repairWording(q);
    repairGenericOptions(q);
    if(q.taskFamily==='reported-vs-fact')repairReported(q);
    else if(q.taskFamily==='scope-negation')repairScope(q);
    else if(q.taskFamily==='evidence-strength')repairEvidence(q);
    else if(q.taskFamily==='speed-order')repairSpeedOrder(q);
    else if(q.taskFamily==='memory-recognition')repairMemoryRecognition(q);
    else if(q.taskFamily==='speed-parity')repairSpeedParity(q);
    repairGenericOptions(q);
  }

  const byId=new Map(),positions=[0,0,0,0],modelSummary={};let cueRiskItems=0;
  for(const q of bank){
    q.optionCueFlags=optionCueFlags(q);
    q.distractorDesign=q.distractorDesign||'qb5-construct-native';
    if(q.optionCueFlags.length)cueRiskItems++;
    if(Number.isInteger(q.a)&&q.a>=0&&q.a<4)positions[q.a]++;
    modelSummary[q.model]=(modelSummary[q.model]||0)+1;
    byId.set(q.id,q);
  }
  window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  const qb5=window.IQ_BANK_META?.revision==='5.0';
  window.IQ_BANK_META={...(window.IQ_BANK_META||{}),optionQualityVersion:qb5?'5.1-full-bank-sweep':'4.0-audit',optionQualityMode:'final-bank-hygiene-and-audit',fullBankSweep:sweep.version};
  window.IQ_OPTION_QUALITY_REPORT={...(window.IQ_OPTION_QUALITY_REPORT||{}),revision:window.IQ_BANK_META?.revision||'5.0',totalItems:bank.length,cueRiskItems,correctPositionCounts:positions,correctPositionSpread:Math.max(...positions)-Math.min(...positions),modelSummary,fullBankSweep:sweep,generatedAt:new Date().toISOString()};
  window.IQ_OPTION_AUDIT={version:qb5?'5.1':'4.0',classifyOption,optionCueFlags};
  window.IQ_FULL_BANK_SWEEP=sweep;
})();