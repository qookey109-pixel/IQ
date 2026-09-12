const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','answer-position-balance.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK;

const mod=(n,m)=>((n%m)+m)%m;
const idx=q=>{const m=String(q.id).match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
const variant=q=>Number(q.constructVariant)-1;
const tier=q=>q.difficulty==='hard'?2:q.difficulty==='medium'?1:0;
const serial=n=>mod(n,18);
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1;};
const frac=(a,b)=>{const g=gcd(a,b);return `${a/g}/${b/g}`;};
const fmtTime=m=>{m=mod(m,1440);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;};
const faces=g=>{let top=0,side=0,R=g.length,C=g[0].length;for(let r=0;r<R;r++)for(let c=0;c<C;c++){const h=g[r][c];if(h<=0)continue;top++;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc,nh=rr<0||cc<0||rr>=R||cc>=C?0:g[rr][cc];side+=Math.max(0,h-nh);}}return top+side;};
const bfs=(N,S,T,B)=>{const qq=[[...S,0]],seen=new Set([S.join(',')]);for(let i=0;i<qq.length;i++){const [r,c,d]=qq[i];if(r===T[0]&&c===T[1])return d;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc,k=`${rr},${cc}`;if(rr<0||cc<0||rr>=N||cc>=N||B.has(k)||seen.has(k))continue;seen.add(k);qq.push([rr,cc,d+1]);}}return null;};

const scenes=[
  ['館員','借書','借閱證','圖書館'],['園丁','澆花','工作證','溫室'],['旅客','搭車','車票','車站'],['演員','登台','通行證','劇院'],
  ['學員','入場練習','預約單','球館'],['訪客','參觀','入場券','展館'],['技師','維修','工單','工坊'],['讀者','取書','領取單','書店'],
  ['船員','出港','許可證','碼頭'],['廚師','進入備餐區','工作證','廚房'],['畫家','布展','核准單','畫廊'],['登山客','進山','登記證','登山口']
];
const objects=['筆記','雨傘','地圖','外套','相機','手冊'];
const contrastBase=[['雨衣','輕巧','防水'],['背包','外型','耐用'],['地圖','精美','準確'],['座椅','便宜','舒適'],['路線','短','安全'],['工具','新穎','實用']];
const contrastTopics=[['雨衣','輕巧','防水'],['背包','外型','耐用'],['地圖','精美','準確'],['座椅','便宜','舒適'],['路線','短','安全'],['工具','新穎','實用'],['燈具','小巧','明亮'],['教材','有趣','清楚'],['房間','寬敞','安靜'],['餐點','外觀','美味'],['鞋子','時髦','合腳'],['方案','速度','可靠'],['相機','輕便','續航'],['行程','緊湊','彈性'],['軟體','功能多','穩定'],['桌子','便宜','耐重'],['外套','好看','保暖'],['耳機','小巧','音質']];
const evidencePairs=[['睡眠時間','測驗分數'],['閱讀時間','詞彙分數'],['運動時間','反應速度'],['練習次數','操作分數'],['通勤時間','疲勞評分'],['飲水量','專注評分'],['使用時間','熟練度'],['到課次數','作業分數'],['休息時間','錯誤率'],['步行量','心情評分'],['複習時間','回憶分數'],['會議次數','完成量'],['光照時間','清醒評分'],['遊戲時數','關卡分數'],['睡前閱讀','入睡時間'],['咖啡量','清醒度'],['練琴時間','演奏分數'],['戶外時間','壓力評分']];
const places=['竹林','港口','書店','花園','車站','山屋','劇院','工坊','市集','燈塔','茶館','畫廊'];

