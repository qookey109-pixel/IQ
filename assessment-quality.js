// Cognitive IQ Lab — assessment quality safeguards
// 1) Working-memory stimuli are presented only once per attempt.
// 2) Scoring v2 keeps raw accuracy visible and uses transparent design-difficulty weights.
// 3) Processing-speed efficiency contributes only after a correct timed response.

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

  const scoring = window.IQ_SCORING_V2;
  if (!scoring) throw new Error('Scoring v2 is required but was not loaded.');
  const report = scoring.scoreAssessment(questions, answers, elapsedTimes);
  const domains = Object.keys(report.domains);
  const stats = {};

  domains.forEach(d => {
    const ids = questions.map((q, i) => q.d === d ? i : -1).filter(i => i >= 0);
    const avgTime = ids.reduce((sum, i) => sum + elapsedTimes[i], 0) / Math.max(1, ids.length);
    const row = report.domains[d];
    stats[d] = {
      perf: Math.round(row.score),
      score: row.score,
      accuracy: row.rawAccuracy,
      weightedAccuracy: row.weightedAccuracy,
      speedEfficiency: row.speedEfficiency,
      avgTime,
      timed: row.timed
    };
  });

  const correctCount = report.rawCorrect;
  const skippedCount = report.skipped;
  const wrongCount = totalQuestions - correctCount - skippedCount;
  const performanceIndex = report.performanceIndex;

  $("indexScore").textContent = Math.round(performanceIndex);
  $("resultSummary").textContent =
    `答對 ${correctCount} / ${totalQuestions} 題（原始正確率 ${report.rawAccuracy}%）；設計難度加權後的綜合表現 ${performanceIndex} / 100 · 總測驗時間 ${formatDuration(finalTotalSeconds)}`;

  let desc = "這次是本站題庫下的一次實驗性認知表現快照。";
  if (performanceIndex >= 85) desc = "這次在本站設計難度下呈現很強的整體表現。";
  else if (performanceIndex >= 70) desc = "這次在多個構面呈現穩定、偏強的表現。";
  else if (performanceIndex >= 55) desc = "這次各構面有強弱差異，可以從分項結果看出主要落差。";
  else desc = "這次部分構面較吃力，也可能受到疲勞、注意力或時間壓力影響。";
  $("resultDesc").textContent = desc;

  $("metrics").innerHTML = domains.map(d => {
    const row = stats[d];
    const speedText = row.timed && row.speedEfficiency != null
      ? ` · 答對後速度效率 ${row.speedEfficiency}%`
      : '';
    return `
      <div class="metric">
        <div class="metricTop"><strong>${d}</strong><strong>${row.perf}</strong></div>
        <div class="track"><div class="fill" style="width:${row.perf}%"></div></div>
        <div class="metricMeta">
          原始正確率 ${row.accuracy}% · 難度加權正確率 ${row.weightedAccuracy}%${speedText} · 平均 ${row.avgTime.toFixed(1)} 秒
        </div>
      </div>
    `;
  }).join("");

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
    scoringVersion: report.version,
    scale: report.scale,
    performanceIndex,
    rawAccuracy: report.rawAccuracy,
    correct: correctCount,
    total: totalQuestions,
    totalSeconds: finalTotalSeconds,
    domains: report.domains,
    calibrated: false
  };

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.IQ_QUALITY_META = {
  memoryStimulusReplay: false,
  speedBonusRequiresCorrect: true,
  scoringVersion: '2.0',
  scoringScale: '0-100-experimental',
  populationNormed: false
};
