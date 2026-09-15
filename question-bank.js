// QB4: 84 verbal items + 35 task families × 144 reproducible variants = 5,124.
// A variant is not an independently authored passage. Never inflate verbal items with dates/IDs.
// semanticKey identifies the reasoning template, never a renamed object or a number.
(() => {
  'use strict';
  const version = 'QB-2026.09.4';
  const domains = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const families = [];
  const add = (domain, key, label, build) => families.push({domain, key, label, build});
  const words = ['竹林','港口','書店','花園','車站','山屋','劇院','工坊','市集','燈塔','茶館','畫廊'];
  function rng(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
  function shuffle(xs, random=Math.random) {
    const a=[...xs]; for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
  }
  const num = (q, c, e, extra={}) => ({q, correct:String(c), wrong:[c-1,c+1,c+2].map(String), e,...extra});
  const choice = (q, correct, wrong, e, extra={}) => ({q,correct,wrong,e,...extra});
  const scenes = [
    ['館員','借書','借閱證','圖書館'],['園丁','澆花','水壺','溫室'],
    ['旅客','搭車','車票','車站'],['演員','登台','通行證','劇院'],
    ['學員','入場練習','預約單','球館'],['訪客','參觀','入場券','展館'],
    ['技師','維修','工單','工坊'],['讀者','取書','領取單','書店'],
    ['船員','出港','許可證','碼頭'],['廚師','備餐','訂單','廚房'],
    ['畫家','布展','核准單','畫廊'],['登山客','進山','登記證','登山口']
  ];
  add(0,'necessary-condition','必要條件',n=>{
    const [who,act,permit,place]=scenes[n%12];
    return choice(`${place}規定：只有持有${permit}的人才可以${act}。一位${who}沒有${permit}。依規定可推知什麼？`,
      `這位${who}不可以${act}`,[`這位${who}一定可以${act}`,`所有${who}都沒有${permit}`,`持有${permit}就一定會${act}`],`「只有」指出必要條件；缺少${permit}就不符合${act}的資格。`);
  });
  add(0,'reported-vs-fact','報導與事實',n=>{
    const [who,act,,place]=scenes[n%12];
    return choice(`一則${place}紀錄寫道：「幾位${who}表示明天打算${act}。」下列哪句沒有把意願誤當成已發生的事？`,
      `這幾位${who}表示想${act}`,[`這幾位${who}已完成${act}`,`明天一定有人${act}`,`其他人都不想${act}`],`原文只記錄打算，不能推出完成、必然實現或其他人的意願。`);
  });
  add(0,'contrast-focus','轉折主旨',n=>{
    const topics=[['雨衣','輕巧','防水'],['背包','好看','耐用'],['地圖','精美','準確'],['座椅','便宜','舒適'],['路線','短','安全'],['工具','新穎','實用'],['燈具','小巧','明亮'],['教材','有趣','清楚'],['房間','寬敞','安靜'],['餐點','漂亮','美味'],['鞋子','時髦','合腳'],['方案','快速','可靠']];
    const [obj,a,b]=topics[n%12];
    return choice(`比較幾款${obj}後，小岑說：「${a}固然不錯，但我更在乎${b}。」哪一項最貼近她的重點？`,
      `選擇時更重視${b}`,[`只要${a}就會選`,`完全不在乎${b}`,`認為${a}與${b}相同`],`「但」「更」把重點放在${b}，並未否定${a}的價值。`);
  });
  add(0,'scope-negation','否定範圍',n=>{
    const [,act,,place]=scenes[n%12];
    return choice(`關於${place}的受訪者：「並非每個人都願意${act}」與哪一句意思相同？`,
      `至少一人不願意${act}`,[`沒有人願意${act}`,`每個人都願意${act}`,`恰好一人願意${act}`],`否定「所有人」只需至少一個反例，不等於「所有人都不」。`);
  });
  add(0,'instruction-exception','例外條款',n=>{
    const [,,permit,place]=scenes[n%12];
    return choice(`${place}公告：「週末不受理申請；但已預約者可在週六辦理。」小禾已預約週六。依公告哪項成立？`,
      '小禾可在預約的週六辦理',['小禾只能在週日辦理','所有人都可在週六辦理',`持有${permit}的人週日都可辦理`],`小禾符合已預約的例外條件；公告沒有開放所有人或週日。`);
  });
  add(0,'pronoun-reference','指涉辨識',n=>{
    const objects=['筆記','雨傘','地圖','外套','相機','手冊','畫冊','信封','茶杯','圍巾','書籤','水瓶'];
    const obj=objects[n%12];
    return choice(`小安去找小禾。小禾把${obj}交給小安，並請「收到${obj}的人」明天歸還。引號指誰？`,
      '小安',['小禾','兩人都不是','兩人都是'],`${obj}由小禾交給小安，所以接收者是小安。`);
  });
  add(0,'evidence-strength','證據強度',n=>{
    const [,act,,place]=scenes[n%12];
    return choice(`調查只訪問${place}的幾位常客，所有受訪者都喜歡${act}。哪個結論獲得資料直接支持？`,
      `這幾位受訪者都喜歡${act}`,[`全城的人都喜歡${act}`,`不常來的人都討厭${act}`,`${act}使每個人更快樂`],`結論只能涵蓋已訪問的樣本，不能擴大到全城或推論因果。`);
  });
  add(1,'machine-composition','規則機器',n=>{const a=n+2,b=3+n%5;return num(`規則機器先把輸入乘 ${b}，再減 ${b-1}。輸入 ${a}，輸出多少？`,a*b-b+1,`${a}×${b}−${b-1}=${a*b-b+1}。`);});
  add(1,'ordering-constraints','次序約束',n=>{const a=n+2;return choice(`編號 ${a}、${a+1}、${a+2} 的三場活動中，${a+2} 必須在 ${a} 前，${a} 必須在 ${a+1} 前。哪個順序符合？`,`${a+2} → ${a} → ${a+1}`,[`${a} → ${a+2} → ${a+1}`,`${a+1} → ${a} → ${a+2}`,`${a+2} → ${a+1} → ${a}`],'串接兩項先後限制即可得到唯一順序。');});
  add(1,'set-overlap','集合交集',n=>{const a=n+12,b=n+9,over=3+n%5;return num(`有 ${a} 人選甲課，${b} 人選乙課，共有 ${a+b-over} 人至少選了一課。兩課都選的有幾人？`,over,`${a}+${b}−${a+b-over}=${over}；重複計算的部分是交集。`);});
  add(1,'code-deduction','符碼對照',n=>{const a=n+11;return choice(`已知「山河」編成 ${a}-${a+1}，「河風」編成 ${a+1}-${a+2}，每字固定一碼。「風山」如何編？`,`${a+2}-${a}`,[`${a}-${a+2}`,`${a+1}-${a}`,`${a+2}-${a+1}`],'從共同的「河」對應中分離各字代碼，再依風、山的順序組合。');});
  add(1,'invariant-transfer','守恆推理',n=>{const a=n+10,b=n+6,k=2+n%5;return num(`甲袋有 ${a} 顆，乙袋有 ${b} 顆。甲移 ${k} 顆給乙，再由乙移 1 顆給甲。兩袋合計剩多少顆？`,a+b,`轉移只改變位置，總數維持 ${a}+${b}=${a+b}。`);});
  add(1,'pairing-capacity','配對限制',n=>{const a=n+8,b=n+5;return num(`桌上有 ${a} 把鎖與 ${b} 把鑰匙。每把鑰匙恰能配一把不同的鎖，每鎖最多一把鑰匙。最多配成幾組？`,b,`鑰匙較少，每把只能配一組，因此最多 ${b} 組。`);});
  add(1,'matrix-difference','矩陣差值',n=>{const a=n+8,b=2+n%6;return num('觀察矩陣：每列第三格等於第一格減第二格。缺失格是多少？',a+4-b-2,`${a+4}−${b+2}=${a+2-b}。`,{type:'matrix',cells:[a,b,a-b,a+2,b+1,a+1-b,a+4,b+2,'?'].map(String)});});
  add(2,'grid-displacement','方格位移',n=>{const x=n+3,y=2+n%9;return choice(`棋子從 (${x}, ${y}) 出發，向右 3 格再向上 2 格；右為 x 增加，上為 y 增加。終點是？`,`(${x+3}, ${y+2})`,[`(${x-3}, ${y+2})`,`(${x+3}, ${y-2})`,`(${x+2}, ${y+3})`],'水平加 3、垂直加 2，兩個座標分別更新。');});
  add(2,'mirror-coordinate','鏡面位置',n=>{const x=n+2,y=3+n%8;return choice(`點 (${x}, ${y}) 對 y 軸作左右鏡射後的座標是？`,`(${-x}, ${y})`,[`(${x}, ${-y})`,`(${-x}, ${-y})`,`(${y}, ${x})`],'對 y 軸鏡射只改變 x 的正負。');});
  add(2,'viewpoint-heading','方位旋轉',n=>{const angle=(n%72)*5,turn=n<72?45:135,end=(angle+turn)%360;return choice(`羅盤以正北為 0°，順時針計角度。指針原指 ${angle}°，再順時針旋轉 ${turn}°，現在指向幾度？`,`${end}°`,[`${(angle-turn+360)%360}°`,`${angle}°`,`${(end+180)%360}°`],`原方位加上旋轉角度，超過 360° 扣掉一圈，得到 ${end}°。`);});
  add(2,'rectangle-cut','切割面積',n=>{const a=n+5,b=4+n%5;return num(`一張長 ${a}、寬 ${b} 的方格紙，沿長邊裁掉寬 2、長 ${a} 的完整紙條。剩下面積是多少？`,a*(b-2),`剩餘長寬為 ${a} 與 ${b-2}，面積為 ${a*(b-2)}。`);});
  add(2,'stack-hidden','堆疊遮擋',n=>{const a=n+2,b=2+n%7,c=1+n%4;return num(`三根方塊柱的高度分別為 ${a}、${b}、${c}，每根上下緊貼且沒有空洞。從正上方只能看見 3 個頂面。共有幾個方塊？`,a+b+c,`俯視的頂面不代表總量，總數為三柱高度相加：${a+b+c}。`);});
  add(2,'scale-drawing','比例縮放',n=>{const a=n+3,s=2+n%4;return num(`某線段原長 ${a} 格，圖形等比例放大為原來 ${s} 倍。線段新長幾格？`,a*s,`每個線性尺寸乘 ${s}，所以 ${a}×${s}=${a*s}。`);});
  add(2,'shortest-grid-path','格線最短路',n=>{const a=n+2,b=3+n%8;return num(`格線地圖上，終點在起點東方 ${a} 格、北方 ${b} 格。只能沿水平或垂直格線走，最短要走幾格？`,a+b,`至少走 ${a} 格水平與 ${b} 格垂直，共 ${a+b} 格。`);});
  const memory=(body,stim)=>({...body,type:'memory',stim});
  add(3,'memory-position','位置回憶',n=>{const a=n+11,seq=[a,a+7,a+3,a+9];return memory(num('剛才序列的第 3 個數字是？',seq[2],`第 3 個是 ${seq[2]}。`),seq.join('　'));});
  add(3,'memory-pair','配對記憶',n=>{const a=n+10;return memory(num('剛才「山屋」對應的編號是？',a+3,`山屋配對 ${a+3}。`),`港口 ${a}　山屋 ${a+3}　書店 ${a+7}`);});
  add(3,'memory-update','資訊更新',n=>{const a=n+3;return memory(num('依剛才的更新指令，最後數量是多少？',a+2,`${a}+4−2=${a+2}。`),`起始 ${a}；增加 4；減少 2`);});
  add(3,'memory-filter','選擇性記憶',n=>{const a=n+10,[x,y,z]=shuffle(words,rng(n+801)).slice(0,3);return memory(choice('只回憶剛才的三個地點，保持出現順序。',`${x} → ${y} → ${z}`,[`${y} → ${x} → ${z}`,`${x} → ${z} → ${y}`,`${z} → ${y} → ${x}`],`忽略穿插數字後，地點順序是${x}、${y}、${z}。`),`${a}　${x}　${a+5}　${y}　${a+8}　${z}`);});
  add(3,'memory-recognition','新舊辨認',n=>{const a=n+11;return memory(num('哪一個數字剛才沒有出現？',a+2,`${a+2} 未出現在刺激中。`,{wrong:[a,a+1,a+3].map(String)}),`${a}　${a+3}　${a+1}`);});
  add(3,'memory-relative','相對位置記憶',n=>{const a=n+7;return memory(num('剛才數字 2 左邊緊鄰的數字是？',a,`數字 2 的左鄰是 ${a}。`),`${a+5}　${a}　2　${a+3}`);});
  add(3,'memory-reorder','順序重組',n=>{const a=n+10;return memory(choice('將剛才三個數字的第一個移到最後，其餘順序不變。',`${a+2} → ${a+5} → ${a}`,[`${a+5} → ${a+2} → ${a}`,`${a} → ${a+5} → ${a+2}`,`${a+2} → ${a} → ${a+5}`],'移走首項後，保留其餘順序，再把首項接到尾端。'),`${a}　${a+2}　${a+5}`);});
  const timed=body=>({...body,limit:18});
  add(4,'speed-exact','精確比對',n=>{const s=`K${n+101}R${n+203}`;return timed(choice(`快速找出與「${s}」完全相同的代碼。`,s,[`R${n+101}K${n+203}`,`K${n+102}R${n+203}`,`K${n+101}R${n+204}`],'逐字比對字母與數字，不能只看開頭。'));});
  add(4,'speed-count','目標計數',n=>{const r=rng(n+77),len=14+n%5;const s=shuffle([...Array(3+n%5).fill('●'),...Array(len).fill('○')],r).join(' ');return timed(num(`快速數出黑色實心圓的數量：${s}`,3+n%5,`只有 ● 計入，共 ${3+n%5} 個。`));});
  add(4,'speed-pair-equality','配對搜尋',n=>{const a=n+101;return timed(choice('哪一組左右代碼完全一致？',`${a}Q / ${a}Q`,[`${a}R / ${a}Q`,`${a}Q / ${a+1}Q`,`${a+1}R / ${a}R`],'唯一一組的每個數字與字母都相同。'));});
  add(4,'speed-parity','條件篩選',n=>{const a=2*n+10;return timed(num(`從選項快速找出唯一的奇數（候選值介於 ${a} 與 ${a+6}）。`,a+3,`${a+3} 無法被 2 整除。`,{wrong:[a,a+2,a+6].map(String)}));});
  add(4,'speed-order','順序掃描',n=>{const a=n+20;return timed(choice('哪一列的數字嚴格由小到大？',`${a} · ${a+2} · ${a+5}`,[`${a+2} · ${a} · ${a+5}`,`${a} · ${a+5} · ${a+2}`,`${a+5} · ${a+2} · ${a}`],'從左到右每一步都增加。'));});
  add(4,'speed-boundary','首尾條件',n=>{const a=n+100;return timed(choice('哪個代碼以 M 開頭、以 T 結尾？',`M${a}T`,[`T${a}M`,`M${a}R`,`R${a}T`],'必須同時符合開頭 M 與結尾 T。'));});
  add(4,'speed-missing','缺項搜尋',n=>{const a=n+10;return timed(num(`完整清單應有 ${a} 到 ${a+5} 的所有整數。現在看到 ${a}、${a+1}、${a+3}、${a+4}、${a+5}，少了哪個？`,a+2,`逐項比對連續整數，缺少 ${a+2}。`));});
  add(5,'quant-discount','折扣計算',n=>{const a=(n+10)*10;return num(`一件商品標價 ${a} 元，打八折，應付多少元？`,a*0.8,`${a}×0.8=${a*0.8} 元。`);});
  add(5,'quant-unit-rate','單位價格',n=>{const a=n+5;return num(`4 本相同筆記本共 ${a*4} 元，單本幾元？`,a,`${a*4}÷4=${a} 元。`);});
  add(5,'quant-average','平均補值',n=>{const a=n+10;return num(`三天平均讀 ${a} 頁；前兩天分別讀 ${a-2}、${a+5} 頁。第三天讀多少頁？`,a-3,`總共 ${a*3} 頁，扣掉前兩天 ${a*2+3} 頁，剩 ${a-3} 頁。`);});
  add(5,'quant-remainder','整除餘數',n=>{const r=1+n%6,a=7*(n+1)+r;return num(`${a} 顆糖每袋裝 7 顆，裝滿若干袋後還剩幾顆？`,r,`${a}=7×${n+1}+${r}，餘數為 ${r}。`,{wrong:[0,(r+1)%7,(r+2)%7].filter((x,i,a)=>a.indexOf(x)===i&&x!==r).concat([7,8]).slice(0,3).map(String)});});
  add(5,'quant-time','時刻推算',n=>{const duration=n+21,start=8*60+35,end=start+duration,fmt=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;return choice(`列車上午 8:35 出發，車程 ${duration} 分鐘。抵達時刻是？`,fmt(end),[fmt(end+10),fmt(end-10),fmt(end+60)],`8:35 加 ${duration} 分鐘為 ${fmt(end)}，每 60 分鐘進位一小時。`);});
  add(5,'quant-probability','機率計數',n=>{const a=n+4;return choice(`袋中有 1 顆紅球與 ${a-1} 顆白球，各球被抽到的機會相同。只抽一球，紅球機率是？`,`1/${a}`,[`1/${a+1}`,`1/${a-1}`,`2/${a}`],`紅球 1 顆，總數 ${a} 顆，機率為 1/${a}。`);});
  add(5,'quant-balance','等式求值',n=>{const a=n+5;return num(`天平平衡：3 個相同砝碼加 2 克，等於 ${3*a+2} 克。每個砝碼幾克？`,a,`先減 2 再除以 3：(${3*a+2}−2)÷3=${a}。`);});

  const bank=[];
  families.forEach((f,fi)=>{
    for(let n=0;n<(f.domain===0?12:144);n++){
      const b=f.build(n),correct=String(b.correct),wrong=[...new Set(b.wrong.map(String))];
      if(wrong.length!==3||wrong.includes(correct)) throw Error(`Invalid choices: ${f.key}/${n}`);
      const o=shuffle([correct,...wrong],rng(fi*144+n+917));
      const {correct:unused,wrong:unusedWrong,...body}=b;
      bank.push({id:`qb4-${f.key}-${String(n+1).padStart(3,'0')}`,bankVersion:version,bankRevision:'4.0',
        source:'original-controlled-variant',d:domains[f.domain],model:`v4-${f.key}`,taskFamily:f.key,
        taskLabel:f.label,semanticKey:f.key,difficulty:n%5<2?'easy':n%5<4?'medium':'hard',
        type:'normal',...body,o,a:o.indexOf(correct)});
    }
  });
  function validateBank(items){
    const errors=[],ids=new Set(),signatures=new Set();
    for(const q of items){
      if(ids.has(q.id))errors.push(`duplicate ID: ${q.id}`);
      ids.add(q.id);
      if(!domains.includes(q.d)||!['easy','medium','hard'].includes(q.difficulty))errors.push(`invalid classification: ${q.id}`);
      if(!q.semanticKey||!q.taskFamily||!q.e||!q.q)errors.push(`missing content: ${q.id}`);
      if(!Array.isArray(q.o)||q.o.length!==4||new Set(q.o).size!==4||!Number.isInteger(q.a)||q.a<0||q.a>3)errors.push(`invalid choices: ${q.id}`);
      if((q.d==='處理速度')!==(Number(q.limit)>0))errors.push(`invalid timing: ${q.id}`);
      if(q.type==='memory'&&!q.stim)errors.push(`missing stimulus: ${q.id}`);
      if(q.type==='matrix'&&q.cells?.length!==9)errors.push(`invalid matrix: ${q.id}`);
      const signature=JSON.stringify([q.q,q.stim||'',q.cells||[],[...q.o].sort()]);
      if(signatures.has(signature))errors.push(`duplicate content: ${q.id}`);
      signatures.add(signature);
    }
    if(items.length!==5124)errors.push(`expected 5124 items, got ${items.length}`);
    return {ok:!errors.length,errors,total:items.length,uniqueTaskSignatures:signatures.size};
  }
  const validation=validateBank(bank);
  if(!validation.ok)throw Error(validation.errors.join('; '));
  function validateForm(form){
    const errors=[],counts={},semantics=new Set(),ids=new Set();
    if(form.length!==30) errors.push('form must contain 30 items');
    for(const q of form){
      counts[q.taskFamily]=(counts[q.taskFamily]||0)+1;
      if(counts[q.taskFamily]>2)errors.push(`family limit: ${q.taskFamily}`);
      if(semantics.has(q.semanticKey))errors.push(`semantic repeat: ${q.semanticKey}`);
      if(ids.has(q.id))errors.push(`duplicate: ${q.id}`);
      semantics.add(q.semanticKey);ids.add(q.id);
    }
    for(const d of domains){const group=form.filter(q=>q.d===d);
      if(group.length!==5)errors.push(`domain quota: ${d}`);
      for(const [tier,count] of Object.entries({easy:2,medium:2,hard:1}))
        if(group.filter(q=>q.difficulty===tier).length!==count)errors.push(`difficulty quota: ${d}/${tier}`);
    }
    return {ok:!errors.length,errors};
  }
  function selectForm({history=[],random=Math.random,pool=bank}={}){
    const recent=new Set(history.slice(-8).flat()),used=new Set(),selected=[];
    for(const d of shuffle(domains,random)){
      const fs=shuffle([...new Set(pool.filter(q=>q.d===d).map(q=>q.semanticKey))],random).filter(k=>!used.has(k));
      if(fs.length<5)throw Error(`Insufficient semantic diversity in ${d}`);
      const tiers=shuffle(['easy','easy','medium','medium','hard'],random);
      fs.slice(0,5).forEach((key,i)=>{
        const candidates=pool.filter(q=>q.d===d&&q.semanticKey===key&&q.difficulty===tiers[i]);
        const fresh=candidates.filter(q=>!recent.has(q.id));
        const q=shuffle(fresh.length?fresh:candidates,random)[0];
        if(!q)throw Error(`No eligible item: ${key}/${tiers[i]}`);
        used.add(key);selected.push(q);
      });
    }
    const form=shuffle(selected,random),report=validateForm(form);
    if(!report.ok)throw Error(report.errors.join('; '));
    return form;
  }
  const historyKey=`cognitive-iq-lab:form-history:${version}`;
  let history=[];
  try {const raw=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(raw))history=raw.filter(Array.isArray).slice(-8);}catch{}
  const selected=selectForm({history});
  try {localStorage.setItem(historyKey,JSON.stringify([...history,selected.map(q=>q.id)].slice(-8)));}catch{}
  window.IQ_QUESTION_BANK=bank;
  window.IQ_QUESTIONS=selected;
  window.IQ_DIVERSITY={families:families.map(({domain,key,label})=>({domain:domains[domain],key,label})),selectForm,validateForm,validateBank};
  window.IQ_BANK_VALIDATION=validation;
  window.IQ_BANK_META={version,revision:'4.0',totalItems:bank.length,selectedItems:30,domains:6,domainOrder:[...domains],
    itemsPerDomain:5,itemsPerDomainInBank:Object.fromEntries(domains.map(d=>[d,bank.filter(q=>q.d===d).length])),
    formDifficulty:{easy:2,medium:2,hard:1},difficultyLabels:{easy:'基礎',medium:'中等',hard:'進階'},
    taskFamilies:42,maxFamilyPerForm:2,uniqueSemanticTemplatesPerForm:30,recentFormAvoidance:8,
    generation:'84-verbal-items-plus-5040-controlled-variants',calibrationStatus:'uncalibrated',duplicateTaskGuard:true};
  window.addEventListener('load',()=>{const restart=document.getElementById('restartBtn');if(restart)restart.onclick=()=>window.location.reload();});
})();