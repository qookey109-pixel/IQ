// Cognitive IQ Lab — low-fatigue presentation layer
// Presentation-only rewrite: keeps item IDs, answer keys and scoring intact while
// removing redundant visual clutter from spatial items and structuring speed items.

(() => {
  const directionName = {
    "↑":"向上", "↗":"右上", "→":"向右", "↘":"右下",
    "↓":"向下", "↙":"左下", "←":"向左", "↖":"左上"
  };
  const arrowRx = /[↑↗→↘↓↙←↖]/g;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function wordsOnly(value) {
    return String(value ?? "").replace(arrowRx, token => directionName[token] || token);
  }

  function simplifySpatial(q) {
    q.q = wordsOnly(q.q)
      .replace(/^箭頭\s*/, "起始方向：")
      .replace(/先做左右鏡像/g, "先左右鏡像")
      .replace(/後會指向哪裡？$/, "後，最後方向？")
      .replace(/最後是哪個方向？$/, "最後方向？")
      .replace(/最後方向是？$/, "最後方向？");

    q.o = q.o.map(option => wordsOnly(option));
    q.e = wordsOnly(q.e);
    q.visual = null;
    q.presentationMode = "text-only";
    q.presentationReason = "redundant-spatial-visual-removed";
  }

  function parseVisualGroups(visual) {
    return String(visual ?? "")
      .trim()
      .split(/\s{2,}|\n+/)
      .map(part => part.trim())
      .filter(Boolean);
  }

  function simplifySpeed(q) {
    const raw = String(q.visual ?? "");
    if (!raw) return;

    if (q.model === "speed-target-match") {
      const lines = raw.split(/\n+/).map(line => line.trim()).filter(Boolean);
      const target = (lines.shift() || "").replace(/^目標：/, "").trim();
      const candidates = parseVisualGroups(lines.join("   "));
      if (target && candidates.length === 4) {
        q.visual = `
          <div class="speedPrompt" aria-label="快速比對題">
            <div class="speedTarget"><span>目標</span><strong>${escapeHtml(target)}</strong></div>
            <div class="speedChoiceGrid">
              ${candidates.map((value, i) => `<div class="speedChoice"><b>${i+1}</b>${escapeHtml(value)}</div>`).join("")}
            </div>
          </div>`;
        q.presentationMode = "structured-speed";
      }
      return;
    }

    if (q.model === "speed-odd-group") {
      const groups = parseVisualGroups(raw);
      if (groups.length === 4) {
        q.visual = `
          <div class="speedPrompt" aria-label="快速辨識題">
            <div class="speedChoiceGrid">
              ${groups.map((value, i) => `<div class="speedChoice"><b>${i+1}</b>${escapeHtml(value)}</div>`).join("")}
            </div>
          </div>`;
        q.presentationMode = "structured-speed";
      }
    }
  }

  const seen = new Set();
  const collections = [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS];
  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (q.d === "視覺空間") simplifySpatial(q);
      else if (q.d === "處理速度") simplifySpeed(q);
      else if (q.type === "matrix") q.presentationMode = "essential-visual";
      else if (q.type === "memory") q.presentationMode = "single-stimulus";
      else q.presentationMode = "text-first";
    }
  }

  window.IQ_PRESENTATION_CLARITY = {
    version: "1.0",
    palette: ["white", "blue", "orange"],
    spatialTextOnly: true,
    structuredSpeed: true,
    principle: "show only information required to solve the item"
  };
})();
