// Cognitive IQ Lab — low-fatigue presentation layer
// Presentation only: never changes QB4 semantics, answer keys or scoring.
(() => {
  'use strict';

  function simplifySpatial(q) {
    // QB4 spatial items are text-first. If an older/fallback item carries a duplicate
    // visual panel, remove that panel but preserve the authored prompt and choices.
    q.visual = null;
    q.presentationMode = 'text-only';
    q.presentationReason = 'spatial-text-first-no-duplicate-panel';
  }

  function parseVisualGroups(visual) {
    return String(visual ?? '').trim().split(/\s{2,}|\n+/).map(x=>x.trim()).filter(Boolean);
  }

  function ordinalFromLabel(label) {
    const m = String(label ?? '').match(/([1-4])/);
    return m ? Number(m[1]) : null;
  }

  function mapBalancedLabelsToValues(labels, values, formatter=value=>value) {
    return labels.map((label,fallbackIndex)=>{
      const ordinal=ordinalFromLabel(label);
      const sourceIndex=ordinal?ordinal-1:fallbackIndex;
      return formatter(values[sourceIndex],sourceIndex);
    });
  }

  function simplifySpeed(q) {
    const raw=String(q.visual ?? '');

    // Legacy compatibility only. QB4 speed items are already direct text/options.
    if (raw && q.model === 'speed-target-match') {
      const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
      const target=(lines.shift()||'').replace(/^目標：/,'').trim();
      const candidates=parseVisualGroups(lines.join('   '));
      if(target&&candidates.length===4){
        q.o=mapBalancedLabelsToValues(q.o,candidates,value=>String(value));
        q.q=`目標：${target}。找出完全相同的字串。`;
        q.e=`正確答案是 ${target}。`;
      }
    } else if (raw && q.model === 'speed-odd-group') {
      const groups=parseVisualGroups(raw);
      if(groups.length===4){
        q.o=mapBalancedLabelsToValues(q.o,groups,(value,index)=>`${index+1} · ${String(value)}`);
        q.q='找出與其他三組不同的一組。';
        q.e=`正確答案是 ${q.o[q.a]}；其中符號順序與其他三組不同。`;
      }
    }

    q.visual=null;
    q.presentationMode='direct-speed';
    q.presentationReason='candidate-information-shown-once-in-prompt-or-options';
  }

  const seen=new Set();
  for(const collection of [window.IQ_QUESTION_BANK,window.IQ_QUESTIONS]){
    if(!Array.isArray(collection)) continue;
    for(const q of collection){
      if(!q||seen.has(q)) continue;
      seen.add(q);
      if(q.d==='視覺空間') simplifySpatial(q);
      else if(q.d==='處理速度') simplifySpeed(q);
      else if(q.type==='matrix') q.presentationMode='essential-visual';
      else if(q.type==='memory') q.presentationMode='single-stimulus';
      else q.presentationMode='text-first';
    }
  }

  window.IQ_PRESENTATION_CLARITY={
    version:'2.0-qb4',
    palette:['warm-ivory','ink-brown','bronze'],
    spatialTextOnly:true,
    directSpeedOptions:true,
    duplicateVisualPanels:false,
    principle:'show each piece of information once, where the user acts on it'
  };
})();