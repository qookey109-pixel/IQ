const questions = window.IQ_QUESTIONS;
const totalQuestions = questions.length;

const $ = id => document.getElementById(id);

let currentIndex = 0;
let answers = [];
let elapsedTimes = [];
let remainingTimes = [];
let timerId = null;
let enteredAt = 0;
let memoryLock = false;
let isAnimating = false;

function initState() {
  answers = Array(totalQuestions).fill(null);
  elapsedTimes = Array(totalQuestions).fill(0);
  remainingTimes = questions.map(q => q.limit || 30);
  currentIndex = 0;
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `00:${String(s).padStart(2,"0")}`;
}

function updateTimerUI() {
  $("timer").textContent = formatTime(remainingTimes[currentIndex]);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function saveElapsedBeforeLeave() {
  if (!enteredAt) return;
  const now = Date.now();
  const spent = (now - enteredAt) / 1000;
  const before = remainingTimes[currentIndex];
  const after = Math.max(0, before - spent);
  const actualSpent = before - after;
  remainingTimes[currentIndex] = after;
  elapsedTimes[currentIndex] += actualSpent;
  enteredAt = 0;
}

function startTimer() {
  stopTimer();
  enteredAt = Date.now();
  updateTimerUI();
  timerId = setInterval(() => {
    saveElapsedBeforeLeave();
    enteredAt = Date.now();
    updateTimerUI();
    if (remainingTimes[currentIndex] <= 0) {
      stopTimer();
      autoAdvanceAfterTimeout();
    }
  }, 1000);
}

function renderMiniNav() {
  const html = questions.map((q, i) => {
    const cls = [
      "dot",
      i === currentIndex ? "current" : "",
      answers[i] !== null ? "done" : ""
    ].join(" ").trim();
    return `<button class="${cls}" onclick="jumpTo(${i})">${i+1}</button>`;
  }).join("");
  $("miniNav").innerHTML = html;
}

function buildMatrix(cells) {
  return `<div class="matrixGrid">${cells.map((cell, idx) => {
    const missing = cell === "?" ? " missing" : "";
    return `<div class="matrixCell${missing}">${cell}</div>`;
  }).join("")}</div>`;
}

function renderQuestion(animationClass = "") {
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

  if (q.type === "memory") {
    memoryLock = true;
    questionEl.textContent = "先記住以下內容";
    helpEl.textContent = "3 秒後會隱藏，再開始作答。";
    visualHolder.innerHTML = `<div class="visual memory" id="memoryStim">${q.stim}</div>`;
    updateTimerUI();
    setTimeout(() => {
      if (currentIndex >= totalQuestions || questions[currentIndex] !== q) return;
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
    helpEl.textContent = q.type === "speed" ? "這題時間較短，請快速辨識。" : "請選出最合理的答案。";
    if (q.type === "matrix" && q.cells) {
      visualHolder.innerHTML = buildMatrix(q.cells);
    } else if (q.visual) {
      visualHolder.innerHTML = `<div class="visual">${q.visual}</div>`;
    }
    drawOptions();
    startTimer();
  }

  function drawOptions() {
    optionsEl.innerHTML = q.o.map((opt, idx) => {
      const selected = answers[currentIndex] === idx ? "selected" : "";
      return `
        <button class="option ${selected}" onclick="selectAnswer(${idx})">
          <span style="opacity:.55;margin-right:8px">${String.fromCharCode(65+idx)}.</span>${opt}
        </button>
      `;
    }).join("");
  }
}

function animatedGoTo(target, direction = "next") {
  if (isAnimating) return;
  saveElapsedBeforeLeave();
  stopTimer();
  isAnimating = true;
  const card = $("questionCard");
  const outClass = direction === "prev" ? "slide-out-right" : "slide-out-left";
  const inClass = direction === "prev" ? "slide-in-left" : "slide-in-right";
  card.className = "questionCard " + outClass;
  setTimeout(() => {
    currentIndex = target;
    renderQuestion(inClass);
    setTimeout(() => { isAnimating = false; }, 280);
  }, 200);
}

function selectAnswer(choice) {
  if (memoryLock || isAnimating) return;
  answers[currentIndex] = choice;
  renderMiniNav();
  document.querySelectorAll(".option").forEach((el, idx) => {
    el.classList.toggle("selected", idx === choice);
  });
  setTimeout(() => {
    if (currentIndex < totalQuestions - 1) {
      animatedGoTo(currentIndex + 1, "next");
    } else {
      finishTest();
    }
  }, 170);
}

function autoAdvanceAfterTimeout() {
  if (isAnimating) return;
  if (currentIndex < totalQuestions - 1) animatedGoTo(currentIndex + 1, "next");
  else finishTest();
}

function jumpTo(target) {
  if (target === currentIndex || isAnimating) return;
  const direction = target < currentIndex ? "prev" : "next";
  animatedGoTo(target, direction);
}

function previousQuestion() {
  if (currentIndex === 0 || isAnimating) return;
  animatedGoTo(currentIndex - 1, "prev");
}

function skipQuestion() {
  if (isAnimating) return;
  answers[currentIndex] = null;
  if (currentIndex < totalQuestions - 1) animatedGoTo(currentIndex + 1, "next");
  else finishTest();
}

function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function renderRadar(domains, stats) {
  const svg = $("radarChart");
  const cx = 160, cy = 130, maxR = 90;
  let html = "";
  [20,40,60,80,100].forEach(level => {
    const pts = domains.map((d, idx) => {
      const ang = idx * (360/domains.length);
      const [x,y] = polarPoint(cx, cy, maxR * (level/100), ang);
      return `${x},${y}`;
    }).join(" ");
    html += `<polygon points="${pts}" fill="none" stroke="#d8e1ee" stroke-width="1"/>`;
  });
  domains.forEach((d, idx) => {
    const ang = idx * (360/domains.length);
    const [x,y] = polarPoint(cx, cy, maxR, ang);
    html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#d8e1ee"/>`;
    const [lx,ly] = polarPoint(cx, cy, maxR+22, ang);
    html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#445770">${d}</text>`;
  });
  const performancePoints = domains.map((d, idx) => {
    const ang = idx * (360/domains.length);
    const [x,y] = polarPoint(cx, cy, maxR * (stats[d].perf/100), ang);
    return `${x},${y}`;
  }).join(" ");
  html += `<polygon points="${performancePoints}" fill="rgba(37,99,214,.18)" stroke="#173b72" stroke-width="2"/>`;
  domains.forEach((d, idx) => {
    const ang = idx * (360/domains.length);
    const [x,y] = polarPoint(cx, cy, maxR * (stats[d].perf/100), ang);
    html += `<circle cx="${x}" cy="${y}" r="4" fill="#2563d6"/>`;
  });
  svg.innerHTML = html;
}

function donutPath(cx, cy, r, startAngle, endAngle) {
  const rad = Math.PI / 180;
  const x1 = cx + r * Math.cos((startAngle-90) * rad);
  const y1 = cy + r * Math.sin((startAngle-90) * rad);
  const x2 = cx + r * Math.cos((endAngle-90) * rad);
  const y2 = cy + r * Math.sin((endAngle-90) * rad);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function renderDonut(correct, wrong, skipped) {
  const total = correct + wrong + skipped || 1;
  const svg = $("donutChart");
  const cx = 120, cy = 130, r = 72;
  const vals = [
    {label:"答對", value:correct, color:"#173b72"},
    {label:"答錯", value:wrong, color:"#2563d6"},
    {label:"未作答", value:skipped, color:"#bfcadd"}
  ];
  let angle = 0;
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e9eff7" stroke-width="22"/>`;
  vals.forEach(v => {
    const span = 360 * (v.value / total);
    const end = angle + span;
    if (span > 0) {
      html += `<path d="${donutPath(cx, cy, r, angle, end)}" fill="none" stroke="${v.color}" stroke-width="22" stroke-linecap="round"/>`;
    }
    angle = end;
  });
  html += `<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="34" font-weight="900" fill="#122238">${correct}</text>`;
  html += `<text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="13" fill="#71839b">答對題數</text>`;
  const legendX = 225;
  vals.forEach((v, i) => {
    const y = 90 + i*34;
    html += `<rect x="${legendX}" y="${y-10}" width="12" height="12" rx="3" fill="${v.color}"/>`;
    html += `<text x="${legendX+20}" y="${y}" font-size="13" fill="#445770">${v.label}：${v.value}</text>`;
  });
  svg.innerHTML = html;
}

function renderBars(domains, stats) {
  const svg = $("barChart");
  const w = 620, h = 280;
  const left = 110, right = 20, top = 24, bottom = 34;
  const chartW = w - left - right, chartH = h - top - bottom;
  const barH = 24, gap = 12;
  let html = "";
  [0,25,50,75,100].forEach(t => {
    const x = left + chartW * (t/100);
    html += `<line x1="${x}" y1="${top}" x2="${x}" y2="${h-bottom}" stroke="#edf2f8"/>`;
    html += `<text x="${x}" y="${h-10}" text-anchor="middle" font-size="11" fill="#71839b">${t}</text>`;
  });
  domains.forEach((d, i) => {
    const y = top + i*(barH+gap);
    const bw = chartW * (stats[d].perf/100);
    html += `<text x="${left-10}" y="${y+16}" text-anchor="end" font-size="13" fill="#445770">${d}</text>`;
    html += `<rect x="${left}" y="${y}" width="${chartW}" height="${barH}" rx="12" fill="#edf2f8"/>`;
    html += `<rect x="${left}" y="${y}" width="${bw}" height="${barH}" rx="12" fill="url(#barGrad)"/>`;
    html += `<text x="${left + Math.max(28, bw - 10)}" y="${y+16}" text-anchor="end" font-size="12" font-weight="900" fill="${bw > 60 ? '#fff' : '#173b72'}">${stats[d].perf}</text>`;
  });
  const defs = `<defs><linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#173b72"/><stop offset="100%" stop-color="#2563d6"/></linearGradient></defs>`;
  svg.innerHTML = defs + html;
}

function finishTest() {
  saveElapsedBeforeLeave();
  stopTimer();
  $("quiz").classList.add("hidden");
  $("result").classList.remove("hidden");

  const domains = [...new Set(questions.map(q => q.d))];
  const stats = {};

  domains.forEach(d => {
    const ids = questions.map((q, i) => q.d === d ? i : -1).filter(i => i >= 0);
    const correct = ids.filter(i => answers[i] === questions[i].a).length;
    const accuracy = correct / ids.length;
    const avgTime = ids.reduce((sum, i) => sum + elapsedTimes[i], 0) / ids.length;
    const avgLimit = ids.reduce((sum, i) => sum + (questions[i].limit || 30), 0) / ids.length;
    const speed = Math.max(0, Math.min(1, 1 - (avgTime / avgLimit)));
    const perf = Math.round((accuracy * 0.9 + speed * 0.1) * 100);
    stats[d] = {
      perf,
      accuracy: Math.round(accuracy * 100),
      avgTime
    };
  });

  const overall = domains.reduce((sum, d) => sum + stats[d].perf, 0) / domains.length;
  const correctCount = questions.filter((q, i) => answers[i] === q.a).length;
  const skippedCount = answers.filter(a => a === null).length;
  const wrongCount = totalQuestions - correctCount - skippedCount;
  const index = Math.max(70, Math.min(130, Math.round(70 + overall * 0.6)));

  $("indexScore").textContent = index;
  $("resultSummary").textContent = `答對 ${correctCount} / ${totalQuestions} 題；整體構面表現 ${Math.round(overall)}%。`;

  let desc = "這次整體表現位於本站題庫的中間區間。";
  if (index >= 120) desc = "這次呈現非常強的綜合推理表現。";
  else if (index >= 110) desc = "這次在多個認知構面中呈現偏強表現。";
  else if (index < 90) desc = "這次部分構面較吃力，也可能受疲勞或時間壓力影響。";
  $("resultDesc").textContent = desc;

  $("metrics").innerHTML = domains.map(d => `
    <div class="metric">
      <div class="metricTop"><strong>${d}</strong><strong>${stats[d].perf}</strong></div>
      <div class="track"><div class="fill" style="width:${stats[d].perf}%"></div></div>
      <div class="metricMeta">正確率 ${stats[d].accuracy}% · 平均 ${stats[d].avgTime.toFixed(1)} 秒</div>
    </div>
  `).join("");

  renderRadar(domains, stats);
  renderDonut(correctCount, wrongCount, skippedCount);
  renderBars(domains, stats);

  $("review").innerHTML = "<h3>逐題解析</h3>" + questions.map((q, i) => {
    const isCorrect = answers[i] === q.a;
    const yourAnswer = answers[i] === null ? "跳過 / 未作答" : q.o[answers[i]];
    return `
      <div class="reviewItem">
        <strong>${i+1}. [${q.d}] ${q.q}</strong>
        <div class="${isCorrect ? 'ok' : 'bad'}" style="margin-top:6px">
          ${isCorrect ? '✓ 正確' : '✕ 未答對'} · 你的答案：${yourAnswer}
        </div>
        <p>${q.e}</p>
      </div>
    `;
  }).join("");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("aboutBtn").onclick = () => $("about").classList.toggle("hidden");
$("startBtn").onclick = () => {
  initState();
  $("start").classList.add("hidden");
  $("result").classList.add("hidden");
  $("quiz").classList.remove("hidden");
  renderQuestion("slide-in-right");
};
$("prevBtn").onclick = previousQuestion;
$("skipBtn").onclick = skipQuestion;
$("restartBtn").onclick = () => {
  initState();
  $("result").classList.add("hidden");
  $("quiz").classList.remove("hidden");
  renderQuestion("slide-in-right");
};
$("reviewBtn").onclick = () => $("review").classList.toggle("hidden");

initState();