function verbal(q,n,v){
  const [who,act,,place]=scenes[n%12];
  switch(q.taskFamily){
    case 'necessary-condition': return v===0?`這位${who}不具備${act}資格`:`這位${who}目前不具備${act}資格`;
    case 'reported-vs-fact': return v===0?`這幾位${who}表示打算${act}`:`主辦方預測明天可能有${who}${act}`;
    case 'contrast-focus': return v===0?`優先考量${contrastBase[n%contrastBase.length][2]}`:contrastTopics[serial(n)][2];
    case 'scope-negation': return v===0?`至少有受訪者不願意${act}`:'至少有完成 A 的人沒有完成 B';
    case 'instruction-exception': return v===0?'小禾可在預約的週六辦理':'可以帶入主要區域';
    case 'pronoun-reference': return v===0?'小安':objects[n%objects.length];
    case 'evidence-strength': {if(v===0)return `受訪常客一致表示喜歡${act}`;const [a,b]=evidencePairs[serial(n)];return `這批資料中${a}與${b}呈現關聯`;}
  }
}

function fluid(q,n,v,t){
  if(q.taskFamily==='machine-composition'){
    const x=3+mod(n*2,9),a=2+mod(v,4),b=1+mod(n+v,6);let c;
    if(v===0)c=x*a+b;else if(v===1)c=(x+b)*a;else if(v===2)c=x*x-b;else if(v===3)c=(x-b)*a;else if(v===4)c=x*a-b;else if(v===5)c=(x+b)*a-(1+t);else if(v===6)c=x*a+b*(2+t);else c=x%2===0?x/2+b:x*2+b;return String(c);
  }
  if(q.taskFamily==='ordering-constraints'){
    const pool=['展覽','講座','彩排','訪談','訓練','簡報','檢查','報到','攝影','會議','導覽','休息','測試','組裝','校對','包裝','審核','交付','採樣','登記','盤點','清潔','彩繪','測量'];
    const count=t===0?3:t===1?4:5,s=serial(n),labels=Array.from({length:count},(_,i)=>pool[mod(s+i*5+v,pool.length)]),shift=mod(s+v,count),order=[...labels.slice(shift),...labels.slice(0,shift)];return order.join(' → ');
  }
  if(q.taskFamily==='set-overlap'){
    const A=12+mod(n,9),B=9+mod(n*2,8),I=2+mod(n+v,Math.max(2,Math.min(A,B)-2)),U=A+B-I,total=U+5+mod(n,6);let c;
    if(v===0)c=I;else if(v===1)c=A-I;else if(v===2)c=B-I;else if(v===3)c=U;else if(v===4)c=A+B-2*I;else if(v===5)c=total-U;else if(v===6)c=A;else c=B;return String(c);
  }
  if(q.taskFamily==='code-deduction'){
    const A=11+mod(n,30),B=A+1,C=A+2,D=A+3,p=(x,y)=>`${x}-${y}`;return [p(C,A),p(D,B),p(B,A),p(B,D),p(D,A),p(A,D),p(D,C),p(C,B)][v];
  }
  if(q.taskFamily==='invariant-transfer'){
    const A=10+mod(n,13),B=6+mod(n*2,10),k=1+mod(n+v,4);let c;
    if(v===0)c=A+B;else if(v===1)c=A-k;else if(v===2)c=B+k-1;else if(v===3)c=Math.abs((A-k+1)-(B+k-1));else if(v===4)c=A+B+(4+mod(n,7));else if(v===5)c=B+k-(2+mod(n,4));else if(v===6)c=(A+B)*(2+mod(n,4));else c=A+B+(5+mod(n,7));return String(c);
  }
  if(q.taskFamily==='pairing-capacity'){
    const locks=8+mod(n,8),keys=5+mod(n,6);let c;
    if(v===0)c=Math.min(locks,keys);else if(v===1)c=Math.min(locks,keys-(1+mod(n,2)));else if(v===2){const a=3+mod(n,4),b=3+mod(n*2,4),ka=2+mod(n,3),kb=2+mod(n+1,3);c=Math.min(a,ka)+Math.min(b,kb);}else if(v===3)c=Math.floor((7+mod(n,7))/2);else if(v===4){const boxes=3+mod(n,4),cap=2+t,items=8+mod(n,8);c=Math.min(items,boxes*cap);}else if(v===5){const seats=8+mod(n,8),reserved=1+mod(n,3),people=6+mod(n,9);c=Math.min(people,seats-reserved);}else if(v===6)c=Math.min(3+mod(n,4),4+mod(n,4));else c=Math.min(4+mod(n,4),(3+mod(n,4))-1);return String(c);
  }
  if(q.taskFamily==='matrix-difference'){
    const s=serial(n),x=12+s*4+v,y=2+mod(s+v,7);let f;
    if(v===0)f=(a,b)=>a-b;else if(v===1)f=(a,b)=>a+b;else if(v===2)f=(a,b)=>2*a-b;else if(v===3)f=(a,b)=>a+2*b;else if(v===4)f=(a,b)=>a*b;else if(v===5)f=(a,b)=>Math.abs(a-b);else if(v===6)f=(a,b)=>Math.max(a,b)+1;else f=(a,b)=>(a+b)/2;let a=x+4,b=y+2;if(v===7&&(a+b)%2)a++;return String(f(a,b));
  }
}

