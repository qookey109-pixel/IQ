// Navigation + matrix density safety.
// Keeps timed-out questions locked while restoring reliable forward navigation.
// Also renders structured matrix symbol clusters without clipping on mobile.

(() => {
  const CLUSTER_PREFIX = "@@cluster:";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseCluster(value) {
    const text = String(value ?? "");
    if (!text.startsWith(CLUSTER_PREFIX)) return null;
    const payload = text.slice(CLUSTER_PREFIX.length);
    const splitAt = payload.lastIndexOf(":");
    if (splitAt <= 0) return null;
    const symbol = payload.slice(0, splitAt);
    const count = Number(payload.slice(splitAt + 1));
    if (!symbol || !Number.isInteger(count) || count < 2 || count > 6) return null;
    return { symbol, count };
  }

  function renderCluster(cluster) {
    const glyphs = Array.from({ length: cluster.count }, () =>
      `<span class="matrixSymbolGlyph">${escapeHtml(cluster.symbol)}</span>`
    ).join("");
    return `<span class="matrixSymbolCluster count-${cluster.count}" aria-label="${escapeHtml(cluster.symbol)} 共 ${cluster.count} 個">${glyphs}</span>`;
  }

  function visualCellLength(value) {
    const lines = String(value ?? "").split(/\n/);
    return Math.max(1, ...lines.map(line => Array.from(line.replace(/\s/g, "")).length));
  }

  function densityClass(value) {
    const cluster = parseCluster(value);
    if (cluster) return `cluster-cell cluster-${cluster.count}`;
    const len = visualCellLength(value);
    if (len >= 6) return "density-6";
    if (len === 5) return "density-5";
    if (len === 4) return "density-4";
    if (len === 3) return "density-3";
    return "density-normal";
  }

  // app.js calls buildMatrix at render time. Replace the global binding so
  // structured question-bank cells render as compact mini-clusters instead of
  // one long glyph string.
  buildMatrix = function (cells) {
    return `<div class="matrixGrid">${cells.map(cell => {
      const missing = cell === "?" ? " missing" : "";
      const density = densityClass(cell);
      const cluster = parseCluster(cell);
      const body = cluster ? renderCluster(cluster) : escapeHtml(cell);
      return `<div class="matrixCell${missing} ${density}">${body}</div>`;
    }).join("")}</div>`;
  };

  function updateForwardControl() {
    const button = $("skipBtn");
    if (!button) return;

    button.disabled = false;
    button.textContent = currentIndex >= totalQuestions - 1 ? "完成" : "下一題";
    button.classList.remove("ghost");
    button.classList.add("secondary", "forwardBtn");

    const hint = document.querySelector("#quiz .hint");
    if (hint) hint.textContent = "選答案會自動下一題 · 也可手動前後瀏覽";
  }

  const baseRenderQuestionNavigation = renderQuestion;
  renderQuestion = function (animationClass = "") {
    const result = baseRenderQuestionNavigation(animationClass);
    updateForwardControl();
    return result;
  };

  function nextQuestion() {
    if (isAnimating) return;

    if (currentIndex < totalQuestions - 1) {
      animatedGoTo(currentIndex + 1, "next");
    } else {
      finishTest();
    }
  }

  skipQuestion = nextQuestion;

  const forwardButton = $("skipBtn");
  if (forwardButton) forwardButton.onclick = nextQuestion;
  updateForwardControl();
})();
