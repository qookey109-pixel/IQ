// Cognitive IQ Lab — Question Bank v2
// Expands the original 30-item set to 60 items, adds difficulty metadata,
// and selects a balanced 30-item form (5 items per cognitive domain) per page load.
// Retests preferentially avoid the immediately previous form.

(() => {
  const base = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  const BANK_VERSION = "QB-2026.09.2";
  const LAST_FORM_KEY = `cognitive-iq-lab:last-form:${BANK_VERSION}`;

  const DOMAIN_ORDER = ["語文理解","流體推理","視覺空間","工作記憶","處理速度","量化推理"];
  const DOMAIN_SLUG = {"語文理解":"verbal","流體推理":"fluid","視覺空間":"spatial","工作記憶":"memory","處理速度":"speed","量化推理":"quant"};
  const DIFFICULTY_LABEL = {easy:"基礎",medium:"中等",hard:"進階"};
  const baseDifficultyPattern = ["easy","easy","medium","medium","hard"];
  const perDomainIndex = Object.fromEntries(DOMAIN_ORDER.map(d => [d,0]));

  const enrichedBase = base.map(q => {
    const index = perDomainIndex[q.d] || 0;
    perDomainIndex[q.d] = index + 1;
    return {...q,id:q.id || `qb2-${DOMAIN_SLUG[q.d] || "item"}-${String(index+1).padStart(2,"0")}`,difficulty:q.difficulty || baseDifficultyPattern[index % baseDifficultyPattern.length],bankVersion:BANK_VERSION};
  });

  const extra = [
    {id:"qb2-verbal-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"語文理解",type:"normal",q:"醫生：醫院 ＝ 老師：？",o:["學校","市場","法院","車站"],a:0,e:"關係是職業與主要工作場所。"},
    {id:"qb2-verbal-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"語文理解",type:"normal",q:"所有青杉都是植物；有些植物會開花。下列哪個結論一定成立？",o:["所有青杉都會開花","有些青杉會開花","青杉是植物","沒有植物不開花"],a:2,e:"題幹直接給出所有青杉都是植物；其他敘述都無法必然推出。"},
    {id:"qb2-verbal-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"語文理解",type:"normal",q:"有些 A 是 B；沒有任何 B 是 C。下列哪個結論一定成立？",o:["所有 A 都不是 C","有些 A 不是 C","所有 C 都是 A","有些 C 是 B"],a:1,e:"既然有些 A 同時是 B，而所有 B 都不是 C，因此至少有些 A 不是 C。"},
    {id:"qb2-verbal-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"語文理解",type:"normal",q:"「節儉」最接近下列哪個意思？",o:["避免不必要的浪費","大量消費","做事很慢","拒絕任何花費"],a:0,e:"節儉指合理節省、避免不必要浪費，不等於完全不花費。"},
    {id:"qb2-verbal-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"語文理解",type:"normal",q:"地圖：空間 ＝ 年表：？",o:["人物","時間","文字","方向"],a:1,e:"地圖用來組織空間資訊；年表用來組織時間資訊。"},
    {id:"qb2-fluid-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"流體推理",type:"matrix",q:"觀察 3×3 圖形矩陣，找出最合理的缺失圖形。",cells:["●","○","●○","■","□","■□","▲","△","?"],o:["▲△","△▲","▲▲","△△"],a:0,e:"每一列第三格都由前兩格依原順序組合而成。"},
    {id:"qb2-fluid-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"流體推理",type:"matrix",q:"觀察 3×3 圖形矩陣，找出最合理的缺失圖形。",cells:["1","3","4","2","4","6","3","5","?"],o:["7","8","9","10"],a:1,e:"每一列第三格等於前兩格相加，因此 3 + 5 = 8。"},
    {id:"qb2-fluid-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"流體推理",type:"matrix",q:"觀察數字矩陣，找出缺失值。",cells:["2","3","8","3","4","15","4","5","?"],o:["20","22","24","25"],a:2,e:"每列第三格＝第一格×第二格＋第一格：2×3+2=8、3×4+3=15、4×5+4=24。"},
    {id:"qb2-fluid-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"流體推理",type:"matrix",q:"觀察 3×3 圖形矩陣，找出最合理的缺失圖形。",cells:["●","○","●","○","●","○","●","○","?"],o:["●","○","●○","○●"],a:0,e:"格子依 ●、○ 交替排列，第九格回到 ●。"},
    {id:"qb2-fluid-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"流體推理",type:"matrix",q:"每列第三格的符號數量等於前兩格數量相加，缺失格應為？",cells:["●","●●","●●●","■■","■■■","■■■■■","▲▲▲","▲▲▲▲","?"],o:["▲▲▲▲▲","▲▲▲▲▲▲","▲▲▲▲▲▲▲","▲▲▲▲▲▲▲▲"],a:2,e:"第三列為 3 + 4 = 7，所以需要 7 個三角形。"},
    {id:"qb2-spatial-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"視覺空間",type:"normal",q:"箭頭「↑」順時針旋轉 90° 後會指向哪裡？",o:["←","→","↓","↑"],a:1,e:"向上的箭頭順時針旋轉 90° 會指向右方。",visual:"↑   ↻ 90°   ?"},
    {id:"qb2-spatial-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"視覺空間",type:"normal",q:"一張紙先左右對折，再上下對折。若在折疊後紙張的外角打一個孔，完全攤開後通常會出現幾個對稱孔？",o:["1","2","4","8"],a:2,e:"兩次互相垂直的對折會形成四層對稱位置，因此攤開後通常為 4 個孔。"},
    {id:"qb2-spatial-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"視覺空間",type:"matrix",q:"觀察角形旋轉規律，找出缺失圖形。",cells:["┌","┐","┘","┐","┘","└","┘","└","?"],o:["┌","┐","┘","└"],a:0,e:"每往右一格都順時針旋轉 90°；每往下一格同樣前進一個旋轉位置，因此最後回到 ┌。"},
    {id:"qb2-spatial-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"視覺空間",type:"normal",q:"箭頭「↗」做左右鏡像後最接近哪一個？",o:["↖","↘","↗","↙"],a:0,e:"左右鏡像會交換水平方向，因此右上變成左上。",visual:"↗   │鏡面│   ?"},
    {id:"qb2-spatial-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"視覺空間",type:"normal",q:"某正方體的相對面配對為 A–D、B–E、C–F。若 A 面朝上，哪一面一定朝下？",o:["B","C","D","F"],a:2,e:"題目已指定 A 與 D 為相對面，所以 A 朝上時 D 必定朝下。"},
    {id:"qb2-memory-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"工作記憶",type:"memory",stim:"4 1 7 3",q:"選出剛才的數字由大到小排列。",o:["7 4 3 1","7 3 4 1","4 7 3 1","1 3 4 7"],a:0,e:"4、1、7、3 由大到小為 7、4、3、1。"},
    {id:"qb2-memory-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"工作記憶",type:"memory",stim:"P 6 R 2 T 8",q:"選出剛才所有字母，保持原順序。",o:["P R T","T R P","P T R","R P T"],a:0,e:"原序列中的字母依序是 P、R、T。"},
    {id:"qb2-memory-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"工作記憶",type:"memory",stim:"8 3 1 7 4 9 2 6",q:"取出第 2、4、6、8 個數字，再反向排列。",o:["6 9 7 3","3 7 9 6","6 2 9 7","9 7 3 6"],a:0,e:"第 2、4、6、8 個是 3、7、9、6，反向後為 6、9、7、3。"},
    {id:"qb2-memory-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"工作記憶",type:"memory",stim:"6 2 9 4 3",q:"剛才第一個數字與最後一個數字相加是多少？",o:["7","8","9","10"],a:2,e:"第一個是 6，最後一個是 3，所以 6 + 3 = 9。"},
    {id:"qb2-memory-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"工作記憶",type:"memory",stim:"A 4 C 9 B 2",q:"只取出數字並由大到小排列。",o:["9 4 2","9 2 4","4 9 2","2 4 9"],a:0,e:"序列中的數字是 4、9、2，由大到小為 9、4、2。"},
    {id:"qb2-speed-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"處理速度",type:"speed",limit:15,q:"找出與目標 X7M4 完全相同的字串。",visual:"目標：X7M4\nX7N4   X7M4   XTM4   X7M9",o:["第 1 個","第 2 個","第 3 個","第 4 個"],a:1,e:"第 2 個與目標 X7M4 完全相同。"},
    {id:"qb2-speed-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"處理速度",type:"speed",limit:12,q:"哪一組符號和其他三組不同？",visual:"△○□   △○□   △□○   △○□",o:["第 1 組","第 2 組","第 3 組","第 4 組"],a:2,e:"只有第 3 組的 ○ 與 □ 順序互換。"},
    {id:"qb2-speed-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"處理速度",type:"speed",limit:10,q:"找出與目標 B8Q7R2 完全相同的字串。",visual:"目標：B8Q7R2\nB8Q7P2   B8O7R2   B8Q7R2   B8Q7RZ",o:["第 1 個","第 2 個","第 3 個","第 4 個"],a:2,e:"第 3 個與目標完全相同。"},
    {id:"qb2-speed-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"處理速度",type:"speed",limit:15,q:"哪一個符號與目標完全相同？",visual:"目標：◈\n◇   ◈   ◆   ◎",o:["第 1 個","第 2 個","第 3 個","第 4 個"],a:1,e:"第 2 個是 ◈。"},
    {id:"qb2-speed-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"處理速度",type:"speed",limit:12,q:"找出唯一方向不同的箭頭。",visual:"↘   ↘   ↙   ↘   ↘",o:["第 1 個","第 2 個","第 3 個","第 4 個"],a:2,e:"第 3 個是 ↙，其餘都是 ↘。"},
    {id:"qb2-quant-06",bankVersion:BANK_VERSION,difficulty:"easy",d:"量化推理",type:"normal",q:"一件商品原價 200 元，打 8 折後是多少？",o:["140","150","160","180"],a:2,e:"200 × 0.8 = 160。"},
    {id:"qb2-quant-07",bankVersion:BANK_VERSION,difficulty:"medium",d:"量化推理",type:"normal",q:"5, 8, 14, 23, 35, ?",o:["47","48","49","50"],a:3,e:"差值依序是 +3、+6、+9、+12，下一次 +15，因此 35 + 15 = 50。"},
    {id:"qb2-quant-08",bankVersion:BANK_VERSION,difficulty:"hard",d:"量化推理",type:"normal",q:"若 A:B = 3:5，且 B:C = 10:7，則 A:C =？",o:["3:7","5:7","6:7","6:5"],a:2,e:"把 A:B 的 B 放大到 10，得到 A:B=6:10；因此 A:C=6:7。"},
    {id:"qb2-quant-09",bankVersion:BANK_VERSION,difficulty:"easy",d:"量化推理",type:"normal",q:"200 的 15% 是多少？",o:["20","25","30","35"],a:2,e:"200 × 0.15 = 30。"},
    {id:"qb2-quant-10",bankVersion:BANK_VERSION,difficulty:"medium",d:"量化推理",type:"normal",q:"2, 6, 12, 20, 30, ?",o:["36","40","42","44"],a:2,e:"依序為 1×2、2×3、3×4、4×5、5×6，下一個是 6×7=42。"}
  ];

  const fullBank = [...enrichedBase,...extra];
  function shuffle(items){const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
  function readPreviousForm(){try{const parsed=JSON.parse(localStorage.getItem(LAST_FORM_KEY)||"[]");return Array.isArray(parsed)?new Set(parsed):new Set();}catch{return new Set();}}
  const previousForm=readPreviousForm();
  function pickTier(pool,difficulty,count){const tier=pool.filter(q=>q.difficulty===difficulty);const fresh=shuffle(tier.filter(q=>!previousForm.has(q.id)));const repeats=shuffle(tier.filter(q=>previousForm.has(q.id)));return [...fresh,...repeats].slice(0,count);}
  function pickForDomain(domain){const pool=fullBank.filter(q=>q.d===domain);const plan={easy:2,medium:2,hard:1};const picked=[];Object.entries(plan).forEach(([difficulty,count])=>picked.push(...pickTier(pool,difficulty,count)));if(picked.length<5){const used=new Set(picked.map(q=>q.id));const fresh=shuffle(pool.filter(q=>!used.has(q.id)&&!previousForm.has(q.id)));const repeats=shuffle(pool.filter(q=>!used.has(q.id)&&previousForm.has(q.id)));picked.push(...[...fresh,...repeats].slice(0,5-picked.length));}return shuffle(picked).slice(0,5);}
  const selected=DOMAIN_ORDER.flatMap(pickForDomain);
  const selectedIds=selected.map(q=>q.id);
  try{localStorage.setItem(LAST_FORM_KEY,JSON.stringify(selectedIds));}catch{}
  window.IQ_QUESTION_BANK=fullBank;
  window.IQ_QUESTIONS=selected;
  window.IQ_BANK_META={version:BANK_VERSION,totalItems:fullBank.length,selectedItems:selected.length,domains:DOMAIN_ORDER.length,itemsPerDomain:5,itemsPerDomainInBank:10,difficultyPlan:{easy:2,medium:2,hard:1},difficultyLabels:DIFFICULTY_LABEL,previousFormAvoidance:true};
  window.addEventListener("load",()=>{const restart=document.getElementById("restartBtn");if(restart){restart.textContent="抽新題再測";restart.onclick=()=>window.location.reload();}});
})();