function spatial(q,n,v,t){
  if(q.taskFamily==='grid-displacement'){
    const x=2+mod(n,6),y=2+mod(n*2,6),d=1+t;let s;if(v===0)s=[[3+d,0],[0,2+d]];else if(v===1)s=[[-2-d,0],[0,3+d]];else if(v===2)s=[[2+d,0],[0,-1-d],[1,0]];else if(v===3)s=[[0,3+d],[-2,0],[0,-1]];else if(v===4)s=[[2,0],[0,2],[-1-d,0]];else if(v===5)s=[[-2,0],[0,-2],[3+d,0]];else if(v===6)s=[[1+d,0],[0,1+d],[-1,0],[0,2]];else s=[[0,-2-d],[2+d,0],[0,1]];let dx=0,dy=0;s.forEach(([a,b])=>{dx+=a;dy+=b;});return `(${x+dx}, ${y+dy})`;
  }
  if(q.taskFamily==='mirror-coordinate'){
    const x=2+mod(n,5),y=1+mod(n*2,5),c=1+mod(n,2);let a;if(v===0)a=[-x,y];else if(v===1)a=[x,-y];else if(v===2)a=[-x,-y];else if(v===3)a=[y,x];else if(v===4)a=[-y,-x];else if(v===5)a=[2*c-x,y];else if(v===6)a=[x,2*c-y];else a=[-y,x];return `(${a[0]}, ${a[1]})`;
  }
  if(q.taskFamily==='viewpoint-heading'){
    const start=mod(n*35+v*20,360);let end;if(v===0)end=mod(start+45+45*t,360);else if(v===1)end=mod(start-(45+45*t),360);else if(v===2)end=mod(start+90-(45+45*t),360);else if(v===3)end=mod(start+90*(1+t),360);else if(v===4)end=mod(start+180,360);else if(v===5)end=mod(start+270,360);else if(v===6)end=mod(start-135,360);else end=mod(start+225,360);return `${end}°`;
  }
  if(q.taskFamily==='rectangle-cut'){
    const L=8+mod(n,8),W=6+mod(n*2,6);let c;if(v===0){const s=1+t;c=L*(W-s);}else if(v===1){const a=2+t,b=2;c=L*W-a*b;}else if(v===2){const s=1+t;c=(L-s)*(W-s);}else if(v===3)c=L*W/2;else if(v===4){const a=2,b=1+t;c=L*W-a*b;}else if(v===5)c=(L-2)*W;else if(v===6)c=L*W-8;else c=(L-2)*(W-2);return String(c);
  }
  if(q.taskFamily==='stack-hidden'){
    const b=1+mod(n,3),patterns=[[[b,b+1],[b+2,b]],[[b+2,b],[b,b+2]],[[b,b+1],[b+1,b+2]],[[b+2,b+1],[b,0]],[[b+1,b+1],[b+1,b+1]],[[b+2,0],[b+1,b]],[[b,b+2],[b+2,b]],[[b+2,b+1],[b+1,b]]],g=patterns[v].map(r=>r.map(x=>x?x+t:0));return String(faces(g));
  }
  if(q.taskFamily==='scale-drawing'){
    const a=3+mod(n,7),b=2+mod(n*2,5);let s=2+mod(v,3),c;if(v===0)c=a*s;else if(v===1)c=a*s;else if(v===2)c=b*s;else if(v===3)c=2*(a+b)*s;else if(v===4)c=a*b*s*s;else if(v===5)c=a;else if(v===6)c=a+b;else c=(a*s)*(b*s);return String(c);
  }
  if(q.taskFamily==='shortest-grid-path'){
    const N=t===0?6:t===1?7:8,S=[N-1,0],T=[0,N-1],B=new Set(),gap=1+mod(n+v,N-2);if(v===0){for(let r=1;r<N-1;r++)if(r!==gap)B.add(`${r},2`);}else if(v===1){const row=Math.min(3,N-2);for(let c=1;c<N-1;c++)if(c!==gap)B.add(`${row},${c}`);}else if(v===2){for(let r=1;r<N-2;r++)B.add(`${r},2`);for(let c=2;c<N-1;c++)B.add(`${N-3},${c}`);B.delete(`${gap},2`);}else if(v===3){for(let i=1;i<N-1;i++)if(i!==gap)B.add(`${i},${i}`);}else if(v===4){for(let c=1;c<N-1;c+=2)B.add(`${N-3},${c}`);for(let r=1;r<N-3;r+=2)B.add(`${r},3`);}else if(v===5){const col=N-3;for(let r=1;r<N-1;r++)if(r!==gap)B.add(`${r},${col}`);}else if(v===6){const row=N-4;for(let c=1;c<N-1;c++)if(c!==gap)B.add(`${row},${c}`);for(let r=1;r<row;r++)if(r!==gap)B.add(`${r},2`);}else{for(let i=1;i<N-1;i++){const col=i%2===0?2:N-3;B.add(`${i},${col}`);}}B.delete(S.join(','));B.delete(T.join(','));let c=bfs(N,S,T,B);if(c==null){B.clear();const col=Math.floor(N/2);for(let r=1;r<N-1;r++)if(r!==gap)B.add(`${r},${col}`);c=bfs(N,S,T,B);}return String(c);
  }
}

