// Cognitive IQ Lab — Question Bank v3.1
// 300 original items generated from controlled item models.
// Quality pass: unique task signatures, broader parameter coverage, balanced forms, exposure control.
// No proprietary WAIS / Raven / Pearson test items are included or reproduced.

(() => {
  const BANK_VERSION = "QB-2026.09.3";
  const BANK_REVISION = "3.1";
  const DOMAIN_ORDER = ["語文理解","流體推理","視覺空間","工作記憶","處理速度","量化推理"];
  const DOMAIN_SLUG = {
    "語文理解":"verbal","流體推理":"fluid","視覺空間":"spatial",
    "工作記憶":"memory","處理速度":"speed","量化推理":"quant"
  };
  const DIFFICULTY_LABEL = {easy:"基礎",medium:"中等",hard:"進階"};
  const FORM_PLAN = {easy:2, medium:2, hard:1};
  const RECENT_FORM_LIMIT = 8;
  const HISTORY_KEY = `cognitive-iq-lab:form-history:${BANK_VERSION}`;
  const CYCLE_KEY = `cognitive-iq-lab:coverage-cycle:${BANK_VERSION}`;

  const difficultyFor = n => n <= 20 ? "easy" : n <= 40 ? "medium" : "hard";
  const itemId = (domain, n) => `qb3-${DOMAIN_SLUG[domain]}-${String(n).padStart(3,"0")}`;

  function rotateArray(arr, offset) {
    const n = ((offset % arr.length) + arr.length) % arr.length;
    return [...arr.slice(n), ...arr.slice(0,n)];
  }

  function uniqueOptions(correct, distractors, seed = 0) {
    const values = [String(correct)];
    for (const value of distractors) {
      const s = String(value);
      if (!values.includes(s)) values.push(s);
      if (values.length === 4) break;
    }
    if (values.length !== 4) {
      throw new Error(`Item generation produced fewer than 4 unique options for "${correct}"`);
    }
    const answerIndex = ((seed % 4) + 4) % 4;
    const others = values.slice(1,4);
    const options = [];
    let oi = 0;
    for (let i=0;i<4;i++) options.push(i === answerIndex ? values[0] : others[oi++]);
    return {o:options, a:answerIndex};
  }

  function numericOptions(correct, seed = 0, step = 1) {
    const c = Number(correct);
    const candidates = [c-step, c+step, c+step*2, c-step*2, c+step*3, c-step*3]
      .filter(v => Number.isFinite(v) && v >= 0 && v !== c);
    return uniqueOptions(String(c), candidates.map(String), seed);
  }

  function sequenceOptions(correctTokens, seed = 0) {
    const c = [...correctTokens];
    const swap = [...c];
    if (swap.length > 1) [swap[0],swap[1]]=[swap[1],swap[0]];
    const rotate = c.length > 1 ? [...c.slice(1),c[0]] : c;
    const reverse = [...c].reverse();
    const alt = c.length > 2 ? [c[0], ...c.slice(2), c[1]] : reverse;
    return uniqueOptions(c.join(" "), [swap.join(" "), rotate.join(" "), reverse.join(" "), alt.join(" ")], seed);
  }

  function makeItem(domain, n, body) {
    return {
      id:itemId(domain,n), bankVersion:BANK_VERSION, bankRevision:BANK_REVISION,
      difficulty:difficultyFor(n), source:"original-aig", ...body, d:domain
    };
  }

  function pickDistinct(pool, correct, start, count=3) {
    const out = [];
    for (let offset=0; offset<pool.length && out.length<count; offset++) {
      const candidate = String(pool[(start + offset) % pool.length]);
      if (candidate !== String(correct) && !out.includes(candidate)) out.push(candidate);
    }
    return out;
  }

  function generateVerbal() {
    const items = [];
    const analogies = [
      ["醫生","醫院","老師","學校"],
      ["廚師","廚房","法官","法院"],
      ["畫家","畫筆","木匠","鋸子"],
      ["地圖","空間","年表","時間"],
      ["種子","植物","蛋","鳥"],
      ["鑰匙","開鎖","剪刀","剪裁"],
      ["溫度計","溫度","尺","長度"],
      ["耳朵","聽覺","眼睛","視覺"],
      ["船","海洋","火車","鐵路"],
      ["蜜蜂","蜂巢","鳥","鳥巢"],
      ["圖書館","書籍","美術館","作品"],
      ["樂譜","音樂","食譜","料理"],
      ["指南針","方向","時鐘","時間"],
      ["雨傘","遮雨","墨鏡","遮光"],
      ["根","吸收水分","葉","光合作用"],
      ["記者","報導","研究員","研究"],
      ["判決","法院","診斷","醫院"],
      ["輪胎","汽車","翅膀","飛機"],
      ["問句","答案","問題","解法"],
      ["字典","詞義","地圖","位置"]
    ];
    const wrongPool = [...new Set(analogies.map(x=>x[3]))];
    analogies.forEach((x, i) => {
      const correct = x[3];
      const distractors = pickDistinct(wrongPool, correct, i*3+2);
      const ans = uniqueOptions(correct,distractors,i);
      items.push(makeItem("語文理解",i+1,{
        type:"normal",model:"verbal-analogy",
        q:`${x[0]}：${x[1]} ＝ ${x[2]}：？`,...ans,
        e:`兩組詞使用相同關係；${x[2]} 對應「${correct}」。`
      }));
    });

    const syllables = [
      ["Luma","Neri","Pavo"],["Seki","Taro","Vima"],["Daro","Meki","Suna"],["Rivo","Kani","Leto"],
      ["Pira","Navo","Seli"],["Feno","Raki","Tuma"],["Gavi","Moro","Peki"],["Haro","Veli","Numa"],
      ["Jori","Sako","Teri"],["Kelo","Ruma","Vano"],["Mira","Palo","Seki"],["Noro","Tavi","Luma"],
      ["Ovi","Kera","Mino"],["Pelo","Savi","Reno"],["Qira","Nelo","Tavo"],["Rami","Kivo","Pena"],
      ["Soro","Mavi","Leki"],["Teno","Rivo","Kasa"],["Umi","Pera","Navi"],["Vero","Sumi","Talo"]
    ];
    syllables.forEach((x,i)=>{
      const n = i+21, [A,B,C]=x;
      const ans = uniqueOptions(
        `所有 ${A} 都是 ${C}`,
        [`所有 ${C} 都是 ${A}`,`有些 ${A} 不是 ${C}`,`沒有任何 ${A} 是 ${C}`],
        n
      );
      items.push(makeItem("語文理解",n,{
        type:"normal",model:"verbal-syllogism-2",
        q:`所有 ${A} 都是 ${B}；所有 ${B} 都是 ${C}。哪一項一定成立？`,
        ...ans,
        e:`集合包含具有傳遞性：${A} ⊆ ${B} 且 ${B} ⊆ ${C}，因此 ${A} ⊆ ${C}。`
      }));
    });

    const hardNames = [
      ["Aro","Beni","Cavo","Deri"],["Elo","Fari","Guno","Havi"],["Iro","Jena","Kumo","Lari"],
      ["Meno","Navi","Oro","Peli"],["Qaro","Reni","Savo","Teri"],["Ulo","Vari","Weno","Xari"],
      ["Yaro","Zeni","Boro","Celi"],["Davo","Eri","Funo","Gali"],["Heno","Ivi","Jaro","Keli"],
      ["Lavo","Meri","Nuno","Oali"]
    ];
    hardNames.forEach((x,i)=>{
      const n=i+41,[A,B,C,D]=x;
      const ans=uniqueOptions(
        `沒有任何 ${A} 是 ${D}`,
        [`所有 ${D} 都是 ${A}`,`有些 ${A} 是 ${D}`,`所有 ${A} 都是 ${D}`],
        n
      );
      items.push(makeItem("語文理解",n,{
        type:"normal",model:"verbal-syllogism-3",
        q:`所有 ${A} 都是 ${B}；所有 ${B} 都是 ${C}；沒有任何 ${C} 是 ${D}。哪一項一定成立？`,
        ...ans,
        e:`${A} 必然屬於 ${C}，而 ${C} 與 ${D} 不重疊，所以 ${A} 不可能是 ${D}。`
      }));
    });
    return items;
  }

  function generateFluid() {
    const items=[];
    const symbols=["●","■","▲","◆","○","□","△","◇","★","✦"];

    for(let n=1;n<=20;n++){
      const k=n-1, family=Math.floor(k/10), idx=k%10;
      const s1=symbols[idx], s2=symbols[(idx+3+family)%10], s3=symbols[(idx+6+family*2)%10];
      const a=family===0?1:2, b=2, c=a+b;
      const row=(s)=>[s.repeat(a),s.repeat(b),s.repeat(c)];
      const cells=[...row(s1),...row(s2),s3.repeat(a),s3.repeat(b),"?"];
      const correct=s3.repeat(c);
      const ans=uniqueOptions(correct,[s3.repeat(Math.max(1,c-1)),s3.repeat(c+1),s3.repeat(c+2)],n);
      items.push(makeItem("流體推理",n,{
        type:"matrix",model:"matrix-symbol-addition",
        q:"觀察 3×3 矩陣；每列使用相同規則。缺失格應為？",
        cells,...ans,
        e:`每列第三格的符號數量＝前兩格相加，因此 ${a}+${b}=${c}。`
      }));
    }

    for(let n=21;n<=40;n++){
      const k=n-21, x=1+(k%5), y=2+2*Math.floor(k/5);
      const r1=[x,y,x+y], r2=[x+1,y+2,x+y+3], r3=[x+2,y+4,"?"];
      const correct=(x+2)+(y+4), ans=numericOptions(correct,n,1+(k%3));
      items.push(makeItem("流體推理",n,{
        type:"matrix",model:"matrix-row-sum",
        q:"觀察數字矩陣；每一列第三格遵循相同規則。缺失值是多少？",
        cells:[...r1,...r2,...r3].map(String),...ans,
        e:`每列第三格＝前兩格相加，所以 ${x+2}+${y+4}=${correct}。`
      }));
    }

    for(let n=41;n<=50;n++){
      const k=n-41, x=2+(k%5), y=3+2*Math.floor(k/5)+(k%2), plusFirst=k%2===0;
      const f=(a,b)=>a*b+(plusFirst?a:b);
      const r1=[x,y,f(x,y)], r2=[x+1,y+1,f(x+1,y+1)], r3=[x+2,y+2,"?"];
      const correct=f(x+2,y+2), ans=numericOptions(correct,n,2+(k%3));
      items.push(makeItem("流體推理",n,{
        type:"matrix",model:plusFirst?"matrix-product-plus-first":"matrix-product-plus-second",
        q:"這個數字矩陣使用兩步規則。找出缺失值。",
        cells:[...r1,...r2,...r3].map(String),...ans,
        e:plusFirst
          ? `每列第三格＝第一格×第二格＋第一格，所以答案是 ${x+2}×${y+2}+${x+2}=${correct}。`
          : `每列第三格＝第一格×第二格＋第二格，所以答案是 ${x+2}×${y+2}+${y+2}=${correct}。`
      }));
    }
    return items;
  }

  function generateSpatial(){
    const items=[], dirs=["↑","↗","→","↘","↓","↙","←","↖"];
    const dirName=["北","東北","東","東南","南","西南","西","西北"];
    const rot=(idx,steps)=>((idx+steps)%8+8)%8;
    const dirOptions=(correct,candidates,seed)=>{
      const pool=[...new Set([...candidates,...dirs])];
      return uniqueOptions(correct,pickDistinct(pool,correct,0),seed);
    };

    for(let n=1;n<=20;n++){
      const k=n-1, start=k%8, band=Math.floor(k/8);
      const angle=[45,90,135][band];
      const clockwise=((k+band)%2===0);
      const steps=(angle/45)*(clockwise?1:-1);
      const correct=dirs[rot(start,steps)];
      const ans=dirOptions(correct,[dirs[rot(start,steps+1)],dirs[rot(start,steps-1)],dirs[rot(start,steps+4)]],n);
      items.push(makeItem("視覺空間",n,{
        type:"normal",model:"spatial-single-rotation",
        q:`箭頭 ${dirs[start]} ${clockwise?"順時針":"逆時針"}旋轉 ${angle}° 後會指向哪裡？`,
        visual:`${dirs[start]}   ${clockwise?"↻":"↺"} ${angle}°   ?`,
        ...ans,e:`從${dirName[start]}方向旋轉 ${angle}°，結果是 ${correct}。`
      }));
    }

    for(let n=21;n<=40;n++){
      const k=n-20, start=(k*5)%8;
      const step1=[1,2,3,4][k%4]*(k%2?1:-1);
      const step2=[1,2,3][k%3]*(k%3===0?-1:1);
      const correct=dirs[rot(start,step1+step2)];
      const ans=dirOptions(correct,[dirs[rot(start,step1)],dirs[rot(start,step2)],dirs[rot(start,step1+step2+2)]],n);
      const text1=`${step1>0?"順時針":"逆時針"} ${Math.abs(step1)*45}°`;
      const text2=`${step2>0?"順時針":"逆時針"} ${Math.abs(step2)*45}°`;
      items.push(makeItem("視覺空間",n,{
        type:"normal",model:"spatial-compound-rotation",
        q:`箭頭 ${dirs[start]} 先${text1}，再${text2}。最後方向是？`,
        visual:`${dirs[start]}  →  ${text1}  →  ${text2}  →  ?`,
        ...ans,e:`把兩次旋轉合併後，最後方向為 ${correct}。`
      }));
    }

    for(let n=41;n<=50;n++){
      const k=n-41, start=k%8, mirrored=(8-start)%8;
      const rotateSteps=k<8?2:3;
      const correct=dirs[rot(mirrored,rotateSteps)];
      const ans=dirOptions(correct,[dirs[mirrored],dirs[rot(start,rotateSteps)],dirs[rot(mirrored,-rotateSteps)]],n);
      items.push(makeItem("視覺空間",n,{
        type:"normal",model:"spatial-mirror-rotate",
        q:`箭頭 ${dirs[start]} 先做左右鏡像，再順時針旋轉 ${rotateSteps*45}°。最後是哪個方向？`,
        visual:`${dirs[start]}  →  左右鏡像  →  ↻ ${rotateSteps*45}°  →  ?`,
        ...ans,e:`左右鏡像後先得到 ${dirs[mirrored]}，再順時針旋轉 ${rotateSteps*45}°，得到 ${correct}。`
      }));
    }
    return items;
  }

  function digitSequence(len,seed){
    const base=["1","2","3","4","5","6","7","8","9"];
    const coprimeSteps=[1,2,4,5,7,8];
    const k=((seed-1)%54+54)%54;
    const start=k%9;
    const step=coprimeSteps[Math.floor(k/9)];
    return Array.from({length:len},(_,i)=>base[(start+i*step)%9]);
  }

  function generateMemory(){
    const items=[];
    for(let n=1;n<=20;n++){
      const len=n%2===0?5:4, seq=digitSequence(len,n);
      let correct,q,model;
      if(n%2===0){
        correct=[...seq].reverse(); q="把剛才的數字倒序。"; model="memory-reverse";
      } else {
        correct=[...seq].sort((a,b)=>Number(a)-Number(b)); q="把剛才的數字由小到大排列。"; model="memory-sort";
      }
      const ans=sequenceOptions(correct,n);
      items.push(makeItem("工作記憶",n,{type:"memory",model,stim:seq.join(" "),q,...ans,e:`正確結果為 ${correct.join(" ")}。`}));
    }

    const letters=["K","R","M","T","Q","P","L","N","S","V","D","F"];
    for(let n=21;n<=40;n++){
      const k=n-20, ds=digitSequence(3,k+20), ls=rotateArray(letters,k).slice(0,3);
      const mix=[ls[0],ds[0],ls[1],ds[1],ls[2],ds[2]];
      let correct,q,model;
      if(k%2===0){
        correct=ls; q="只取出剛才的字母，保持原順序。"; model="memory-extract-letters";
      } else {
        correct=[...ds].sort((a,b)=>Number(b)-Number(a)); q="只取出剛才的數字，並由大到小排列。"; model="memory-extract-sort";
      }
      const ans=sequenceOptions(correct,n);
      items.push(makeItem("工作記憶",n,{type:"memory",model,stim:mix.join(" "),q,...ans,e:`正確結果為 ${correct.join(" ")}。`}));
    }

    for(let n=41;n<=50;n++){
      const k=n-40, seq=digitSequence(8,k+40);
      const chosen=(k%2===0?[1,3,5,7]:[0,2,4,6]).map(i=>seq[i]);
      let correct,q,model;
      if(k%2===0){
        correct=[...chosen].reverse(); q="取出第 2、4、6、8 個數字，再反向排列。"; model="memory-select-reverse";
      } else {
        correct=[...chosen].sort((a,b)=>Number(a)-Number(b)); q="取出第 1、3、5、7 個數字，再由小到大排列。"; model="memory-select-sort";
      }
      const ans=sequenceOptions(correct,n);
      items.push(makeItem("工作記憶",n,{type:"memory",model,stim:seq.join(" "),q,...ans,e:`依指定位置處理後，正確結果為 ${correct.join(" ")}。`}));
    }
    return items;
  }

  function targetString(length,seed){
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s="",x=(seed*17+11)%chars.length;
    for(let i=0;i<length;i++){s+=chars[x];x=(x+7+seed%5)%chars.length;}
    return s;
  }

  function mutateAt(s,pos,seed){
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",cur=s[pos];
    let idx=(chars.indexOf(cur)+1+seed)%chars.length,repl=chars[idx];
    if(repl===cur) repl=chars[(idx+1)%chars.length];
    return s.slice(0,pos)+repl+s.slice(pos+1);
  }

  function generateSpeed(){
    const items=[],symbols=["△","○","□","◇","◆","●","■","▲","✦","★"];
    for(let n=1;n<=50;n++){
      const diff=difficultyFor(n), limit=diff==="easy"?15:diff==="medium"?12:9;
      if(n%2===0){
        const len=diff==="easy"?4:diff==="medium"?5:6;
        const target=targetString(len,n), correctPos=n%4, candidates=[];
        let d=0;
        for(let i=0;i<4;i++){
          if(i===correctPos) candidates.push(target);
          else { candidates.push(mutateAt(target,(n+d)%len,d+1)); d++; }
        }
        items.push(makeItem("處理速度",n,{
          type:"speed",model:"speed-target-match",limit,
          q:"找出與目標完全相同的字串。",
          visual:`目標：${target}\n${candidates.join("   ")}`,
          o:["第 1 個","第 2 個","第 3 個","第 4 個"],a:correctPos,
          e:`第 ${correctPos+1} 個與目標 ${target} 完全相同。`
        }));
      } else {
        const k=Math.floor((n-1)/2), start=k%10, step=1+Math.floor(k/10);
        const triplet=[symbols[start],symbols[(start+step)%10],symbols[(start+2*step)%10]];
        const normal=triplet.join(""), odd=[triplet[0],triplet[2],triplet[1]].join("");
        const correctPos=k%4, groups=Array(4).fill(normal); groups[correctPos]=odd;
        items.push(makeItem("處理速度",n,{
          type:"speed",model:"speed-odd-group",limit,
          q:"哪一組符號和其他三組不同？",
          visual:groups.join("   "),
          o:["第 1 組","第 2 組","第 3 組","第 4 組"],a:correctPos,
          e:`第 ${correctPos+1} 組交換了後兩個符號，與其他三組不同。`
        }));
      }
    }
    return items;
  }

  function generateQuant(){
    const items=[];
    for(let n=1;n<=20;n++){
      if(n%2===0){
        const pct=[10,20,25,30,40][n%5], amount=100+25*n, correct=amount*pct/100;
        const ans=numericOptions(correct,n,5);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-percent",q:`${amount} 的 ${pct}% 是多少？`,...ans,e:`${amount} × ${pct/100} = ${correct}。`}));
      } else {
        const each=3+(n%7), boxes=2+(n%6), correct=each*boxes;
        const ans=numericOptions(correct,n,each);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-multiplicative",q:`每盒有 ${each} 個零件，${boxes} 盒共有幾個？`,...ans,e:`${each} × ${boxes} = ${correct}。`}));
      }
    }

    for(let n=21;n<=40;n++){
      const k=n-20;
      if(k%2===0){
        const start=2+(k%5),d=1+(k%4),seq=[start];
        let inc=d;
        for(let i=0;i<4;i++){seq.push(seq[seq.length-1]+inc);inc++;}
        const correct=seq[seq.length-1]+inc,ans=numericOptions(correct,n,1);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-growing-difference",q:`${seq.join(", ")}, ?`,...ans,e:`相鄰差值從 +${d} 開始，每次增加 1；下一個差值是 +${inc}，所以答案為 ${correct}。`}));
      } else {
        const a=2+(k%4),b=3+(k%5),mult=2+(k%4),B=b*mult,correct=a*mult,ans=numericOptions(correct,n,a);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-ratio",q:`若 A:B = ${a}:${b}，而 B = ${B}，A =？`,...ans,e:`比例同乘 ${mult}，所以 A = ${a}×${mult} = ${correct}。`}));
      }
    }

    for(let n=41;n<=50;n++){
      const k=n-40;
      if(k%2===0){
        const start=2+(k%3),c=1+(k%4),seq=[start];
        for(let i=0;i<4;i++)seq.push(seq[seq.length-1]*2+c);
        const correct=seq[seq.length-1]*2+c,ans=numericOptions(correct,n,2+c);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-recurrence",q:`${seq.join(", ")}, ?`,...ans,e:`每一步都是 ×2 + ${c}，因此下一項為 ${seq[seq.length-1]}×2+${c}=${correct}。`}));
      } else {
        const a=2+(k%4),b=3+(k%4),c=4+(k%5),A=2*a,C=c,correct=`${A}:${C}`;
        const ans=uniqueOptions(correct,[`${a}:${C}`,`${A}:${C+1}`,`${A+1}:${C}`],n);
        items.push(makeItem("量化推理",n,{type:"normal",model:"quant-chain-ratio",q:`若 A:B = ${a}:${b}，且 B:C = ${2*b}:${c}，則 A:C =？`,...ans,e:`把第一個比例的 B 放大成 ${2*b}，得到 A:B=${2*a}:${2*b}，所以 A:C=${correct}。`}));
      }
    }
    return items;
  }

  const fullBank=[
    ...generateVerbal(),...generateFluid(),...generateSpatial(),
    ...generateMemory(),...generateSpeed(),...generateQuant()
  ];

  function taskSignature(q){
    return JSON.stringify([
      q.d,q.model,q.q,
      q.cells||null,
      q.visual||null,
      q.stim||null
    ]);
  }

  function validateBank(bank){
    const errors=[],ids=new Set(),signatures=new Map();
    if(bank.length!==300)errors.push(`expected 300 items, got ${bank.length}`);

    for(const q of bank){
      if(ids.has(q.id))errors.push(`duplicate id ${q.id}`);
      ids.add(q.id);

      if(!DOMAIN_ORDER.includes(q.d))errors.push(`invalid domain ${q.id}`);
      if(!["easy","medium","hard"].includes(q.difficulty))errors.push(`invalid difficulty ${q.id}`);
      if(!Array.isArray(q.o)||q.o.length!==4)errors.push(`invalid options ${q.id}`);
      if(!Number.isInteger(q.a)||q.a<0||q.a>3)errors.push(`invalid answer ${q.id}`);
      if(Array.isArray(q.o)&&new Set(q.o.map(String)).size!==4)errors.push(`duplicate options ${q.id}`);
      if(Array.isArray(q.o)&&q.o[q.a] == null)errors.push(`answer does not resolve ${q.id}`);
      if(q.type==="matrix"&&(!Array.isArray(q.cells)||q.cells.length!==9))errors.push(`invalid matrix ${q.id}`);
      if(q.d==="處理速度"){
        if(!(Number(q.limit)>0))errors.push(`speed item missing limit ${q.id}`);
      } else if(q.limit!=null){
        errors.push(`non-speed item unexpectedly timed ${q.id}`);
      }

      const sig=taskSignature(q);
      if(signatures.has(sig)) errors.push(`duplicate task signature ${signatures.get(sig)} / ${q.id}`);
      else signatures.set(sig,q.id);
    }

    for(const domain of DOMAIN_ORDER){
      const group=bank.filter(q=>q.d===domain);
      const counts={
        easy:group.filter(q=>q.difficulty==="easy").length,
        medium:group.filter(q=>q.difficulty==="medium").length,
        hard:group.filter(q=>q.difficulty==="hard").length
      };
      if(group.length!==50)errors.push(`${domain} expected 50, got ${group.length}`);
      if(counts.easy!==20||counts.medium!==20||counts.hard!==10){
        errors.push(`${domain} difficulty mismatch ${JSON.stringify(counts)}`);
      }
    }
    return {ok:errors.length===0,errors,total:bank.length,uniqueTaskSignatures:signatures.size};
  }

  const validation=validateBank(fullBank);
  if(!validation.ok)console.error("Question Bank v3.1 validation failed",validation.errors);

  function shuffle(items){
    const arr=[...items];
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function readHistory(){
    try{
      const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
      return Array.isArray(parsed)?parsed.filter(Array.isArray).slice(-RECENT_FORM_LIMIT):[];
    }catch{return [];}
  }

  function readCycleSeen(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CYCLE_KEY)||"[]");
      return Array.isArray(parsed)?new Set(parsed):new Set();
    }catch{return new Set();}
  }

  const history=readHistory(),recentIds=new Set(history.flat()),cycleSeen=readCycleSeen();

  function pickTier(pool,difficulty,count){
    const tier=pool.filter(q=>q.difficulty===difficulty);
    const unseen=shuffle(tier.filter(q=>!cycleSeen.has(q.id)));
    const seenButNotRecent=shuffle(tier.filter(q=>cycleSeen.has(q.id)&&!recentIds.has(q.id)));
    const recent=shuffle(tier.filter(q=>recentIds.has(q.id)));
    return [...unseen,...seenButNotRecent,...recent].slice(0,count);
  }

  function pickForDomain(domain){
    const pool=fullBank.filter(q=>q.d===domain),picked=[];
    for(const [difficulty,count] of Object.entries(FORM_PLAN)){
      picked.push(...pickTier(pool,difficulty,count));
    }
    return shuffle(picked);
  }

  const selected=DOMAIN_ORDER.flatMap(pickForDomain),selectedIds=selected.map(q=>q.id);
  try{
    localStorage.setItem(HISTORY_KEY,JSON.stringify([...history,selectedIds].slice(-RECENT_FORM_LIMIT)));
    const nextCycle=new Set([...cycleSeen,...selectedIds]);
    localStorage.setItem(CYCLE_KEY,JSON.stringify(nextCycle.size>=fullBank.length?[]:[...nextCycle]));
  }catch{}

  window.IQ_QUESTION_BANK=fullBank;
  window.IQ_QUESTIONS=selected;
  window.IQ_BANK_VALIDATION=validation;
  window.IQ_BANK_META={
    version:BANK_VERSION,revision:BANK_REVISION,totalItems:fullBank.length,
    selectedItems:selected.length,domains:DOMAIN_ORDER.length,
    itemsPerDomain:5,itemsPerDomainInBank:50,
    bankDifficulty:{easy:20,medium:20,hard:10},
    formDifficulty:FORM_PLAN,difficultyLabels:DIFFICULTY_LABEL,
    recentFormAvoidance:RECENT_FORM_LIMIT,
    coverageCycleItems:fullBank.length,
    generation:"controlled-original-item-models",
    calibrationStatus:"uncalibrated",
    duplicateTaskGuard:true
  };

  window.addEventListener("load",()=>{
    const restart=document.getElementById("restartBtn");
    if(restart){
      restart.textContent="抽新題再測";
      restart.onclick=()=>window.location.reload();
    }
  });
})();
