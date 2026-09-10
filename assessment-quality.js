// Cognitive IQ Lab — assessment quality safeguards
// 1) Working-memory stimuli are presented only once per attempt.
// 2) Processing-speed bonus is awarded only on correct timed responses.

let memoryStimulusSeen = Array(totalQuestions).fill(false);

const qualityBaseInitState = initState;
initState = function () {
  qualityBaseInitState();
  memoryStimulusSeen = Array(totalQuestions).fill(false);
};

const qualityBaseRenderQuestion = renderQuestion;
renderQuestion = function (animationClass = "") {
  const q = questions[currentIndex];

  if (q && q.type === "memory") {
    if (memoryStimulusSeen[currentIndex]) {
      const originalType = q.type;
      const originalVisual = q.visual;
      q.type = "normal";
      q.visual = null;

      try {
        qualityBaseRenderQuestion(animationClass);
        const helpEl = $("help");
        if (helpEl) {
          helpEl.textContent = "記憶內容每次測驗只呈現一次；返回此題不會重新顯示刺激。";
        }
      } finally {
        q.type = originalType;
        q.visual = originalVisual;
      }
      return;
    }

    // Mark as exposed immediately. Leaving early does not grant a second presentation.
    memoryStimulusSeen[currentIndex] = true;
  }

  qualityBaseRenderQuestion(animationClass);
};

finishTest = function () {
  saveElapsedBeforeLeave();
  stopTimer();
  stopTotalTimer();

  $("quiz").classList.add("hidden");
  $("result").classList.remove("hidden");

  const domains = [...new Set(questions.map(q => q.d))];
  const stats = {};

  domains.forEach(d => {
    const ids = questions.map((q, i) => q.d === d ? i : -1).filter(i => i >= 0);
    const timedIds = ids.filter(i => {
      const limit = Number(questions[i].limit);
      return Number.isFinite(limit) && limit > 0;
    });
    const correct = ids.filter(i => answers[i] === questions[i].a).length;
    const accuracy = correct / ids.length;
    const avgTime = ids.reduce((sum, i) => sum + elapsedTimes[i], 0) / ids.length;

    let speed = null;
    let perf = Math.round(accuracy * 100);

    if (timedIds.length > 0) {
      const speedTotal = timedIds.reduce((sum, i) => {
        // Speed contributes only when the answer is correct.
        if (answers[i] !== questions[i].a) return sum;

        const limit = Number(questions[i].limit);
        const spent = Math.max(0, elapsedTimes[i]);
        const efficiency = Math.max(0, Math.min(1, 1 - (spent / limit)));
        return sum + efficiency;
      }, 0);

      speed = speedTotal / timedIds.length;
      perf = Math.round((accuracy * 0.9 + speed * 0.1) * 100);
    }

    stats[d] = {
      perf,
      accuracy: Math.round(accuracy * 100),
      avgTime,
      timed: timedIds.length > 0
    };
  });

  const overall = domains.reduce((sum, d) => sum + stats[d].perf, 0) / domains.length;
  const correctCount = questions.filter((q, i) => answers[i] === q.a).length;
  const skippedCount = answers.filter(a => a === null).length;
  const wrongCount = totalQuestions - correctCount - skippedCount;
  const index = Math.max(70, Math.min(130, Math.round(70 + overall * 0.6)));

  $("indexScore").textContent = index;
  $("resultSummary").textContent =
    `答對 ${correctCount} / ${totalQuestions} 題；整體構面表現 ${Math.round(overall)}% · 總測驗時間 ${formatDuration(finalTotalSeconds)}`;

  let desc = "這次整體表現位於本站題庫的中間區間。";
  if (index >= 120) desc = "這次呈現非常強的綜合推理表現。";
  else if (index >= 110) desc = "這次在多個認知構面中呈現偏強表現。";
  else if (index < 90) desc = "這次部分構面較吃力，也可能受疲勞或時間壓力影響。";
  $("resultDesc").textContent = desc;

  $("metrics").innerHTML = domains.map(d => `
    <div class="metric">
      <div class="metricTop"><strong>${d}</strong><strong>${stats[d].perf}</strong></div>
      <div class="track"><div class="fill" style="width:${stats[d].perf}%"></div></div>
      <div class="metricMeta">
        正確率 ${stats[d].accuracy}% · 平均 ${stats[d].avgTime.toFixed(1)} 秒 ·
        ${stats[d].timed ? "限時題：只有答對時速度才加分" : "不限時題不因速度扣分"}
      </div>
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

  window.IQ_LAST_RESULT = {
    bankVersion: window.IQ_BANK_META?.version || null,
    bankRevision: window.IQ_BANK_META?.revision || null,
    overall: Math.round(overall),
    cognitiveIndex: index,
    correct: correctCount,
    total: totalQuestions,
    totalSeconds: finalTotalSeconds,
    domains: stats
  };

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.IQ_QUALITY_META = {
  memoryStimulusReplay: false,
  speedBonusRequiresCorrect: true
};
