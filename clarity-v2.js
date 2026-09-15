// QB4 Clarity v2 — wording-only revision layer.
// Updates ambiguous prompts/explanations while preserving answer choices, keys,
// difficulty, timing, diagrams, IDs, and selection behavior.
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
    'pairing-capacity':144,'grid-displacement':144,'mirror-coordinate':144,'viewpoint-heading':144,
    'rectangle-cut':144,'stack-hidden':144,'scale-drawing':144,'shortest-grid-path':144,
    'speed-parity':144,'quant-discount':144,'quant-average':144,'quant-probability':144,'quant-balance':144
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
      case 'necessary-condition': { const [who,act,permit,place]=scenes[n%12]; text=[
        `${place}明確規定：「必須持有${permit}，才具備${act}的資格。」一位${who}沒有${permit}。只依這項規定判斷，哪一項必然成立？`,
        `這項規定把「持有${permit}」設為${act}的必要條件；沒有${permit}，就不具備${act}的資格。題目沒有說持有${permit}的人一定會${act}。`
      ]; break; }
      case 'reported-vs-fact': { const [who,act,,place]=scenes[n%12]; text=[
        `一則${place}紀錄只寫道：「幾位${who}表示明天打算${act}。」只依這句紀錄，哪一項可以直接確定？`,
        `紀錄能直接確定的只有：這幾位${who}表達了想${act}的意願。意願不等於已經完成，也不能推出明天一定會發生，或推知其他人的想法。`
      ]; break; }
      case 'contrast-focus': { const [obj,a,b]=topics[n%12]; text=[
        `比較幾款${obj}後，小岑明確說：「${a}固然不錯，但我更在乎${b}。」只依這句話，哪一項最能代表她表達的優先順序？`,
        `「但我更在乎${b}」明確表示：在這次比較中，她把${b}放在較高優先順位；這不代表她完全不在乎${a}。`
      ]; break; }
      case 'scope-negation': { const [,act,,place]=scenes[n%12]; text=[
        `針對${place}的受訪者，敘述「並非每個人都願意${act}」。依一般邏輯，下面哪一句與它等價？`,
        `「並非每個人都願意${act}」等價於「至少有一位受訪者不願意${act}」。它不表示所有人都不願意，也沒有說恰好只有一人。`
      ]; break; }
      case 'instruction-exception': { const [,,,place]=scenes[n%12]; text=[
        `${place}公告的完整規則是：「週末原則上不受理申請；明示的例外是，已預約者可在週六辦理。」小禾已預約週六。只依這份公告，哪一項成立？`,
        `小禾符合公告明示的「已預約者」例外，因此可在預約的週六辦理。公告沒有說所有人週六都能辦，也沒有開放週日。`
      ]; break; }
      case 'pronoun-reference': { const obj=objects[n%12]; text=[
        `小安去找小禾。小禾把${obj}交給小安，接著請「收到${obj}的人」明天歸還。句中的「收到${obj}的人」明確指誰？`,
        `${obj}是由小禾交給小安，因此在這段敘述中，收到${obj}的人就是小安。`
      ]; break; }
      case 'evidence-strength': { const [,act,,place]=scenes[n%12]; text=[
        `一份調查只訪問${place}的幾位常客，而且所有受訪者都表示喜歡${act}。如果不把結果外推到未受訪者，也不推論因果，哪個結論可以由這份資料直接確定？`,
        `資料直接支持的範圍只有受訪樣本：這幾位受訪者都表示喜歡${act}。不能據此推論全城、不常來的人，或宣稱${act}造成某種情緒結果。`
      ]; break; }
      case 'ordering-constraints': { const a=n+2; text=[
        `編號 ${a}、${a+1}、${a+2} 的三場活動必須排成不重疊的先後順序。已知 ${a+2} 必須早於 ${a}，而 ${a} 必須早於 ${a+1}。哪個完整順序符合全部條件？`,
        `由 ${a+2} 早於 ${a}，且 ${a} 早於 ${a+1}，可串成唯一先後關係：${a+2} → ${a} → ${a+1}。`
      ]; break; }
      case 'set-overlap': { const a=n+12,b=n+9,over=3+n%5,u=a+b-over; text=[
        `在同一群人中，有 ${a} 人選甲課、${b} 人選乙課，而「至少選甲或乙其中一課」的人共有 ${u} 人。兩課都選的人有幾人？`,
        `把兩課人數相加時，兩課都選的人會被算兩次，所以要扣掉一次重複：${a}+${b}−${u}=${over}。`
      ]; break; }
      case 'code-deduction': { const a=n+11; text=[
        `一套編碼規則規定：同一個字不論出現在第幾個位置，都固定對應同一個碼。已知「山河」編成 ${a}-${a+1}，「河風」編成 ${a+1}-${a+2}。依此規則，「風山」應編成什麼？`,
        `共同字「河」在兩組中都對應 ${a+1}；因此「山」對應 ${a}，「風」對應 ${a+2}。依「風、山」順序組合，得到 ${a+2}-${a}。`
      ]; break; }
      case 'invariant-transfer': { const a=n+10,b=n+6,k=2+n%5; text=[
        `甲袋有 ${a} 顆，乙袋有 ${b} 顆。先從甲袋移 ${k} 顆到乙袋，再從乙袋移 1 顆回甲袋；兩次都只是袋與袋之間移動，沒有新增、取走或遺失。操作完成後，兩袋合計共有多少顆？`,
        `兩次操作都只改變物品所在的袋子，總數不變，所以合計仍是 ${a}+${b}=${a+b} 顆。`
      ]; break; }
      case 'pairing-capacity': { const a=n+8,b=n+5; text=[
        `桌上有 ${a} 把鎖與 ${b} 把鑰匙。每把鑰匙都恰好能打開這批鎖中的一把，而且不同鑰匙對應不同鎖；每把鎖最多配一把鑰匙。最多能完成幾組一對一配對？`,
        `每把鑰匙都能在這批鎖中找到唯一且不重複的配對。因為鑰匙數較少，所以最多能配成 ${b} 組。`
      ]; break; }
      case 'grid-displacement': { const x=n+3,y=2+n%9; text=[
        `棋子從 (${x}, ${y}) 出發，向右移動 3 格、再向上移動 2 格（向右只會改變 x 座標，向上只會改變 y 座標）。請問終點座標是？`,
        `終點 x 座標＝起點 x + 向右格數＝${x}+3=${x+3}；終點 y 座標＝起點 y + 向上格數＝${y}+2=${y+2}。所以終點是 (${x+3}, ${y+2})。（向右的格數只能加在 x，向上的格數只能加在 y，兩者不可加錯座標，也不能當成相減。）`
      ]; break; }
      case 'mirror-coordinate': { const x=n+2,y=3+n%8; text=[
        `採用標準直角座標系：x 軸水平、y 軸垂直。點 (${x}, ${y}) 對 y 軸做鏡射後，座標是多少？`,
        `對 y 軸鏡射時，y 座標保持不變，x 座標改成相反數；因此 (${x}, ${y}) 變成 (${-x}, ${y})。`
      ]; break; }
      case 'viewpoint-heading': { const angle=(n%72)*5,turn=n<72?45:135,end=(angle+turn)%360; text=[
        `方位角採以下固定規則：正北＝0°、正東＝90°、正南＝180°、正西＝270°，角度順時針增加，360° 與 0° 視為同一方向。指針原在 ${angle}°，再順時針旋轉 ${turn}°，最後的方位角是多少？`,
        `順時針旋轉就是把角度相加，再以 360° 為一圈取等價角：(${angle}+${turn}) mod 360=${end}°。`
      ]; break; }
      case 'rectangle-cut': { const a=n+5,b=4+n%5,r=b-2; text=[
        `一張長 ${a} 格、寬 ${b} 格的長方形方格紙。沿著整條長邊裁去一條「長 ${a} 格、寬 2 格」的長方形紙條。剩下部分的面積是多少平方格？`,
        `裁掉的紙條貫穿整個長度，因此長仍是 ${a} 格，剩餘寬度是 ${b}−2=${r} 格；面積＝${a}×${r}=${a*r} 平方格。`
      ]; break; }
      case 'stack-hidden': { const a=n+2,b=2+n%7,c=1+n%4; text=[
        `有三根彼此分開、互不重疊的直立方塊柱。每根柱都由單位方塊上下緊密堆成、沒有空洞，而且柱高就等於該柱的方塊數。三根柱的高度分別是 ${a}、${b}、${c}。三柱合計共有幾個方塊？`,
        `三根柱彼此分開，且每柱高度就是方塊數，因此直接相加：${a}+${b}+${c}=${a+b+c} 個方塊。`
      ]; break; }
      case 'scale-drawing': { const a=n+3,s=2+n%4; text=[
        `一個圖形做等比例放大，放大倍數是 ${s} 倍，也就是所有「線性尺寸」都乘以 ${s}。其中一條線段原長 ${a} 格，放大後長多少格？`,
        `這題問的是線段長度，屬於線性尺寸，所以直接乘放大倍數：${a}×${s}=${a*s} 格。`
      ]; break; }
      case 'shortest-grid-path': { const east=n+2,north=3+n%8,total=east+north; text=[
        `格線地圖上，起點座標視為 (0, 0)，終點在起點東方 ${east} 格、北方 ${north} 格。你每次只能沿格線移動 1 格，方向限定為正東西或正南北，不能斜著抄對角線捷徑。從起點走到終點，最少需要移動幾格？`,
        `因為不能抄對角線，東西方向與南北方向的步數要分開累計、不能互相抵銷：東西方向至少要走 ${east} 格，南北方向至少要走 ${north} 格，兩個方向都走完才算到達終點，所以最少總步數＝${east}+${north}＝${total} 格。（少於 ${total} 格代表還有一個方向沒走完；多於 ${total} 格則是多繞了路。）`
      ]; break; }
      case 'speed-parity': { const a=2*n+10,c=a+3; text=[
        `以下四個選項中，哪一個是唯一的奇數？`,
        `${c} 不能被 2 整除，其餘三個選項都能被 2 整除，所以 ${c} 是唯一的奇數。`
      ]; break; }
      case 'quant-discount': { const a=(n+10)*10,c=a*0.8; text=[
        `一件商品標價 ${a} 元，店家標示「八折」，本題定義為按原標價的 80% 付款。應付多少元？`,
        `八折在本題已明確定義為原價的 80%，所以 ${a}×0.8=${c} 元。`
      ]; break; }
      case 'quant-average': { const a=n+10,p1=a-2,p2=a+5,total=a*3,p12=p1+p2,c=a-3; text=[
        `連續三天的閱讀量「每天平均」是 ${a} 頁。前兩天分別讀了 ${p1} 頁、${p2} 頁。第三天讀了多少頁？`,
        `每天平均 ${a} 頁、共 3 天，所以三天總量是 ${a}×3=${total} 頁。前兩天合計 ${p12} 頁，因此第三天是 ${total}−${p12}=${c} 頁。`
      ]; break; }
      case 'quant-probability': { const a=n+4,w=a-1; text=[
        `袋中共有 ${a} 顆球：1 顆紅球、${w} 顆白球。隨機抽取 1 顆，且每一顆球被抽中的機會完全相同。抽到紅球的機率是多少？`,
        `共有 ${a} 顆等可能的球，其中只有 1 顆是紅球，所以機率＝1/${a}。`
      ]; break; }
      case 'quant-balance': { const a=n+5,total=3*a+2; text=[
        `3 個完全相同的砝碼，其總重量再加上 2 克，剛好等於 ${total} 克。每個砝碼重多少克？`,
        `先扣除額外的 2 克，再把剩餘重量平均分給 3 個相同砝碼：(${total}−2)÷3=${a} 克。`
      ]; break; }
      default: return false;
    }
    q.q = text[0];
    q.e = text[1];
    q.clarityRevision = '2.0';
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

  window.IQ_CLARITY_V2 = {
    version: '2.0',
    modifiedItems,
    modifiedFamilies: Object.keys(counts).length,
    counts,
    expectedCounts,
    fieldsChanged: ['q','e'],
    invariant: 'answers-options-difficulty-timing-diagrams-ids-unchanged'
  };
})();
