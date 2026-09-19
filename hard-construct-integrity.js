// Cognitive IQ Lab — Hard Construct Integrity v2
(() => {
  'use strict';
  const bank=Array.isArray(window.IQ_QUESTION_BANK)?window.IQ_QUESTION_BANK:[];
  const selected=Array.isArray(window.IQ_QUESTIONS)?window.IQ_QUESTIONS:[];
  if(!bank.length)return;
  const VERSION='HCI-2026.09.2',report={version:VERSION,total:0,families:{}};
  const mod=(n,m)=>((n%m)+m)%m;
  const idx=q=>{const m=String(q.id||'').match(/-(\d{3})$/);return m?Number(m[1])-1:0;};
  const variant=q=>Math.max(0,Number(q.constructVariant||1)-1);
  const mark=(q,r)=>{q.hardIntegrityReason=r;report.total++;report.families[q.taskFamily]=(report.families[q.taskFamily]||0)+1;};
  const svg=(inner,label)=>`<svg class="qb5-spatial-svg" font-size="13" viewBox="0 0 360 220" width="360" height="220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  function install(q,c,wrong,reason){const target=Number.isInteger(q.a)&&q.a>=0&&q.a<4?q.a:0,C=String(c),W=[],seen=new Set([C]);for(const x of wrong){const s=String(x);if(!seen.has(s)){seen.add(s);W.push(s);}}if(W.length<3)throw new Error(`hard integrity: insufficient distractors for ${q.id}`);const out=[];let wi=0;for(let i=0;i<4;i++)out.push(i===target?C:W[wi++]);q.o=out;q.a=target;q.correctContent=C;mark(q,reason);}
  const installNum=(q,c,r,step=1)=>install(q,c,[c-step,c+step,c+2*step],r);
  const digitSum=x=>String(Math.abs(x)).split('').reduce((s,d)=>s+Number(d),0);
  function residues(c,d){const out=[];for(let k=1;out.length<3&&k<d+4;k++)for(const x of [mod(c-k,d),mod(c+k,d)])if(x!==c&&!out.includes(x)){out.push(x);if(out.length===3)break;}return out;}
  function choose(start,pred){for(let k=0;k<100;k++){const x=10+mod(start+k*7,90);if(pred(x))return x;}throw new Error('hard integrity: numeric candidate');}

  function machine(q,n,v){
    if(v===6){
      const x=3+mod(n*2,9),a=2+mod(n,3),b=2+mod(n+v,5),d=1+mod(n,4),y=a*x+b,z=2*y-d;
      q.q=`某個整數 X 先算 Y = ${a}X + ${b}，再算 Z = 2Y − ${d}。已知最後 Z = ${z}，X 是多少？`;
      q.e=`先反推 Y=(${z}+${d})÷2=${y}，再由 ${a}X+${b}=${y} 得 X=${x}。`;
      install(q,x,[x+1,x+2,x+3],'hard-machine-reverse-two-stage');
    }else if(v===7){
      const x=4+mod(n,8),b=1+mod(n,5),d=2+mod(n,4);
      const out=value=>{const y=value+b;return y%2===0?y/2+d:2*y-d;};
      const z=out(x),wrong=[];
      for(let k=1;wrong.length<3&&k<12;k++)for(const cand of [x-k,x+k])if(cand>0&&cand!==x&&out(cand)!==z&&!wrong.includes(cand)){wrong.push(cand);if(wrong.length===3)break;}
      q.q=`某個正整數 X 先令 Y = X + ${b}；若 Y 為偶數，結果為 Y ÷ 2 + ${d}；若 Y 為奇數，結果為 2Y − ${d}。已知最後結果是 ${z}，下列哪個 X 符合？`;
      q.e=`把候選值先轉成 Y，再依 Y 的奇偶套用不同分支；只有 X=${x} 會得到 ${z}。`;
      install(q,x,wrong,'hard-machine-branch-inference');
    }
  }
  function fluidOrder(q,n,v){
    if(v!==6&&v!==7)return;
    const start=65+mod(n,18),labels=Array.from({length:5},(_,i)=>String.fromCharCode(start+i));
    const [A,B,C,D,E]=labels,correct=labels.join(' → ');
    let prompt,wrong,reason;
    if(v===6){
      prompt=`${labels.join('、')} 要排成第 1 到第 5。已知：${A} 緊接在 ${B} 前面；${C} 緊接在 ${D} 前面；${C} 位於正中間（第 3）。哪個順序符合全部條件？`;
      wrong=[
        [B,A,C,D,E],
        [C,D,A,B,E],
        [A,B,C,E,D]
      ].map(x=>x.join(' → '));
      q.e=`${C} 固定在第 3，因此 ${D} 在第 4；剩下前兩格只能放相鄰的 ${A}、${B}，最後留下 ${E}，所以順序是 ${correct}。`;
      reason='hard-ordering-block-and-position';
    }else{
      prompt=`${labels.join('、')} 要排成第 1 到第 5。已知：${A} 在 ${B} 前；${A} 與 ${C} 中間恰好隔 1 個位置；${A} 不與 ${D} 相鄰；${C} 與 ${E} 中間也恰好隔 1 個位置。哪個順序符合全部條件？`;
      wrong=[
        [A,C,B,D,E],
        [B,A,C,D,E],
        [A,B,C,E,D]
      ].map(x=>x.join(' → '));
      q.e=`把兩個「相隔一格」條件一起定位，再套用 ${A} 在 ${B} 前且 ${A} 不鄰 ${D}，唯一符合的是 ${correct}。`;
      reason='hard-ordering-distance-constraints';
    }
    q.q=prompt;install(q,correct,wrong,reason);
  }

  function codeDeduction(q,n,v){
    if(v===6){
      const a=4+mod(n,9),b=7+mod(n*2,8),c=10+mod(n*3,7);
      const ab=a+b,bc=b+c,ac=a+c;
      q.q=`每個字各代表一個固定整數，兩字並列表示兩個數值相加。已知「山河」=${ab}、「河風」=${bc}、「山風」=${ac}。請問「風」代表多少？`;
      q.e=`把「河風」與「山風」相加，再減去「山河」，得到 2×風=${bc}+${ac}−${ab}=${2*c}，所以風=${c}。`;
      install(q,c,[c+1,c+2,c+3],'hard-code-pair-sum-system');
    }else if(v===7){
      const a=5+mod(n,8),b=8+mod(n*3,7),cc=11+mod(n*2,9),d=6+mod(n*5,8),target=b+cc;
      const s1=a+b+cc,s2=b+cc+d,s3=a+d;
      q.q=`每個字各代表一個固定整數，並列表示相加。已知「山河風」=${s1}、「河風月」=${s2}、「山月」=${s3}。請問「河風」的數值是多少？`;
      q.e=`前兩式相加後減去「山月」，山與月會抵消，得到 2×(河+風)=${s1}+${s2}−${s3}=${2*target}，所以河+風=${target}。`;
      install(q,target,[target-2,target+2,target+4],'hard-code-triple-sum-elimination');
    }
  }

  function overlap(q,n,v){const I=3+mod(n,5),A=12+mod(n*2,8),B=10+mod(n*3,8),U=A+B-I;if(v===6){q.q=`至少選一項的共有 ${U} 人；選 B 的有 ${B} 人，其中兩項都選的有 ${I} 人。選 A 的總共有多少人？`;q.e=`A=${U}−${B}+${I}=${A}。`;installNum(q,A,'hard-set-overlap-inverse');}else if(v===7){const neither=4+mod(n,5),T=U+neither,c=B-I;q.q=`共有 ${T} 人。${neither} 人兩項都沒選；選 A 的有 ${A} 人；兩項都選的有 ${I} 人。只選 B 的有多少人？`;q.e=`至少選一項有 ${T}−${neither}=${U} 人，只選 B=${U}−${A}=${c}。`;installNum(q,c,'hard-set-overlap-neither');}}
  function invariant(q,n,v){if(v===6){const A=14+mod(n,8),B=9+mod(n*2,7),k=2+mod(n,4),r=2+mod(n,3),add=1+mod(n*3,5),c=A+B-r+add;q.q=`甲盒原有 ${A} 顆、乙盒原有 ${B} 顆。甲先把 ${k} 顆移到乙盒。接著丁從乙盒拿走 ${r} 顆，這 ${r} 顆離開甲、乙兩盒且不再放回；之後丁從甲、乙兩盒之外另外拿 ${add} 顆新的放進甲盒。最後甲、乙兩盒合計共有多少顆？`;q.e=`甲移給乙只是兩盒內部轉移，總數不變；丁拿走 ${r} 顆後再加入 ${add} 顆新的，所以 ${A+B}−${r}+${add}=${c}。`;installNum(q,c,'hard-invariant-net-change');}else if(v===7){const A=11+mod(n,8),B=8+mod(n*2,7),C=6+mod(n*3,6),k=1+mod(n,4),m=1+mod(n*2,3),r=2+mod(n,3),add=2+mod(n*4,4),c=A+B+C-r+add;q.q=`甲、乙、丙三盒原本分別有 ${A}、${B}、${C} 顆。甲把 ${k} 顆移到乙盒，乙再把 ${m} 顆移到丙盒。之後丁從丙盒拿走 ${r} 顆，這 ${r} 顆離開甲、乙、丙三盒且不再放回；接著丁從三盒之外另外拿 ${add} 顆新的放進乙盒。最後甲、乙、丙三盒合計共有多少顆？`;q.e=`甲→乙、乙→丙都只是三盒內部轉移，總數不變；丁拿走 ${r} 顆，再加入 ${add} 顆新的，所以 ${A+B+C}−${r}+${add}=${c}。`;installNum(q,c,'hard-invariant-three-container');}}
  function pairing(q,n,v){if(v===6){const R=8+mod(n,7),B=5+mod(n*2,6),C=3+mod(n,5),c=Math.min(Math.floor(R/2),B,C);q.q=`每隊需要 2 名紅組、1 名藍組，且每隊必須有 1 位教練。現有紅組 ${R} 人、藍組 ${B} 人、教練 ${C} 位。最多能組幾隊？`;q.e=`上限是 ${Math.floor(R/2)}、${B}、${C}，取最小值得 ${c}。`;installNum(q,c,'hard-pairing-three-resource');}else if(v===7){const A=10+mod(n,9),B=12+mod(n*2,10),S=3+mod(n,5),c=Math.min(Math.floor(A/2),Math.floor(B/3),S);q.q=`每包需要 2 個 A 零件、3 個 B 零件，並占用 1 個工作站。現有 A ${A} 個、B ${B} 個、工作站 ${S} 個。最多能同時組出幾包？`;q.e=`三個上限為 ${Math.floor(A/2)}、${Math.floor(B/3)}、${S}，瓶頸是 ${c}。`;installNum(q,c,'hard-pairing-multi-capacity');}}
  function parity(q,n,v){const s18=mod(n,18);if(v===6){const c=21+2*s18,s=digitSum(c),w=[];for(let x=10;x<100&&w.length<3;x++)if(x!==c&&!(x%2===1&&digitSum(x)===s))w.push(x);q.q=`哪個兩位數同時符合「奇數」且「十位數＋個位數＝${s}」？`;q.e=`${c} 同時符合兩個條件。`;install(q,c,w,'hard-speed-dual-number-filter');}else if(v===7){const c=20+4*s18,d=Math.abs(Math.floor(c/10)-c%10),w=[];for(let x=10;x<100&&w.length<3;x++)if(x!==c&&!(x%4===0&&Math.abs(Math.floor(x/10)-x%10)===d))w.push(x);q.q=`哪個兩位數同時符合「可被 4 整除」且「十位數與個位數之差的絕對值＝${d}」？`;q.e=`${c} 同時符合兩個條件。`;install(q,c,w,'hard-speed-divisibility-filter');}}
  function order(q,n,v){const s18=mod(n,18);if(v===6){const d=2+s18,c=[`C${d}`,`A${d+1}`,`B${d+1}`,`D${d+2}`];q.q='依規則排序：先看數字由小到大；數字相同時，字母依英文字母順序。哪一列正確？';q.e=`正確順序為 ${c.join(' · ')}。`;install(q,c.join(' · '),[[c[0],c[2],c[1],c[3]],[c[1],c[0],c[2],c[3]],[...c].reverse()].map(x=>x.join(' · ')),'hard-speed-two-key-order');}else if(v===7){const a=2+s18,c=[`A${a+3}`,`A${a}`,`B${a+1}`,`C${a+2}`];q.q='依規則排序：先按字母 A→B→C；字母相同時，數字由大到小。哪一列正確？';q.e=`正確順序為 ${c.join(' · ')}。`;install(q,c.join(' · '),[[c[1],c[0],c[2],c[3]],[c[0],c[1],c[3],c[2]],[...c].reverse()].map(x=>x.join(' · ')),'hard-speed-hierarchical-order');}}
  function boundary(q,n,v){if(v===6){let a=120+mod(n*17,700);while(digitSum(a)%2)a++;let odd=a+1;while(digitSum(odd)%2===0)odd++;const c=`M${a}M`;q.q='哪個代碼同時符合「恰好兩個 M」且「數字部分各位數字和為偶數」？';q.e=`${c} 同時符合兩個條件。`;install(q,c,[`M${odd}M`,`M${a}N`,`MM${a}M`],'hard-speed-boundary-dual');}else if(v===7){const a=130+mod(n*19,700),c=`K${a}K`;q.q='哪個代碼同時符合「不含 R」且「首尾字母相同」？';q.e=`${c} 不含 R，且首尾相同。`;install(q,c,[`K${a}R`,`R${a}R`,`K${a}T`],'hard-speed-boundary-conjunction');}}
  function missing(q,n,v){const a=12+mod(n,20);if(v===6){const c=a+8;q.q=`找缺項：${a}、${a+2}、${a+6}、?、${a+12}（差值依序重複 +2、+4）。`;q.e=`差值為 +2、+4、+2、+4，所以缺項是 ${c}。`;installNum(q,c,'hard-speed-missing-alternating-add');}else if(v===7){const c=4*a-9;q.q=`找缺項：${a}、${2*a}、${2*a-3}、${4*a-6}、?（運算依序重複 ×2、−3）。`;q.e=`${4*a-6} 再減 3，得到 ${c}。`;installNum(q,c,'hard-speed-missing-alternating-op');}}
  function remainder(q,n,v){const s18=mod(n,18),d=7+s18,r=1+mod(5*s18+v,d-1);if(v===6){const c=mod(3*r+2,d);q.q=`整數 N 除以 ${d} 餘 ${r}。3N + 2 除以 ${d} 的餘數是多少？`;q.e=`(3×${r}+2) mod ${d}=${c}。`;install(q,c,residues(c,d),'hard-remainder-linear');}else if(v===7){const c=mod((r+1)*(r+1),d);q.q=`整數 N 除以 ${d} 餘 ${r}。(N + 1)² 除以 ${d} 的餘數是多少？`;q.e=`(${r}+1)² mod ${d}=${c}。`;install(q,c,residues(c,d),'hard-remainder-square');}}
  function scale(q,n,v){if(v!==6)return;const L=3+mod(n,7),W=2+mod(n*2,5),c=L*2*W*3;q.q=`原圖長 ${L}、寬 ${W}。長放大 2 倍、寬放大 3 倍後，新圖面積是多少？`;q.e=`新長 ${L*2}、新寬 ${W*3}，面積為 ${c}。`;q.visual=svg(`<text x="180" y="22" text-anchor="middle">雙向縮放</text><text x="78" y="48" text-anchor="middle">原圖</text><rect x="36" y="60" width="84" height="58" fill="none" stroke="currentColor" stroke-width="3"/><text x="78" y="142" text-anchor="middle">長 ${L}</text><text x="22" y="90" text-anchor="middle" transform="rotate(-90 22 90)">寬 ${W}</text><line x1="138" y1="88" x2="210" y2="88" stroke="currentColor" stroke-width="2"/><text x="174" y="65" text-anchor="middle">長×2／寬×3</text><rect x="230" y="50" width="104" height="82" fill="none" stroke="currentColor" stroke-width="3"/><text x="282" y="156" text-anchor="middle">面積 ?</text>`,'雙向縮放面積圖');installNum(q,c,'hard-scale-independent-axis',Math.max(1,L));q.diagramType='scale-drawing';q.presentationMode='spatial-diagram';}
  function mirror(q,n,v){if(v!==6)return;const s18=mod(n,18),x=2+s18,c=1+mod(s18,2),y=c+1+mod(s18*2,4),yy=2*c-y,ans=`(${-x}, ${yy})`;q.q=`點 (${x}, ${y}) 先對直線 y=${c} 鏡射，再對 y 軸鏡射。最後座標是？`;q.e=`先得到 (${x}, ${yy})，再得到 ${ans}。`;q.visual=svg(`<line x1="20" y1="110" x2="340" y2="110" stroke="currentColor" opacity=".25"/><line x1="180" y1="15" x2="180" y2="205" stroke="currentColor" stroke-width="2"/><line x1="20" y1="92" x2="340" y2="92" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5"/><text x="50" y="28">① 對 y=${c} 鏡射</text><text x="50" y="47">② 再對 y 軸鏡射</text><circle cx="270" cy="74" r="7" fill="currentColor"/><text x="280" y="66">P(${x},${y})</text>`,'兩階段座標鏡射圖');install(q,ans,[`(${x}, ${yy})`,`(${-x}, ${y})`,`(${x}, ${y})`],'hard-mirror-two-stage');q.diagramType='mirror-coordinate';q.presentationMode='spatial-diagram';}

  for(const q of bank){if(q.difficulty!=='hard')continue;const n=idx(q),v=variant(q);if(q.taskFamily==='machine-composition')machine(q,n,v);else if(q.taskFamily==='ordering-constraints')fluidOrder(q,n,v);else if(q.taskFamily==='code-deduction')codeDeduction(q,n,v);else if(q.taskFamily==='set-overlap')overlap(q,n,v);else if(q.taskFamily==='invariant-transfer')invariant(q,n,v);else if(q.taskFamily==='pairing-capacity')pairing(q,n,v);else if(q.taskFamily==='speed-parity')parity(q,n,v);else if(q.taskFamily==='speed-order')order(q,n,v);else if(q.taskFamily==='speed-boundary')boundary(q,n,v);else if(q.taskFamily==='speed-missing')missing(q,n,v);else if(q.taskFamily==='quant-remainder')remainder(q,n,v);else if(q.taskFamily==='scale-drawing')scale(q,n,v);else if(q.taskFamily==='mirror-coordinate')mirror(q,n,v);}
  let risks=0;if(window.IQ_OPTION_AUDIT?.optionCueFlags){for(const q of bank){q.optionCueFlags=window.IQ_OPTION_AUDIT.optionCueFlags(q);if(q.optionCueFlags.length)risks++;}if(window.IQ_OPTION_QUALITY_REPORT)window.IQ_OPTION_QUALITY_REPORT.cueRiskItems=risks;}
  const byId=new Map(bank.map(q=>[q.id,q]));window.IQ_QUESTIONS=selected.map(q=>byId.get(q.id)||q);
  window.IQ_HARD_CONSTRUCT_INTEGRITY=report;if(window.IQ_BANK_META){window.IQ_BANK_META.hardConstructIntegrity=VERSION;window.IQ_BANK_META.hardConstructIntegrityMode='final-hard-load-pass';}
})();