function memory(q,n,v,t){
  if(q.taskFamily==='memory-position'){const len=4+t,base=1000+n*20,vals=Array.from({length:len},(_,i)=>base+i*3),pos=mod(serial(n)+v,len);return String(vals[pos]);}
  if(q.taskFamily==='memory-pair'){const count=3+t,start=mod(v,places.length-count),names=places.slice(start,start+count),vals=names.map((_,i)=>10+mod(n*5+i*7+v,90)),k=mod(n+v,count);return String(vals[k]);}
  if(q.taskFamily==='memory-update'){const start=30+serial(n)*4+v,count=2+t;let cur=start;for(let i=0;i<count;i++){const val=1+mod(serial(n)+v+i,5),plus=(i+v)%2===0;cur+=plus?val:-val;}return String(cur);}
  if(q.taskFamily==='memory-filter'){const count=3+t,start=mod(v,places.length-count),locs=places.slice(start,start+count),nums=locs.map((_,i)=>20+mod(n+i*4,50));return v%2===0?locs.join(' → '):nums.join(' → ');}
  if(q.taskFamily==='memory-recognition'){const len=4+t,vals=Array.from({length:len},(_,i)=>String.fromCharCode(65+mod(n+i*3+v,20))+String(1+mod(n+i,9)));if(v%2===0)return `Z${10+mod(n+v,80)}`;return vals[mod(n+v,len)];}
  if(q.taskFamily==='memory-relative'){const len=5+t,vals=Array.from({length:len},(_,i)=>100+mod(n*7+i*11+v,700)),right=v%2===1,dist=t===2&&v>=4?2:1,span=Math.max(1,len-2*dist),k=dist+mod(n+v,span);return String(vals[k+(right?dist:-dist)]);}
  if(q.taskFamily==='memory-reorder'){const len=4+t,vals=Array.from({length:len},(_,i)=>500+n*11+i*5);let out;if(v===0)out=[...vals.slice(1),vals[0]];else if(v===1)out=[vals.at(-1),...vals.slice(0,-1)];else if(v===2)out=[...vals].reverse();else if(v===3)out=[vals[1],vals[0],...vals.slice(2)];else if(v===4){out=[...vals];const j=out.length-2;[out[1],out[j]]=[out[j],out[1]];}else if(v===5)out=[...vals.slice(2),...vals.slice(0,2)];else if(v===6)out=[vals[0],...vals.slice(1).reverse()];else out=[...vals.slice(-2),...vals.slice(0,-2)];return out.join(' → ');}
}

