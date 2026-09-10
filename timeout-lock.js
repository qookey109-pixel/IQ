// Timed-question lock behavior layered on top of app.js.
// Once a question reaches 00:00, it is permanently locked for that attempt.

let expiredQuestionsLock = Array(totalQuestions).fill(false);

const baseInitState = initState;
initState = function () {
  baseInitState();
  expiredQuestionsLock = Array(totalQuestions).fill(false);
};

const timeoutStyle = document.createElement("style");
timeoutStyle.textContent = `
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
`;
document.head.appendChild(timeoutStyle);

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
  if (expiredQuestionsLock[currentIndex]) return;

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
  if (expiredQuestionsLock[currentIndex]) return;

  stopTimer();
  enteredAt = Date.now();
  updateTimerUI();

  timerId = setInterval(() => {
    saveElapsedBeforeLeave();
    enteredAt = Date.now();
    updateTimerUI();

    if (remainingTimes[currentIndex] <= 0) {
      remainingTimes[currentIndex] = 0;
      expireCurrentQuestionLocked();
    }
  }, 1000);
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

    optionsEl.innerHTML = `<div class="timeoutState">時間到 · 此題沒有可選答案</div>`;
    $("skipBtn").disabled = true;
    updateTimerUI();
    return;
  }

  if (q.type === "memory") {
    memoryLock = true;
    questionEl.textContent = "先記住以下內容";
    helpEl.textContent = "3 秒後會隱藏，再開始作答。";
    visualHolder.innerHTML = `<div class="visual memory" id="memoryStim">${q.stim}</div>`;
    updateTimerUI();

    setTimeout(() => {
      if (currentIndex >= totalQuestions || questions[currentIndex] !== q) return;
      if (expiredQuestionsLock[currentIndex]) return;

      const stim = $("memoryStim");
      if (stim) stim.textContent = "••••••";
      questionEl.textContent = q.q;
      helpEl.textContent = "現在依照記憶作答。";
      drawOptions();
      memoryLock = false;
      startTimer();
    }, 3000);
  } else {
    questionEl.textContent = q.q;
    helpEl.textContent = q.type === "speed"
      ? "這題時間較短，請快速辨識。"
      : "請選出最合理的答案。";

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
  if (
    memoryLock ||
    isAnimating ||
    expiredQuestionsLock[currentIndex] ||
    remainingTimes[currentIndex] <= 0
  ) return;

  answers[currentIndex] = choice;
  renderMiniNav();

  document.querySelectorAll(".option").forEach((el, idx) => {
    el.classList.toggle("selected", idx === choice);
  });

  setTimeout(() => {
    if (expiredQuestionsLock[currentIndex]) return;

    if (currentIndex < totalQuestions - 1) {
      animatedGoTo(currentIndex + 1, "next");
    } else {
      finishTest();
    }
  }, 170);
};

autoAdvanceAfterTimeout = function () {
  if (isAnimating) return;
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

// app.js bound skipQuestion before this layer loaded, so rebind it.
$("skipBtn").onclick = skipQuestion;
