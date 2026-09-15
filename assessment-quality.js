// Cognitive IQ Lab — assessment quality safeguards
// 1) Working-memory stimuli are presented only once per attempt.
// 2) Scoring v2 keeps raw accuracy visible and uses transparent design-difficulty weights.
// 3) Processing-speed efficiency contributes only after a correct timed response.
// 4) IQ is never fabricated from CPI before age-normed calibration exists.

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

function renderIqCalibrationStatus(performanceIndex) {
  const scoreCard = document.querySelector(".scoreCard");
  if (!scoreCard) return;

  let panel = document.getElementById("iqCalibrationStatus");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "iqCalibrationStatus";
    panel.style.cssText = [
      "margin:0 0 18px",
      "padding:14px 16px",
      "border:1px solid rgba(124,88,55,.24)",
      "border-radius:16px",
      "background:rgba(255,255,255,.42)"
    ].join(";");
    scoreCard.insertAdjacentElement("afterbegin", panel);
  }

  const profile = window.IQ_PARTICIPANT_PROFILE || null;
  const ageText = profile?.ageBand ? `你目前選擇的年齡層為 ${profile.ageBand} 歲。` : "";
  panel.innerHTML = `
    <div style="font-size:12px;font-weight:900;letter-spacing:.08em;opacity:.68">IQ ESTIMATE</div>
    <div style="font-size:clamp(28px,4vw,48px);font-weight:950;line-height:1.05;margin-top:4px">尚未校準</div>
    <div style="margin-top:8px;font-size:13px;line-height:1.55;opacity:.78">
      ${ageText}目前尚未建立足夠的同齡常模、信度與效度資料，因此不能把 CPI ${Math.round(performanceIndex)} 任意換算成 IQ。
      常模完成後，這裡才會顯示 IQ 估計、百分位與信賴區間。
    </div>`;
}

finishTest = function () {
  saveElapsedBeforeLeave();
  settleTimedQuestions();
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

  renderIqCalibrationStatus(performanceIndex);

  $("indexScore").textContent = Math.round(performanceIndex);
  $("resultSummary").textContent =
    `答對 ${correctCount} / ${totalQuestions} 題（原始正確率 ${report.rawAccuracy}%）；目前可回報的 Cognitive Performance Index 為 ${performanceIndex} / 100 · 總測驗時間 ${formatDuration(finalTotalSeconds)}`;

  let desc = "這次是本站題庫下的一次實驗性認知表現快照；IQ 仍需同齡常模後才能估計。";
  if (performanceIndex >= 85) desc = "這次在本站設計難度下呈現很強的整體表現；目前仍不能直接換算成 IQ。";
  else if (performanceIndex >= 70) desc = "這次在多個構面呈現穩定、偏強的表現；IQ 仍待常模校準。";
  else if (performanceIndex >= 55) desc = "這次各構面有強弱差異，可以從分項結果看出主要落差；IQ 仍待常模校準。";
  else desc = "這次部分構面較吃力，也可能受到疲勞、注意力或時間壓力影響；IQ 仍待常模校準。";
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

  const profile = window.IQ_PARTICIPANT_PROFILE || null;
  window.IQ_LAST_RESULT = {
    bankVersion: window.IQ_BANK_META?.version || null,
    bankRevision: window.IQ_BANK_META?.revision || null,
    scoringVersion: report.version,
    scale: report.scale,
    performanceIndex,
    iqEstimate: null,
    iqStatus: 'not-population-normed',
    ageYears: profile?.ageYears ?? null,
    ageBand: profile?.ageBand ?? null,
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
  populationNormed: false,
  iqEstimateAvailable: false,
  iqRequiresAgeNorms: true
};
