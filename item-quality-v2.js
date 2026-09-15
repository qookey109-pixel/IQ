// Cognitive IQ Lab — Local Item Quality QA v2
// Browser-local aggregate analytics only. No network upload and no personal identity data.
// Adds item-rest discrimination, distractor efficiency, target-difficulty mismatch,
// option cue-risk preflight, answer-position balance and response-time dispersion.

(() => {
  const meta = window.IQ_BANK_META || {};
  const bankVersion = meta.version || "unknown";
  const bankRevision = meta.revision || "unknown";
  const STORAGE_KEY = `cognitive-iq-lab:item-quality-v2:${bankVersion}:${bankRevision}`;
  let recordedForAttempt = false;

  function emptyStore() {
    return { schemaVersion: 2, bankVersion, bankRevision, forms: 0, items: {}, updatedAt: null };
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.schemaVersion !== 2 || !parsed.items) return emptyStore();
      return parsed;
    } catch { return emptyStore(); }
  }

  function saveStore(store) {
    try {
      store.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn("Unable to persist Item Quality QA v2", error);
    }
  }

  function ensureEntry(store, q) {
    if (!store.items[q.id]) {
      store.items[q.id] = {
        id: q.id, domain: q.d, difficulty: q.difficulty || null, model: q.model || null,
        timed: Number.isFinite(Number(q.limit)) && Number(q.limit) > 0,
        limit: Number.isFinite(Number(q.limit)) && Number(q.limit) > 0 ? Number(q.limit) : null,
        exposures: 0, correct: 0, skipped: 0, timeouts: 0,
        totalSeconds: 0, totalSecondsSq: 0,
        sumRest: 0, sumRestSq: 0, sumXRest: 0,
        choiceCounts: {}
      };
    }
    return store.items[q.id];
  }

  function recordCurrentForm() {
    if (recordedForAttempt || !Array.isArray(questions) || !questions.length) return;
    const store = loadStore();
    const correctness = questions.map((q, i) => answers[i] === q.a ? 1 : 0);
    const totalCorrect = correctness.reduce((a, b) => a + b, 0);
    const denom = Math.max(1, questions.length - 1);

    questions.forEach((q, i) => {
      const entry = ensureEntry(store, q);
      const answer = answers[i];
      const x = correctness[i];
      const rest = (totalCorrect - x) / denom;
      const spent = Math.max(0, Number(elapsedTimes[i]) || 0);
      const timedOut = typeof expiredQuestionsLock !== "undefined" && Boolean(expiredQuestionsLock[i]);

      entry.exposures += 1;
      entry.correct += x;
      if (answer === null || answer === undefined) entry.skipped += 1;
      if (timedOut) entry.timeouts += 1;
      entry.totalSeconds += spent;
      entry.totalSecondsSq += spent * spent;
      entry.sumRest += rest;
      entry.sumRestSq += rest * rest;
      entry.sumXRest += x * rest;

      if (Number.isInteger(answer) && q.o?.[answer] != null) {
        const choice = String(q.o[answer]);
        entry.choiceCounts[choice] = (entry.choiceCounts[choice] || 0) + 1;
      }
    });

    store.forms += 1;
    saveStore(store);
    recordedForAttempt = true;
  }

  function correlationFromSums(entry) {
    const n = entry.exposures || 0;
    if (n < 30) return null;
    const meanX = entry.correct / n;
    const meanY = entry.sumRest / n;
    const varX = meanX * (1 - meanX);
    const varY = entry.sumRestSq / n - meanY * meanY;
    if (varX <= 1e-9 || varY <= 1e-9) return null;
    const cov = entry.sumXRest / n - meanX * meanY;
    return Math.max(-1, Math.min(1, cov / Math.sqrt(varX * varY)));
  }

  function difficultyMismatch(q, accuracy, n) {
    if (n < 30 || accuracy == null) return null;
    if (q.difficulty === "easy" && accuracy < 0.55) return "基礎題實際偏難";
    if (q.difficulty === "medium" && accuracy > 0.85) return "中等題實際偏易";
    if (q.difficulty === "medium" && accuracy < 0.35) return "中等題實際偏難";
    if (q.difficulty === "hard" && accuracy > 0.75) return "進階題實際偏易";
    return null;
  }

  function evaluateItem(q, entry) {
    const n = entry?.exposures || 0;
    const staticFlags = Array.isArray(q.optionCueFlags) ? q.optionCueFlags : [];
    if (!n) {
      return {
        id:q.id, domain:q.d, difficulty:q.difficulty, model:q.model, n:0,
        accuracy:null, skipRate:null, timeoutRate:null, avgTime:null, timeSd:null,
        discrimination:null, distractorEfficiency:null, weakDistractors:null,
        qualityScore:null, flags: staticFlags.length ? staticFlags.map(x=>`靜態提示風險：${x}`) : ["尚無作答資料"],
        staticFlags, distractorDesign:q.distractorDesign || "model-native"
      };
    }

    const accuracy = entry.correct / n;
    const skipRate = entry.skipped / n;
    const timeoutRate = entry.timeouts / n;
    const avgTime = entry.totalSeconds / n;
    const variance = Math.max(0, entry.totalSecondsSq / n - avgTime * avgTime);
    const timeSd = Math.sqrt(variance);
    const discrimination = correlationFromSums(entry);
    const correctText = String(q.o?.[q.a] ?? "");
    const distractors = (q.o || []).map(String).filter(x => x !== correctText);
    const distractorRates = distractors.map(text => (entry.choiceCounts[text] || 0) / n);
    const functional = distractorRates.filter(rate => rate >= 0.05).length;
    const distractorEfficiency = n >= 20 && distractors.length ? functional / distractors.length : null;
    const weakDistractors = distractorEfficiency == null ? null : distractors.length - functional;
    const flags = [];
    let qualityScore = 100;

    staticFlags.forEach(flag => { flags.push(`靜態提示風險：${flag}`); qualityScore -= 10; });

    if (n < 10) {
      flags.push("樣本不足");
      qualityScore = null;
    } else {
      if (accuracy >= 0.92) { flags.push("可能過易"); qualityScore -= 14; }
      if (accuracy <= 0.30) { flags.push("可能過難／規則不清"); qualityScore -= 20; }
      if (skipRate >= 0.20) { flags.push("跳過率偏高"); qualityScore -= 14; }
      if (entry.timed && timeoutRate >= 0.20) { flags.push("逾時率偏高"); qualityScore -= 14; }
      if (entry.timed && entry.limit && avgTime / entry.limit >= 0.85) { flags.push("平均作答接近時限"); qualityScore -= 8; }

      if (n >= 20 && weakDistractors > 0) {
        flags.push(`${weakDistractors} 個干擾選項 <5%`);
        qualityScore -= Math.min(18, weakDistractors * 6);
      }

      if (n >= 30 && discrimination != null) {
        if (discrimination < 0) { flags.push("負鑑別：需優先檢查"); qualityScore -= 28; }
        else if (discrimination < 0.15) { flags.push("鑑別度偏低"); qualityScore -= 16; }
        else if (discrimination >= 0.30) { flags.push("鑑別度良好"); }
      }

      const mismatch = difficultyMismatch(q, accuracy, n);
      if (mismatch) { flags.push(mismatch); qualityScore -= 12; }

      if (!flags.length) flags.push("目前正常");
      qualityScore = Math.max(0, Math.min(100, qualityScore));
    }

    return {
      id:q.id, domain:q.d, difficulty:q.difficulty, model:q.model, n,
      accuracy, skipRate, timeoutRate, avgTime, timeSd, discrimination,
      distractorEfficiency, weakDistractors, distractorRates,
      qualityScore, flags, staticFlags,
      distractorDesign:q.distractorDesign || "model-native"
    };
  }

  function bankPreflight(bank) {
    const positions = [0,0,0,0];
    const cueItems = [];
    const stems = new Map();
    const models = {};
    bank.forEach(q => {
      if (Number.isInteger(q.a) && q.a >= 0 && q.a < 4) positions[q.a] += 1;
      if (q.optionCueFlags?.length) cueItems.push({id:q.id, flags:[...q.optionCueFlags]});
      stems.set(q.q, (stems.get(q.q) || 0) + 1);
      models[q.model] = (models[q.model] || 0) + 1;
    });
    const repeatedStems = [...stems.entries()].filter(([,count]) => count >= 8).map(([stem,count]) => ({stem,count}));
    const total = positions.reduce((a,b)=>a+b,0) || 1;
    const probs = positions.map(n => n / total).filter(Boolean);
    const entropy = -probs.reduce((sum,p)=>sum+p*Math.log2(p),0) / 2;
    return { positions, positionSpread:Math.max(...positions)-Math.min(...positions), positionEntropy:entropy, cueItems, repeatedStems, models };
  }

  function getReport() {
    const store = loadStore();
    const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
    const items = bank.map(q => evaluateItem(q, store.items[q.id]));
    const observed = items.filter(x=>x.n>0);
    const evaluable = items.filter(x=>x.n>=10);
    const calibrated = items.filter(x=>x.n>=30 && x.discrimination!=null);
    const flagged = evaluable.filter(x=>!x.flags.includes("目前正常") && !x.flags.every(f=>f==="鑑別度良好"));
    const avgDisc = calibrated.length ? calibrated.reduce((s,x)=>s+x.discrimination,0)/calibrated.length : null;
    const avgDE = items.filter(x=>x.distractorEfficiency!=null);
    const meanDE = avgDE.length ? avgDE.reduce((s,x)=>s+x.distractorEfficiency,0)/avgDE.length : null;
    return {
      schemaVersion:2, bankVersion, bankRevision, forms:store.forms||0,
      totalItems:bank.length, observedItems:observed.length, evaluableItems:evaluable.length,
      calibratedItems:calibrated.length, flaggedItems:flagged.length,
      meanDiscrimination:avgDisc, meanDistractorEfficiency:meanDE,
      preflight:bankPreflight(bank), items, generatedAt:new Date().toISOString()
    };
  }

  const pct = value => value == null ? "—" : `${Math.round(value*100)}%`;
  const num = value => value == null || !Number.isFinite(value) ? "—" : value.toFixed(2);
  const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function renderDashboard() {
    const panel = document.getElementById("itemQaPanel");
    if (!panel) return;
    const report = getReport();
    const ranked = [...report.items].sort((a,b)=>{
      const ap = a.n>=10 && a.flags.length && !a.flags.includes("目前正常") ? 0 : a.n>0 ? 1 : 2;
      const bp = b.n>=10 && b.flags.length && !b.flags.includes("目前正常") ? 0 : b.n>0 ? 1 : 2;
      if (ap!==bp) return ap-bp;
      const aq=a.qualityScore==null?101:a.qualityScore, bq=b.qualityScore==null?101:b.qualityScore;
      return aq-bq || b.n-a.n;
    }).slice(0,50);

    const p = report.preflight;
    panel.innerHTML = `
      <button class="screenClose" type="button" aria-label="關閉">×</button>
      <div class="itemQaHeader qaV2Header">
        <div>
          <div class="sectionKicker">ITEM QUALITY LAB · V2</div>
          <h3>題庫品質 QA+</h3>
          <p>除了答對率，現在也檢查鑑別度、干擾選項效率、答案位置、難度標籤落差、逾時與靜態選項提示。資料只留在這台瀏覽器。</p>
        </div>
        <div class="itemQaActions"><button class="btn secondary" id="exportQaV2">匯出 QA JSON</button><button class="btn ghost" id="resetQaV2">清除 QA v2</button></div>
      </div>
      <div class="itemQaCards qaV2Cards">
        <div class="itemQaCard"><strong>${report.forms}</strong><span>本機完成測驗</span></div>
        <div class="itemQaCard"><strong>${report.observedItems}/${report.totalItems}</strong><span>已觀察題目</span></div>
        <div class="itemQaCard"><strong>${num(report.meanDiscrimination)}</strong><span>平均 item-rest r</span></div>
        <div class="itemQaCard"><strong>${pct(report.meanDistractorEfficiency)}</strong><span>平均干擾效率</span></div>
      </div>
      <div class="qaPreflight">
        <strong>題庫預檢</strong>
        <span>答案位置 A/B/C/D：${p.positions.join(" / ")}</span>
        <span>位置平衡度：${Math.round(p.positionEntropy*100)}%</span>
        <span>靜態選項提示風險：${p.cueItems.length} 題</span>
        <span>高重複題幹族：${p.repeatedStems.length} 組</span>
      </div>
      <div class="itemQaNotice"><strong>判讀門檻：</strong> N&lt;10 只累積資料；N≥20 開始看干擾選項；N≥30 才顯示 item-rest 鑑別度。錯誤選項若低於約 5% 的作答者選擇，會被標成可能失效。這仍是本機工程 QA，不是正式 IRT 校準或 IQ 常模。</div>
      <div class="itemQaTableWrap"><table class="itemQaTable qaV2Table">
        <thead><tr><th>題目</th><th>難度</th><th>N</th><th>答對率</th><th>item-rest r</th><th>干擾效率</th><th>跳過</th><th>逾時</th><th>平均時間</th><th>QA</th><th>訊號</th></tr></thead>
        <tbody>${ranked.map(x=>`<tr>
          <td><code>${esc(x.id)}</code><small>${esc(x.model)} · ${esc(x.distractorDesign)}</small></td>
          <td>${esc(x.difficulty||"")}</td><td>${x.n}</td><td>${pct(x.accuracy)}</td><td>${num(x.discrimination)}</td>
          <td>${pct(x.distractorEfficiency)}</td><td>${pct(x.skipRate)}</td><td>${pct(x.timeoutRate)}</td><td>${x.avgTime==null?"—":`${x.avgTime.toFixed(1)}s`}</td>
          <td>${x.qualityScore==null?"—":x.qualityScore}</td><td>${x.flags.map(f=>`<span class="qaFlag">${esc(f)}</span>`).join(" ")}</td>
        </tr>`).join("")}</tbody>
      </table></div>`;

    panel.querySelector(".screenClose")?.addEventListener("click",()=>panel.classList.add("hidden"));
    document.getElementById("exportQaV2")?.addEventListener("click", exportReport);
    document.getElementById("resetQaV2")?.addEventListener("click", resetReport);
  }

  function exportReport() {
    const blob = new Blob([JSON.stringify(getReport(), null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`cognitive-iq-lab-item-quality-v2-${bankVersion}-${bankRevision}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function resetReport() {
    if (!window.confirm("確定清除這台裝置的 QA v2 統計嗎？")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    renderDashboard();
  }

  const previousFinish = finishTest;
  finishTest = function () {
    const result = previousFinish();
    recordCurrentForm();
    return result;
  };

  const previousInit = initState;
  initState = function () {
    recordedForAttempt = false;
    return previousInit();
  };

  function installUI() {
    const oldButton = document.getElementById("itemQaBtn");
    const panel = document.getElementById("itemQaPanel");
    if (!oldButton || !panel || document.getElementById("itemQaBtnV2")) return;
    const button = oldButton.cloneNode(true);
    button.id = "itemQaBtnV2";
    button.textContent = "題庫品質 QA+";
    oldButton.replaceWith(button);
    panel.classList.add("screenModal");
    button.addEventListener("click",()=>{
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) renderDashboard();
    });
  }

  const style=document.createElement("style");
  style.textContent=`
    .qaPreflight{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0;padding:14px 16px;border:1px solid var(--line);background:rgba(255,252,244,.72);border-radius:14px;color:var(--muted);font-size:13px}.qaPreflight strong{color:var(--ink);width:100%}
    .qaV2Table{min-width:1280px}.qaV2Table th{background:#f2eadb!important;color:#4a3829!important}.qaV2Table .qaFlag{background:#eee2d0!important;color:#65492f!important}
    .qaV2Cards .itemQaCard{background:#fbf6ec!important}.qaV2Cards .itemQaCard strong{color:#704a2d!important}
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",()=>setTimeout(installUI,0),{once:true});
  } else setTimeout(installUI,0);

  window.IQ_ITEM_QA_V2 = { storageKey:STORAGE_KEY, getReport, evaluateItem, bankPreflight, renderDashboard, exportReport, resetReport };
})();