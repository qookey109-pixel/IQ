// Cognitive IQ Lab — local item quality analytics
// Aggregates item-level QA signals in this browser only. No network upload.

(() => {
  const meta = window.IQ_BANK_META || {};
  const bankVersion = meta.version || "unknown";
  const bankRevision = meta.revision || "unknown";
  const STORAGE_KEY = `cognitive-iq-lab:item-analytics:${bankVersion}:${bankRevision}`;
  let recordedForAttempt = false;

  function emptyStore() {
    return {
      schemaVersion: 1,
      bankVersion,
      bankRevision,
      forms: 0,
      items: {},
      updatedAt: null
    };
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object" || !parsed.items) return emptyStore();
      return parsed;
    } catch {
      return emptyStore();
    }
  }

  function saveStore(store) {
    try {
      store.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn("Unable to persist local item analytics", error);
    }
  }

  function ensureEntry(store, q) {
    if (!store.items[q.id]) {
      store.items[q.id] = {
        id: q.id,
        domain: q.d,
        difficulty: q.difficulty || null,
        model: q.model || null,
        timed: Number.isFinite(Number(q.limit)) && Number(q.limit) > 0,
        limit: Number.isFinite(Number(q.limit)) && Number(q.limit) > 0 ? Number(q.limit) : null,
        exposures: 0,
        correct: 0,
        skipped: 0,
        timeouts: 0,
        totalSeconds: 0,
        totalSecondsSq: 0,
        optionCounts: [0, 0, 0, 0]
      };
    }
    return store.items[q.id];
  }

  function recordCurrentForm() {
    if (recordedForAttempt || !Array.isArray(questions) || !questions.length) return;
    const store = loadStore();

    questions.forEach((q, i) => {
      const entry = ensureEntry(store, q);
      const answer = answers[i];
      const spent = Math.max(0, Number(elapsedTimes[i]) || 0);
      const timedOut = typeof expiredQuestionsLock !== "undefined" && Boolean(expiredQuestionsLock[i]);

      entry.exposures += 1;
      if (answer === q.a) entry.correct += 1;
      if (answer === null || answer === undefined) entry.skipped += 1;
      if (timedOut) entry.timeouts += 1;
      entry.totalSeconds += spent;
      entry.totalSecondsSq += spent * spent;
      if (Number.isInteger(answer) && answer >= 0 && answer < 4) entry.optionCounts[answer] += 1;
    });

    store.forms += 1;
    saveStore(store);
    recordedForAttempt = true;
    renderDashboard();
  }

  function evaluateItem(q, entry) {
    const n = entry?.exposures || 0;
    if (!n) {
      return {
        id: q.id,
        domain: q.d,
        difficulty: q.difficulty,
        model: q.model,
        n: 0,
        accuracy: null,
        skipRate: null,
        timeoutRate: null,
        avgTime: null,
        qualityScore: null,
        flags: ["尚無資料"]
      };
    }

    const accuracy = entry.correct / n;
    const skipRate = entry.skipped / n;
    const timeoutRate = entry.timeouts / n;
    const avgTime = entry.totalSeconds / n;
    const answered = Math.max(0, n - entry.skipped);
    const wrongResponses = Math.max(0, answered - entry.correct);
    const flags = [];
    let qualityScore = 100;

    if (n < 10) {
      flags.push("樣本不足");
      qualityScore = null;
    } else {
      if (accuracy >= 0.9) {
        flags.push("可能過易");
        qualityScore -= 18;
      }
      if (accuracy <= 0.35) {
        flags.push("可能過難／規則不清");
        qualityScore -= 24;
      }
      if (skipRate >= 0.2) {
        flags.push("跳過率偏高");
        qualityScore -= 18;
      }
      if (entry.timed && timeoutRate >= 0.2) {
        flags.push("逾時率偏高");
        qualityScore -= 18;
      }
      if (entry.timed && entry.limit && avgTime / entry.limit >= 0.85) {
        flags.push("平均作答接近時限");
        qualityScore -= 10;
      }

      if (wrongResponses >= 10) {
        const wrongCounts = entry.optionCounts.filter((_, idx) => idx !== q.a);
        const weakDistractors = wrongCounts.filter(count => count / wrongResponses < 0.1).length;
        if (weakDistractors > 0) {
          flags.push(`${weakDistractors} 個干擾選項偏弱`);
          qualityScore -= Math.min(18, weakDistractors * 6);
        }
      }

      if (!flags.length) flags.push("目前正常");
      qualityScore = Math.max(0, Math.min(100, qualityScore));
    }

    return {
      id: q.id,
      domain: q.d,
      difficulty: q.difficulty,
      model: q.model,
      n,
      accuracy,
      skipRate,
      timeoutRate,
      avgTime,
      qualityScore,
      flags,
      optionCounts: [...entry.optionCounts]
    };
  }

  function getReport() {
    const store = loadStore();
    const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
    const items = bank.map(q => evaluateItem(q, store.items[q.id]));
    const observed = items.filter(item => item.n > 0);
    const evaluable = items.filter(item => item.n >= 10);
    const flagged = evaluable.filter(item => !item.flags.includes("目前正常"));

    return {
      schemaVersion: 1,
      bankVersion,
      bankRevision,
      forms: store.forms || 0,
      totalResponses: observed.reduce((sum, item) => sum + item.n, 0),
      observedItems: observed.length,
      totalItems: bank.length,
      evaluableItems: evaluable.length,
      flaggedItems: flagged.length,
      generatedAt: new Date().toISOString(),
      items
    };
  }

  function pct(value) {
    return value == null ? "—" : `${Math.round(value * 100)}%`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderDashboard() {
    const panel = document.getElementById("itemQaPanel");
    if (!panel) return;

    const report = getReport();
    const ranked = [...report.items]
      .sort((a, b) => {
        const aPriority = a.n >= 10 && !a.flags.includes("目前正常") ? 0 : a.n > 0 ? 1 : 2;
        const bPriority = b.n >= 10 && !b.flags.includes("目前正常") ? 0 : b.n > 0 ? 1 : 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aq = a.qualityScore == null ? 101 : a.qualityScore;
        const bq = b.qualityScore == null ? 101 : b.qualityScore;
        if (aq !== bq) return aq - bq;
        return b.n - a.n;
      })
      .slice(0, 40);

    panel.innerHTML = `
      <div class="itemQaHeader">
        <div>
          <div class="sectionKicker">LOCAL ITEM QUALITY LAB</div>
          <h3>題庫品質 QA</h3>
          <p>只分析這台裝置累積的作答資料，不會自動上傳。至少累積 10 次曝光後才開始標記「過易／過難／跳過率／逾時率／干擾選項」等訊號。</p>
        </div>
        <div class="itemQaActions">
          <button class="btn secondary" id="exportItemQaBtn">匯出 QA JSON</button>
          <button class="btn ghost" id="resetItemQaBtn">清除本機統計</button>
        </div>
      </div>
      <div class="itemQaCards">
        <div class="itemQaCard"><strong>${report.forms}</strong><span>本機完成測驗</span></div>
        <div class="itemQaCard"><strong>${report.totalResponses}</strong><span>題目曝光紀錄</span></div>
        <div class="itemQaCard"><strong>${report.observedItems}/${report.totalItems}</strong><span>已觀察題目</span></div>
        <div class="itemQaCard"><strong>${report.flaggedItems}</strong><span>目前需檢查</span></div>
      </div>
      <div class="itemQaNotice">目前這些只是 <strong>工程 QA 訊號</strong>，不是 IRT 難度、鑑別度、效度或正式常模。單一瀏覽器的資料也不能代表整體人口。</div>
      <div class="itemQaTableWrap">
        <table class="itemQaTable">
          <thead><tr><th>題目</th><th>構面</th><th>N</th><th>答對率</th><th>跳過</th><th>逾時</th><th>平均時間</th><th>QA</th><th>訊號</th></tr></thead>
          <tbody>
            ${ranked.map(item => `
              <tr>
                <td><code>${escapeHtml(item.id)}</code><small>${escapeHtml(item.model || "")}</small></td>
                <td>${escapeHtml(item.domain)}<small>${escapeHtml(item.difficulty || "")}</small></td>
                <td>${item.n}</td>
                <td>${pct(item.accuracy)}</td>
                <td>${pct(item.skipRate)}</td>
                <td>${pct(item.timeoutRate)}</td>
                <td>${item.avgTime == null ? "—" : `${item.avgTime.toFixed(1)}s`}</td>
                <td>${item.qualityScore == null ? "—" : item.qualityScore}</td>
                <td>${item.flags.map(flag => `<span class="qaFlag">${escapeHtml(flag)}</span>`).join(" ")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("exportItemQaBtn")?.addEventListener("click", exportReport);
    document.getElementById("resetItemQaBtn")?.addEventListener("click", resetReport);
  }

  function exportReport() {
    const report = getReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cognitive-iq-lab-item-qa-${bankVersion}-${bankRevision}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function resetReport() {
    const ok = window.confirm("確定清除這台裝置累積的題目品質統計嗎？這不會影響題庫本身。");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    renderDashboard();
  }

  function installUI() {
    const resultActions = document.querySelector("#result .actions");
    if (!resultActions || document.getElementById("itemQaBtn")) return;

    const button = document.createElement("button");
    button.id = "itemQaBtn";
    button.className = "btn secondary";
    button.textContent = "題庫品質 QA";
    resultActions.appendChild(button);

    const panel = document.createElement("div");
    panel.id = "itemQaPanel";
    panel.className = "itemQaPanel hidden";
    resultActions.insertAdjacentElement("afterend", panel);

    button.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) renderDashboard();
    });
  }

  const analyticsBaseInitState = initState;
  initState = function () {
    recordedForAttempt = false;
    return analyticsBaseInitState();
  };

  const analyticsBaseFinishTest = finishTest;
  finishTest = function () {
    const result = analyticsBaseFinishTest();
    recordCurrentForm();
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    .itemQaPanel{margin-top:24px;padding:24px;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:var(--shadow-soft)}
    .itemQaHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.itemQaHeader h3{margin:8px 0}.itemQaHeader p{margin:0;max-width:760px}
    .itemQaActions{display:flex;gap:10px;flex-wrap:wrap}.itemQaCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0}
    .itemQaCard{padding:18px;border:1px solid var(--line);border-radius:18px;background:#f8fbff}.itemQaCard strong{display:block;font-size:28px;color:var(--navy)}.itemQaCard span{display:block;margin-top:4px;color:var(--muted);font-weight:800}
    .itemQaNotice{padding:14px 16px;border-radius:16px;background:#fff8e8;border:1px solid #ecd8a4;color:#65532c;font-size:14px;line-height:1.6}
    .itemQaTableWrap{overflow:auto;margin-top:18px}.itemQaTable{width:100%;border-collapse:collapse;min-width:1000px;font-size:14px}.itemQaTable th,.itemQaTable td{padding:12px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.itemQaTable th{position:sticky;top:0;background:#f5f8fc;color:#445770}.itemQaTable code{font-size:12px}.itemQaTable small{display:block;margin-top:4px;color:var(--muted)}
    .qaFlag{display:inline-block;margin:2px 3px 2px 0;padding:4px 7px;border-radius:999px;background:#eef3fb;color:#405878;font-size:12px;font-weight:800}
    @media(max-width:900px){.itemQaHeader{display:block}.itemQaActions{margin-top:14px}.itemQaCards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installUI);
  } else {
    installUI();
  }

  window.IQ_ITEM_QA = {
    storageKey: STORAGE_KEY,
    getReport,
    evaluateItem,
    exportReport,
    resetReport,
    renderDashboard
  };
})();
