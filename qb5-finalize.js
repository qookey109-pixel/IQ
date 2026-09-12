// QB5 finalizer: apply construct variants, polish user-facing language, validate bank, and build a load-matched form.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {bank,VERSION,REVISION}=E;
  E.apply();

  // Natural Language Pass v1
  // Keeps construct/answer logic intact while removing template-like surface wrappers.
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
  const actors=['藍色棋子','圓形棋子','三角棋子','機器人','巡檢員','郵差','旅客','搬運車','探測器','小車','導航點','標記物','搜索員','工程車','無人機','登山客','導覽員','測量員'];
  const materials=['木製','塑膠','金屬','紙製','透明','白色','灰色','黑色','輕質','實心','空心','紅色','藍色','綠色','黃色','霧面','亮面','磁性'];
  const products=[['筆記本','本'],['鉛筆','支'],['貼紙','張'],['卡片','張'],['信封','個'],['紙盒','個'],['資料夾','個'],['標籤','張'],['票券','張'],['杯墊','個'],['明信片','張'],['小冊','本'],['紙袋','個'],['包裝盒','個'],['便條紙','張'],['書籤','張'],['紙張','張'],['圖卡','張']];
  const foods=['蘋果','橘子','米','咖啡豆','茶葉','馬鈴薯','番茄','麵粉','糖','鹽','堅果','葡萄','香蕉','豆子','燕麥','洋蔥','胡蘿蔔','地瓜'];
  const vehicles=['小貨車','電動車','巡檢車','巴士','接駁車','貨車','測試車','工程車','配送車','服務車','公務車','廂型車','機車','自行車','電輔車','觀光車','校車','搬運車'];
  const groups=['導覽組','工作組','練習組','測試組','報到組','攝影組','整理組','搬運組','巡檢組','採樣組','盤點組','清潔組','校對組','包裝組','審核組','交付組','測量組','記錄組'];
  const contexts=['圖書館','車站','展館','劇院','球館','工坊','書店','碼頭','畫廊','山屋','市集','茶館','教室','工作室','博物館','實驗室','運動中心','社區中心'];
  const equivalencePhrases=['以下哪一句邏輯相同？','下列哪句與它等價？','哪一項與這句意思相同？','哪個敘述與原句等價？','以下哪個說法保留相同邏輯？','哪一句保留完全相同的邏輯意思？'];

  function naturalizeMachine(q,n,v,t){
    const x=3+mod(n*2,9),a=2+mod(v,4),b=1+mod(n+v,6);let c;
    if(v===0){c=x*a+b;q.q=`X = ${x}，求 ${a}X + ${b}。`;q.e=`${a}×${x}+${b}=${c}。`;}
    else if(v===1){c=(x+b)*a;q.q=`X = ${x}，求 (X + ${b}) × ${a}。`;q.e=`(${x}+${b})×${a}=${c}。`;}
    else if(v===2){c=x*x-b;q.q=`X = ${x}，求 X² − ${b}。`;q.e=`${x}²−${b}=${c}。`;}
    else if(v===3){c=(x-b)*a;q.q=`X = ${x}，求 (X − ${b}) × ${a}。`;q.e=`(${x}−${b})×${a}=${c}。`;}
    else if(v===4){c=x*a-b;q.q=`X = ${x}，求 ${a}X − ${b}。`;q.e=`${a}×${x}−${b}=${c}。`;}
    else if(v===5){const d=1+t;c=(x+b)*a-d;q.q=`X = ${x}，求 (X + ${b}) × ${a} − ${d}。`;q.e=`(${x}+${b})×${a}−${d}=${c}。`;}
    else if(v===6){const d=2+t;c=x*a+b*d;q.q=`X = ${x}，求 ${a}X + ${b} × ${d}。`;q.e=`${a}×${x}+${b}×${d}=${c}。`;}
    else {c=x%2===0?x/2+b:x*2+b;q.q=`X = ${x}。若 X 為偶數，算 X ÷ 2 + ${b}；若為奇數，算 2X + ${b}。結果是多少？`;q.e=`${x} 是${x%2===0?'偶':'奇'}數，套用對應式得到 ${c}。`;}
  }

  function naturalizeInvariant(q,n,v){
    const A=10+mod(n,13),B=6+mod(n*2,10),k=1+mod(n+v,4);
    if(v===0){q.q=`甲袋有 ${A} 顆，乙袋有 ${B} 顆。甲給乙 ${k} 顆，乙再還 1 顆給甲。最後兩袋共有多少顆？`;q.e=`珠子只在兩袋之間移動，合計仍是 ${A+B} 顆。`;}
    else if(v===1){q.q=`甲袋有 ${A} 顆。甲給乙 ${k} 顆後，甲袋還有多少顆？`;q.e=`${A}−${k}=${A-k}。`;}
    else if(v===2){q.q=`乙袋原有 ${B} 顆。甲先給乙 ${k} 顆，乙再還甲 1 顆。最後乙袋有多少顆？`;q.e=`${B}+${k}−1=${B+k-1}。`;}
    else if(v===3){const aa=A-k+1,bb=B+k-1;q.q=`甲有 ${A} 顆、乙有 ${B} 顆。甲給乙 ${k} 顆，乙再還甲 1 顆。最後兩袋相差多少顆？`;q.e=`最後甲有 ${aa} 顆、乙有 ${bb} 顆，相差 ${Math.abs(aa-bb)} 顆。`;}
    else if(v===4){const C=4+mod(n,7),m=1+mod(n,3);q.q=`甲、乙、丙三盒分別有 ${A}、${B}、${C} 顆。甲給乙 ${k} 顆，乙再給丙 ${m} 顆。最後三盒共有多少顆？`;q.e=`只是在三盒之間移動，合計仍是 ${A+B+C} 顆。`;}
    else if(v===5){const m=2+mod(n,4);q.q=`乙杯原有 ${B} mL。甲倒入 ${k} mL 後，乙又倒回甲 ${m} mL。乙杯最後有多少 mL？`;q.e=`${B}+${k}−${m}=${B+k-m}。`;}
    else if(v===6){const value=2+mod(n,4);q.q=`甲盒有 ${A} 枚、乙盒有 ${B} 枚代幣，每枚值 ${value} 分。代幣在兩盒間任意移動後，全部代幣總值多少分？`;q.e=`總枚數不變，(${A}+${B})×${value}=${(A+B)*value}。`;}
    else {const C=5+mod(n,7);q.q=`甲、乙、丙三個容器分別有 ${A}、${B}、${C} 顆珠子。每次只把 1 顆珠子從一個容器移到另一個。移動若干次後，三個容器共有多少顆？`;q.e=`珠子只改變所在容器，總數仍是 ${A+B+C} 顆。`;}
  }

  function naturalizeUnitRate(q,n,v,t,s){
    const unit=5+mod(n,12),qty=3+t+mod(v,3),[product,cl]=products[s],food=foods[s],vehicle=vehicles[s],group=groups[s];
    if(v===0){q.q=`${qty} ${cl}${product}共 ${unit*qty} 元，平均每${cl}多少元？`;q.e=`${unit*qty}÷${qty}=${unit}。`;}
    else if(v===1){q.q=`${qty} 公斤${food}共 ${unit*qty} 元，每公斤多少元？`;q.e=`${unit*qty}÷${qty}=${unit}。`;}
    else if(v===2){const h=2+t,d=unit*h;q.q=`${vehicle} ${h} 小時行駛 ${d} 公里，速度固定。每小時行駛幾公里？`;q.e=`${d}÷${h}=${unit}。`;}
    else if(v===3){const total=unit*qty;q.q=`${qty} 盒${product}共有 ${total} ${cl}，每盒一樣多。每盒有幾${cl}？`;q.e=`${total}÷${qty}=${unit}。`;}
    else if(v===4){const need=qty+2;q.q=`製作 1 ${cl}${product}需要 ${unit} 克材料。做 ${need} ${cl}共需要多少克？`;q.e=`${unit}×${need}=${unit*need}。`;}
    else if(v===5){const mins=5+t*5,total=unit*mins;q.q=`機器 ${mins} 分鐘製作 ${total} ${cl}${product}，速率固定。每分鐘製作幾${cl}？`;q.e=`${total}÷${mins}=${unit}。`;}
    else if(v===6){const km=qty*2,cost=unit*km;q.q=`${vehicle}行駛 ${km} 公里共花 ${cost} 元，每公里成本固定。每公里多少元？`;q.e=`${cost}÷${km}=${unit}。`;}
    else {q.q=`${group}每組 ${unit} 人，共 ${qty} 組。總共有多少人？`;q.e=`${unit}×${qty}=${unit*qty}。`;}
  }

  function polishNaturalLanguage(items){
    for(const q of items){
      const n=itemIndex(q),v=variant(q),t=tier(q),s=Math.max(0,Math.min(17,Number(q.surfaceVariant||1)-1));
      if(q.taskFamily==='machine-composition') naturalizeMachine(q,n,v,t);
      else if(q.taskFamily==='scope-negation'){
        if(v===1)q.q=`「不是所有完成 A 的人都完成 B」${equivalencePhrases[s%equivalencePhrases.length]}`;
        else {const m=String(q.q).match(/「([^」]+)」/);if(m)q.q=`「${m[1]}」以下哪一句意思相同？`;}
      }
      else if(q.taskFamily==='invariant-transfer') naturalizeInvariant(q,n,v);
      else if(q.taskFamily==='quant-unit-rate') naturalizeUnitRate(q,n,v,t,s);
      else if(q.taskFamily==='grid-displacement'){
        const base=String(q.q).replace(/^以[^，]+的位置為例，/,'').replace(/^棋子/,actors[s]);q.q=base;
      }
      else if(q.taskFamily==='mirror-coordinate'){
        const base=String(q.q).replace(/^以[^，]+的位置為例，/,'');q.q=base.replace(/^點\s*/,`${actors[s]}位於點 `);
      }
      else if(q.taskFamily==='stack-hidden'){
        q.q=`使用${materials[s]}單位方塊搭成下圖。圖中數字表示每格堆疊的方塊數；相鄰方塊互相貼合，底面不算外露面。整個造型共有多少個外露面？`;
      }
      else if(q.taskFamily==='scale-drawing'){
        const base=String(q.q).replace(/^在[^，]+的比例草圖中，/,'');q.q=`${products[s][0]}的尺寸如下。${base}`;
      }
      else if(q.taskFamily==='shortest-grid-path'){
        q.q=`${actors[s]}要從 S 走到 E，每次只能上下左右移動 1 格，灰色格不可通行。最少要走幾步？`;
      }
      else if(q.taskFamily==='set-overlap'){
        const base=String(q.q).replace(/^在[^，]+的這個案例中，/,'');q.q=`${contexts[s]}的調查：${base}`;
      }
      else if(q.taskFamily==='pairing-capacity'){
        const base=String(q.q).replace(/^在[^，]+的這個案例中，/,'');q.q=`${contexts[s]}：${base}`;
      }
    }
  }
  polishNaturalLanguage(bank);

  const EQ=window.QB5_FORM_EQUIVALENCE;
  if(EQ)EQ.attach(bank);

  const domains=['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const errors=[],ids=new Set(),signatures=new Set(),semantics=new Set();
  for(const q of bank){
    if(ids.has(q.id))errors.push(`duplicate ID: ${q.id}`);ids.add(q.id);
    if(!q.q||!q.e||!q.taskFamily||!q.semanticKey)errors.push(`missing content: ${q.id}`);
    if(!Array.isArray(q.o)||q.o.length!==4||new Set(q.o.map(String)).size!==4)errors.push(`invalid choices: ${q.id}`);
    if(!Number.isInteger(q.a)||q.a<0||q.a>3)errors.push(`invalid answer key: ${q.id}`);
    if((q.d==='處理速度')!==(Number(q.limit)>0))errors.push(`timing mismatch: ${q.id}`);
    if(q.d==='視覺空間'&&!String(q.visual||'').includes('<svg'))errors.push(`missing spatial SVG: ${q.id}`);
    if(q.type==='memory'&&!q.stim)errors.push(`missing memory stimulus: ${q.id}`);
    if(q.type==='matrix'&&q.cells?.length!==9)errors.push(`invalid matrix: ${q.id}`);
    if(EQ&&!Number.isFinite(Number(q.formLoad)))errors.push(`missing form load: ${q.id}`);
    signatures.add(JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...q.o].sort()]));
    semantics.add(q.semanticKey);
  }
  if(bank.length!==5124)errors.push(`expected 5124 items, got ${bank.length}`);
  if(semantics.size!==294)errors.push(`expected 294 semantic templates, got ${semantics.size}`);
  if(bank.filter(q=>q.d==='視覺空間'&&String(q.visual||'').includes('<svg')).length!==1008)errors.push('all 1008 spatial items must have SVG diagrams');
  if(errors.length)throw new Error(errors.slice(0,40).join('; '));

  function shuffle(xs,random=Math.random){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function validateForm(form){
    const out=[];if(form.length!==30)out.push('form must contain 30 items');
    const ids=new Set();
    for(const q of form){if(ids.has(q.id))out.push(`duplicate item: ${q.id}`);ids.add(q.id);}
    for(const d of domains){
      const group=form.filter(q=>q.d===d);if(group.length!==5)out.push(`domain quota: ${d}`);
      if(new Set(group.map(q=>q.taskFamily)).size!==5)out.push(`family diversity: ${d}`);
      for(const [level,count] of Object.entries({easy:2,medium:2,hard:1}))if(group.filter(q=>q.difficulty===level).length!==count)out.push(`difficulty quota: ${d}/${level}`);
    }
    return {ok:!out.length,errors:out};
  }

  function generateCandidate({history=[],random=Math.random,pool=bank}={}){
    const recent=new Set(history.slice(-8).flat()),selected=[];
    for(const d of shuffle(domains,random)){
      const families=shuffle([...new Set(pool.filter(q=>q.d===d).map(q=>q.taskFamily))],random).slice(0,5);
      const tiers=shuffle(['easy','easy','medium','medium','hard'],random);
      families.forEach((family,i)=>{
        const variants=shuffle([...new Set(pool.filter(q=>q.d===d&&q.taskFamily===family).map(q=>q.semanticKey))],random);
        let candidates=[];
        for(const key of variants){
          const c=pool.filter(q=>q.d===d&&q.taskFamily===family&&q.semanticKey===key&&q.difficulty===tiers[i]);
          if(c.length){candidates=c;break;}
        }
        const fresh=candidates.filter(q=>!recent.has(q.id)),q=shuffle(fresh.length?fresh:candidates,random)[0];
        if(!q)throw new Error(`No eligible QB5 item: ${d}/${family}/${tiers[i]}`);selected.push(q);
      });
    }
    return selected;
  }

  function selectForm({history=[],random=Math.random,pool=bank}={}){
    const make=()=>generateCandidate({history,random,pool});
    const picked=EQ?EQ.pickBest(make,EQ.trials||64):{form:make(),metrics:null,trials:1};
    const form=shuffle(picked.form,random),report=validateForm(form);
    if(!report.ok)throw new Error(report.errors.join('; '));
    window.IQ_FORM_EQUIVALENCE_LAST=picked.metrics?{...picked.metrics,trials:picked.trials}:null;
    return form;
  }

  const historyKey=`cognitive-iq-lab:form-history:${VERSION}`;let history=[];
  try{const raw=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(raw))history=raw.filter(Array.isArray).slice(-8);}catch{}
  const form=selectForm({history});
  try{localStorage.setItem(historyKey,JSON.stringify([...history,form.map(q=>q.id)].slice(-8)));}catch{}
  window.IQ_QUESTIONS=form;
  window.IQ_BANK_VALIDATION={ok:true,errors:[],total:bank.length,uniqueTaskSignatures:signatures.size,semanticTemplates:semantics.size};
  window.IQ_DIVERSITY={
    ...(window.IQ_DIVERSITY||{}),selectForm,validateForm,semanticTemplates:semantics.size,familyDistinctPerDomain:true,
    formEquivalence:EQ?{version:EQ.version,trials:EQ.trials,principle:EQ.principle}:null
  };
  window.IQ_BANK_META={
    ...(window.IQ_BANK_META||{}),version:VERSION,revision:REVISION,totalItems:bank.length,selectedItems:30,domains:6,taskFamilies:42,
    semanticTemplates:semantics.size,spatialSvgItems:1008,verbalArchetypesPerFamily:2,otherArchetypesPerFamily:8,
    generation:'84-verbal-items-plus-5040-controlled-construct-variants',constructExpansion:'QB5',naturalLanguageRevision:'NL-2026.09.1',
    difficultyPolicy:'tier-specific span, operation count and constraint load',calibrationStatus:'uncalibrated',recentFormAvoidance:8,
    formEquivalence:EQ?'64-candidate-design-load-matching':'quota-only'
  };
  window.IQ_QB5={version:REVISION,semanticTemplates:semantics.size,uniqueTaskSignatures:signatures.size,spatialSvgItems:1008,
    naturalLanguageRevision:'NL-2026.09.1',principle:'construct diversity first; psychometric calibration still pending'};
})();