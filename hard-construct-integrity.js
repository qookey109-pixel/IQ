// Cognitive IQ Lab — Hard Construct Integrity v1
// Final production pass for hard variants whose original rule/load was too close to easy/medium work.
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;

  const VERSION='HCI-2026.09.1';
  const report={version:VERSION,total:0,families:{}};
  const mod=(n,m)=>((n%m)+m)%m;
  const itemIndex=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const mark=(q,reason)=>{q.hardIntegrityReason=reason;report.total++;report.families[q.taskFamily]=(report.families[q.taskFamily]||0)+1;};
  const svg=(inner,label)=>`<svg class="qb5-spatial-svg" font-size="13" viewBox="0 0 360 220" width="360" height="220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  function install(q,correct,wrong,reason){
    const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0,c=String(correct),outWrong=[],seen=new Set([c]);
    for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);outWrong.push(s);}}
    if(outWrong.length<3)throw new Error(`hard integrity: insufficient distractors for ${q.id}`);
    const out=[];let wi=0;for(let i=0;i<4;i++)out.push(i===target?c:outWrong[wi++]);
    q.o=out;q.a=target;q.correctContent=c;mark(q,reason);
  }
  function installNum(q,c,reason,step=1){install(q,c,[c-step,c+step,c+2*step],reason);}
  function legalResidues(c,d){const out=[];for(let delta=1;out.length<3&&delta<d+3;delta++)for(const x of [mod(c-delta,d),mod(c+delta,d)])if(x!==c&&!out.includes(x)){out.push(x);if(out.length===3)break;}return out;}
  function chooseNumber(start,pred){for(let k=0;k<100;k++){const x=10+mod(start+k*7,90);if(pred(x))return x;}throw new Error('hard integrity: no numeric candidate');}
  const digitSum=x=>String(Math.abs(x)).split('').reduce((s,d)=>s+Number(d),0);

  function machine(q,n,v){
    if(v===6){const x=3+mod(n*2,9),a=2+mod(n,3),b=2+mod(n+v,5),c=1+mod(n,4),y=a*x+b,ans=2*y-c;
      q.q=`X = ${x}。先算 Y = ${a}X + ${b}，再算 2Y − ${c}。最後結果是多少？`;q.e=`先得 Y=${a}×${x}+${b}=${y}，再算 2×${y}−${c}=${ans}。`;installNum(q,ans,'hard-machine-two-stage');
    }else if(v===7){const x=4+mod(n,8),b=1+mod(n,5),d=2+mod(n,4),y=x+b,ans=y%2===0?y/2+d:2*y-d;
      q.q=`X = ${x}。先令 Y = X + ${b}；若 Y 為偶數，算 Y ÷ 2 + ${d}，若為奇數，算 2Y − ${d}。結果是多少？`;q.e=`Y=${x}+${b}=${y}，Y 是${y%2===0?'偶':'奇'}數，因此結果為 ${ans}。`;installNum(q,ans,'hard-machine-derived-branch');}
  }

  function setOverlap(q,n,v){
    const I=3+mod(n,5),A=12+mod(n*2,8),B=10+mod(n*3,8),U=A+B-I;
    if(v===6){q.q=`某調查中，至少選一項的共有 ${U} 人；選 B 的有 ${B} 人，其中兩項都選的有 ${I} 人。選 A 的總共有多少人？`;q.e=`由 A+B−交集=聯集，所以 A=${U}−${B}+${I}=${A}。`;installNum(q,A,'hard-set-overlap-inverse-inclusion');}
    else if(v===7){const neither=4+mod(n,5),total=U+neither,onlyB=B-I;q.q=`共有 ${total} 人。${neither} 人兩項都沒選；選 A 的有 ${A} 人；兩項都選的有 ${I} 人。只選 B 的有多少人？`;q.e=`至少選一項有 ${total}−${neither}=${U} 人；只選 B=${U}−${A}=${onlyB}。`;installNum(q,onlyB,'hard-set-overlap-neither-inverse');}
  }

  function invariant(q,n,v){
    if(v===6){const A=14+mod(n,8),B=9+mod(n*2,7),k=2+mod(n,4),removed=2+mod(n,3),added=1+mod(n*3,5),ans=A+B-removed+added;
      q.q=`甲盒原有 ${A} 顆、乙盒原有 ${B} 顆。甲先移 ${k} 顆給乙，接著從乙盒取走 ${removed} 顆，最後再從外部放 ${added} 顆進甲盒。此時兩盒共有多少顆？`;q.e=`盒間移動不改變總數；只有取走 ${removed}、外加 ${added} 會改變總數，所以 ${A+B}−${removed}+${added}=${ans}。`;installNum(q,ans,'hard-invariant-internal-vs-external');}
    else if(v===7){const A=11+mod(n,8),B=8+mod(n*2,7),C=6+mod(n*3,6),k=1+mod(n,4),m=1+mod(n*2,3),removed=2+mod(n,3),added=2+mod(n*4,4),ans=A+B+C-removed+added;
      q.q=`甲、乙、丙原有 ${A}、${B}、${C} 顆。甲給乙 ${k} 顆，乙再給丙 ${m} 顆；之後從丙取走 ${removed} 顆，並從外部放 ${added} 顆進乙。最後三盒共有多少顆？`;q.e=`前兩次只在盒間移動；總數只受取走與外加影響：${A+B+C}−${removed}+${added}=${ans}。`;installNum(q,ans,'hard-invariant-three-container-net-change');}
  }

  function pairing(q,n,v){
    if(v===6){const red=8+mod(n,7),blue=5+mod(n*2,6),coach=3+mod(n,5),ans=Math.min(Math.floor(red/2),blue,coach);
      q.q=`每隊需要 2 名紅組、1 名藍組，且每隊必須有 1 位教練。現有紅組 ${red} 人、藍組 ${blue} 人、教練 ${coach} 位，每人最多參加一隊。最多能組幾隊？`;q.e=`三個上限分別是 ⌊${red}/2⌋=${Math.floor(red/2)}、${blue}、${coach}，取最小值得 ${ans} 隊。`;installNum(q,ans,'hard-pairing-three-resource');}
    else if(v===7){const A=10+mod(n,9),B=12+mod(n*2,10),stations=3+mod(n,5),ans=Math.min(Math.floor(A/2),Math.floor(B/3),stations);
      q.q=`每組工作包需要 2 個 A 零件、3 個 B 零件，並占用 1 個工作站。現有 A ${A} 個、B ${B} 個、可用工作站 ${stations} 個。最多能同時組出幾包？`;q.e=`A 可供 ${Math.floor(A/2)} 包，B 可供 ${Math.floor(B/3)} 包，工作站可供 ${stations} 包；瓶頸是 ${ans} 包。`;installNum(q,ans,'hard-pairing-multi-capacity');}
  }

  function speedParity(q,n,v){
    if(v===6){const c=chooseNumber(n*11+37,x=>x%2===1&&digitSum(x)>=6&&digitSum(x)<=15),sum=digitSum(c);const wrong=[];for(let x=10;x<100&&wrong.length<3;x++)if(x!==c&&!(x%2===1&&digitSum(x)===sum)&&Math.abs(x-c)<=18)wrong.push(x);
      q.q=`哪個兩位數同時符合「奇數」且「十位數＋個位數＝${sum}」？`;q.e=`${c} 是奇數，而且各位數字和為 ${sum}。`;install(q,c,wrong,'hard-speed-dual-number-filter');}
    else if(v===7){const c=chooseNumber(n*13+29,x=>x%4===0&&Math.abs(Math.floor(x/10)-x%10)>=2),diff=Math.abs(Math.floor(c/10)-c%10);const wrong=[];for(let x=10;x<100&&wrong.length<3;x++)if(x!==c&&!(x%4===0&&Math.abs(Math.floor(x/10)-x%10)===diff)&&Math.abs(x-c)<=24)wrong.push(x);
      q.q=`哪個兩位數同時符合「可被 4 整除」且「十位數與個位數之差的絕對值＝${diff}」？`;q.e=`${c} 可被 4 整除，且兩位數字差的絕對值為 ${diff}。`;install(q,c,wrong,'hard-speed-divisibility-digit-filter');}
  }

  function speedOrder(q,n,v){
    if(v===6){const d1=2+mod(n,5),d2=d1+1,tokens=[`B${d2}`,`C${d1}`,`A${d2}`,`D${d1+2}`],correct=[`C${d1}`,`B${d2}`,`A${d2}`,`D${d1+2}`];
      q.q='依規則排序：先看數字由小到大；數字相同時，字母依英文字母順序。哪一列正確？';q.e=`先依數字分組，再處理同數字的字母順序，得到 ${correct.join(' · ')}。`;const w1=[correct[0],correct[2],correct[1],correct[3]],w2=[correct[1],correct[0],correct[2],correct[3]],w3=[...correct].reverse();install(q,correct.join(' · '),[w1.join(' · '),w2.join(' · '),w3.join(' · ')],'hard-speed-two-key-order');}
    else if(v===7){const a=2+mod(n,4),tokens=[`A${a}`,`C${a+2}`,`A${a+3}`,`B${a+1}`],correct=[`A${a+3}`,`A${a}`,`B${a+1}`,`C${a+2}`];
      q.q='依規則排序：先按字母 A→B→C；字母相同時，數字由大到小。哪一列正確？';q.e=`先依字母分組，同字母內再由大到小，得到 ${correct.join(' · ')}。`;const w1=[correct[1],correct[0],correct[2],correct[3]],w2=[correct[0],correct[1],correct[3],correct[2]],w3=[...correct].reverse();install(q,correct.join(' · '),[w1.join(' · '),w2.join(' · '),w3.join(' · ')],'hard-speed-hierarchical-order');}
  }

  function speedBoundary(q,n,v){
    if(v===6){let a=120+mod(n*17,700);while(digitSum(a)%2!==0)a++;const odd=a+1,correct=`M${a}M`;
      q.q='哪個代碼同時符合「恰好兩個 M」且「數字部分各位數字和為偶數」？';q.e=`${correct} 恰有兩個 M，而且 ${a} 的各位數字和是偶數。`;install(q,correct,[`M${odd}M`,`M${a}N`,`MM${a}M`],'hard-speed-boundary-dual-condition');}
    else if(v===7){const a=130+mod(n*19,700),correct=`K${a}K`;q.q='哪個代碼同時符合「不含 R」且「首尾字母相同」？';q.e=`${correct} 不含 R，且首尾都是 K。`;install(q,correct,[`K${a}R`,`R${a}R`,`K${a}T`],'hard-speed-boundary-conjunction');}
  }

  function speedMissing(q,n,v){
    const a=12+mod(n,20);
    if(v===6){const c=a+8;q.q=`找缺項：${a}、${a+2}、${a+6}、?、${a+12}（差值依序重複 +2、+4）。`;q.e=`差值為 +2、+4、+2、+4，所以缺項是 ${c}。`;installNum(q,c,'hard-speed-missing-alternating-add');}
    else if(v===7){const c=4*a-9;q.q=`找缺項：${a}、${2*a}、${2*a-3}、${4*a-6}、?（運算依序重複 ×2、−3）。`;q.e=`${4*a-6} 再減 3，得到 ${c}。`;installNum(q,c,'hard-speed-missing-alternating-operation');}
  }

  function remainder(q,n,v){
    const d=7+mod(n,4),r=1+mod(n,d-2);
    if(v===6){const c=mod(3*r+2,d);q.q=`某整數 N 除以 ${d} 餘 ${r}。則 3N + 2 除以 ${d} 的餘數是多少？`;q.e=`只需追蹤餘數：(3×${r}+2) mod ${d}=${c}。`;install(q,c,legalResidues(c,d),'hard-remainder-linear-transform');}
    else if(v===7){const c=mod((r+1)*(r+1),d);q.q=`某整數 N 除以 ${d} 餘 ${r}。則 (N + 1)² 除以 ${d} 的餘數是多少？`;q.e=`N 可用餘數 ${r} 代入，所以 (${r}+1)² mod ${d}=${c}。`;install(q,c,legalResidues(c,d),'hard-remainder-square-transform');}
  }

  function scale(q,n,v){if(v!==6)return;const L=3+mod(n,7),W=2+mod(n*2,5),fx=2,fy=3,ans=L*fx*W*fy;
    q.q=`原圖長 ${L}、寬 ${W}。長放大 ${fx} 倍、寬放大 ${fy} 倍後，新圖面積是多少？`;q.e=`新長 ${L*fx}、新寬 ${W*fy}，面積 ${L*fx}×${W*fy}=${ans}。`;
    q.visual=svg(`<text x="180" y="22" text-anchor="middle">非等比例雙向縮放</text><text x="78" y="48" text-anchor="middle">原圖</text><rect x="36" y="60" width="84" height="58" fill="none" stroke="currentColor" stroke-width="3"/><text x="78" y="142" text-anchor="middle">長 ${L}</text><text x="22" y="90" text-anchor="middle" transform="rotate(-90 22 90)">寬 ${W}</text><line x1="138" y1="88" x2="210" y2="88" stroke="currentColor" stroke-width="2"/><polygon points="210,88 199,82 199,94" fill="currentColor"/><text x="174" y="64" text-anchor="middle">長 × ${fx}</text><text x="174" y="81" text-anchor="middle">寬 × ${fy}</text><rect x="230" y="50" width="104" height="82" fill="none" stroke="currentColor" stroke-width="3"/><text x="282" y="156" text-anchor="middle">面積 ?</text>`,'雙向縮放面積圖');
    installNum(q,ans,'hard-scale-independent-axis-area',Math.max(1,L));q.diagramType='scale-drawing';q.presentationMode='spatial-diagram';}

  function mirror(q,n,v){if(v!==6)return;const x=2+mod(n,5),y=1+mod(n*2,5),c=1+mod(n,2),yy=2*c-y,ans=`(${-x}, ${yy})`;
    q.q=`點 (${x}, ${y}) 先對直線 y=${c} 鏡射，再對 y 軸鏡射。最後座標是？`;q.e=`先得到 (${x}, ${yy})，再對 y 軸鏡射為 ${ans}。`;
    q.visual=svg(`<line x1="20" y1="110" x2="340" y2="110" stroke="currentColor" opacity=".25"/><line x1="180" y1="15" x2="180" y2="205" stroke="currentColor" stroke-width="2"/><line x1="20" y1="92" x2="340" y2="92" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/><circle cx="270" cy="74" r="7" fill="currentColor"/><text x="280" y="66">P(${x},${y})</text><text x="50" y="28">① 對 y=${c} 鏡射</text><text x="50" y="47">② 再對 y 軸鏡射</text>`,'兩階段座標鏡射圖');
    install(q,ans,[`(${x}, ${yy})`,`(${-x}, ${y})`,`(${x}, ${y})`],'hard-mirror-two-stage');q.diagramType='mirror-coordinate';q.presentationMode='spatial-diagram';}

  for(const q of bank){if(q.difficulty!=='hard')continue;const n=itemIndex(q),v=variant(q);
    if(q.taskFamily==='machine-composition')machine(q,n,v);
    else if(q.taskFamily==='set-overlap')setOverlap(q,n,v);
    else if(q.taskFamily==='invariant-transfer')invariant(q,n,v);
    else if(q.taskFamily==='pairing-capacity')pairing(q,n,v);
    else if(q.taskFamily==='speed-parity')speedParity(q,n,v);
    else if(q.taskFamily==='speed-order')speedOrder(q,n,v);
    else if(q.taskFamily==='speed-boundary')speedBoundary(q,n,v);
    else if(q.taskFamily==='speed-missing')speedMissing(q,n,v);
    else if(q.taskFamily==='quant-remainder')remainder(q,n,v);
    else if(q.taskFamily==='scale-drawing')scale(q,n,v);
    else if(q.taskFamily==='mirror-coordinate')mirror(q,n,v);
  }

  let cueRiskItems=0;if(window.IQ_OPTION_AUDIT?.optionCueFlags){for(const q of bank){q.optionCueFlags=window.IQ_OPTION_AUDIT.optionCueFlags(q);if(q.optionCueFlags.length)cueRiskItems++;}if(window.IQ_OPTION_QUALITY_REPORT)window.IQ_OPTION_QUALITY_REPORT.cueRiskItems=cueRiskItems;}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_HARD_CONSTRUCT_INTEGRITY=report;
  if(window.IQ_BANK_META){window.IQ_BANK_META.hardConstructIntegrity=VERSION;window.IQ_BANK_META.hardConstructIntegrityMode='final-hard-load-pass';}
})();