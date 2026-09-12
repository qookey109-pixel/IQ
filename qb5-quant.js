// QB5 quantitative variants: 7 families × 8 arithmetic/probability archetypes.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {register,set,setNum,mod,frac,fmtTime,uniq}=E;

  register('quant-discount',(q,{n,v,t})=>{
    const price=(10+mod(n,20))*10;let c,p,ex;
    if(v===0){const rate=[90,80,75][t];c=price*rate/100;p=`商品標價 ${price} 元，按原價的 ${rate}% 付款，應付多少元？`;ex=`${price}×${rate/100}=${c}。`;}
    else if(v===1){const off=[10,20,25][t];c=price*(100-off)/100;p=`商品標價 ${price} 元，折價 ${off}% 後應付多少元？`;ex=`付款比例 ${100-off}%，得到 ${c} 元。`;}
    else if(v===2){const saved=[10,20,30][t];c=price-saved;p=`商品標價 ${price} 元，折價 ${saved} 元。實付多少？`;ex=`${price}−${saved}=${c}。`;}
    else if(v===3){const fee=10*t;c=price*.8+fee;p=`商品先打八折，再加固定處理費 ${fee} 元。標價 ${price} 元，總共多少？`;ex=`${price}×0.8+${fee}=${c}。`;}
    else if(v===4){const paid=price*.8;c=price;p=`某商品打八折後售價 ${paid} 元。原標價是多少？`;ex=`${paid}÷0.8=${c}。`;}
    else if(v===5){c=price*.9*.8;p=`商品標價 ${price} 元，先打九折，再在折後價打八折。最後多少元？`;ex=`${price}×0.9×0.8=${c}。`;}
    else if(v===6){const coupon=20+10*t;c=price*.8-coupon;p=`商品標價 ${price} 元，先打八折，再折抵 ${coupon} 元折價券。實付多少？`;ex=`${price}×0.8−${coupon}=${c}。`;}
    else {c=price*.8*1.1;p=`商品標價 ${price} 元，先打八折，再對折後價加 10% 費用。總額多少元？`;ex=`${price}×0.8×1.1=${c}。`;}
    q.q=p;q.e=ex;set(q,String(c),[String(c-10),String(c+10),String(c+20)]);
  });

  register('quant-unit-rate',(q,{n,v,t})=>{
    const unit=5+mod(n,12),qty=3+t+mod(v,3);let c,p,ex;
    if(v===0){c=unit;p=`${qty} 本相同筆記本共 ${unit*qty} 元，單本多少元？`;ex=`${unit*qty}÷${qty}=${unit}。`;}
    else if(v===1){c=unit;p=`${qty} 公斤水果共 ${unit*qty} 元，每公斤多少元？`;ex=`總價÷公斤數=${unit}。`;}
    else if(v===2){const h=2+t,d=unit*h;c=unit;p=`${h} 小時行駛 ${d} 公里，若速度固定，平均每小時幾公里？`;ex=`${d}÷${h}=${unit}。`;}
    else if(v===3){const total=unit*qty;c=unit;p=`${qty} 盒共有 ${total} 顆糖，每盒一樣多。每盒幾顆？`;ex=`${total}÷${qty}=${unit}。`;}
    else if(v===4){const need=qty+2;c=unit*need;p=`每份需要 ${unit} 克材料，做 ${need} 份共需要多少克？`;ex=`${unit}×${need}=${c}。`;}
    else if(v===5){const mins=5+t*5,total=unit*mins;c=unit;p=`機器 ${mins} 分鐘製作 ${total} 件，速率固定。每分鐘製作幾件？`;ex=`${total}÷${mins}=${unit}。`;}
    else if(v===6){const km=qty*2,cost=unit*km;c=unit;p=`行駛 ${km} 公里共花 ${cost} 元，若每公里成本固定，每公里多少元？`;ex=`${cost}÷${km}=${unit}。`;}
    else {c=unit*qty;p=`每組 ${unit} 人，共有 ${qty} 組。總共有多少人？`;ex=`${unit}×${qty}=${c}。`;}
    q.q=p;q.e=ex;setNum(q,c,[-1,1,2]);
  });

  register('quant-average',(q,{n,v})=>{
    const a=10+mod(n,20);let c,p,ex;
    if(v===0){const x=a-2,y=a+5;c=3*a-x-y;p=`三天平均每天 ${a} 頁，前兩天讀 ${x}、${y} 頁。第三天多少？`;ex=`總量 ${3*a}，扣掉前兩天 ${x+y}，剩 ${c}。`;}
    else if(v===1){const x=a-3,y=a+1,z=a+2;c=(x+y+z)/3;p=`三次成績為 ${x}、${y}、${z}，平均是多少？`;ex=`(${x}+${y}+${z})÷3=${c}。`;}
    else if(v===2){const count=4,newVal=a+8;c=(a*count+newVal)/(count+1);p=`前 ${count} 次平均 ${a}，第 ${count+1} 次是 ${newVal}。新的平均是多少？`;ex=`(${a*count}+${newVal})÷${count+1}=${c}。`;}
    else if(v===3){const total=a*4,known=[a-2,a,a+1];c=total-known.reduce((s,x)=>s+x,0);p=`4 個數平均為 ${a}；其中三個是 ${known.join('、')}。第四個是多少？`;ex=`總和 ${total} 扣掉已知三數，得到 ${c}。`;}
    else if(v===4){const b=a+6;c=(a+b)/2;p=`兩組人數相同，第一組平均 ${a}，第二組平均 ${b}。合併後平均是多少？`;ex=`兩組人數相同，合併平均為 (${a}+${b})÷2=${c}。`;}
    else if(v===5){const remove=a-4;c=(a*5-remove)/4;p=`5 個數平均 ${a}。移除其中一個數 ${remove} 後，剩下 4 個數的平均是多少？`;ex=`(${a*5}−${remove})÷4=${c}。`;}
    else if(v===6){const add=a+9;c=(a*3+add)/4;p=`3 天平均 ${a} 頁，第 4 天讀 ${add} 頁。4 天平均是多少？`;ex=`(${a*3}+${add})÷4=${c}。`;}
    else {const m1=a-2,m2=a+2;c=(m1*2+m2*3)/5;p=`甲組 2 人平均 ${m1}，乙組 3 人平均 ${m2}。合併 5 人平均是多少？`;ex=`(${m1}×2+${m2}×3)÷5=${c}。`;}
    q.q=p;q.e=ex;set(q,String(c),[String(Number(c)-1),String(Number(c)+1),String(Number(c)+2)]);
  });

  register('quant-remainder',(q,{n,v})=>{
    const d=5+mod(v,4),r=1+mod(n,d-1),a=d*(3+mod(n,8))+r;let c,p,ex,candidates;
    if(v===0){c=r;p=`${a} 顆糖，每袋裝 ${d} 顆；盡量裝滿後，還剩幾顆？`;ex=`${a}=${d}×${Math.floor(a/d)}+${r}，餘數 ${r}。`;candidates=[0,mod(r+1,d),mod(r+2,d)];}
    else if(v===1){c=(d-r)%d;p=`${a} 再加最少幾個，就能被 ${d} 整除？`;ex=`目前餘 ${r}，補到下一個 ${d} 的倍數需 ${c}。`;candidates=[Math.max(0,c-1),c+1,c+2];}
    else if(v===2){c=Math.floor(a/d);p=`${a} 件物品，每箱裝 ${d} 件。能裝滿幾箱？`;ex=`整除商為 ${c}，另有餘數 ${r}。`;candidates=[c-1,c+1,c+2];}
    else if(v===3){c=r;p=`${a} 除以 ${d} 的餘數是多少？`;ex=`${a}=${d}×${Math.floor(a/d)}+${r}。`;candidates=[0,mod(r+1,d),mod(r+2,d)];}
    else if(v===4){c=mod(r+2,d);p=`某數除以 ${d} 餘 ${r}。這個數再加 2 後，新的餘數是多少？`;ex=`(${r}+2) mod ${d}=${c}。`;candidates=[mod(c+1,d),mod(c+2,d),mod(c+3,d)];}
    else if(v===5){c=mod(r*2,d);p=`某數除以 ${d} 餘 ${r}。這個數的 2 倍除以 ${d}，餘數是多少？`;ex=`(2×${r}) mod ${d}=${c}。`;candidates=[mod(c+1,d),mod(c+2,d),mod(c+3,d)];}
    else if(v===6){c=d-r;p=`某數除以 ${d} 餘 ${r}。最少加多少可使餘數變成 0？`;ex=`需要補 ${d-r}。`;candidates=[Math.max(0,c-1),c+1,c+2];}
    else {c=mod(r+3,d);p=`某數除以 ${d} 餘 ${r}。再加 3 後餘數是多少？`;ex=`(${r}+3) mod ${d}=${c}。`;candidates=[mod(c+1,d),mod(c+2,d),mod(c+3,d)];}
    if([0,3,4,5,7].includes(v)){const legal=uniq(candidates.concat([0,1,2,3,4,5,6])).map(Number).filter(x=>x>=0&&x<d&&x!==c).slice(0,3);set(q,String(c),legal.map(String));}else setNum(q,c,[-1,1,2]);
    q.q=p;q.e=ex;
  });

  register('quant-time',(q,{n,v,t})=>{
    const start=8*60+20+mod(n*7,180),dur=20+mod(n*11,100);let c,p,ex,isClock=true;
    if(v===0){c=start+dur;p=`列車 ${fmtTime(start)} 出發，車程 ${dur} 分鐘。抵達時刻（24 小時制）是？`;ex=`${fmtTime(start)} 加 ${dur} 分鐘 = ${fmtTime(c)}。`;}
    else if(v===1){c=start;p=`列車 ${fmtTime(start+dur)} 抵達，車程 ${dur} 分鐘。出發時刻（24 小時制）是？`;ex=`抵達時刻往前推 ${dur} 分鐘 = ${fmtTime(c)}。`;}
    else if(v===2){const wait=10+5*t;c=start+dur+wait;p=`${fmtTime(start)} 出發，行駛 ${dur} 分鐘後停留 ${wait} 分鐘。再次出發時是幾點？`;ex=`依序加 ${dur} 與 ${wait} 分鐘，得到 ${fmtTime(c)}。`;}
    else if(v===3){const d2=15+5*t;c=start+dur+d2;p=`${fmtTime(start)} 出發，第一段 ${dur} 分鐘，接著第二段 ${d2} 分鐘，中間不停留。最後到達時刻？`;ex=`總車程 ${dur+d2} 分鐘，抵達 ${fmtTime(c)}。`;}
    else if(v===4){c=dur;isClock=false;p=`活動從 ${fmtTime(start)} 到 ${fmtTime(start+dur)}，共持續幾分鐘？`;ex=`終點減起點，共 ${dur} 分鐘。`;}
    else if(v===5){const s=23*60+30,d=45+15*t;c=s+d;p=`列車 ${fmtTime(s)} 出發，行駛 ${d} 分鐘。跨過午夜後抵達時刻（24 小時制）是？`;ex=`跨日後為 ${fmtTime(c)}。`;}
    else if(v===6){const rest=15;c=start+dur+rest;p=`${fmtTime(start)} 開始工作 ${dur} 分鐘，休息 ${rest} 分鐘後再開始。再次開始時刻？`;ex=`總共經過 ${dur+rest} 分鐘，得到 ${fmtTime(c)}。`;}
    else {c=dur;isClock=false;p=`從 ${fmtTime(start)} 到 ${fmtTime(start+dur)}，經過多少分鐘？`;ex=`兩時刻差為 ${dur} 分鐘。`;}
    q.q=p;q.e=ex;if(isClock)set(q,fmtTime(c),[fmtTime(c+10),fmtTime(c-10),fmtTime(c+60)]);else setNum(q,c,[-10,10,20]);
  });

  register('quant-probability',(q,{n,v})=>{
    let R=1+mod(n,4),W=3+mod(n*2,5);if(v===4)R=2+mod(n,3);if(v===6)W=2+mod(n,4);const T=R+W;let c,p,wrong,ex;
    if(v===0){c=frac(R,T);p=`袋中有 ${R} 顆紅球、${W} 顆白球。隨機抽 1 顆，每顆等可能。抽到紅球的機率？`;ex=`${R}/${T}=${c}。`;wrong=[frac(W,T),frac(1,T),frac(R,T+1)];}
    else if(v===1){c=frac(W,T);p=`袋中有 ${R} 紅、${W} 白。抽 1 顆，抽到白球的機率？`;ex=`${W}/${T}=${c}。`;wrong=[frac(R,T),frac(1,T),frac(W,T+1)];}
    else if(v===2){c=frac(W,T);p=`袋中 ${R} 紅、${W} 白。抽 1 顆，「不是紅球」的機率？`;ex=`不是紅球即白球，所以 ${c}。`;wrong=[frac(R,T),frac(1,T),frac(T-1,T+1)];}
    else if(v===3){c=frac(1,T);p=`袋中共 ${T} 顆彼此可區分的球。指定其中某一顆，隨機抽 1 顆剛好抽中它的機率？`;ex=`每顆等可能，所以是 ${c}。`;wrong=[frac(2,T),frac(1,T+1),frac(T-1,T)];}
    else if(v===4){const den=T*(T-1);c=frac(R*(R-1),den);p=`袋中 ${R} 紅、${W} 白，連抽 2 顆且不放回。兩顆都是紅球的機率？`;ex=`${R}/${T}×${R-1}/${T-1}=${c}。`;wrong=[frac(R,T),frac(R*R,T*T),frac(W*(W-1),den)];}
    else if(v===5){const den=T*(T-1);c=frac(2*R*W,den);p=`袋中 ${R} 紅、${W} 白，不放回抽 2 顆。恰好一紅一白的機率？`;ex=`紅白或白紅兩種次序，相加得到 ${c}。`;wrong=[frac(R*W,den),frac(R,T),frac(W,T)];}
    else if(v===6){const den=T*(T-1);c=frac(W*(W-1),den);p=`袋中 ${R} 紅、${W} 白，不放回抽 2 顆。兩顆都是白球的機率？`;ex=`${W}/${T}×${W-1}/${T-1}=${c}。`;wrong=[frac(W,T),frac(W*W,T*T),frac(R*(R-1),den)];}
    else {c=frac(W,T);p=`袋中 ${R} 紅、${W} 白。抽 1 顆，沒有抽到紅球的機率？`;ex=`補事件為白球：${c}。`;wrong=[frac(R,T),frac(1,T),frac(R+1,T)];}
    q.q=p;q.e=ex;set(q,c,wrong);
  });

  register('quant-balance',(q,{n,v})=>{
    const x=4+mod(n,12),a=2+mod(v,4),b=2+mod(n,7);let p,ex;
    if(v===0){p=`${a} 個相同砝碼總重 ${a*x} 克。每個幾克？`;ex=`${a*x}÷${a}=${x}。`;}
    else if(v===1){p=`${a} 個相同砝碼再加 ${b} 克，共 ${a*x+b} 克。每個砝碼幾克？`;ex=`(${a*x+b}−${b})÷${a}=${x}。`;}
    else if(v===2){p=`${a} 個相同砝碼減去 ${b} 克後，剩 ${a*x-b} 克。每個砝碼原本幾克？`;ex=`(${a*x-b}+${b})÷${a}=${x}。`;}
    else if(v===3){p=`方程 ${a}x + ${b} = ${a*x+b}。x 是多少？`;ex=`先減 ${b} 再除以 ${a}，x=${x}。`;}
    else if(v===4){p=`${a} 個相同盒子各重 x 克，再加 ${b} 克，總重 ${a*x+b} 克。求 x。`;ex=`(${a*x+b}−${b})÷${a}=${x}。`;}
    else if(v===5){p=`方程 ${a}x + ${b} = ${a*x+b}。x 是多少？`;ex=`移項後 ${a}x=${a*x}，所以 x=${x}。`;}
    else if(v===6){p=`方程 ${a}x = ${a*x}。x 是多少？`;ex=`等式兩邊除以 ${a}，x=${x}。`;}
    else {const c=3+mod(n,5);p=`${a} 個相同物件與 ${c} 克砝碼平衡於 ${a*x+c} 克。每個物件幾克？`;ex=`扣除 ${c} 再除以 ${a}，得到 ${x}。`;}
    q.q=p;q.e=ex;setNum(q,x,[-1,1,2]);
  });
})();