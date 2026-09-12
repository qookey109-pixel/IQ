// QB5 processing-speed variants: 7 families × 8 scanning/filter archetypes.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {register,set,setNum,mod}=E;

  register('speed-exact',(q,{n,v,t})=>{
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',len=4+t;let target='';for(let i=0;i<len;i++)target+=chars[mod(n*3+i*5+v,chars.length)];
    const last=chars[mod(chars.indexOf(target.at(-1))+1,chars.length)];
    q.q=`快速找出與「${target}」完全相同的代碼。`;q.e=`完全相同的是 ${target}。`;
    set(q,target,[target.slice(0,-1)+last,target.slice(1)+target[0],target[0]+target.slice(2)+target[1]]);
  });

  register('speed-count',(q,{n,v,t})=>{
    const symbols=['●','■','▲','◆','★','○','□','△'],target=symbols[v],other=symbols[(v+3)%symbols.length],count=3+t+mod(n,3),len=14+t*3,seq=[];
    for(let i=0;i<len;i++)seq.push(i<count?target:other);for(let i=0;i<len;i++){const j=mod(n*7+i*5,len);[seq[i],seq[j]]=[seq[j],seq[i]];}
    q.q=`快速數出「${target}」的數量：${seq.join(' ')}`;q.e=`目標符號「${target}」共 ${count} 個。`;setNum(q,count,[-1,1,2]);
  });

  register('speed-pair-equality',(q,{n,v})=>{
    const a=100+mod(n*7,800),letters='QRMNTKPS',L=letters[v],correct=`${a}${L} / ${a}${L}`;
    q.q='哪一組左右代碼完全一致？';q.e='逐字比較後，只有正解左右完全相同。';
    set(q,correct,[`${a}${L} / ${a+1}${L}`,`${a}${letters[(v+1)%8]} / ${a}${L}`,`${a+1}${L} / ${a}${L}`]);
  });

  register('speed-parity',(q,{n,v})=>{
    const base=12+mod(n*4,80);let c,prompt,wrong;
    if(v===0){c=base+1;prompt='哪一個是唯一的奇數？';wrong=[base,base+2,base+4];}
    else if(v===1){c=base;prompt='哪一個是唯一的偶數？';wrong=[base+1,base+3,base+5];}
    else if(v===2){c=base+mod(3-mod(base,3),3);if(c===base)c+=3;prompt='哪一個可以被 3 整除？';wrong=[c+1,c+2,c+4];}
    else if(v===3){c=base+mod(5-mod(base,5),5);if(c===base)c+=5;prompt='哪一個可以被 5 整除？';wrong=[c+1,c+2,c+3];}
    else if(v===4){c=base+2;prompt='哪一個不是 4 的倍數？';wrong=[base,base+4,base+8];}
    else if(v===5){c=base+mod(7-mod(base,7),7);if(c===base)c+=7;prompt='哪一個可以被 7 整除？';wrong=[c+1,c+2,c+3];}
    else if(v===6){c=Math.floor(base/10)*10+3;prompt='哪一個數字的個位數是 3？';wrong=[c+1,c+2,c+4];}
    else {c=base+9;prompt='哪一個數字最大？';wrong=[base+3,base+5,base+7];}
    q.q=`快速判斷：${prompt}`;q.e=`依指定條件，正解是 ${c}。`;set(q,String(c),wrong.map(String));
  });

  register('speed-order',(q,{n,v})=>{
    const a=20+mod(n,50),b=a+2,c=a+5;let prompt,correct,wrong;
    if(v%4===0){prompt='哪一列數字嚴格由小到大？';correct=`${a} · ${b} · ${c}`;wrong=[`${b} · ${a} · ${c}`,`${a} · ${c} · ${b}`,`${c} · ${b} · ${a}`];}
    else if(v%4===1){prompt='哪一列數字嚴格由大到小？';correct=`${c} · ${b} · ${a}`;wrong=[`${a} · ${b} · ${c}`,`${c} · ${a} · ${b}`,`${b} · ${c} · ${a}`];}
    else if(v%4===2){const x=String.fromCharCode(65+mod(n,20)),y=String.fromCharCode(x.charCodeAt(0)+2),z=String.fromCharCode(x.charCodeAt(0)+4);prompt='哪一列字母依英文字母順序排列？';correct=`${x} · ${y} · ${z}`;wrong=[`${y} · ${x} · ${z}`,`${z} · ${y} · ${x}`,`${x} · ${z} · ${y}`];}
    else {prompt='哪一列符合「第一個最小、第三個最大」？';correct=`${a} · ${b} · ${c}`;wrong=[`${b} · ${a} · ${c}`,`${c} · ${a} · ${b}`,`${c} · ${b} · ${a}`];}
    q.q=prompt;q.e='只有正解符合指定的掃描順序。';set(q,correct,wrong);
  });

  register('speed-boundary',(q,{n,v})=>{
    const a=100+mod(n,800);let prompt,correct,wrong;
    if(v===0){prompt='哪個代碼以 M 開頭、T 結尾？';correct=`M${a}T`;wrong=[`T${a}M`,`M${a}R`,`R${a}T`];}
    else if(v===1){prompt='哪個代碼以 K 開頭、數字 7 結尾？';correct=`K${a}7`;wrong=[`7${a}K`,`K${a}8`,`R${a}7`];}
    else if(v===2){prompt='哪個代碼第二個字元是 Q？';correct=`AQ${a}`;wrong=[`QA${a}`,`AR${a}`,`A${a}Q`];}
    else if(v===3){prompt='哪個代碼同時包含 X 且以 5 結尾？';correct=`BX${a}5`;wrong=[`B${a}X5`,`BX${a}6`,`B${a}5`];}
    else if(v===4){prompt='哪個代碼首尾字母相同？';correct=`R${a}R`;wrong=[`R${a}T`,`T${a}R`,`Q${a}P`];}
    else if(v===5){prompt='哪個代碼以數字開頭、字母結尾？';correct=`${a}K`;wrong=[`K${a}`,`K${a}R`,`R${a}`];}
    else if(v===6){prompt='哪個代碼恰好有兩個字母 M？';correct=`M${a}M`;wrong=[`M${a}N`,`N${a}M`,`MM${a}M`];}
    else {prompt='哪個代碼不含字母 R？';correct=`K${a}T`;wrong=[`R${a}T`,`K${a}R`,`R${a}R`];}
    q.q=prompt;q.e='逐字檢查首尾或指定位置即可找到唯一符合者。';set(q,correct,wrong);
  });

  register('speed-missing',(q,{n,v})=>{
    const a=10+mod(n,40);let c,prompt,wrong;
    if(v===0){c=a+2;prompt=`連續整數 ${a} 到 ${a+5} 中，畫面列出 ${a}、${a+1}、${a+3}、${a+4}、${a+5}。缺少哪個？`;wrong=[a+1,a+3,a+4];}
    else if(v===1){const s=a*2;c=s+8;prompt=`偶數序列 ${s}、${s+2}、${s+4}、${s+6}、${s+10} 中，缺少哪個應有項？`;wrong=[c-2,c+2,c+4];}
    else if(v===2){const ch=String.fromCharCode(65+mod(n,18));c=String.fromCharCode(ch.charCodeAt(0)+2);prompt=`字母序列應為 ${ch}、${String.fromCharCode(ch.charCodeAt(0)+1)}、?、${String.fromCharCode(ch.charCodeAt(0)+3)}。缺少哪個？`;wrong=[String.fromCharCode(ch.charCodeAt(0)+1),String.fromCharCode(ch.charCodeAt(0)+3),String.fromCharCode(ch.charCodeAt(0)+4)];}
    else if(v===3){c=a+6;prompt=`每次加 3 的序列：${a}、${a+3}、?、${a+9}。缺少哪個？`;wrong=[a+4,a+5,a+7];}
    else if(v===4){c=a*2;prompt=`每次乘 2 的序列：${a/2}、${a}、?、${a*4}。缺少哪個？`;wrong=[c-1,c+1,c+2];}
    else if(v===5){c=a+1;prompt=`連續倒數：${a+3}、${a+2}、?、${a}。缺少哪個？`;wrong=[a,a+2,a+3];}
    else if(v===6){const s=a%2===0?a:a+1;c=s+5;prompt=`奇數序列：${s+1}、${s+3}、?、${s+7}。缺少哪個？`;wrong=[c-1,c+1,c+2];}
    else {c=a+10;prompt=`每次加 5：${a}、${a+5}、?、${a+15}。缺少哪個？`;wrong=[a+8,a+9,a+11];}
    q.q=`快速找缺項：${prompt}`;q.e=`依序列規則，缺少 ${c}。`;set(q,String(c),wrong.map(String));
  });
})();