// QB5 fluid-reasoning construct variants: 7 families × 8 rule archetypes.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {register,set,setNum,mod}=E;

  register('machine-composition',(q,{n,v,t})=>{
    const x=3+mod(n*2,9),a=2+mod(v,4),b=1+mod(n+v,6);let c,prompt,ex;
    if(v===0){c=x*a+b;prompt=`規則機器：先乘 ${a}，再加 ${b}。輸入 ${x}，輸出多少？`;ex=`${x}×${a}+${b}=${c}。`;}
    else if(v===1){c=(x+b)*a;prompt=`規則機器：先加 ${b}，再乘 ${a}。輸入 ${x}，輸出多少？`;ex=`(${x}+${b})×${a}=${c}。`;}
    else if(v===2){c=x*x-b;prompt=`規則機器：先把輸入平方，再減 ${b}。輸入 ${x}，輸出多少？`;ex=`${x}²−${b}=${c}。`;}
    else if(v===3){c=(x-b)*a;prompt=`規則機器：先減 ${b}，再乘 ${a}。輸入 ${x}，輸出多少？`;ex=`(${x}−${b})×${a}=${c}。`;}
    else if(v===4){c=x*a-b;prompt=`規則機器：把輸入乘 ${a} 後減 ${b}。輸入 ${x}，輸出多少？`;ex=`${x}×${a}−${b}=${c}。`;}
    else if(v===5){const d=1+t;c=(x+b)*a-d;prompt=`規則機器依序做三步：+${b}、×${a}、−${d}。輸入 ${x}，輸出多少？`;ex=`(${x}+${b})×${a}−${d}=${c}。`;}
    else if(v===6){const d=2+t;c=x*a+b*d;prompt=`規則機器先算輸入的 ${a} 倍，再加上 ${b}×${d}。輸入 ${x}，輸出多少？`;ex=`${x}×${a}+${b}×${d}=${c}。`;}
    else {c=x%2===0?x/2+b:x*2+b;prompt=`規則機器：輸入為偶數時先除以 2；輸入為奇數時先乘 2；最後都加 ${b}。輸入 ${x}，輸出多少？`;ex=`${x} 是${x%2===0?'偶':'奇'}數，依對應分支計算後得到 ${c}。`;}
    q.q=prompt;q.e=ex;setNum(q,c,[-2,-1,1]);
  });

  register('ordering-constraints',(q,{n,v,t})=>{
    const count=t===0?3:t===1?4:5,labels=Array.from({length:count},(_,i)=>String.fromCharCode(65+i));
    const shift=mod(n+v,count),order=[...labels.slice(shift),...labels.slice(0,shift)];
    const constraints=[];for(let i=0;i<order.length-1;i++)constraints.push(`${order[i]} 在 ${order[i+1]} 前`);
    const shown=t===0?constraints.slice(0,2):t===1?constraints.slice(0,3):constraints;
    const correct=order.join(' → '), wrong=[[...order].reverse().join(' → '),[order[1],order[0],...order.slice(2)].join(' → '),[...order.slice(0,-2),order.at(-1),order.at(-2)].join(' → ')];
    q.q=`${labels.join('、')} 必須排成先後順序。已知：${shown.join('；')}。哪個選項符合全部條件？`;q.e=`把條件串接，可得到 ${correct}。`;set(q,correct,wrong);
  });

  register('set-overlap',(q,{n,v})=>{
    const A=12+mod(n,9),B=9+mod(n*2,8),I=2+mod(n+v,Math.max(2,Math.min(A,B)-2)),U=A+B-I,total=U+5+mod(n,6);let c,prompt,ex;
    if(v===0){c=I;prompt=`有 ${A} 人選甲、${B} 人選乙；選甲、選乙、或兩課都選的人合計 ${U} 人。兩課都選多少人？`;ex=`交集=${A}+${B}−${U}=${I}。`;}
    else if(v===1){c=A-I;prompt=`有 ${A} 人選甲，其中 ${I} 人也選乙。只選甲的人有多少？`;ex=`只選甲=${A}−${I}=${c}。`;}
    else if(v===2){c=B-I;prompt=`有 ${B} 人選乙，其中 ${I} 人也選甲。只選乙的人有多少？`;ex=`只選乙=${B}−${I}=${c}。`;}
    else if(v===3){c=U;prompt=`有 ${A} 人選甲、${B} 人選乙，其中 ${I} 人兩課都選。至少選一課的共有多少？`;ex=`聯集=${A}+${B}−${I}=${U}。`;}
    else if(v===4){c=A+B-2*I;prompt=`有 ${A} 人選甲、${B} 人選乙，其中 ${I} 人兩課都選。恰好只選其中一課的共有多少？`;ex=`只選一課=(甲−交集)+(乙−交集)=${c}。`;}
    else if(v===5){c=total-U;prompt=`共有 ${total} 人，其中至少選甲或乙的人有 ${U} 人。兩課都沒選的人有多少？`;ex=`${total}−${U}=${c}。`;}
    else if(v===6){const only=A-I;c=only+I;prompt=`只選甲有 ${only} 人，兩課都選有 ${I} 人。選甲的人總共有多少？`;ex=`${only}+${I}=${c}。`;}
    else {const only=B-I;c=only+I;prompt=`只選乙有 ${only} 人，兩課都選有 ${I} 人。選乙的人總共有多少？`;ex=`${only}+${I}=${c}。`;}
    q.q=prompt;q.e=ex;setNum(q,c,[-1,1,2]);
  });

  register('code-deduction',(q,{n,v})=>{
    const A=11+mod(n,30),B=A+1,C=A+2,D=A+3,p=(x,y)=>`${x}-${y}`;let prompt,correct,wrong;
    if(v===0){prompt=`「山河」=${p(A,B)}，「河風」=${p(B,C)}；每字固定一碼。「風山」=?`;correct=p(C,A);wrong=[p(A,C),p(B,A),p(C,B)];}
    else if(v===1){prompt=`「河風」=${p(B,C)}，「風月」=${p(C,D)}；每字固定一碼。「月河」=?`;correct=p(D,B);wrong=[p(B,D),p(C,B),p(D,C)];}
    else if(v===2){prompt=`「山風」=${p(A,C)}，「風河」=${p(C,B)}；每字固定一碼。「河山」=?`;correct=p(B,A);wrong=[p(A,B),p(C,A),p(B,C)];}
    else if(v===3){prompt=`「月山」=${p(D,A)}，「山河」=${p(A,B)}；每字固定一碼。「河月」=?`;correct=p(B,D);wrong=[p(D,B),p(A,D),p(B,A)];}
    else if(v===4){prompt=`「山河風」=${A}-${B}-${C}，「河風月」=${B}-${C}-${D}。每字固定一碼。「月山」=?`;correct=p(D,A);wrong=[p(A,D),p(C,A),p(D,B)];}
    else if(v===5){prompt=`每字固定一碼，且字序不改。「河山」=${B}-${A}，「月河」=${D}-${B}。「山月」=?`;correct=p(A,D);wrong=[p(D,A),p(B,D),p(A,B)];}
    else if(v===6){prompt=`每字固定一碼。「山月」=${A}-${D}，「風山」=${C}-${A}。「月風」=?`;correct=p(D,C);wrong=[p(C,D),p(A,C),p(D,A)];}
    else {prompt=`每字固定一碼。「河月」=${B}-${D}，「月風」=${D}-${C}。「風河」=?`;correct=p(C,B);wrong=[p(B,C),p(D,B),p(C,D)];}
    q.q=prompt;q.e='利用重複出現的字分離固定代碼，再按題目要求的字序排列。';set(q,correct,wrong);
  });

  register('invariant-transfer',(q,{n,v})=>{
    const A=10+mod(n,13),B=6+mod(n*2,10),k=1+mod(n+v,4);let c,prompt,ex;
    if(v===0){c=A+B;prompt=`甲袋有 ${A} 顆，乙袋有 ${B} 顆。甲移 ${k} 顆給乙，再由乙移 1 顆給甲。最後兩袋合計多少顆？`;ex=`兩次都是袋與袋之間的轉移，總數維持 ${c}。`;}
    else if(v===1){c=A-k;prompt=`甲袋有 ${A} 顆，乙袋有 ${B} 顆。甲移 ${k} 顆給乙後，甲袋剩多少顆？`;ex=`${A}−${k}=${c}。`;}
    else if(v===2){c=B+k-1;prompt=`甲袋有 ${A} 顆，乙袋有 ${B} 顆。甲先移 ${k} 顆給乙，乙再移 1 顆回甲。最後乙袋有多少顆？`;ex=`${B}+${k}−1=${c}。`;}
    else if(v===3){const aa=A-k+1,bb=B+k-1;c=Math.abs(aa-bb);prompt=`甲有 ${A} 顆、乙有 ${B} 顆。甲給乙 ${k} 顆後，乙再給甲 1 顆。最後兩袋數量相差多少？`;ex=`最後甲=${aa}、乙=${bb}，相差 ${c}。`;}
    else if(v===4){const C=4+mod(n,7),m=1+mod(n,3);c=A+B+C;prompt=`甲、乙、丙三盒分別有 ${A}、${B}、${C} 顆。甲給乙 ${k} 顆，乙再給丙 ${m} 顆。最後三盒合計多少顆？`;ex=`只是盒與盒之間移動，合計仍為 ${c}。`;}
    else if(v===5){const m=2+mod(n,4);c=B+k-m;prompt=`甲杯有 ${A} mL、乙杯有 ${B} mL。從甲倒 ${k} mL 到乙，再從乙倒 ${m} mL 回甲。乙杯最後有多少 mL？`;ex=`${B}+${k}−${m}=${c}。`;}
    else if(v===6){const value=2+mod(n,4);c=(A+B)*value;prompt=`甲盒有 ${A} 枚、乙盒有 ${B} 枚相同代幣，每枚價值 ${value} 分。任意在兩盒之間搬動代幣後，全部代幣總價值多少分？`;ex=`總枚數不變，所以 (${A}+${B})×${value}=${c}。`;}
    else {const C=5+mod(n,7);c=A+B+C;prompt=`三個容器中共有 ${A}、${B}、${C} 顆珠子。經過若干次「從一個容器拿出 1 顆放入另一個容器」後，三個容器合計多少顆？`;ex=`每一步只改變所在容器，總數保持 ${c}。`;}
    q.q=prompt;q.e=ex;setNum(q,c,[-2,-1,1]);
  });

  register('pairing-capacity',(q,{n,v,t})=>{
    const locks=8+mod(n,8),keys=5+mod(n,6);let c,prompt,ex;
    if(v===0){c=Math.min(locks,keys);prompt=`有 ${locks} 把鎖與 ${keys} 把可用鑰匙，每把鑰匙最多配一把鎖、每把鎖最多配一把鑰匙。最多能配成幾組？`;ex=`一對一配對上限由較少的一側決定：${c} 組。`;}
    else if(v===1){const bad=1+mod(n,2);c=Math.min(locks,keys-bad);prompt=`有 ${locks} 把鎖與 ${keys} 把鑰匙，其中 ${bad} 把無法打開這批任何鎖；其餘鑰匙彼此配不同鎖。最多幾組？`;ex=`可用鑰匙 ${keys-bad} 把，最多 ${c} 組。`;}
    else if(v===2){const a=3+mod(n,4),b=3+mod(n*2,4),ka=2+mod(n,3),kb=2+mod(n+1,3);c=Math.min(a,ka)+Math.min(b,kb);prompt=`A 型鎖 ${a} 把、B 型鎖 ${b} 把；A 型鑰匙 ${ka} 把只能開 A 型鎖，B 型鑰匙 ${kb} 把只能開 B 型鎖。最多配成幾組？`;ex=`分兩類配對：${Math.min(a,ka)}+${Math.min(b,kb)}=${c}。`;}
    else if(v===3){const people=7+mod(n,7);c=Math.floor(people/2);prompt=`有 ${people} 人要兩兩組隊，每人最多加入一隊。最多能組成幾個完整的兩人隊？`;ex=`⌊${people}/2⌋=${c}。`;}
    else if(v===4){const boxes=3+mod(n,4),cap=2+t,items=8+mod(n,8);c=Math.min(items,boxes*cap);prompt=`有 ${boxes} 個盒子，每盒最多放 ${cap} 件；共有 ${items} 件物品，每件只能放一盒。最多能放入多少件？`;ex=`總容量 ${boxes*cap}，與物品數比較後取較小值 ${c}。`;}
    else if(v===5){const seats=8+mod(n,8),reserved=1+mod(n,3),people=6+mod(n,9);c=Math.min(people,seats-reserved);prompt=`共有 ${seats} 個座位，其中 ${reserved} 個保留不能使用；有 ${people} 位一般觀眾。最多能安排幾位入座？`;ex=`可用座位 ${seats-reserved} 個，最多 ${c} 位。`;}
    else if(v===6){const red=3+mod(n,4),blue=4+mod(n,4);c=Math.min(red,blue);prompt=`要組成紅藍各 1 人的雙人隊。紅組有 ${red} 人、藍組有 ${blue} 人，每人最多入一隊。最多能組幾隊？`;ex=`上限是較少的一組：${c}。`;}
    else {const jobs=4+mod(n,4),machines=3+mod(n,4);c=Math.min(jobs,machines-1);prompt=`有 ${jobs} 個工作與 ${machines} 台機器，每台同時最多處理 1 個工作，其中 1 台維修中不可用。當下最多可同時處理幾個工作？`;ex=`可用機器 ${machines-1} 台，因此上限 ${c}。`;}
    q.q=prompt;q.e=ex;setNum(q,c,[-1,1,2]);
  });

  register('matrix-difference',(q,{n,v})=>{
    const x=4+mod(n,7),y=1+mod(n+v,4);let f,desc;
    if(v===0){f=(a,b)=>a-b;desc='第一格減第二格';}
    else if(v===1){f=(a,b)=>a+b;desc='前兩格相加';}
    else if(v===2){f=(a,b)=>2*a-b;desc='第一格兩倍再減第二格';}
    else if(v===3){f=(a,b)=>a+2*b;desc='第一格加第二格兩倍';}
    else if(v===4){f=(a,b)=>a*b;desc='前兩格相乘';}
    else if(v===5){f=(a,b)=>Math.abs(a-b);desc='前兩格差的絕對值';}
    else if(v===6){f=(a,b)=>Math.max(a,b)+1;desc='較大者再加 1';}
    else {f=(a,b)=>(a+b)/2;desc='前兩格的平均';}
    const rows=[];for(let r=0;r<3;r++){let a=x+r*2,b=y+r;if(v===7&&(a+b)%2!==0)a++;rows.push([a,b,f(a,b)]);}
    const c=rows[2][2];q.q='觀察 3×3 數字矩陣。三列都遵循同一個規則；缺失格應是多少？';q.type='matrix';q.cells=[...rows[0],...rows[1],rows[2][0],rows[2][1],'?'].map(String);q.e=`共同規則是「${desc}」，因此缺失格為 ${c}。`;setNum(q,c,[-2,-1,1]);
  });
})();