// Cognitive IQ Lab — Question Bank v3.2 option-quality pass
// Research-informed principles only; no proprietary or third-party test items are copied.
// Goals: plausible near-miss distractors, stable answer keys, balanced answer positions,
// and static cue-risk auditing before response data exists.

(() => {
  const SOURCE_REVISION = "3.1";
  const TARGET_REVISION = "3.2";

  const analogyV2 = [
    ["醫生：診斷 ＝ 法官：？", "判決", ["起訴", "辯護", "作證"], "兩組都是『專業角色 → 核心專業產出』。"],
    ["溫度計：溫度 ＝ 天平：？", "重量", ["長度", "體積", "密度"], "兩組都是『測量工具 → 主要測量量』。"],
    ["指南針：方向 ＝ 時鐘：？", "時間", ["速度", "距離", "溫度"], "兩組都是『工具 → 主要指示資訊』。"],
    ["樂譜：音樂 ＝ 食譜：？", "料理", ["食材", "餐具", "廚房"], "兩組都是『符號化指引 → 可完成的作品』。"],
    ["鑰匙：開鎖 ＝ 剪刀：？", "剪裁", ["測量", "黏合", "鑽孔"], "兩組都是『工具 → 典型功能』。"],
    ["耳朵：聽覺 ＝ 眼睛：？", "視覺", ["光線", "顏色", "影像"], "兩組都是『感官器官 → 感覺能力』。"],
    ["肺：呼吸 ＝ 胃：？", "消化", ["循環", "排汗", "平衡"], "兩組都是『器官 → 主要生理功能』。"],
    ["船：海洋 ＝ 火車：？", "鐵路", ["車站", "月台", "隧道"], "兩組都是『交通工具 → 主要運行環境／路徑』。"],
    ["蜜蜂：蜂巢 ＝ 鳥：？", "鳥巢", ["樹枝", "森林", "羽毛"], "兩組都是『動物 → 建造或居住的巢』。"],
    ["圖書館：書籍 ＝ 美術館：？", "作品", ["畫框", "展廳", "門票"], "兩組都是『典藏場所 → 主要典藏內容』。"],
    ["字典：詞義 ＝ 地圖：？", "位置", ["距離", "比例", "路線"], "兩組都是『資訊工具 → 主要查詢資訊』。"],
    ["種子：植物 ＝ 蛋：？", "鳥", ["羽毛", "鳥巢", "飛行"], "兩組都是『早期形態 → 發育後的生物』。"],
    ["輪胎：汽車 ＝ 翅膀：？", "飛機", ["跑道", "機場", "引擎"], "兩組都是『關鍵部件 → 所屬載具』。"],
    ["問句：答案 ＝ 問題：？", "解法", ["原因", "條件", "結果"], "兩組都是『待解內容 → 對應回應』。"],
    ["記者：報導 ＝ 研究員：？", "研究", ["審查", "教學", "訪談"], "兩組都是『角色 → 核心工作活動』。"],
    ["雨傘：遮雨 ＝ 墨鏡：？", "遮光", ["保暖", "防風", "放大"], "兩組都是『物件 → 主要防護功能』。"],
    ["地圖：空間 ＝ 年表：？", "時間", ["歷史", "日期", "順序"], "兩組都是『表徵工具 → 主要組織維度』。"],
    ["畫家：畫筆 ＝ 木匠：？", "鋸子", ["鉛筆", "刷子", "畫布"], "兩組都是『職業 → 代表性工作工具』。"],
    ["望遠鏡：遠方 ＝ 顯微鏡：？", "微小物", ["近距離", "光線", "影像"], "兩組都是『觀察工具 → 擅長觀察的尺度／對象』。"],
    ["密碼：解密 ＝ 謎題：？", "解謎", ["記憶", "分類", "計數"], "兩組都是『待處理資訊 → 對應解決活動』。"],
  ];

  function itemNumber(q) {
    const m = String(q.id || "").match(/-(\d{3})$/);
    return m ? Number(m[1]) : null;
  }

  function placeCorrect(correct, distractors, answerIndex) {
    const key = String(correct);
    const wrong = [];
    for (const value of distractors) {
      const s = String(value);
      if (s !== key && !wrong.includes(s)) wrong.push(s);
    }
    if (wrong.length < 3) return null;
    const index = Number.isInteger(answerIndex) ? answerIndex : 0;
    const options = [];
    let wi = 0;
    for (let i = 0; i < 4; i++) options.push(i === index ? key : wrong[wi++]);
    return { o: options, a: index };
  }

  function niceNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }

  function uniqueNumeric(correct, candidates, q) {
    const c = Number(correct);
    if (!Number.isFinite(c)) return null;
    const values = [];
    for (const raw of candidates) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || Math.abs(n - c) < 1e-9) continue;
      const s = niceNumber(n);
      if (!values.includes(s)) values.push(s);
    }
    const fallbackStep = Math.max(1, Math.round(Math.max(1, Math.abs(c)) * 0.08));
    for (const n of [c - fallbackStep, c + fallbackStep, c + fallbackStep * 2, c - fallbackStep * 2]) {
      if (n >= 0 && n !== c && !values.includes(niceNumber(n))) values.push(niceNumber(n));
    }
    return placeCorrect(niceNumber(c), values, q.a);
  }

  function numbersFromStem(stem) {
    return (String(stem).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  }

  function upgradeAnalogy(q) {
    const n = itemNumber(q);
    if (!n || n > 20 || q.model !== "verbal-analogy") return q;
    const row = analogyV2[n - 1];
    if (!row) return q;
    const [stem, correct, distractors, explanation] = row;
    const placed = placeCorrect(correct, distractors, q.a);
    return {
      ...q,
      q: stem,
      ...placed,
      e: explanation,
      bankRevision: TARGET_REVISION,
      distractorDesign: "curated-peer-near-miss",
      source: "original-research-informed"
    };
  }

  function upgradeNumeric(q) {
    const correctText = q.o?.[q.a];
    const c = Number(correctText);
    if (!Number.isFinite(c)) return q;
    let candidates = null;

    if (q.model === "matrix-row-sum" && Array.isArray(q.cells)) {
      const a = Number(q.cells[6]);
      const b = Number(q.cells[7]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        candidates = [a + b - 1, a + b + 1, a + b + 2];
      }
    } else if ((q.model === "matrix-product-plus-first" || q.model === "matrix-product-plus-second") && Array.isArray(q.cells)) {
      const a = Number(q.cells[6]);
      const b = Number(q.cells[7]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        candidates = q.model === "matrix-product-plus-first"
          ? [a * b, a * b + b, (a + 1) * b + a]
          : [a * b, a * b + a, a * (b + 1) + b];
      }
    } else if (q.model === "quant-percent") {
      const nums = numbersFromStem(q.q);
      const amount = nums[0];
      if (Number.isFinite(amount)) {
        const delta = Math.max(1, amount * 0.05);
        candidates = [c - delta, c + delta, c + delta * 2];
      }
    } else if (q.model === "quant-multiplicative") {
      const nums = numbersFromStem(q.q);
      const each = nums[0], boxes = nums[1];
      if (Number.isFinite(each) && Number.isFinite(boxes)) {
        candidates = [each * Math.max(1, boxes - 1), (each + 1) * boxes, Math.max(0, (each - 1) * boxes)];
      }
    } else if (q.model === "quant-growing-difference") {
      const seq = numbersFromStem(q.q);
      if (seq.length >= 3) {
        const last = seq[seq.length - 1];
        const prev = seq[seq.length - 2];
        const lastDiff = last - prev;
        candidates = [last + lastDiff, last + lastDiff + 2, last + lastDiff - 1];
      }
    } else if (q.model === "quant-ratio") {
      const nums = numbersFromStem(q.q);
      if (nums.length >= 3 && nums[1] !== 0) {
        const a = nums[0], b = nums[1], B = nums[2];
        const mult = B / b;
        candidates = [a * Math.max(1, mult - 1), a * (mult + 1), c + Math.max(1, Math.abs(b - a))];
      }
    } else if (q.model === "quant-recurrence") {
      const seq = numbersFromStem(q.q);
      if (seq.length >= 2) {
        const offset = seq[1] - seq[0] * 2;
        const last = seq[seq.length - 1];
        candidates = [last * 2, last * 2 + offset - 1, last * 2 + offset + 1];
      }
    }

    if (!candidates) return q;
    const placed = uniqueNumeric(c, candidates, q);
    if (!placed) return q;
    return {
      ...q,
      ...placed,
      bankRevision: TARGET_REVISION,
      distractorDesign: "single-error-near-miss",
      source: "original-research-informed"
    };
  }

  function upgradeSymbolMatrix(q) {
    if (q.model !== "matrix-symbol-addition" || !Array.isArray(q.o)) return q;
    const correct = String(q.o[q.a] || "");
    const chars = Array.from(correct);
    if (!chars.length) return q;
    const symbol = chars[0];
    if (!chars.every(ch => ch === symbol)) return q;
    const count = chars.length;
    const counts = [Math.max(1, count - 2), Math.max(1, count - 1), count + 1, count + 2]
      .filter((v, i, arr) => v !== count && arr.indexOf(v) === i)
      .slice(0, 3);
    const placed = placeCorrect(correct, counts.map(n => symbol.repeat(n)), q.a);
    if (!placed) return q;
    return {
      ...q,
      ...placed,
      bankRevision: TARGET_REVISION,
      distractorDesign: "single-rule-count-near-miss",
      source: "original-research-informed"
    };
  }

  function classifyOption(value) {
    const s = String(value).trim();
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return "number";
    if (/^\d+\s*:\s*\d+$/.test(s)) return "ratio";
    if (/^[↑↗→↘↓↙←↖]+$/.test(s)) return "direction";
    if (/^[●■▲◆○□△◇★✦◆◇□■▲△]+$/u.test(s)) return "symbol";
    return "text";
  }

  function optionCueFlags(q) {
    const flags = [];
    const opts = Array.isArray(q.o) ? q.o.map(String) : [];
    if (opts.length !== 4 || new Set(opts).size !== 4) flags.push("option-uniqueness");
    if (!Number.isInteger(q.a) || q.a < 0 || q.a >= opts.length) return [...flags, "invalid-key"];

    const correct = opts[q.a];
    const wrong = opts.filter((_, i) => i !== q.a);
    const types = opts.map(classifyOption);
    const majorityType = types.sort((a,b) => types.filter(x=>x===b).length - types.filter(x=>x===a).length)[0];
    if (classifyOption(correct) !== majorityType) flags.push("format-cue");

    const clen = Array.from(correct.replace(/\s/g, "")).length;
    const wlens = wrong.map(x => Array.from(x.replace(/\s/g, "")).length).sort((a,b)=>a-b);
    const median = wlens[1] || 1;
    if (Math.abs(clen - median) >= 4 && (clen > median * 1.7 || clen < median * 0.55)) flags.push("length-cue");

    if (q.model === "matrix-symbol-addition") {
      const keyChars = new Set(Array.from(correct));
      const sameFamily = wrong.every(x => Array.from(x).every(ch => keyChars.has(ch)));
      if (!sameFamily) flags.push("symbol-family-cue");
    }
    return flags;
  }

  function upgradeItem(item) {
    let q = { ...item };
    q = upgradeAnalogy(q);
    q = upgradeSymbolMatrix(q);
    q = upgradeNumeric(q);
    q.bankRevision = TARGET_REVISION;
    q.optionCueFlags = optionCueFlags(q);
    if (!q.distractorDesign) q.distractorDesign = "model-native";
    return q;
  }

  const sourceBank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
  const sourceSelected = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  const originalCorrect = new Map(sourceBank.map(q => [q.id, q.o?.[q.a]]));
  const upgradedBank = sourceBank.map(upgradeItem);
  const byId = new Map(upgradedBank.map(q => [q.id, q]));
  const upgradedSelected = sourceSelected.map(q => byId.get(q.id) || upgradeItem(q));

  const positions = [0,0,0,0];
  let cueRiskItems = 0;
  let upgradedItems = 0;
  const modelSummary = {};
  upgradedBank.forEach(q => {
    if (Number.isInteger(q.a) && q.a >= 0 && q.a < 4) positions[q.a] += 1;
    if (q.optionCueFlags?.length) cueRiskItems += 1;
    if (q.source === "original-research-informed") upgradedItems += 1;
    modelSummary[q.model] = (modelSummary[q.model] || 0) + 1;
  });

  window.IQ_QUESTION_BANK = upgradedBank;
  window.IQ_QUESTIONS = upgradedSelected;
  window.IQ_BANK_META = {
    ...(window.IQ_BANK_META || {}),
    revision: TARGET_REVISION,
    optionQualityVersion: "1.0",
    optionQualityResearch: "OMIB/AIG/distractor-efficiency principles; original items only"
  };
  window.IQ_OPTION_QUALITY_REPORT = {
    sourceRevision: SOURCE_REVISION,
    revision: TARGET_REVISION,
    totalItems: upgradedBank.length,
    upgradedItems,
    cueRiskItems,
    correctPositionCounts: positions,
    correctPositionSpread: Math.max(...positions) - Math.min(...positions),
    modelSummary,
    originalCorrect,
    generatedAt: new Date().toISOString()
  };
})();