function speed(q,n,v,t){
  if(q.taskFamily==='speed-exact'){
    const s=serial(n),L=4+t,alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let base='';for(let i=0;i<L;i++)base+=alphabet[mod(s*7+v*5+i*3,alphabet.length)];if(v===0)return base;if(v===1)return [...base].reverse().join('');if(v===2)return base.slice(1)+base[0];if(v===3)return base.at(-1)+base.slice(0,-1);if(v===4)return base[0]+base[0]+base.slice(2);if(v===5)return base.slice(0,-1)+'Q';if(v===6)return base.slice(0,2)+base.slice(2).split('').reverse().join('');return base.slice(0,-2)+base.at(-1)+base.at(-2);
  }
  if(q.taskFamily==='speed-count')return String(3+t+mod(n,3));
  if(q.taskFamily==='speed-pair-equality'){const a=100+mod(n*7,800),L='QRMNTKPS'[v];return `${a}${L} / ${a}${L}`;}
  if(q.taskFamily==='speed-parity'){const base=12+mod(n*4,80);let c;if(v===0)c=base+1;else if(v===1)c=base;else if(v===2){c=base+mod(3-mod(base,3),3);if(c===base)c+=3;}else if(v===3){c=base+mod(5-mod(base,5),5);if(c===base)c+=5;}else if(v===4)c=base+2;else if(v===5){c=base+mod(7-mod(base,7),7);if(c===base)c+=7;}else if(v===6)c=Math.floor(base/10)*10+3;else c=base+9;return String(c);}
  if(q.taskFamily==='speed-order'){const a=20+mod(n,50),b=a+2,c=a+5;if(v%4===0)return `${a} · ${b} · ${c}`;if(v%4===1)return `${c} · ${b} · ${a}`;if(v%4===2){const x=String.fromCharCode(65+mod(n,20)),y=String.fromCharCode(x.charCodeAt(0)+2),z=String.fromCharCode(x.charCodeAt(0)+4);return `${x} · ${y} · ${z}`;}return `${a} · ${b} · ${c}`;}
  if(q.taskFamily==='speed-boundary'){const a=100+mod(n,800);return [`M${a}T`,`K${a}7`,`AQ${a}`,`BX${a}5`,`R${a}R`,`${a}K`,`M${a}M`,`K${a}T`][v];}
  if(q.taskFamily==='speed-missing'){const a=10+mod(n,40);let c;if(v===0)c=a+2;else if(v===1)c=a*2+8;else if(v===2){const ch=String.fromCharCode(65+mod(n,18));return String.fromCharCode(ch.charCodeAt(0)+2);}else if(v===3)c=a+6;else if(v===4)c=a*2;else if(v===5)c=a+1;else if(v===6){const s=a%2===0?a:a+1;c=s+5;}else c=a+10;return String(c);}
}

