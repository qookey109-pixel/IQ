// Cognitive IQ Lab — Natural Language Pass v3
// Inspired by speak-human-tw: preserve facts first, remove template tone second,
// then localize for concise, natural Traditional Chinese used in Taiwan.
(() => {
  'use strict';
  const bank=window.IQ_QUESTION_BANK;
  if(!Array.isArray(bank)||!bank.length)return;

  const report={
    version:'NL-2026.09.3',
    reference:'Raymondhou0917/speak-human-tw@1.4.0 (principles adapted; no runtime dependency)',
    principles:['preserve-semantics','direct-stem','context-must-matter','taiwan-zh-hant','no-template-wrapper','no-fake-humanization'],
    applied:{},retained:{},spatialSvgSized:0,taiwanTermsFixed:0,metrics:{}
  };
  const signature=(q,prompt=q.q)=>JSON.stringify([prompt,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  const surface=q=>Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
  const fmtTime=m=>{m=mod(m,1440);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;};

  const products=[['筆記本','本'],['鉛筆','支'],['貼紙','張'],['卡片','張'],['信件','封'],['紙盒','個'],['資料夾','個'],['標籤','張'],['票券','張'],['杯墊','個'],['明信片','張'],['小冊','本'],['紙袋','個'],['包裝盒','個'],['便條紙','張'],['書籤','張'],['紙張','張'],['圖卡','張']];
  const activities=['包裝作業','校對作業','巡檢作業','整理作業','列印作業','盤點作業','裝訂作業','配送作業','檢測作業','分類作業','掃描作業','採樣作業','測量作業','登記作業','審核作業','清潔作業','組裝作業','標記作業'];
  const probabilityObjects=[['珠子','顆'],['籌碼','枚'],['圓片','枚'],['木珠','顆'],['玻璃珠','顆'],['棋子','枚'],['小球','顆'],['代幣','枚'],['石子','顆'],['彈珠','顆'],['紙片','張'],['卡片','張'],['標記片','枚'],['積木','塊'],['豆子','顆'],['鈕扣','顆'],['磁片','枚'],['籤牌','張']];
  const weightObjects=['金屬塊','木塊','砝碼','零件','小盒','樣品','元件','石塊','積木','配重塊','測試件','零組件','模型塊','物件','磁塊','墊片','方塊','材料塊'];
  const symbols=['X','Y','Z','A','B','C','D','E','F','G','H','J','K','M','N','P','Q','R'];
  const overlapPairs=[
    ['閱讀課','寫作課'],['公車','捷運'],['咖啡','茶'],['游泳','跑步'],['電影','影集'],['蘋果','香蕉'],['紅隊','藍隊'],['早班','晚班'],['A 方案','B 方案'],
    ['攝影','剪輯'],['桌球','羽球'],['紙本書','電子書'],['中文課','英文課'],['北線','南線'],['展覽 A','展覽 B'],['工作坊 A','工作坊 B'],['產品 A','產品 B'],['任務 A','任務 B']
  ];
  const lockObjects=['置物櫃鎖','門鎖','抽屜鎖','工具箱鎖','器材櫃鎖','倉庫鎖','收納櫃鎖','文件櫃鎖','展示櫃鎖','工作櫃鎖','置物箱鎖','設備櫃鎖','樣品櫃鎖','材料櫃鎖','儲物櫃鎖','小櫃鎖','保管箱鎖','機櫃鎖'];
  const boxObjects=[['紙箱','包裹'],['收納盒','樣品'],['托盤','零件'],['資料盒','文件'],['籃子','物品'],['容器','材料'],['盒子','卡片'],['貨架格','商品'],['抽屜','文具'],['置物格','器材'],['袋子','標籤'],['周轉箱','零件'],['資料袋','文件'],['收納格','樣品'],['紙盒','票券'],['工具盒','工具'],['樣品盒','樣品'],['包裝箱','商品']];
  const venues=['小劇場','講堂','教室','展演廳','會議室','放映室','活動中心','球館','工作坊','展館','演講廳','排練室','簡報室','攝影棚','實驗室','訓練室','視聽室','社區中心'];
  const speedSymbols=['●','■','▲','◆','★','○','□','△','◇','☆'];

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
    const n=itemIndex(q),v=variant(q),s=surface(q),[product,cl]=products[s];
    const d=5+mod(v,4),r=1+mod(n,d-1),a=d*(3+mod(n,8))+r;
    if(v===0)return `${a} ${cl}${product}，每 ${d} ${cl}分一組。分完後剩幾${cl}？`;
    if(v===1)return `${a} ${cl}${product}，至少再加幾${cl}，總數才會是 ${d} 的倍數？`;
    if(v===2)return `${a} ${cl}${product}，每箱放 ${d} ${cl}。最多能裝滿幾箱？`;
    if(v===3)return `${a} ${cl}${product}，每 ${d} ${cl}分一組。最後剩幾${cl}？`;
    if(v===4)return `${product}數量除以 ${d} 餘 ${r}。再加 2 ${cl}後，餘數是多少？`;
    if(v===5)return `${product}數量除以 ${d} 餘 ${r}。數量變成 2 倍後，餘數是多少？`;
    if(v===6)return `${product}數量除以 ${d} 餘 ${r}。至少再加幾${cl}，才能整除？`;
    return `${product}數量除以 ${d} 餘 ${r}。再加 3 ${cl}後，餘數是多少？`;
  }

  function naturalTime(q){
    const n=itemIndex(q),v=variant(q),t=tier(q),s=surface(q),task=activities[s],start=8*60+20+mod(n*7,180),dur=20+mod(n*11,100);
    if(v===0)return `${task} ${fmtTime(start)} 開始，持續 ${dur} 分鐘。幾點結束？`;
    if(v===1)return `${task} ${fmtTime(start+dur)} 結束，共進行 ${dur} 分鐘。幾點開始？`;
    if(v===2){const wait=10+5*t;return `${task} ${fmtTime(start)} 開始，進行 ${dur} 分鐘後休息 ${wait} 分鐘。幾點再次開始？`;}
    if(v===3){const d2=15+5*t;return `${task} ${fmtTime(start)} 開始，第一階段 ${dur} 分鐘，接著進行 ${d2} 分鐘，中間不停。幾點完成？`;}
    if(v===4)return `${task}從 ${fmtTime(start)} 到 ${fmtTime(start+dur)}，共幾分鐘？`;
    if(v===5){const d=45+15*t;return `${task} 23:30 開始，持續 ${d} 分鐘。跨過午夜後，幾點結束？`;}
    if(v===6)return `${task} ${fmtTime(start)} 開始，進行 ${dur} 分鐘後休息 15 分鐘。幾點再次開始？`;
    return `${task}從 ${fmtTime(start)} 到 ${fmtTime(start+dur)}，共幾分鐘？`;
  }

  function naturalProbability(q){
    const n=itemIndex(q),v=variant(q),s=surface(q),[obj,cl]=probabilityObjects[s];
    let R=1+mod(n,4),W=3+mod(n*2,5);if(v===4)R=2+mod(n,3);if(v===6)W=2+mod(n,4);const T=R+W;
    if(v===0)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，抽到紅色的機率是多少？`;
    if(v===1)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，抽到白色的機率是多少？`;
    if(v===2)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，不是紅色的機率是多少？`;
    if(v===3)return `袋中共有 ${T} ${cl}可區分的${obj}。指定其中 1 ${cl}，隨機抽中它的機率是多少？`;
    if(v===4)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。不放回抽 2 ${cl}，兩${cl}都是紅色的機率是多少？`;
    if(v===5)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。不放回抽 2 ${cl}，剛好一紅一白的機率是多少？`;
    if(v===6)return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。不放回抽 2 ${cl}，兩${cl}都是白色的機率是多少？`;
    return `袋中有 ${R} ${cl}紅色${obj}、${W} ${cl}白色${obj}。隨機抽 1 ${cl}，沒有抽到紅色的機率是多少？`;
  }

  function naturalBalance(q){
    const v=variant(q),s=surface(q);let base=String(q.q).replace(/^以[^，]+這組資料為情境，/,'');
    if(v<=2)return base.replaceAll('砝碼',weightObjects[s]);
    return base.replace(/x/g,symbols[s]);
  }

  function naturalSetOverlap(q){
    const n=itemIndex(q),v=variant(q),s=surface(q),[left,right]=overlapPairs[s];
    const A=12+mod(n,9),B=9+mod(n*2,8),I=2+mod(n+v,Math.max(2,Math.min(A,B)-2)),U=A+B-I,total=U+5+mod(n,6);
    if(v===0)return `${A} 人選「${left}」、${B} 人選「${right}」，至少選一項的共有 ${U} 人。兩項都選的有多少人？`;
    if(v===1)return `${A} 人選「${left}」，其中 ${I} 人也選「${right}」。只選「${left}」的有多少人？`;
    if(v===2)return `${B} 人選「${right}」，其中 ${I} 人也選「${left}」。只選「${right}」的有多少人？`;
    if(v===3)return `${A} 人選「${left}」、${B} 人選「${right}」，其中 ${I} 人兩項都選。至少選一項的共有多少人？`;
    if(v===4)return `${A} 人選「${left}」、${B} 人選「${right}」，其中 ${I} 人兩項都選。剛好只選一項的有多少人？`;
    if(v===5)return `共有 ${total} 人，其中 ${U} 人至少選了「${left}」或「${right}」。兩項都沒選的有多少人？`;
    if(v===6)return `只選「${left}」的有 ${A-I} 人，兩項都選的有 ${I} 人。選「${left}」的總共有多少人？`;
    return `只選「${right}」的有 ${B-I} 人，兩項都選的有 ${I} 人。選「${right}」的總共有多少人？`;
  }

  function naturalPairing(q){
    const n=itemIndex(q),v=variant(q),t=tier(q),s=surface(q),locks=8+mod(n,8),keys=5+mod(n,6),lock=lockObjects[s];
    if(v===0)return `${lock}有 ${locks} 把、可用鑰匙有 ${keys} 把，一把鑰匙最多配一把鎖。最多能配成幾組？`;
    if(v===1){const bad=1+mod(n,2);return `${lock}有 ${locks} 把、鑰匙有 ${keys} 把，其中 ${bad} 把不能開這批鎖。最多能配成幾組？`;}
    if(v===2){const a=3+mod(n,4),b=3+mod(n*2,4),ka=2+mod(n,3),kb=2+mod(n+1,3);return `A 型${lock} ${a} 把、B 型${lock} ${b} 把；A 型鑰匙 ${ka} 把只能開 A 型，B 型鑰匙 ${kb} 把只能開 B 型。最多能配成幾組？`;}
    if(v===3){const people=7+mod(n,7);return `${people} 人兩兩組隊，每人只能加入一隊。最多能組成幾隊？`;}
    if(v===4){const boxes=3+mod(n,4),cap=2+t,items=8+mod(n,8),[box,item]=boxObjects[s];return `有 ${boxes} 個${box}，每個最多放 ${cap} 件${item}；共有 ${items} 件。最多能放入幾件？`;}
    if(v===5){const seats=8+mod(n,8),reserved=1+mod(n,3),people=6+mod(n,9);return `${venues[s]}有 ${seats} 個座位，其中 ${reserved} 個保留不用；現場有 ${people} 人。最多能安排幾人入座？`;}
    if(v===6){const red=3+mod(n,4),blue=4+mod(n,4);return `甲組 ${red} 人、乙組 ${blue} 人。每隊要甲、乙各 1 人，每人只能入一隊。最多能組幾隊？`;}
    const jobs=4+mod(n,4),machines=3+mod(n,4);return `${jobs} 個工作要交給 ${machines} 台機器處理，每台同時只能處理 1 個工作，其中 1 台維修中。最多能同時處理幾個工作？`;
  }

  function naturalSpeedCount(q){
    const n=itemIndex(q),v=variant(q),t=tier(q),s=surface(q),target=speedSymbols[v%speedSymbols.length];
    let other1=speedSymbols[(v+3+s)%speedSymbols.length],other2=speedSymbols[(v+6+Math.floor(s/2))%speedSymbols.length];
    if(other1===target)other1=speedSymbols[(v+4+s)%speedSymbols.length];
    if(other2===target||other2===other1)other2=speedSymbols[(v+7+s)%speedSymbols.length];
    const count=3+t+mod(n,3),len=14+t*3,seq=[];
    for(let i=0;i<count;i++)seq.push(target);
    for(let i=count;i<len;i++)seq.push((i+s)%3===0?other2:other1);
    for(let i=0;i<len;i++){const j=mod(s*5+n+i*7,len);[seq[i],seq[j]]=[seq[j],seq[i]];}
    return `符號列：${seq.join(' ')}。「${target}」共有幾個？`;
  }

  const shortEquivalence=['以下哪一句邏輯相同？','下列哪句與原句等價？','哪個敘述與原句邏輯相同？','下列哪一句保留相同邏輯？','哪一句和原句等價？','以下哪個說法與原句等價？'];
  rewriteFamily('scope-negation',q=>{
    const m=String(q.q).match(/「([^」]+)」/);return m?`「${m[1]}」${shortEquivalence[surface(q)%shortEquivalence.length]}`:q.q;
  });
  rewriteFamily('reported-vs-fact',q=>String(q.q)
    .replace('只依這份紀錄，哪一句沒有把「打算」升級成已發生的事？','只看這份紀錄，哪一句最符合原文？')
    .replace('下面哪一句最忠實保留原文的證據強度？','哪一句最符合原文？'));
  rewriteFamily('contrast-focus',q=>String(q.q).replace('哪一項最符合她的優先順序？','她最優先考量什麼？'));
  rewriteFamily('evidence-strength',q=>String(q.q).replace('僅憑這項觀察，哪個說法最穩妥？','只看這份資料，哪個說法最合理？'));

  rewriteFamily('set-overlap',naturalSetOverlap);
  rewriteFamily('pairing-capacity',naturalPairing);

  rewriteFamily('memory-update',q=>'照剛才的順序計算，最後是多少？');
  rewriteFamily('memory-relative',q=>String(q.q)
    .replace(/^剛才序列中，以「([^」]+)」這個完整項目為基準，它(左|右)邊第 (\d+) 個項目是什麼？$/,'剛才序列中，「$1」$2邊第 $3 個項目是什麼？'));
  rewriteFamily('memory-reorder',q=>String(q.q).replace(/^對剛才序列做以下操作：「([^」]+)」。結果是哪一列？$/,'把剛才的序列「$1」。結果是哪一列？'));

  rewriteFamily('stack-hidden',q=>'下圖由單位方塊堆成。數字表示每格堆幾層；相鄰面貼合，底面不算。共有多少個外露面？');
  rewriteFamily('matrix-difference',q=>'觀察 3×3 數字矩陣。每一列都遵循同一規則，問號應填多少？');

  rewriteFamily('quant-remainder',naturalRemainder);
  rewriteFamily('quant-time',naturalTime);
  rewriteFamily('quant-probability',naturalProbability);
  rewriteFamily('quant-balance',naturalBalance);

  rewriteFamily('speed-count',naturalSpeedCount);
  rewriteFamily('speed-parity',q=>{
    const s=surface(q),base=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'').replace(/^快速判斷：/,'');
    const forms=[base,`快速找出：${base}`,`四個選項中，${base}`,`請判斷：${base}`,base.replace('哪一個','哪個'),`找出符合條件的數字：${base}`];
    return forms[s%forms.length];
  });
  rewriteFamily('speed-order',q=>{
    const s=surface(q),base=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'');
    const forms=[base,base.replace(/^哪一列/,'找出哪一列'),`快速判斷：${base}`,base.replace('哪一列','四列中，哪一列'),`請找出：${base}`,base.replace(/？$/,'。選哪一列？')];
    return forms[s%forms.length];
  });
  rewriteFamily('speed-missing',q=>{
    const s=surface(q),base=String(q.q).replace(/^在[^，]+的快速掃描組中，/,'').replace(/^快速找缺項：/,'');
    const forms=[base,`快速找出缺項：${base}`,`請補上缺少的一項：${base}`,base.replace('缺少哪個','少了哪個'),`找出缺少的項目：${base}`,base.replace(/？$/,'。缺少哪一項？')];
    return forms[s%forms.length];
  });

  // Unit-rate wording is already reconstructed in the base language pass. Tighten
  // common Taiwan measure words and remove generic "件" when a concrete noun exists.
  rewriteFamily('quant-unit-rate',q=>String(q.q)
    .replace(/(\d+) 個信封/g,'$1 封信件')
    .replace(/製作 (\d+) 個信封/g,'製作 $1 封信件'));

  // Safe Taiwan localization for generated text. Avoid broad replacements that could
  // change a technical meaning; only replace terms with stable Taiwan equivalents.
  const termMap=[['視頻','影片'],['信息','資訊'],['網絡','網路'],['軟件','軟體'],['硬件','硬體'],['數據庫','資料庫'],['服務器','伺服器'],['屏幕','螢幕'],['鼠標','滑鼠'],['默認','預設'],['兼容','相容'],['卸載','解除安裝'],['反饋','回饋'],['性價比','CP 值']];
  for(const q of bank){
    for(const [from,to] of termMap){
      for(const key of ['q','e'])if(typeof q[key]==='string'&&q[key].includes(from)){q[key]=q[key].split(from).join(to);report.taiwanTermsFixed++;}
      if(Array.isArray(q.o))q.o=q.o.map(x=>typeof x==='string'&&x.includes(from)?(report.taiwanTermsFixed++,x.split(from).join(to)):x);
    }
  }

  // Make SVG intrinsic size explicit as well as CSS-responsive. Safari can otherwise
  // shrink a viewBox-only SVG to min-content width inside the single-screen grid.
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
  if(allSignatures.size!==bank.length)throw new Error(`Natural Language v3 created duplicate concrete items: ${allSignatures.size}/${bank.length}`);

  const stemLengths=bank.map(q=>String(q.q||'').length).sort((a,b)=>a-b);
  report.metrics={
    items:bank.length,
    avgStemChars:Number((stemLengths.reduce((a,b)=>a+b,0)/stemLengths.length).toFixed(1)),
    p95StemChars:stemLengths[Math.floor(stemLengths.length*.95)],
    maxStemChars:stemLengths.at(-1),
    artificialWrapperCount:bank.filter(q=>/這組資料為情境|的這個案例中|快速掃描組中|規則機器|的紀錄中，句子/.test(String(q.q))).length
  };

  if(window.IQ_BANK_VALIDATION){
    window.IQ_BANK_VALIDATION.uniqueTaskSignatures=allSignatures.size;
    window.IQ_BANK_VALIDATION.naturalLanguageRevision=report.version;
  }
  if(window.IQ_BANK_META){
    window.IQ_BANK_META.naturalLanguageRevision=report.version;
    window.IQ_BANK_META.languageStyle='direct-taiwan-zh-hant';
  }
  if(window.IQ_QB5)window.IQ_QB5.naturalLanguageRevision=report.version;
  window.IQ_NATURAL_LANGUAGE=report;
})();
