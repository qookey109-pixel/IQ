// Navigation + matrix density safety.
// Keeps timed-out questions locked while restoring reliable forward navigation.
// Also prevents dense matrix symbols from spilling outside their own cell.

(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function visualCellLength(value) {
    const lines = String(value ?? "").split(/\n/);
    return Math.max(1, ...lines.map(line => Array.from(line.replace(/\s/g, "")).length));
  }

  function densityClass(value) {
    const len = visualCellLength(value);
    if (len >= 6) return "density-6";
    if (len === 5) return "density-5";
    if (len === 4) return "density-4";
    if (len === 3) return "density-3";
    return "density-normal";
  }

  // app.js calls buildMatrix at render time, so replacing the global binding here
  // safely upgrades every matrix without rewriting the question bank.
  buildMatrix = function (cells) {
    return `<div class="matrixGrid">${cells.map(cell => {
      const missing = cell === "?" ? " missing" : "";
      const density = densityClass(cell);
      return `<div class="matrixCell${missing} ${density}">${escapeHtml(cell)}</div>`;
    }).join("")}</div>`;
  };

  function updateForwardControl() {
    const button = $("skipBtn");
    if (!button) return;

    // This control is navigation, not answer deletion. An unanswered item simply
    // stays unanswered when the user moves forward.
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

  // Preserve the old function name because other layers already reference it,
  // but change its semantics to non-destructive forward navigation.
  skipQuestion = nextQuestion;

  const forwardButton = $("skipBtn");
  if (forwardButton) forwardButton.onclick = nextQuestion;
  updateForwardControl();
})();
