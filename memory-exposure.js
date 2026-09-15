// Cognitive IQ Lab — adaptive working-memory exposure policy
// Memory stimuli remain single-exposure, but longer/harder items receive slightly
// more encoding time so the task measures memory more than reading speed.

(() => {
  const secondsByDifficulty = Object.freeze({ easy: 4, medium: 5, hard: 6 });

  function memoryExposureSeconds(question) {
    if (!question || question.type !== "memory") return null;
    if (secondsByDifficulty[question.difficulty]) {
      return secondsByDifficulty[question.difficulty];
    }

    const tokens = String(question.stim || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (tokens >= 8) return 6;
    if (tokens >= 6) return 5;
    return 4;
  }

  window.IQ_MEMORY_EXPOSURE_POLICY = {
    version: "1.0",
    secondsByDifficulty: { ...secondsByDifficulty },
    minimumSeconds: 4,
    maximumSeconds: 6,
    singleExposure: true,
    answerUntimed: true,
    getSeconds: memoryExposureSeconds
  };

  // The rest of this layer only installs in the live browser runtime.
  if (
    typeof renderQuestion !== "function" ||
    typeof updateQuestionTimeIndicator !== "function" ||
    typeof updateTimerUI !== "function"
  ) return;

  const baseIndicator = updateQuestionTimeIndicator;
  updateQuestionTimeIndicator = function () {
    baseIndicator();

    const q = questions[currentIndex];
    if (!q || q.type !== "memory" || isTimedQuestion()) return;

    const seconds = memoryExposureSeconds(q);
    const badge = $("questionTimeBadge");
    const label = $("timerLabel");
    const timer = $("timer");

    if (badge) {
      badge.className = "questionTimeBadge memoryMode";
      badge.textContent = `記憶呈現 ${seconds} 秒 · 作答不限時`;
    }

    if (label) label.textContent = memoryLock ? "記憶呈現" : "作答時間";

    if (timer) {
      timer.classList.remove("timedTimer", "urgent");
      timer.classList.add(memoryLock ? "memoryTimer" : "untimedTimer");
      timer.classList.toggle("memoryTimer", memoryLock);
      timer.textContent = memoryLock ? `${seconds} 秒` : "不限時";
    }
  };

  const baseTimerUI = updateTimerUI;
  updateTimerUI = function () {
    baseTimerUI();

    const q = questions[currentIndex];
    if (!q || q.type !== "memory" || isTimedQuestion()) return;

    const seconds = memoryExposureSeconds(q);
    const label = $("timerLabel");
    const timer = $("timer");

    if (label) label.textContent = memoryLock ? "記憶呈現" : "作答時間";
    if (timer) {
      timer.classList.toggle("memoryTimer", memoryLock);
      timer.classList.toggle("untimedTimer", !memoryLock);
      timer.textContent = memoryLock ? `${seconds} 秒` : "不限時";
    }
  };

  const baseRenderQuestion = renderQuestion;
  renderQuestion = function (animationClass = "") {
    const q = questions[currentIndex];

    if (!q || q.type !== "memory" || expiredQuestionsLock[currentIndex]) {
      return baseRenderQuestion(animationClass);
    }

    const exposureSeconds = memoryExposureSeconds(q);
    const exposureMs = exposureSeconds * 1000;
    const nativeSetTimeout = window.setTimeout;

    // timeout-lock.js schedules the one-shot memory reveal at 3000ms. Replace
    // only that exact scheduling call while this memory item is rendered.
    window.setTimeout = function (fn, delay, ...args) {
      const effectiveDelay = Number(delay) === 3000 ? exposureMs : delay;
      return nativeSetTimeout.call(window, fn, effectiveDelay, ...args);
    };

    try {
      const result = baseRenderQuestion(animationClass);
      const help = $("help");
      if (help && memoryLock) {
        help.textContent = `內容只顯示 ${exposureSeconds} 秒；消失後作答不限時。`;
      }
      updateTimerUI();
      return result;
    } finally {
      window.setTimeout = nativeSetTimeout;
    }
  };
})();