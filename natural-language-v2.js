// Cognitive IQ Lab — Natural Language Pass v2
// Removes unnecessary surface wrappers only when doing so preserves concrete-item uniqueness.
(() => {
  'use strict';
  const bank=window.IQ_QUESTION_BANK;
  if(!Array.isArray(bank)||!bank.length)return;

  const report={version:'NL-2026.09.2',applied:{},retained:{},spatialSvgSized:0};
  const signature=(q,prompt=q.q)=>JSON.stringify([prompt,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);

  function rewriteFamily(family,mapper){
    const items=bank.filter(q=>q.taskFamily===family);
    if(!items.length)return;
    const candidates=items.map(q=>String(mapper(q)??q.q));
    const sigs=new Set(items.map((q,i)=>signature(q,candidates[i])));
    if(sigs.size!==items.length){
      report.retained[family]={items:items.length,reason:'rewrite-would-create-duplicate-concrete-items'};
      return;
    }
    items.forEach((q,i)=>{q.q=candidates[i];});
    report.applied[family]=items.length;
  }

  // These prefixes were originally added only for surface uniqueness. Remove them
  // when the underlying numbers / structure already keep every concrete item unique.
  for(const family of ['quant-remainder','quant-time','quant-probability','quant-balance']){
    rewriteFamily(family,q=>String(q.q).replace(/^以[^，]+這組資料為情境，/,''));
  }

  for(const family of ['speed-count','speed-parity','speed-order','speed-missing']){
    rewriteFamily(family,q=>String(q.q).replace(/^在[^，]+的快速掃描組中，/,''));
  }

  // V1 kept natural location labels for these two families. If the actual numeric
  // content is already unique, drop the location label too.
  rewriteFamily('set-overlap',q=>String(q.q).replace(/^[^：]{1,12}的調查：/,''));
  rewriteFamily('pairing-capacity',q=>String(q.q).replace(/^[^：]{1,12}：/,''));

  // Make the SVG intrinsic size explicit as well as CSS-responsive. This avoids
  // Safari shrinking an inline viewBox-only SVG to a min-content sliver inside grid.
  for(const q of bank){
    if(q.d!=='視覺空間'||!String(q.visual||'').includes('<svg'))continue;
    if(/<svg\b[^>]*\bwidth=/.test(q.visual))continue;
    q.visual=String(q.visual).replace(
      '<svg class="qb5-spatial-svg"',
      '<svg class="qb5-spatial-svg" width="360" height="220" preserveAspectRatio="xMidYMid meet"'
    );
    report.spatialSvgSized++;
  }

  const allSignatures=new Set(bank.map(q=>signature(q));
  if(allSignatures.size!==bank.length)throw new Error(`Natural Language v2 created duplicate concrete items: ${allSignatures.size}/${bank.length}`);

  if(window.IQ_BANK_VALIDATION){
    window.IQ_BANK_VALIDATION.uniqueTaskSignatures=allSignatures.size;
    window.IQ_BANK_VALIDATION.naturalLanguageRevision=report.version;
  }
  if(window.IQ_BANK_META)window.IQ_BANK_META.naturalLanguageRevision=report.version;
  if(window.IQ_QB5)window.IQ_QB5.naturalLanguageRevision=report.version;
  window.IQ_NATURAL_LANGUAGE=report;
})();
