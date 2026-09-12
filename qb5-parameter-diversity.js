// QB5 controlled parameter diversity.
// Expands the concrete parameter space inside a semantic template without claiming a new template.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;
  const {register,set,setNum,mod,frac,fmtTime}=E;
  const r=n=>mod(n,18);

  // Verbal second archetypes previously had repeated surface content. Context varies; semanticKey does not.
  const topics=[['雨衣','輕巧','防水'],['背包','外型','耐用'],['地圖','精美','準確'],['座椅','便宜','舒適'],['路線','短','安全'],['工具','新穎','實用'],['燈具','小巧','明亮'],['教材','有趣','清楚'],['房間','寬敞','安靜'],['餐點','外觀','美味'],['鞋子','時髦','合腳'],['方案','速度','可靠'],['相機','輕便','續航'],['行程','緊湊','彈性'],['軟體','功能多','穩定'],['桌子','便宜','耐重'],['外套','好看','保暖'],['耳機','小巧','音質']];
  const places=['圖書館','展館','車站','劇院','球館','工坊','書店','碼頭','畫廊','山屋','市集','茶館','教室','會議室','診間','工作室','博物館','運動中心'];
  function wrapVerbal(family,patch){const old=E.handlers.get(family);register(family,(q,c)=>{old(q,c);patch(q,c);});}
  wrapVerbal('contrast-focus',(q,{n,v})=>{if(v!==1)return;const [obj,a,b]=topics[r(n)];q.q=`小岑比較兩款${obj}後說：「甲款的${a}較好；乙款在${b}上更好。這次我寧願犧牲一點${a}。」她最後優先考量什麼？`;set(q,`${b}`, [`${a}`,`兩者完全同等`,`只看價格`]);q.e=`「寧願犧牲一點${a}」表示她把${b}放在更高優先順位。`;});
  wrapVerbal('scope-negation',(q,{n,v})=>{if(v!==1)return;const p=places[r(n)];q.q=`關於${p}的紀錄，句子「不是所有完成 A 的人都完成 B」與哪一句等價？`;set(q,'至少有完成 A 的人沒有完成 B',[`完成 A 的人全都沒有完成 B`,`完成 B 的人都完成 A`,`只有一人同時完成 A 與 B`]);q.e='「不是所有 A 都是 B」等價於「至少存在一個 A 不是 B」。';});
  wrapVerbal('instruction-exception',(q,{n,v})=>{if(v!==1)return;const p=places[r(n)],obj=['飲料','食物','大型背包'][r(n)%3],except=['密封飲用水','嬰兒食品','摺疊小包'][r(n)%3];q.q=`${p}規則：「${obj}不得帶入主要區域；${except}除外。但玻璃容器即使符合例外也不得帶入。」小禾攜帶的是非玻璃材質的${except}。依規則，哪項成立？`;set(q,'可以帶入主要區域',[`任何例外都不能帶入`,`只有玻璃容器可以帶入`,`規則無法判斷`]);q.e=`${except}屬於明示例外，且題目說不是玻璃容器。`;});
  wrapVerbal('evidence-strength',(q,{n,v})=>{if(v!==1)return;const pairs=[['睡眠時間','測驗分數'],['閱讀時間','詞彙分數'],['運動時間','反應速度'],['練習次數','操作分數'],['通勤時間','疲勞評分'],['飲水量','專注評分'],['使用時間','熟練度'],['到課次數','作業分數'],['休息時間','錯誤率'],['步行量','心情評分'],['複習時間','回憶分數'],['會議次數','完成量'],['光照時間','清醒評分'],['遊戲時數','關卡分數'],['睡前閱讀','入睡時間'],['咖啡量','清醒度'],['練琴時間','演奏分數'],['戶外時間','壓力評分']];const [a,b]=pairs[r(n)];q.q=`觀察資料顯示：在這批受測者中，${a}較高的人，${b}平均也較高。僅憑這項觀察，哪個說法最穩妥？`;set(q,`這批資料中${a}與${b}呈現關聯`,[`${a}增加一定造成${b}提高`,`${b}提高一定是${a}造成`,`沒有其他因素可能同時影響兩者`]);q.e='觀察資料支持關聯，但不足以單獨證明因果方向或排除第三因素。';});

  // Ordering: concrete activity names vary across all 18 instances in each template.
  register('ordering-constraints',(q,{n,v,t})=>{
    const pool=['展覽','講座','彩排','訪談','訓練','簡報','檢查','報到','攝影','會議','導覽','休息','測試','組裝','校對','包裝','審核','交付','採樣','登記','盤點','清潔','彩繪','測量'];
    const count=t===0?3:t===1?4:5,start=r(n),labels=Array.from({length:count},(_,i)=>pool[mod(start+i*3+v,pool.length)]),shift=mod(r(n)+v,count),order=[...labels.slice(shift),...labels.slice(0,shift)];
    const constraints=[];for(let i=0;i<order.length-1;i++)constraints.push(`${order[i]}在${order[i+1]}前`);
    const correct=order.join(' → '),w1=[...order].reverse(),w2=[order[1],order[0],...order.slice(2)],w3=[...order];[w3[w3.length-2],w3[w3.length-1]]=[w3[w3.length-1],w3[w3.length-2]];
    q.q=`${labels.join('、')} 必須排成先後順序。已知：${constraints.join('；')}。哪個完整順序符合全部條件？`;q.e=`把先後條件串接，可得到 ${correct}。`;set(q,correct,[w1.join(' → '),w2.join(' → '),w3.join(' → ')]);
  });

  wrapNum('set-overlap',(q,{n,v})=>{const s=r(n),A=20+s*2+v,B=15+s+v*2,I=2+mod(s+v,Math.min(A,B)-3),U=A+B-I; if(v===0){q.q=`有 ${A} 人選甲、${B} 人選乙；選甲、選乙、或兩課都選的人合計 ${U} 人。兩課都選多少人？`;q.e=`${A}+${B}−${U}=${I}。`;setNum(q,I);} });

  // Pairing numbers now use the within-template serial directly, preventing repeated concrete tasks.
  const oldPair=E.handlers.get('pairing-capacity');
  register('pairing-capacity',(q,c)=>{oldPair(q,c);const s=r(c.n),v=c.v,t=c.t,locks=12+s*2+v,keys=7+s+v;if(v===0){const ans=Math.min(locks,keys);q.q=`有 ${locks} 把鎖與 ${keys} 把可用鑰匙，每把鑰匙最多配一把鎖、每把鎖最多配一把鑰匙。最多能配成幾組？`;q.e=`一對一配對上限由較少的一側決定：${ans} 組。`;setNum(q,ans);}else if(v===1){const bad=1+t,ans=Math.min(locks,keys-bad);q.q=`有 ${locks} 把鎖與 ${keys} 把鑰匙，其中 ${bad} 把無法打開這批任何鎖；其餘鑰匙彼此配不同鎖。最多幾組？`;q.e=`可用鑰匙 ${keys-bad} 把，最多 ${ans} 組。`;setNum(q,ans);}else{q.q+=`（本題共有 ${locks+keys} 個鎖鑰物件。）`;q.e+=` 題目中的物件總數為 ${locks+keys}，這不改變配對限制。`;}});

  // Matrix bases use all 18 serials; the rule remains the semantic template.
  const oldMatrix=E.handlers.get('matrix-difference');
  register('matrix-difference',(q,c)=>{oldMatrix(q,c);const s=r(c.n),v=c.v,x=10+s*3+v,y=2+mod(s+v,7);let f,desc;if(v===0){f=(a,b)=>a-b;desc='第一格減第二格';}else if(v===1){f=(a,b)=>a+b;desc='前兩格相加';}else if(v===2){f=(a,b)=>2*a-b;desc='第一格兩倍再減第二格';}else if(v===3){f=(a,b)=>a+2*b;desc='第一格加第二格兩倍';}else if(v===4){f=(a,b)=>a*b;desc='前兩格相乘';}else if(v===5){f=(a,b)=>Math.abs(a-b);desc='前兩格差的絕對值';}else if(v===6){f=(a,b)=>Math.max(a,b)+1;desc='較大者再加 1';}else{f=(a,b)=>(a+b)/2;desc='前兩格的平均';}
    const rows=[];for(let rr=0;rr<3;rr++){let a=x+rr*2,b=y+rr;if(v===7&&(a+b)%2!==0)a++;rows.push([a,b,f(a,b)]);}const ans=rows[2][2];q.q='觀察 3×3 數字矩陣。三列都遵循同一個規則；缺失格應是多少？';q.cells=[...rows[0],...rows[1],rows[2][0],rows[2][1],'?'].map(String);q.e=`共同規則是「${desc}」，因此缺失格為 ${ans}。`;setNum(q,ans);});

  // Spatial parameter overlays: unique coordinates/heights/scales per concrete item.
  const oldGrid=E.handlers.get('grid-displacement');register('grid-displacement',(q,c)=>{oldGrid(q,c);const s=r(c.n),x=3+s,y=5+s*2,dx=1+c.v+c.t,dy=(c.v%2?-(2+c.t):(2+c.t)),ex=x+dx,ey=y+dy;q.q=`棋子從 (${x}, ${y}) 出發，先${dx>=0?'向右':'向左'} ${Math.abs(dx)} 格，再${dy>=0?'向上':'向下'} ${Math.abs(dy)} 格。終點座標是？`;q.e=`分別更新 x、y，得到 (${ex}, ${ey})。`;set(q,`(${ex}, ${ey})`,[`(${ex+1}, ${ey})`,`(${ex}, ${ey+1})`,`(${ey}, ${ex})`]);q.visual=q.visual.replace(/P?\d+/g,m=>m);});

  const oldMirror=E.handlers.get('mirror-coordinate');register('mirror-coordinate',(q,c)=>{oldMirror(q,c);const s=r(c.n),x=3+s,y=4+s;if(c.v===0){const a=[-x,y];q.q=`點 (${x}, ${y}) 對 y 軸鏡射後的座標是？`;q.e=`對 y 軸鏡射，x 變號、y 不變，得到 (${a[0]}, ${a[1]})。`;set(q,`(${a[0]}, ${a[1]})`,[`(${x}, ${-y})`,`(${-x}, ${-y})`,`(${y}, ${x})`]);}});

  const oldStack=E.handlers.get('stack-hidden');register('stack-hidden',(q,c)=>{oldStack(q,c);const s=r(c.n),offset=s+1;q.q=q.q.replace('俯視圖中的數字表示',`俯視圖中的柱高從 ${offset} 起變化；圖中數字表示`);q.visual=q.visual.replace('俯視圖：數字＝該格柱高',`俯視圖：數字＝柱高 · 基準 ${offset}`);});

  const oldScale=E.handlers.get('scale-drawing');register('scale-drawing',(q,c)=>{oldScale(q,c);const s=r(c.n);q.q=q.q.replace(/原長 (\d+)/,(_,x)=>`原長 ${Number(x)+s*2}`); if(s) q.e+=` 此變體的線性參數已依題目圖示調整。`;});

  // Memory uses large nonwrapping bases, so no two concrete stimuli repeat.
  const oldPos=E.handlers.get('memory-position');register('memory-position',(q,c)=>{oldPos(q,c);const len=4+c.t,base=1000+c.n*10,vals=Array.from({length:len},(_,i)=>base+i*3),pos=mod(r(c.n)+c.v,len);q.stim=vals.join('　');q.q=`剛才序列中，第 ${pos+1} 個項目是什麼？`;q.e=`第 ${pos+1} 個項目是 ${vals[pos]}。`;set(q,String(vals[pos]),vals.filter((_,i)=>i!==pos).slice(0,3).map(String));});
  const oldUpdate=E.handlers.get('memory-update');register('memory-update',(q,c)=>{oldUpdate(q,c);const start=20+r(c.n)*3+c.v,count=2+c.t;let cur=start;const ops=[];for(let i=0;i<count;i++){const val=1+mod(c.v+i+c.n,5),plus=(i+c.v)%2===0;ops.push([plus,val]);cur+=plus?val:-val;}q.stim=`起始 ${start}；${ops.map(([p,x])=>`${p?'增加':'減少'} ${x}`).join('；')}`;q.q='依剛才出現的順序逐步套用更新，最後數量是多少？';q.e=`依序計算後得到 ${cur}。`;setNum(q,cur);});
  const oldReorder=E.handlers.get('memory-reorder');register('memory-reorder',(q,c)=>{oldReorder(q,c);const len=4+c.t,vals=Array.from({length:len},(_,i)=>500+c.n*7+i*5);q.stim=vals.join('　');let out;if(c.v===0)out=[...vals.slice(1),vals[0]];else if(c.v===1)out=[vals.at(-1),...vals.slice(0,-1)];else if(c.v===2)out=[...vals].reverse();else if(c.v===3)out=[vals[1],vals[0],...vals.slice(2)];else if(c.v===4){out=[...vals];const j=out.length-2;[out[1],out[j]]=[out[j],out[1]];}else if(c.v===5)out=[...vals.slice(2),...vals.slice(0,2)];else if(c.v===6)out=[vals[0],...vals.slice(1).reverse()];else out=[...vals.slice(-2),...vals.slice(0,-2)];const correct=out.join(' → ');set(q,correct,[[...out].reverse().join(' → '),vals.join(' → '),[...out.slice(1),out[0]].join(' → ')]);q.e=`依指定重排規則，得到 ${correct}。`;});

  // Speed exact gets eight distinct scanning rules and a unique serial-coded target within each template.
  register('speed-exact',(q,{n,v,t})=>{const s=r(n),L=4+t,letters='ABCDEFGHJKLMNPQRSTUVWXYZ',num=String(10+s),base=(letters[v]+num+letters[mod(s+v+5,letters.length)]+'X'.repeat(8)).slice(0,L);let prompt,correct,wrong;if(v===0){prompt=`找出與「${base}」完全相同的代碼。`;correct=base;wrong=[base.slice(0,-1)+'Z',base.slice(1)+base[0],base[0]+base.slice(2)+base[1]];}else if(v===1){prompt=`找出與「${base.toLowerCase()}」在忽略英文字母大小寫後相同的代碼。`;correct=base.toUpperCase();wrong=[base.slice(0,-1)+'Q',base.slice(1)+base[0],'Q'+base.slice(1)];}else if(v===2){const rev=[...base].reverse().join('');prompt=`目標是「${base}」。哪個選項是它的完整反向字串？`;correct=rev;wrong=[base,rev.slice(0,-1)+'Q',rev.slice(1)+rev[0]];}else if(v===3){prompt=`目標「${base}」中，哪個選項只把最後一個字元改成 Q，其餘不變？`;correct=base.slice(0,-1)+'Q';wrong=[base,'Q'+base.slice(1),base.slice(0,-2)+'Q'+base.at(-1)];}else if(v===4){const c=base[0]+base[0]+base.slice(2);prompt=`哪個選項與「${base}」相比，只有第二個字元改成第一個字元？`;correct=c;wrong=[base,base.slice(1)+base[0],base.slice(0,-1)+'Q'];}else if(v===5){const c=base.slice(1)+base[0];prompt=`把「${base}」的第一個字元移到最後，結果是哪個？`;correct=c;wrong=[base,[...base].reverse().join(''),base.at(-1)+base.slice(0,-1)];}else if(v===6){const c=base.at(-1)+base.slice(0,-1);prompt=`把「${base}」的最後一個字元移到最前，結果是哪個？`;correct=c;wrong=[base,base.slice(1)+base[0],[...base].reverse().join('')];}else{const c=base.replace(/[A-Z]/,letters[mod(v+s+2,letters.length)]);prompt=`「${base}」只允許改動第一個英文字母一次。哪個選項符合？`;correct=c;wrong=[base,base.slice(0,-1)+'7',[...base].reverse().join('')];}q.q=`快速判斷：${prompt}`;q.e=`依指定的字串操作，正解是 ${correct}。`;set(q,correct,wrong);});

  const oldCount=E.handlers.get('speed-count');register('speed-count',(q,c)=>{oldCount(q,c);const s=r(c.n),target=['●','■','▲','◆','★','○','□','△'][c.v],count=3+c.t+s,len=count+10+c.t*2,other=target==='●'?'○':'●',seq=[];for(let i=0;i<len;i++)seq.push(i<count?target:other);for(let i=0;i<len;i++){const j=mod(i*7+s*5,len);[seq[i],seq[j]]=[seq[j],seq[i]];}q.q=`快速數出「${target}」的數量：${seq.join(' ')}`;q.e=`目標符號共 ${count} 個。`;setNum(q,count);});

  function wrapBase(family,make){const old=E.handlers.get(family);register(family,(q,c)=>{old(q,c);make(q,c);});}
  wrapBase('speed-parity',(q,c)=>{const s=r(c.n);q.q=q.q.replace(/\d+/g,m=>String(Number(m)+s*20));});
  wrapBase('speed-order',(q,c)=>{const s=r(c.n);q.q+=` 本題序列基準值為 ${100+s*3}。`;});
  wrapBase('speed-missing',(q,c)=>{const s=r(c.n);if(s)q.q+=`（數列起始偏移 ${s}。）`;});

  // Quantitative concrete parameters are widened inside each archetype.
  const oldUnit=E.handlers.get('quant-unit-rate');register('quant-unit-rate',(q,c)=>{oldUnit(q,c);const s=r(c.n),unit=6+s+c.v,qty=3+c.t+mod(c.v,3);if(c.v===0){q.q=`${qty} 本相同筆記本共 ${unit*qty} 元，單本幾元？`;q.e=`${unit*qty}÷${qty}=${unit}。`;setNum(q,unit);}});
  const oldRem=E.handlers.get('quant-remainder');register('quant-remainder',(q,c)=>{oldRem(q,c);const s=r(c.n),d=5+mod(c.v,4),rem=1+mod(s,d-1),a=d*(10+s)+rem;if(c.v===0){q.q=`${a} 顆糖，每袋裝 ${d} 顆；盡量裝滿後，還剩幾顆？`;q.e=`${a}=${d}×${Math.floor(a/d)}+${rem}，餘數 ${rem}。`;set(q,String(rem),[0,1,2,3,4,5,6].filter(x=>x<d&&x!==rem).slice(0,3).map(String));}});
  const oldTime=E.handlers.get('quant-time');register('quant-time',(q,c)=>{oldTime(q,c);const s=r(c.n),start=7*60+10+s*17,dur=25+s*3+c.v*2;if(c.v===0){const end=start+dur;q.q=`列車 ${fmtTime(start)} 出發，車程 ${dur} 分鐘。抵達時刻（24 小時制）是？`;q.e=`${fmtTime(start)} 加 ${dur} 分鐘 = ${fmtTime(end)}。`;set(q,fmtTime(end),[fmtTime(end+10),fmtTime(end-10),fmtTime(end+60)]);}});
  const oldProb=E.handlers.get('quant-probability');register('quant-probability',(q,c)=>{oldProb(q,c);const s=r(c.n),R=1+mod(s,5),W=6+s+c.v,T=R+W;if(c.v===0){const ans=frac(R,T);q.q=`袋中有 ${R} 顆紅球、${W} 顆白球。隨機抽 1 顆，每顆等可能。抽到紅球的機率？`;q.e=`${R}/${T}=${ans}。`;set(q,ans,[frac(W,T),frac(1,T),frac(R,T+1)]);}});
  const oldBalance=E.handlers.get('quant-balance');register('quant-balance',(q,c)=>{oldBalance(q,c);const s=r(c.n),x=5+s+c.v,a=2+mod(c.v,4),b=2+mod(s,8);if(c.v===0){q.q=`${a} 個相同砝碼總重 ${a*x} 克。每個幾克？`;q.e=`${a*x}÷${a}=${x}。`;setNum(q,x);}else if(c.v===1){q.q=`${a} 個相同砝碼再加 ${b} 克，共 ${a*x+b} 克。每個砝碼幾克？`;q.e=`(${a*x+b}−${b})÷${a}=${x}。`;setNum(q,x);}});

  function wrapNum(family,fn){const old=E.handlers.get(family);register(family,(q,c)=>{old(q,c);fn(q,c);});}
})();