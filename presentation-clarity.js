// Cognitive IQ Lab — low-fatigue presentation layer
// Presentation only: never changes question semantics, answer keys or scoring.
(() => {
  'use strict';

  const svgSafety={normalized:0,headingFixed:0,displacementFixed:0};

  function normalizeSpatialSvg(q){
    let out=String(q.visual||'');
    if(!out.includes('class="qb5-spatial-svg"')) return;

    if(!out.includes('preserveAspectRatio=')){
      out=out.replace(
        '<svg class="qb5-spatial-svg"',
        '<svg class="qb5-spatial-svg" preserveAspectRatio="xMidYMid meet" font-size="13"'
      );
    }else if(!/class="qb5-spatial-svg"[^>]*font-size=/.test(out)){
      out=out.replace('class="qb5-spatial-svg"','class="qb5-spatial-svg" font-size="13"');
    }
    svgSafety.normalized++;

    if(q.diagramType==='heading-rotation'){
      out=out
        .replace('cx="180" cy="110" r="78"','cx="180" cy="110" r="68"')
        .replace('<text x="180" y="20" text-anchor="middle">N 0°</text>','<text x="180" y="32" text-anchor="middle" font-size="14" font-weight="700">N 0°</text>')
        .replace('<text x="337" y="115" text-anchor="end">E 90°</text>','<text x="306" y="115" text-anchor="end" font-size="14" font-weight="700">E 90°</text>')
        .replace('<text x="180" y="214" text-anchor="middle">S 180°</text>','<text x="180" y="202" text-anchor="middle" font-size="14" font-weight="700">S 180°</text>')
        .replace('<text x="20" y="115">W 270°</text>','<text x="54" y="115" font-size="14" font-weight="700">W 270°</text>');
      svgSafety.headingFixed++;
    }

    if(q.diagramType==='grid-displacement'){
      // Some 3–4 step schematics extend below/right of the original 360×220 viewBox.
      // Expand the logical canvas so the route, S/E markers and labels always remain visible.
      out=out.replace('viewBox="0 0 360 220"','viewBox="-30 -40 420 300"');
      svgSafety.displacementFixed++;
    }

    q.visual=out;
    q.visualSafeArea='qb5-svg-safe-area-v1';
  }

  function simplifySpatial(q) {
    // QB5 spatial items intentionally carry one essential inline SVG. Preserve it,
    // while normalizing the SVG's internal safe area so Safari cannot clip labels.
    if (q.constructRevision === '5.0' && String(q.visual || '').includes('<svg')) {
      normalizeSpatialSvg(q);
      q.presentationMode = 'spatial-diagram';
      q.presentationReason = 'qb5-essential-spatial-diagram';
      return;
    }
    // Legacy fallback: remove duplicate nonessential visual panels.
    q.visual = null;
    q.presentationMode = 'text-only';
    q.presentationReason = 'legacy-spatial-text-first-no-duplicate-panel';
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

  const qb5=Array.isArray(window.IQ_QUESTION_BANK)&&window.IQ_QUESTION_BANK.some(q=>q.constructRevision==='5.0');
  window.IQ_PRESENTATION_CLARITY={
    version:qb5?'3.1-qb5':'2.0-qb4',
    palette:['warm-ivory','ink-brown','bronze'],
    spatialTextOnly:!qb5,
    spatialDiagrams:qb5,
    spatialSvgSafety:{
      version:'1.0',
      ...svgSafety,
      rootFontSize:13,
      displacementViewBox:'-30 -40 420 300',
      policy:'safe-area-first-no-label-clipping'
    },
    directSpeedOptions:true,
    duplicateVisualPanels:false,
    principle:'show each piece of information once, where the user acts on it'
  };
})();