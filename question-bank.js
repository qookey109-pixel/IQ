// Cognitive IQ Lab — Question Bank v1
// Expands the original 30-item set to 42 items, adds difficulty metadata,
// and selects a balanced 30-item form (5 items per cognitive domain) per page load.

(() => {
  const base = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  const DOMAIN_ORDER = [
    "語文理解",
    "流體推理",
    "視覺空間",
    "工作記憶",
    "處理速度",
    "量化推理"
  ];

  const DOMAIN_SLUG = {
    "語文理解": "verbal",
    "流體推理": "fluid",
    "視覺空間": "spatial",
    "工作記憶": "memory",
    "處理速度": "speed",
    "量化推理": "quant"
  };

  const DIFFICULTY_LABEL = {
    easy: "基礎",
    medium: "中等",
    hard: "進階"
  };

  const baseDifficultyPattern = ["easy", "medium", "medium", "hard", "hard"];
  const perDomainIndex = Object.fromEntries(DOMAIN_ORDER.map(d => [d, 0]));

  const enrichedBase = base.map((q) => {
    const index = perDomainIndex[q.d] || 0;
    perDomainIndex[q.d] = index + 1;
    return {
      ...q,
      id: q.id || `qb1-${DOMAIN_SLUG[q.d] || "item"}-${String(index + 1).padStart(2, "0")}`,
      difficulty: q.difficulty || baseDifficultyPattern[index % baseDifficultyPattern.length],
      bankVersion: "QB-2026.09.1"
    };
  });

  const extra = [
    {
      id:"qb1-verbal-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"語文理解", type:"normal",
      q:"醫生：醫院 ＝ 老師：？",
      o:["學校","市場","法院","車站"], a:0,
      e:"關係是職業與主要工作場所。"
    },
    {
      id:"qb1-verbal-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"語文理解", type:"normal",
      q:"所有青杉都是植物；有些植物會開花。下列哪個結論一定成立？",
      o:["所有青杉都會開花","有些青杉會開花","青杉是植物","沒有植物不開花"], a:2,
      e:"題幹直接給出所有青杉都是植物；其他敘述都無法必然推出。"
    },

    {
      id:"qb1-fluid-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"流體推理", type:"matrix",
      q:"觀察 3×3 圖形矩陣，找出最合理的缺失圖形。",
      cells:["●","○","●○","■","□","■□","▲","△","?"],
      o:["▲△","△▲","▲▲","△△"], a:0,
      e:"每一列第三格都由前兩格依原順序組合而成。"
    },
    {
      id:"qb1-fluid-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"流體推理", type:"matrix",
      q:"觀察 3×3 圖形矩陣，找出最合理的缺失圖形。",
      cells:["1","3","4","2","4","6","3","5","?"],
      o:["7","8","9","10"], a:1,
      e:"每一列第三格等於前兩格相加，因此 3 + 5 = 8。"
    },

    {
      id:"qb1-spatial-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"視覺空間", type:"normal",
      q:"箭頭「↑」順時針旋轉 90° 後會指向哪裡？",
      o:["←","→","↓","↑"], a:1,
      e:"向上的箭頭順時針旋轉 90° 會指向右方。",
      visual:"↑   ↻ 90°   ?"
    },
    {
      id:"qb1-spatial-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"視覺空間", type:"normal",
      q:"一張紙先左右對折，再上下對折。若在折疊後紙張的外角打一個孔，完全攤開後通常會出現幾個對稱孔？",
      o:["1","2","4","8"], a:2,
      e:"兩次互相垂直的對折會形成四層對稱位置，因此攤開後通常為 4 個孔。"
    },

    {
      id:"qb1-memory-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"工作記憶", type:"memory", stim:"4 1 7 3",
      q:"選出剛才的數字由大到小排列。",
      o:["7 4 3 1","7 3 4 1","4 7 3 1","1 3 4 7"], a:0,
      e:"4、1、7、3 由大到小為 7、4、3、1。"
    },
    {
      id:"qb1-memory-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"工作記憶", type:"memory", stim:"P 6 R 2 T 8",
      q:"選出剛才所有字母，保持原順序。",
      o:["P R T","T R P","P T R","R P T"], a:0,
      e:"原序列中的字母依序是 P、R、T。"
    },

    {
      id:"qb1-speed-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"處理速度", type:"speed", limit:15,
      q:"找出與目標 X7M4 完全相同的字串。",
      visual:"目標：X7M4\nX7N4   X7M4   XTM4   X7M9",
      o:["第 1 個","第 2 個","第 3 個","第 4 個"], a:1,
      e:"第 2 個與目標 X7M4 完全相同。"
    },
    {
      id:"qb1-speed-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"處理速度", type:"speed", limit:12,
      q:"哪一組符號和其他三組不同？",
      visual:"△○□   △○□   △□○   △○□",
      o:["第 1 組","第 2 組","第 3 組","第 4 組"], a:2,
      e:"只有第 3 組的 ○ 與 □ 順序互換。"
    },

    {
      id:"qb1-quant-06", bankVersion:"QB-2026.09.1", difficulty:"easy",
      d:"量化推理", type:"normal",
      q:"一件商品原價 200 元，打 8 折後是多少？",
      o:["140","150","160","180"], a:2,
      e:"200 × 0.8 = 160。"
    },
    {
      id:"qb1-quant-07", bankVersion:"QB-2026.09.1", difficulty:"medium",
      d:"量化推理", type:"normal",
      q:"5, 8, 14, 23, 35, ?",
      o:["47","48","49","50"], a:3,
      e:"差值依序是 +3、+6、+9、+12，下一次 +15，因此 35 + 15 = 50。"
    }
  ];

  const fullBank = [...enrichedBase, ...extra];

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickForDomain(domain) {
    const pool = fullBank.filter(q => q.d === domain);
    const plan = { easy: 2, medium: 2, hard: 1 };
    const picked = [];

    Object.entries(plan).forEach(([difficulty, count]) => {
      picked.push(...shuffle(pool.filter(q => q.difficulty === difficulty)).slice(0, count));
    });

    if (picked.length < 5) {
      const used = new Set(picked.map(q => q.id));
      picked.push(...shuffle(pool.filter(q => !used.has(q.id))).slice(0, 5 - picked.length));
    }

    return shuffle(picked).slice(0, 5);
  }

  const selected = DOMAIN_ORDER.flatMap(pickForDomain);

  window.IQ_QUESTION_BANK = fullBank;
  window.IQ_QUESTIONS = selected;
  window.IQ_BANK_META = {
    version: "QB-2026.09.1",
    totalItems: fullBank.length,
    selectedItems: selected.length,
    domains: DOMAIN_ORDER.length,
    itemsPerDomain: 5,
    difficultyPlan: { easy: 2, medium: 2, hard: 1 },
    difficultyLabels: DIFFICULTY_LABEL
  };

  // A retry intentionally draws a fresh balanced form by reloading the page.
  window.addEventListener("load", () => {
    const restart = document.getElementById("restartBtn");
    if (restart) {
      restart.textContent = "抽新題再測";
      restart.onclick = () => window.location.reload();
    }
  });
})();
