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
    <div style="font-size:12px;font-weight:900;letter-spacing:.08em;opacity:.68">SCORE STATUS</div>
    <div style="font-size:clamp(28px,4vw,48px);font-weight:950;line-height:1.05;margin-top:4px">CPI ONLY</div>
    <div style="margin-top:8px;font-size:13px;line-height:1.55;opacity:.78">
      ${ageText}目前產品主線只回報 0–100 的 Cognitive Performance Index。
      這個分數沒有建立人口常模，因此不提供 IQ、百分位或同齡排名。
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

  const rankedDomains = [...domains].sort((a, b) => stats[b].score - stats[a].score);
  const highestDomain = rankedDomains[0] || null;
  const lowestDomain = rankedDomains[rankedDomains.length - 1] || null;
  let desc = "這次結果只描述本次測驗內部的作答表現，不代表人口中的高低位置。";
  if (highestDomain && lowestDomain && highestDomain !== lowestDomain) {
    desc = `本次六構面中，${highestDomain} 的 CPI 分項最高，${lowestDomain} 較低；這是同一份測驗內的相對差異，不代表 IQ、百分位或同齡排名。`;
  }
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
  iqRequiresAgeNorms: true,
  productMode: 'cpi-only',
  iqConversionEnabled: false,
  populationPercentileAvailable: false
};
