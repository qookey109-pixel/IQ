// Cognitive IQ Lab — option-quality audit for the final balanced bank.
(() => {
  'use strict';
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
  const byId=new Map(),positions=[0,0,0,0],modelSummary={};let cueRiskItems=0;
  for(const q of bank){q.optionCueFlags=optionCueFlags(q);q.distractorDesign=q.distractorDesign||'qb5-construct-native';if(q.optionCueFlags.length)cueRiskItems++;if(Number.isInteger(q.a)&&q.a>=0&&q.a<4)positions[q.a]++;modelSummary[q.model]=(modelSummary[q.model]||0)+1;byId.set(q.id,q);}
  window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  const qb5=window.IQ_BANK_META?.revision==='5.0';
  window.IQ_BANK_META={...(window.IQ_BANK_META||{}),optionQualityVersion:qb5?'5.0-audit':'4.0-audit',optionQualityMode:'final-bank-audit'};
  window.IQ_OPTION_QUALITY_REPORT={...(window.IQ_OPTION_QUALITY_REPORT||{}),revision:window.IQ_BANK_META?.revision||'5.0',totalItems:bank.length,cueRiskItems,correctPositionCounts:positions,correctPositionSpread:Math.max(...positions)-Math.min(...positions),modelSummary,generatedAt:new Date().toISOString()};
  window.IQ_OPTION_AUDIT={version:qb5?'5.0':'4.0',classifyOption,optionCueFlags};
})();