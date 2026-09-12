// Cognitive IQ Lab — Natural Language Pass v2
// Removes template-like surface wrappers while preserving 5,124 concrete-item uniqueness.
(() => {
  'use strict';
  const bank=window.IQ_QUESTION_BANK;
  if(!Array.isArray(bank)||!bank.length)return;

  const report={version:'NL-2026.09.2',applied:{},retained:{},spatialSvgSized:0};
  const signature=(q,prompt=q.q)=>JSON.stringify([prompt,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  const fmtTime=m=>{m=mod(m,1440);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;};

  const products=[['筆記本','本'],['鉛筆','支'],['貼紙','張'],['卡片','張'],['信封','個'],['紙盒','個'],['資料夾','個'],['標籤','張'],['票券','張'],['杯墊','個'],['明信片','張'],['小冊','本'],['紙袋','個'],['包裝盒','個'],['便條紙','張'],['書籤','張'],['紙張','張'],['圖卡','張']];
  const activities=['包裝作業','校對作業','巡檢作業','整理作業','列印作業','盤點作業','裝訂作業','配送作業','檢測作業','分類作業','掃描作業','採樣作業','測量作業','登記作業','審核作業','清潔作業','組裝作業','標記作業'];
  const probabilityObjects=[['珠子','顆'],['籌碼','枚'],['圓片','枚'],['木珠','顆'],['玻璃珠','顆'],['棋子','枚'],['小球','顆'],['代幣','枚'],['石子','顆'],['彈珠','顆'],['紙片','張'],['卡片','張'],['標記片','枚'],['積木','塊'],['豆子','顆'],['鈕扣','顆'],['磁片','枚'],['籤牌','張']];
  const weightObjects=['金屬塊','木塊','砝碼','零件','小盒','樣品','元件','石塊','積木','配重塊','測試件','零組件','模型塊','物件','磁塊','墊片','方塊','材料塊'];
  const symbols=['X','Y','Z','A','B','C','D','E','F','G','H','J','K','M','N','P','Q','R'];

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

  function naturalRemainder(q){
    const n=itemIndex(q),v=variant(q),s=Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
    const [product,cl]=products[s];
    const d=5+mod(v,4),r=1+mod(n,d-1),a=d*(3+mod(n,8))+r;
    if(v===0)return `有 ${a} ${cl}${product}，每組放 ${d} ${cl}。盡量分成完整組後，還剩幾${cl}？`;
    if(v===1)return `有 ${a} ${cl}${product}，至少再加幾${cl}，總數才能被 ${d} 整除？`;
    if(v===2)return `有 ${a} ${cl}${product}，每箱放 ${d} ${cl}。最多能裝滿幾箱？`;
    if(v===3)return `有 ${a} ${cl}${product}，每 ${d} ${cl}分成一組。全部分完後剩幾${cl}？`;
    if(v===4)return `${product}數量除以 ${d} 餘 ${r}。再增加 2 ${cl}後，新的餘數是多少？`;
    if(v===5)return `${product}數量除以 ${d} 餘 ${r}。若數量變成原來的 2 倍，新的餘數是多少？`;
    if(v===6)return `${product}數量除以 ${d} 餘 ${r}。至少再加幾${cl}，餘數才會變成 0？`;
    return `${product}數量除以 ${d} 餘 ${r}。再增加 3 ${cl}後，新的餘數是多少？`;
  }

  function naturalTime(q){
    const n=itemIndex(q),v=variant(q),t=tier(q),s=Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
    const task=activities[s],start=8*60+20+mod(n*7,180),dur=20+mod(n*11,100);
    if(v===0)return `${task}於 ${fmtTime(start)} 開始，持續 ${dur} 分鐘。結束時刻（24 小時制）是？`;
    if(v===1)return `${task}於 ${fmtTime(start+dur)} 結束，共進行 ${dur} 分鐘。開始時刻（24 小時制）是？`;
    if(v===2){const wait=10+5*t;return `${task}於 ${fmtTime(start)} 開始，進行 ${dur} 分鐘後休息 ${wait} 分鐘。再次開始時是幾點？`;}
    if(v===3){const d2=15+5*t;return `${task}於 ${fmtTime(start)} 開始，第一階段 ${dur} 分鐘，接著第二階段 ${d2} 分鐘，中間不停。何時完成？`;}
    if(v===4)return `${task}從 ${fmtTime(start)} 進行到 ${fmtTime(start+dur)}，共經過幾分鐘？`;
    if(v===5){const d=45+15*t;return `${task}於 23:30 開始，持續 ${d} 分鐘。跨過午夜後，何時結束？`;}
    if(v===6)return `${task}於 ${fmtTime(start)} 開始，進行 ${dur} 分鐘後休息 15 分鐘。再次開始時是幾點？`;
    return `${task}從 ${fmtTime(start)} 到 ${fmtTime(start+dur)}，共經過幾分鐘？`;
  }

  function naturalProbability(q){
    const n=itemIndex(q),v=variant(q),s=Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
    const [obj,cl]=probabilityObjects[s];
    let R=1+mod(n,4),W=3+mod(n*2,5);if(v===4)R=2+mod(n,3);if(v===6)W=2+mod(n,4);const T=R+W;
    if(v===0)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，每${cl}等可能。抽到紅色${obj}的機率是多少？`;
    if(v===1)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，抽到白色${obj}的機率是多少？`;
    if(v===2)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，沒有抽到紅色${obj}的機率是多少？`;
    if(v===3)return `袋中共有 ${T} ${cl}彼此可區分的${obj}。指定其中 1 ${cl}，隨機抽 1 ${cl}剛好抽中它的機率是多少？`;
    if(v===4)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。連抽 2 ${cl}且不放回，兩${cl}都是紅色的機率是多少？`;
    if(v===5)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。不放回抽 2 ${cl}，恰好一紅一白的機率是多少？`;
    if(v===6)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。不放回抽 2 ${cl}，兩${cl}都是白色的機率是多少？`;
    return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，沒有抽到紅色${obj}的機率是多少？`;
  }

  function naturalBalance(q){
    const v=variant(q),s=Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
    let base=String(q.q).replace(/^以[^，]+這組資料為情境，/,'');
    if(v<=2)return base.replaceAll('砝碼',weightObjects[s]);
    const sym=symbols[s];
    base=base.replace(/x/g,sym);
    return base;
  }

  // Natural quantitative contexts: the surface noun now belongs to the sentence,
  // rather than appearing as an artificial "以○○這組資料為情境" prefix.
  rewriteFamily('quant-remainder',naturalRemainder);
  rewriteFamily('quant-time',naturalTime);
  rewriteFamily('quant-probability',naturalProbability);
  rewriteFamily('quant-balance',naturalBalance);

  for(const family of ['speed-count','speed-parity','speed-order','speed-missing']){
    rewriteFamily(family,q=>String(q.q).replace(/^在[^，]+的快速掃描組中，/,''));
  }

  // V1 kept natural location labels for these two families. If the actual numeric
  // content is already unique, drop the location label too.
  rewriteFamily('set-overlap',q=>String(q.q).replace(/^[^：]{1,12}的調查：/,''));
  rewriteFamily('pairing-capacity',q=>String(q.q).replace(/^[^：]{1,12}：/,''));

  // Make SVG intrinsic size explicit as well as CSS-responsive. This avoids Safari
  // shrinking an inline viewBox-only SVG to a min-content sliver inside CSS grid.
  for(const q of bank){
    if(q.d!=='視覺空間'||!String(q.visual||'').includes('<svg'))continue;
    if(/<svg\b[^>]*\bwidth=/.test(q.visual))continue;
    q.visual=String(q.visual).replace(
      '<svg class="qb5-spatial-svg"',
      '<svg class="qb5-spatial-svg" width="360" height="220" preserveAspectRatio="xMidYMid meet"'
    );
    report.spatialSvgSized++;
  }

  const allSignatures=new Set(bank.map(q=>signature(q)));
  if(allSignatures.size!==bank.length)throw new Error(`Natural Language v2 created duplicate concrete items: ${allSignatures.size}/${bank.length}`);

  if(window.IQ_BANK_VALIDATION){
    window.IQ_BANK_VALIDATION.uniqueTaskSignatures=allSignatures.size;
    window.IQ_BANK_VALIDATION.naturalLanguageRevision=report.version;
  }
  if(window.IQ_BANK_META)window.IQ_BANK_META.naturalLanguageRevision=report.version;
  if(window.IQ_QB5)window.IQ_QB5.naturalLanguageRevision=report.version;
  window.IQ_NATURAL_LANGUAGE=report;
})();
