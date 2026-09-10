// Timing behavior layered on top of app.js.
// Only questions with an explicit numeric `limit` use a countdown.
// Untimed questions still track elapsed time for reporting.
// Once a timed question reaches 00:00, it is permanently locked for that attempt.

let expiredQuestionsLock = Array(totalQuestions).fill(false);
let totalTimerInterval = null;
let totalStartMs = 0;
let finalTotalSeconds = 0;

function isTimedQuestion(index = currentIndex) {
  const q = questions[index];
  return Boolean(q && Number.isFinite(Number(q.limit)) && Number(q.limit) > 0);
}

function getQuestionLimit(index = currentIndex) {
  return isTimedQuestion(index) ? Number(questions[index].limit) : null;
}

function formatDuration(sec) {
  const value = Math.max(0, Math.floor(sec || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function currentTotalSeconds() {
  if (!totalStartMs) return finalTotalSeconds;
  return (Date.now() - totalStartMs) / 1000;
}

function updateTotalTimerUI() {
  const el = $("totalTimer");
  if (el) el.textContent = formatDuration(currentTotalSeconds());
}

function startTotalTimer() {
  if (totalTimerInterval) clearInterval(totalTimerInterval);
  totalStartMs = Date.now();
  finalTotalSeconds = 0;
  updateTotalTimerUI();
  totalTimerInterval = setInterval(updateTotalTimerUI, 250);
}

function stopTotalTimer() {
  if (totalStartMs) {
    finalTotalSeconds = currentTotalSeconds();
  }
  totalStartMs = 0;
  if (totalTimerInterval) clearInterval(totalTimerInterval);
  totalTimerInterval = null;
  updateTotalTimerUI();
}

const baseInitState = initState;
initState = function () {
  baseInitState();
  expiredQuestionsLock = Array(totalQuestions).fill(false);
  remainingTimes = questions.map(q =>
    Number.isFinite(Number(q.limit)) && Number(q.limit) > 0 ? Number(q.limit) : null
  );
  startTotalTimer();
};

const timingStyle = document.createElement("style");
timingStyle.textContent = `
  .timersPanel {
    display:flex;
    align-items:stretch;
    justify-content:flex-end;
    gap:12px;
    flex-wrap:wrap;
  }

  .timerWrap {
    min-width:132px;
    padding:12px;
    border-radius:18px;
    border:1px solid var(--line);
    background:#fff;
    box-shadow:var(--shadow-soft);
  }

  .timerWrap .timerLabel {
    text-align:center;
    margin-bottom:7px;
  }

  .timer {
    min-width:108px;
    box-shadow:none;
  }

  .timer.timedTimer {
    background:#fff4f1;
    border-color:#f2b8ab;
    color:#a93226;
    box-shadow:0 0 0 4px rgba(205,76,55,.07);
  }

  .timer.timedTimer.urgent {
    background:#fff0ee;
    border-color:#e58d7d;
    color:#9e2418;
    animation:timerPulse .85s ease-in-out infinite alternate;
  }

  .timer.untimedTimer {
    background:#f5f8fc;
    color:#60728a;
    border-color:#dbe3ee;
    font-size:18px;
  }

  .timer.totalTimer {
    background:linear-gradient(180deg,#f4f8ff,#edf4ff);
    color:var(--navy);
    border-color:#cfdcf2;
  }

  .questionTimeBadge {
    width:max-content;
    max-width:100%;
    display:inline-flex;
    align-items:center;
    gap:8px;
    margin:2px 0 4px;
    padding:10px 14px;
    border-radius:999px;
    font-size:15px;
    line-height:1.25;
    font-weight:950;
    letter-spacing:.1px;
    border:1px solid transparent;
  }

  .questionTimeBadge.timed {
    background:#fff1ed;
    border-color:#f0b5a8;
    color:#a93226;
    box-shadow:0 6px 18px rgba(169,50,38,.09);
  }

  .questionTimeBadge.untimed {
    background:#f2f6fb;
    border-color:#d8e2ef;
    color:#60728a;
  }

  .questionTimeBadge.memoryMode {
    background:#f2f2ff;
    border-color:#d8d6ff;
    color:#5046a8;
  }

  .dot.expired {
    background:#f5f6f8;
    color:#8d99aa;
    border-color:#d8dee8;
  }

  .dot.expired.current {
    background:#6f7c8f;
    color:#fff;
    border-color:transparent;
  }

  .timeoutState {
    grid-column:1 / -1;
    padding:20px;
    border-radius:18px;
    border:1px solid #e0e5ed;
    background:#f5f7fa;
    color:#68778c;
    font-size:18px;
    font-weight:900;
    text-align:center;
    line-height:1.6;
  }

  @keyframes timerPulse {
    from { transform:scale(1); box-shadow:0 0 0 4px rgba(205,76,55,.05); }
    to { transform:scale(1.025); box-shadow:0 0 0 7px rgba(205,76,55,.11); }
  }

  @media (max-width:900px) {
    .timersPanel {
      justify-content:flex-start;
      width:100%;
    }
    .timerWrap {
      flex:1;
      min-width:140px;
    }
  }
`;
document.head.appendChild(timingStyle);

function updateQuestionTimeIndicator() {
  const q = questions[currentIndex];
  const badge = $("questionTimeBadge");
  const label = $("timerLabel");
  const timer = $("timer");

  if (!q || !badge || !timer) return;

  badge.className = "questionTimeBadge";
  timer.classList.remove("timedTimer", "untimedTimer", "urgent");

  if (q.type === "memory" && !isTimedQuestion()) {
    badge.classList.add("memoryMode");
    badge.textContent = "記憶呈現 3 秒 · 作答不限時";
    if (label) label.textContent = "本題時間";
    timer.classList.add("untimedTimer");
    timer.textContent = "不限時";
    return;
  }

  if (isTimedQuestion()) {
    const limit = getQuestionLimit();
    badge.classList.add("timed");
    badge.textContent = `⏱ 限時 ${limit} 秒`;
    if (label) label.textContent = "本題倒數";
    timer.classList.add("timedTimer");
  } else {
    badge.classList.add("untimed");
    badge.textContent = "不限時";
    if (label) label.textContent = "本題時間";
    timer.classList.add("untimedTimer");
    timer.textContent = "不限時";
  }
}

updateTimerUI = function () {
  const timer = $("timer");
  if (!timer) return;

  updateQuestionTimeIndicator();

  if (!isTimedQuestion()) {
    timer.textContent = "不限時";
    return;
  }

  const seconds = Math.max(0, Number(remainingTimes[currentIndex]) || 0);
  timer.textContent = formatTime(seconds);
  timer.classList.toggle("urgent", seconds <= 5 && seconds > 0);
};

saveElapsedBeforeLeave = function () {
  if (!enteredAt) return;

  const now = Date.now();
  const spent = Math.max(0, (now - enteredAt) / 1000);

  if (isTimedQuestion()) {
    const before = Math.max(0, Number(remainingTimes[currentIndex]) || 0);
    const after = Math.max(0, before - spent);
    const actualSpent = before - after;
    remainingTimes[currentIndex] = after;
    elapsedTimes[currentIndex] += actualSpent;
  } else {
    elapsedTimes[currentIndex] += spent;
    remainingTimes[currentIndex] = null;
  }

  enteredAt = 0;
};

renderMiniNav = function () {
  const html = questions.map((q, i) => {
    const cls = [
      "dot",
      i === currentIndex ? "current" : "",
      answers[i] !== null ? "done" : "",
      expiredQuestionsLock[i] ? "expired" : ""
    ].join(" ").trim();
    return `<button class="${cls}" onclick="jumpTo(${i})">${i + 1}</button>`;
  }).join("");
  $("miniNav").innerHTML = html;
};

function expireCurrentQuestionLocked() {
  if (!isTimedQuestion() || expiredQuestionsLock[currentIndex]) return;

  stopTimer();
  enteredAt = 0;
  remainingTimes[currentIndex] = 0;
  expiredQuestionsLock[currentIndex] = true;

  const optionsEl = $("options");
  const helpEl = $("help");

  if (optionsEl) optionsEl.innerHTML = "";
  if (helpEl) helpEl.textContent = "時間已到，此題已鎖定，不能再作答。";

  $("skipBtn").disabled = true;
  updateTimerUI();
  renderMiniNav();

  const expiredIndex = currentIndex;
  setTimeout(() => {
    if (currentIndex !== expiredIndex) return;
    if (!expiredQuestionsLock[expiredIndex]) return;

    if (currentIndex < totalQuestions - 1) {
      animatedGoTo(currentIndex + 1, "next");
    } else {
      finishTest();
    }
  }, 700);
}

startTimer = function () {
  if (expiredQuestionsLock[currentIndex]) {
    updateTimerUI();
    return;
  }

  stopTimer();
  enteredAt = Date.now();
  updateTimerUI();

  if (!isTimedQuestion()) {
    return;
  }

  timerId = setInterval(() => {
    saveElapsedBeforeLeave();

    if (remainingTimes[currentIndex] <= 0) {
      remainingTimes[currentIndex] = 0;
      expireCurrentQuestionLocked();
      return;
    }

    enteredAt = Date.now();
    updateTimerUI();
  }, 250);
};

renderQuestion = function (animationClass = "") {
  stopTimer();

  const q = questions[currentIndex];
  $("counter").textContent = `第 ${currentIndex + 1} 題 / ${totalQuestions}`;
  $("domain").textContent = q.d;
  $("progressBar").style.width = `${(currentIndex / totalQuestions) * 100}%`;
  $("progressText").textContent = `${currentIndex + 1} / ${totalQuestions}`;
  $("prevBtn").disabled = currentIndex === 0;
  renderMiniNav();
  updateQuestionTimeIndicator();
  updateTotalTimerUI();

  const card = $("questionCard");
  const visualHolder = $("visualHolder");
  const questionEl = $("question");
  const helpEl = $("help");
  const optionsEl = $("options");

  card.className = "questionCard";
  if (animationClass) {
    void card.offsetWidth;
    card.classList.add(animationClass);
  }

  visualHolder.innerHTML = "";
  optionsEl.innerHTML = "";
  memoryLock = false;
  $("skipBtn").disabled = false;

  if (expiredQuestionsLock[currentIndex]) {
    questionEl.textContent = q.q;
    helpEl.textContent = "時間已到，此題已鎖定，不能再作答。";

    if (q.type === "matrix" && q.cells) {
      visualHolder.innerHTML = buildMatrix(q.cells);
    } else if (q.type === "memory") {
      visualHolder.innerHTML = `<div class="timeoutState">此題已逾時，記憶內容不再顯示。</div>`;
    } else if (q.visual) {
      visualHolder.innerHTML = `<div class="visual">${q.visual}</div>`;
    }

    optionsEl.innerHTML = `<div class="timeoutState">時間到 · 此題已鎖定</div>`;
    $("skipBtn").disabled = true;
    updateTimerUI();
    return;
  }

  if (q.type === "memory") {
    memoryLock = true;
    questionEl.textContent = "先記住以下內容";
    helpEl.textContent = "內容只顯示 3 秒；消失後作答不限時。";
    visualHolder.innerHTML = `<div class="visual memory" id="memoryStim">${q.stim}</div>`;
    updateTimerUI();

    setTimeout(() => {
      if (currentIndex >= totalQuestions || questions[currentIndex] !== q) return;
      if (expiredQuestionsLock[currentIndex]) return;

      const stim = $("memoryStim");
      if (stim) stim.textContent = "••••••";
      questionEl.textContent = q.q;
      helpEl.textContent = "現在依照記憶作答；這一題作答不限時。";
      drawOptions();
      memoryLock = false;
      startTimer();
    }, 3000);
  } else {
    questionEl.textContent = q.q;
    helpEl.textContent = isTimedQuestion()
      ? `這題限時 ${getQuestionLimit()} 秒，倒數結束後會鎖定。`
      : "這題不限時，請依自己的節奏選出最合理的答案。";

    if (q.type === "matrix" && q.cells) {
      visualHolder.innerHTML = buildMatrix(q.cells);
    } else if (q.visual) {
      visualHolder.innerHTML = `<div class="visual">${q.visual}</div>`;
    }

    drawOptions();
    startTimer();
  }

  function drawOptions() {
    if (expiredQuestionsLock[currentIndex]) {
      optionsEl.innerHTML = "";
      return;
    }

    optionsEl.innerHTML = q.o.map((opt, idx) => {
      const selected = answers[currentIndex] === idx ? "selected" : "";
      return `
        <button class="option ${selected}" onclick="selectAnswer(${idx})">
          <span style="opacity:.55;margin-right:8px">${String.fromCharCode(65 + idx)}.</span>${opt}
        </button>
      `;
    }).join("");
  }
};

selectAnswer = function (choice) {
  const timedAndExpired = isTimedQuestion() &&
    (expiredQuestionsLock[currentIndex] || Number(remainingTimes[currentIndex]) <= 0);

  if (memoryLock || isAnimating || timedAndExpired) return;

  answers[currentIndex] = choice;
  renderMiniNav();

  document.querySelectorAll(".option").forEach((el, idx) => {
    el.classList.toggle("selected", idx === choice);
  });

  setTimeout(() => {
    if (isTimedQuestion() && expiredQuestionsLock[currentIndex]) return;

    if (currentIndex < totalQuestions - 1) {
      animatedGoTo(currentIndex + 1, "next");
    } else {
      finishTest();
    }
  }, 170);
};

autoAdvanceAfterTimeout = function () {
  if (isAnimating || !isTimedQuestion()) return;
  expireCurrentQuestionLocked();
};

skipQuestion = function () {
  if (isAnimating || expiredQuestionsLock[currentIndex]) return;

  answers[currentIndex] = null;

  if (currentIndex < totalQuestions - 1) {
    animatedGoTo(currentIndex + 1, "next");
  } else {
    finishTest();
  }
};

const baseFinishTest = finishTest;
finishTest = function () {
  stopTotalTimer();
  baseFinishTest();

  const summary = $("resultSummary");
  if (summary && !summary.dataset.totalTimeAdded) {
    summary.textContent += ` · 總測驗時間 ${formatDuration(finalTotalSeconds)}`;
    summary.dataset.totalTimeAdded = "true";
  }
};

// app.js bound these handlers before this layer loaded, so rebind where needed.
$("skipBtn").onclick = skipQuestion;

// Initial UI before the first attempt starts.
if ($("totalTimer")) $("totalTimer").textContent = "00:00";
if ($("timer")) {
  $("timer").textContent = "不限時";
  $("timer").classList.add("untimedTimer");
}
updateQuestionTimeIndicator();
