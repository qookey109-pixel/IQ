// QB5 working-memory construct variants: query target, span and manipulation now vary by item/tier.
(() => {
  'use strict';
  const E=window.QB5E;if(!E)return;const {register,set,setNum,mod}=E;
  const places=['竹林','港口','書店','花園','車站','山屋','劇院','工坊','市集','燈塔','茶館','畫廊'];

  register('memory-position',(q,{n,v,t})=>{
    const len=4+t,vals=Array.from({length:len},(_,i)=>10+mod(n*7+i*3+v,80)),pos=mod(n+v,len);
    q.type='memory';q.stim=vals.join('　');q.q=`剛才序列中，第 ${pos+1} 個項目是什麼？`;q.e=`第 ${pos+1} 個項目是 ${vals[pos]}。`;
    set(q,String(vals[pos]),[vals[mod(pos+1,len)],vals[mod(pos+2,len)],vals[mod(pos+3,len)]].map(String));
  });

  register('memory-pair',(q,{n,v,t})=>{
    const count=3+t,start=mod(v,places.length-count),names=places.slice(start,start+count),vals=names.map((_,i)=>10+mod(n*5+i*7+v,90)),k=mod(n+v,count);
    q.type='memory';q.stim=names.map((x,i)=>`${x} ${vals[i]}`).join('　');q.q=`剛才「${names[k]}」配對的編號是？`;q.e=`${names[k]} 配對 ${vals[k]}。`;
    set(q,String(vals[k]),vals.filter((_,i)=>i!==k).map(String).concat([String(vals[k]+1)]));
  });

  register('memory-update',(q,{n,v,t})=>{
    const start=5+mod(n,12),count=2+t,patterns=[['+',3],['-',2],['+',4],['-',1],['+',2],['-',3],['+',5],['-',2]];let cur=start;const ops=[];
    for(let i=0;i<count;i++){const [op,val]=patterns[mod(v+i,patterns.length)];ops.push([op,val]);cur=op==='+'?cur+val:cur-val;}
    q.type='memory';q.stim=`起始 ${start}；${ops.map(([op,val])=>`${op==='+'?'增加':'減少'} ${val}`).join('；')}`;
    q.q='依剛才出現的順序逐步套用更新，最後數量是多少？';q.e=`依序計算後得到 ${cur}。`;setNum(q,cur,[-2,-1,1]);
  });

  register('memory-filter',(q,{n,v,t})=>{
    const count=3+t,start=mod(v,places.length-count),locs=places.slice(start,start+count),nums=locs.map((_,i)=>20+mod(n+i*4,50)),tokens=[];
    for(let i=0;i<count;i++)tokens.push(String(nums[i]),locs[i]);q.type='memory';q.stim=tokens.join('　');
    if(v%2===0){const c=locs.join(' → ');q.q='忽略數字，只回憶剛才出現的地點，保持原順序。';q.e=`地點依序為 ${c}。`;set(q,c,[[...locs].reverse().join(' → '),[locs[1],locs[0],...locs.slice(2)].join(' → '),[...locs.slice(1),locs[0]].join(' → ')]);}
    else {const c=nums.join(' → ');q.q='忽略地點，只回憶剛才出現的數字，保持原順序。';q.e=`數字依序為 ${c}。`;set(q,c,[[...nums].reverse().join(' → '),[nums[1],nums[0],...nums.slice(2)].join(' → '),[...nums.slice(1),nums[0]].join(' → ')]);}
  });

  register('memory-recognition',(q,{n,v,t})=>{
    const len=4+t,vals=Array.from({length:len},(_,i)=>String.fromCharCode(65+mod(n+i*3+v,20))+String(1+mod(n+i,9)));
    q.type='memory';q.stim=vals.join('　');
    if(v%2===0){const novel=`Z${10+mod(n+v,80)}`;q.q='哪一個代碼剛才沒有出現？';q.e=`${novel} 未出現在刺激中。`;set(q,novel,vals.slice(0,3));}
    else {const k=mod(n+v,len),c=vals[k];q.q='哪一個代碼剛才有出現？';q.e=`${c} 出現在剛才的序列中。`;set(q,c,[`${c}X`,`${c.slice(0,-1)}${mod(Number(c.at(-1))+1,10)}`,`Z${c.slice(1)}`]);}
  });

  register('memory-relative',(q,{n,v,t})=>{
    const len=5+t,vals=Array.from({length:len},(_,i)=>100+mod(n*7+i*11+v,700)),right=v%2===1,dist=t===2&&v>=4?2:1;
    const span=Math.max(1,len-2*dist),k=dist+mod(n+v,span),target=vals[k],ans=vals[k+(right?dist:-dist)];
    q.type='memory';q.stim=vals.join('　');q.q=`剛才序列中，以「${target}」這個完整項目為基準，它${right?'右':'左'}邊第 ${dist} 個項目是什麼？`;q.e=`從完整項目 ${target} 往${right?'右':'左'}數 ${dist} 格，得到 ${ans}。`;
    set(q,String(ans),vals.filter(x=>x!==ans).slice(0,3).map(String));
  });

  register('memory-reorder',(q,{n,v,t})=>{
    const len=4+t,vals=Array.from({length:len},(_,i)=>10+mod(n*5+i*6+v,80));let out,rule;
    if(v===0){out=[...vals.slice(1),vals[0]];rule='把第一個移到最後';}
    else if(v===1){out=[vals.at(-1),...vals.slice(0,-1)];rule='把最後一個移到最前';}
    else if(v===2){out=[...vals].reverse();rule='整列反轉';}
    else if(v===3){out=[vals[1],vals[0],...vals.slice(2)];rule='交換前兩個';}
    else if(v===4){out=[...vals];const j=out.length-2,tmp=out[1];out[1]=out[j];out[j]=tmp;rule='交換第二個與倒數第二個';}
    else if(v===5){out=[...vals.slice(2),...vals.slice(0,2)];rule='把前兩個整組移到最後';}
    else if(v===6){out=[vals[0],...vals.slice(1).reverse()];rule='第一個不動，其餘反轉';}
    else {out=[...vals.slice(-2),...vals.slice(0,-2)];rule='把最後兩個整組移到最前';}
    const c=out.join(' → ');q.type='memory';q.stim=vals.join('　');q.q=`對剛才序列做以下操作：「${rule}」。結果是哪一列？`;q.e=`依規則重排後得到 ${c}。`;
    set(q,c,[[...out].reverse().join(' → '),vals.join(' → '),[...out.slice(1),out[0]].join(' → ')]);
  });
})();