// QB4 Clarity v3 — construct-preserving clarity.
// Clarifies only conventions that would otherwise permit multiple reasonable readings.
// Reasoning steps stay in explanations, not in prompts.
(() => {
  'use strict';

  const scenes = [
    ['館員','借書','借閱證','圖書館'],['園丁','澆花','水壺','溫室'],
    ['旅客','搭車','車票','車站'],['演員','登台','通行證','劇院'],
    ['學員','入場練習','預約單','球館'],['訪客','參觀','入場券','展館'],
    ['技師','維修','工單','工坊'],['讀者','取書','領取單','書店'],
    ['船員','出港','許可證','碼頭'],['廚師','備餐','訂單','廚房'],
    ['畫家','布展','核准單','畫廊'],['登山客','進山','登記證','登山口']
  ];
  const topics=[
    ['雨衣','輕巧','防水'],['背包','好看','耐用'],['地圖','精美','準確'],['座椅','便宜','舒適'],
    ['路線','短','安全'],['工具','新穎','實用'],['燈具','小巧','明亮'],['教材','有趣','清楚'],
    ['房間','寬敞','安靜'],['餐點','漂亮','美味'],['鞋子','時髦','合腳'],['方案','快速','可靠']
  ];
  const objects=['筆記','雨傘','地圖','外套','相機','手冊','畫冊','信封','茶杯','圍巾','書籤','水瓶'];

  const expectedCounts = {
    'necessary-condition':12,'reported-vs-fact':12,'contrast-focus':12,'scope-negation':12,
    'instruction-exception':12,'pronoun-reference':12,'evidence-strength':12,
    'ordering-constraints':144,'set-overlap':144,'code-deduction':144,'invariant-transfer':144,
    'pairing-capacity':144,'matrix-difference':144,'grid-displacement':144,'mirror-coordinate':144,
    'viewpoint-heading':144,'rectangle-cut':144,'stack-hidden':144,'scale-drawing':144,
    'shortest-grid-path':144,'memory-update':144,'memory-relative':144,'speed-parity':144,
    'quant-discount':144,'quant-average':144,'quant-remainder':144,'quant-time':144,
    'quant-probability':144,'quant-balance':144
  };

  function variantIndex(q) {
    const m = String(q?.id || '').match(/-(\d{3})$/);
    return m ? Number(m[1]) - 1 : -1;
  }

  function rewrite(q) {
    const n = variantIndex(q);
    if (!q || n < 0) return false;
    let text = null;

    switch (q.taskFamily) {
      case 'necessary-condition': {
        const [who,act,permit,place]=scenes[n%12];
        text=[
          `${place}規定：只有持有${permit}的人才具備${act}資格。一位${who}沒有${permit}。依規定可推知什麼？`,
          `「只有持有${permit}的人才具備${act}資格」表示${permit}是必要條件。這位${who}沒有${permit}，因此不具備${act}資格；但不能反過來推出持有${permit}的人一定會${act}。`
        ]; break;
      }
      case 'reported-vs-fact': {
        const [who,act,,place]=scenes[n%12];
        text=[
          `一則${place}紀錄寫道：「幾位${who}表示明天打算${act}。」只依這則紀錄，哪一項成立？`,
          `紀錄能直接確定的是：這幾位${who}表示打算${act}。它不能證明事情已完成，也不能保證明天一定發生，更不能推知其他人的打算。`
        ]; break;
      }
      case 'contrast-focus': {
        const [obj,a,b]=topics[n%12];
        text=[
          `比較幾款${obj}後，小岑說：「${a}固然不錯，但我更在乎${b}。」哪一項最貼近她表達的重點？`,
          `「但我更在乎${b}」表示她在這次選擇中把${b}放在較高優先順位；這不代表她完全否定${a}。`
        ]; break;
      }
      case 'scope-negation': {
        const [,act,,place]=scenes[n%12];
        text=[
          `關於${place}的受訪者，「並非每個人都願意${act}」與哪一項意思相同？`,
          `否定「每個人都願意${act}」只需要至少一個反例，因此等價於「至少有一位受訪者不願意${act}」。`
        ]; break;
      }
      case 'instruction-exception': {
        const [,,,place]=scenes[n%12];
        text=[
          `${place}公告：「週末不受理申請；但已預約者可在週六辦理。」小禾已預約週六。依公告哪一項成立？`,
          `小禾符合公告明示的例外，因此可在預約的週六辦理。公告沒有開放所有人週六辦理，也沒有開放週日。`
        ]; break;
      }
      case 'pronoun-reference': {
        const obj=objects[n%12];
        text=[
          `小禾把${obj}交給小安，接著對小安說：「請你明天歸還。」句中的「你」指誰？`,
          `這句話是小禾對小安說的，因此引號中的第二人稱「你」指小安。`
        ]; break;
      }
      case 'evidence-strength': {
        const [,act,,place]=scenes[n%12];
        text=[
          `一份調查只訪問${place}的幾位常客，所有受訪者都表示喜歡${act}。哪個結論最符合這份資料？`,
          `資料直接支持的範圍只有實際受訪者：所有受訪者都表示喜歡${act}。不能據此推論未受訪者、整個地區，或宣稱因果。`
        ]; break;
      }
      case 'ordering-constraints': {
        const a=n+2;
        text=[
          `編號 ${a}、${a+1}、${a+2} 的三場活動中，${a+2} 必須早於 ${a}，而 ${a} 必須早於 ${a+1}。哪個順序符合全部條件？`,
          `把兩項先後限制串起來：${a+2} 早於 ${a}，而 ${a} 又早於 ${a+1}，所以順序是 ${a+2} → ${a} → ${a+1}。`
        ]; break;
      }
      case 'set-overlap': {
        const a=n+12,b=n+9,over=3+n%5,u=a+b-over;
        text=[
          `有 ${a} 人選甲課，${b} 人選乙課；選甲、選乙、或兩課都選的人合計 ${u} 人。兩課都選的有幾人？`,
          `甲乙人數相加時，兩課都選的人會被計算兩次，所以交集＝${a}+${b}−${u}=${over}。`
        ]; break;
      }
      case 'code-deduction': {
        const a=n+11;
        text=[
          `已知「山河」編成 ${a}-${a+1}，「河風」編成 ${a+1}-${a+2}，而同一個字固定對應同一個碼。「風山」如何編？`,
          `共同字「河」對應 ${a+1}，所以「山」對應 ${a}、「風」對應 ${a+2}；依風、山順序得到 ${a+2}-${a}。`
        ]; break;
      }
      case 'invariant-transfer': {
        const a=n+10,b=n+6,k=2+n%5;
        text=[
          `甲袋有 ${a} 顆，乙袋有 ${b} 顆。甲移 ${k} 顆給乙，再由乙移 1 顆給甲。操作後兩袋合計有多少顆？`,
          `兩次都是袋與袋之間的轉移，物品總數沒有改變，所以合計仍是 ${a}+${b}=${a+b} 顆。`
        ]; break;
      }
      case 'pairing-capacity': {
        const a=n+8,b=n+5;
        text=[
          `桌上有 ${a} 把鎖與 ${b} 把鑰匙。每把鑰匙能配一把鎖，而且不同鑰匙不能配到同一把鎖。最多能配成幾組？`,
          `每組需要一把鎖和一把鑰匙，而且鑰匙不能重複配到同一把鎖。鑰匙較少，因此最多能完成 ${b} 組。`
        ]; break;
      }
      case 'matrix-difference': {
        const a=n+8,b=2+n%6;
        text=[
          '觀察矩陣：每一列都遵循同一個簡單算術規則。缺失格最可能是多少？',
          `前兩列都符合「第一格減第二格＝第三格」；因此最後一列是 ${a+4}−${b+2}=${a+2-b}。`
        ]; break;
      }
      case 'grid-displacement': {
        const x=n+3,y=2+n%9;
        text=[
          `在標準直角座標系中，棋子從 (${x}, ${y}) 出發，向右 3 格再向上 2 格。終點座標是？`,
          `向右使 x 增加 3：${x}+3=${x+3}；向上使 y 增加 2：${y}+2=${y+2}。所以終點是 (${x+3}, ${y+2})。`
        ]; break;
      }
      case 'mirror-coordinate': {
        const x=n+2,y=3+n%8;
        text=[
          `在標準直角座標系中，點 (${x}, ${y}) 對 y 軸鏡射後的座標是？`,
          `對 y 軸鏡射只改變 x 的正負，y 不變，因此得到 (${-x}, ${y})。`
        ]; break;
      }
      case 'viewpoint-heading': {
        const angle=(n%72)*5,turn=n<72?45:135,end=(angle+turn)%360;
        text=[
          `羅盤以正北為 0°，角度順時針增加。指針原在 ${angle}°，再順時針旋轉 ${turn}°，最後是多少度？`,
          `順時針旋轉就是相加，超過一圈時以 360° 取等價角：(${angle}+${turn}) mod 360=${end}°。`
        ]; break;
      }
      case 'rectangle-cut': {
        const a=n+5,b=4+n%5,r=b-2;
        text=[
          `一張長 ${a} 格、寬 ${b} 格的長方形方格紙，沿整個長度裁去一條寬 2 格的長方形紙條。剩下面積是多少平方格？`,
          `裁掉的是整段長度上的 2 格寬紙條，所以剩餘寬度是 ${b}−2=${r} 格；面積＝${a}×${r}=${a*r} 平方格。`
        ]; break;
      }
      case 'stack-hidden': {
        const a=n+2,b=2+n%7,c=1+n%4;
        text=[
          `三根直立方塊柱的高度分別為 ${a}、${b}、${c}，每根都由單位方塊逐層堆成。三根柱合計共有幾個方塊？`,
          `每根柱的高度就是該柱的方塊數，因此總數為 ${a}+${b}+${c}=${a+b+c}。`
        ]; break;
      }
      case 'scale-drawing': {
        const a=n+3,s=2+n%4;
        text=[
          `一條線段原長 ${a} 格；圖形等比例放大為原來的 ${s} 倍。這條線段放大後長幾格？`,
          `線性尺寸按相同比例放大，所以 ${a}×${s}=${a*s} 格。`
        ]; break;
      }
      case 'shortest-grid-path': {
        const east=n+2,north=3+n%8,total=east+north;
        text=[
          `起點座標視為 (0,0)。終點在起點東方 ${east} 格、北方 ${north} 格；每次只能沿格線水平或垂直移動 1 格。從起點到終點，最少需要移動幾格？`,
          `因為只能水平或垂直移動，最短路徑需要完成 ${east} 格水平位移與 ${north} 格垂直位移，所以共 ${east}+${north}=${total} 格。`
        ]; break;
      }
      case 'memory-update': {
        const a=n+3;
        text=[
          '依照剛才顯示的順序，從起始值開始依序執行更新。最後數量是多少？',
          `刺激依序是：起始 ${a}、增加 4、減少 2，所以 ${a}+4−2=${a+2}。`
        ]; break;
      }
      case 'memory-relative': {
        const a=n+7;
        text=[
          '剛才序列中，單獨的「2」這個項目左邊緊鄰的數字是？',
          `要找的是獨立項目「2」，不是含有數字 2 的其他多位數；它左邊緊鄰的是 ${a}。`
        ]; break;
      }
      case 'speed-parity': {
        const a=2*n+10,c=a+3;
        text=[
          '以下四個選項中，哪一個是唯一的奇數？',
          `${c} 不能被 2 整除，其餘三個選項都能被 2 整除，因此 ${c} 是唯一的奇數。`
        ]; break;
      }
      case 'quant-discount': {
        const a=(n+10)*10,c=a*0.8;
        text=[
          `一件商品標價 ${a} 元，打八折，也就是按原價的 80% 付款。應付多少元？`,
          `${a}×0.8=${c} 元。`
        ]; break;
      }
      case 'quant-average': {
        const a=n+10,p1=a-2,p2=a+5,total=a*3,p12=p1+p2,c=a-3;
        text=[
          `連續三天每天平均讀 ${a} 頁；前兩天分別讀 ${p1} 頁、${p2} 頁。第三天讀多少頁？`,
          `三天總量是 ${a}×3=${total} 頁；前兩天共 ${p12} 頁，所以第三天是 ${total}−${p12}=${c} 頁。`
        ]; break;
      }
      case 'quant-remainder': {
        const r=1+n%6,a=7*(n+1)+r;
        text=[
          `${a} 顆糖，每袋裝 7 顆。盡量裝成完整的 7 顆一袋後，還剩幾顆？`,
          `${a}=7×${n+1}+${r}，所以裝滿 ${n+1} 袋後剩 ${r} 顆。`
        ]; break;
      }
      case 'quant-time': {
        const duration=n+21,start=8*60+35,end=start+duration,fmt=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
        text=[
          `列車 08:35 出發（24 小時制），車程 ${duration} 分鐘。抵達時刻是？`,
          `08:35 加上 ${duration} 分鐘，得到 ${fmt(end)}。`
        ]; break;
      }
      case 'quant-probability': {
        const a=n+4;
        text=[
          `袋中有 1 顆紅球與 ${a-1} 顆白球，每一顆球被抽中的機會相同。隨機抽 1 顆，抽到紅球的機率是多少？`,
          `共有 ${a} 顆等可能的球，其中 1 顆是紅球，所以機率為 1/${a}。`
        ]; break;
      }
      case 'quant-balance': {
        const a=n+5,total=3*a+2;
        text=[
          `3 個完全相同的砝碼，其總重量再加 2 克，剛好等於 ${total} 克。每個砝碼重多少克？`,
          `先扣除額外的 2 克，再除以 3：(${total}−2)÷3=${a} 克。`
        ]; break;
      }
      default: return false;
    }

    q.q = text[0];
    q.e = text[1];
    q.clarityRevision = '3.0';
    return true;
  }

  const seen = new Set();
  const counts = {};
  let modifiedItems = 0;
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (rewrite(q)) {
        modifiedItems += 1;
        counts[q.taskFamily] = (counts[q.taskFamily] || 0) + 1;
      }
    }
  }

  window.IQ_CLARITY_V3 = {
    version: '3.0',
    modifiedItems,
    modifiedFamilies: Object.keys(counts).length,
    counts,
    expectedCounts,
    fieldsChanged: ['q','e'],
    principle: 'construct-preserving clarity: clarify conventions, keep reasoning out of prompts'
  };
})();