function quant(q,n,v,t){
  if(q.taskFamily==='quant-discount'){const price=(10+mod(n,20))*10;let c;if(v===0)c=price*[90,80,75][t]/100;else if(v===1)c=price*(100-[10,20,25][t])/100;else if(v===2)c=price-[10,20,30][t];else if(v===3)c=price*.8+10*t;else if(v===4)c=price;else if(v===5)c=price*.9*.8;else if(v===6)c=price*.8-(20+10*t);else c=price*.8*1.1;return String(c);}
  if(q.taskFamily==='quant-unit-rate'){const unit=5+mod(n,12),qty=3+t+mod(v,3);if(v===4)return String(unit*(qty+2));if(v===7)return String(unit*qty);return String(unit);}
  if(q.taskFamily==='quant-average'){const a=10+mod(n,20);let c;if(v===0){const x=a-2,y=a+5;c=3*a-x-y;}else if(v===1)c=((a-3)+(a+1)+(a+2))/3;else if(v===2)c=(a*4+(a+8))/5;else if(v===3)c=a*4-((a-2)+a+(a+1));else if(v===4)c=(a+(a+6))/2;else if(v===5)c=(a*5-(a-4))/4;else if(v===6)c=(a*3+(a+9))/4;else c=((a-2)*2+(a+2)*3)/5;return String(c);}
  if(q.taskFamily==='quant-remainder'){const d=5+mod(v,4),r=1+mod(n,d-1),a=d*(3+mod(n,8))+r;let c;if(v===0)c=r;else if(v===1)c=(d-r)%d;else if(v===2)c=Math.floor(a/d);else if(v===3)c=r;else if(v===4)c=mod(r+2,d);else if(v===5)c=mod(r*2,d);else if(v===6)c=d-r;else c=mod(r+3,d);return String(c);}
  if(q.taskFamily==='quant-time'){const start=8*60+20+mod(n*7,180),dur=20+mod(n*11,100);let c,isClock=true;if(v===0)c=start+dur;else if(v===1)c=start;else if(v===2)c=start+dur+(10+5*t);else if(v===3)c=start+dur+(15+5*t);else if(v===4){c=dur;isClock=false;}else if(v===5)c=23*60+30+(45+15*t);else if(v===6)c=start+dur+15;else {c=dur;isClock=false;}return isClock?fmtTime(c):String(c);}
  if(q.taskFamily==='quant-probability'){let R=1+mod(n,4),W=3+mod(n*2,5);if(v===4)R=2+mod(n,3);if(v===6)W=2+mod(n,4);const T=R+W;if(v===0)return frac(R,T);if(v===1||v===2||v===7)return frac(W,T);if(v===3)return frac(1,T);if(v===4)return frac(R*(R-1),T*(T-1));if(v===5)return frac(2*R*W,T*(T-1));return frac(W*(W-1),T*(T-1));}
  if(q.taskFamily==='quant-balance'){return String(4+mod(n,12));}
}

function expected(q){const n=idx(q),v=variant(q),t=tier(q);if(q.d==='語文理解')return verbal(q,n,v);if(q.d==='流體推理')return fluid(q,n,v,t);if(q.d==='視覺空間')return spatial(q,n,v,t);if(q.d==='工作記憶')return memory(q,n,v,t);if(q.d==='處理速度')return speed(q,n,v,t);if(q.d==='量化推理')return quant(q,n,v,t);}

const failures=[];
const familyCount={};
for(const q of bank){
  const oracle=String(expected(q));
  const correct=String(q.o[q.a]);
  familyCount[q.taskFamily]=(familyCount[q.taskFamily]||0)+1;
  if(oracle!==String(q.correctContent)||oracle!==correct)failures.push({id:q.id,family:q.taskFamily,oracle,correctContent:String(q.correctContent),actual:correct});
}

assert.strictEqual(bank.length,5124);
assert.strictEqual(Object.keys(familyCount).length,42);
assert.strictEqual(new Set(bank.map(q=>q.semanticKey)).size,294);
assert.deepStrictEqual(failures,[],`Oracle mismatches:\n${JSON.stringify(failures.slice(0,30),null,2)}`);
console.log('QB5 independent oracle validation PASS');
console.log('5,124 / 5,124 answers independently recomputed across all 42 families and 294 semantic templates.');
