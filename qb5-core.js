// Cognitive IQ Lab — QB5 construct-expansion core
(() => {
  'use strict';
  const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
  const selected = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  const handlers = new Map();
  const VERSION = 'QB-2026.09.5';
  const REVISION = '5.0';
  const idx = q => { const m=String(q?.id||'').match(/-(\d{3})$/); return m ? Number(m[1])-1 : 0; };
  const tier = q => q.difficulty==='hard' ? 2 : q.difficulty==='medium' ? 1 : 0;
  const variant = q => q.d==='語文理解' ? Math.min(1,Math.floor(idx(q)/6)) : Math.min(7,Math.floor(idx(q)/18));
  const mod=(n,m)=>((n%m)+m)%m;
  const uniq=a=>[...new Set(a.map(String))];
  function wrong(correct,candidates){
    const c=String(correct); const out=uniq(candidates).filter(x=>x!==c); let k=1;
    while(out.length<3){ const num=Number(c); const x=Number.isFinite(num)?String(num+(k%2?k:-k)):`${c}·${k}`; if(x!==c&&!out.includes(x))out.push(x); k++; }
    return out.slice(0,3);
  }
  function set(q,correct,candidates){ q.o=[String(correct),...wrong(correct,candidates)]; q.a=0; q.correctContent=String(correct); }
  const setNum=(q,c,d=[-1,1,2])=>set(q,String(c),d.map(x=>String(Number(c)+x)));
  const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1;};
  const frac=(a,b)=>{const g=gcd(a,b);return `${a/g}/${b/g}`;};
  const fmtTime=m=>{m=mod(m,1440);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;};
  function prep(q){
    const v=variant(q),t=tier(q);
    q.bankVersion=VERSION;q.bankRevision=REVISION;q.constructRevision=REVISION;q.constructVariant=v+1;
    q.semanticKey=`${q.taskFamily}:v${v+1}`;q.model=`v5-${q.taskFamily}-v${v+1}`;q.complexityScore=t+1;
    q.visual=null;q.diagramType=null;q.diagramData=null;q.optionCueFlags=[];
    if(q.d==='處理速度')q.limit=18;else delete q.limit;
    return {n:idx(q),v,t};
  }
  function register(family,fn){handlers.set(family,fn);}
  function apply(){
    const seen=new Set();
    for(const collection of [bank,selected]) for(const q of collection){
      if(!q||seen.has(q))continue; seen.add(q); const ctx=prep(q); const fn=handlers.get(q.taskFamily); if(fn)fn(q,ctx);
    }
  }
  window.QB5E={bank,selected,handlers,VERSION,REVISION,idx,tier,variant,mod,uniq,wrong,set,setNum,gcd,frac,fmtTime,register,apply};
})();