// Cognitive IQ Lab — assessment quality safeguards
// 1) Working-memory stimuli are presented only once per attempt.
// 2) Scoring v2 remains available internally for engineering consistency.
// 3) The public result is qualitative: no score, IQ, percentile, rank, or age norm is shown.
// 4) Playful titles describe only the relative shape of this attempt.

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

const PLAYFUL_DOMAIN_PROFILES = {
  "語文理解": {
    emoji: "📚",
    title: "文字解碼師",
    cue: "文字線索",
    action: "先拆文字裡的關鍵線索"
  },
  "流體推理": {
    emoji: "🧩",
    title: "規律捕手",
    cue: "規律推理",
    action: "先找藏在題目裡的規律"
  },
  "視覺空間": {
    emoji: "🧭",
    title: "空間導航員",
    cue: "空間結構",
    action: "先看位置、方向與結構"
  },
  "工作記憶": {
    emoji: "🧠",
    title: "記憶收藏家",
    cue: "短期記憶",
    action: "先抓住剛出現的關鍵資訊"
  },
  "處理速度": {
    emoji: "⚡",
    title: "閃電掃描員",
    cue: "快速辨識",
    action: "先快速掃描差異與相同點"
  },
  "量化推理": {
    emoji: "🔢",
    title: "數字拆解師",
    cue: "數字關係",
    action: "先把數字關係拆成小步驟"
  }
};

function playfulDomainProfile(domain) {
  return PLAYFUL_DOMAIN_PROFILES[domain] || {
    emoji: "✨",
    title: "腦內探險家",
    cue: domain || "多線索",
    action: "先找出最有用的線索"
  };
}

function buildPlayfulResult(domains, stats) {
  const ordered = domains
    .map((domain, index) => ({ domain, index, score: Number(stats[domain]?.score) || 0 }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));

  const top = ordered[0]?.domain || domains[0] || "多線索";
  const second = ordered[1]?.domain || top;
  const topScore = ordered[0]?.score ?? 0;
  const topTies = ordered.filter(row => row.score === topScore);
  const primary = playfulDomainProfile(top);
  const secondary = playfulDomainProfile(second);

  if (topTies.length > 1) {
    const tiedNames = topTies.slice(0, 3).map(row => row.domain);
    return {
      emoji: "✨",
      title: "多線探索者",
      primaryDomain: tiedNames[0] || top,
      secondaryDomain: tiedNames[1] || second,
      summary: `這次最有存在感的方向不只一個：${tiedNames.join("、")}一起冒出頭。`,
      strategy: "你這次沒有只靠單一路線解題，而是讓不同線索輪流接手。",
      description: "這個稱號只描述這一次作答裡相對突出的方向，不是能力等級、固定人格或任何正式標準。"
    };
  }

  return {
    emoji: primary.emoji,
    title: primary.title,
    primaryDomain: top,
    secondaryDomain: second,
    summary: `今天最有存在感的是${primary.cue}；${secondary.cue}也成了很明顯的第二條線索。`,
    strategy: `${primary.action}，再用${secondary.cue}交叉確認。`,
    description: "這個稱號只描述這一次作答裡相對突出的方向，不是能力等級、固定人格或任何正式標準。"
  };
}

function renderPlayfulHighlights(profile) {
  const holder = $("profileHighlights");
  if (!holder) return;
  holder.innerHTML = `
    <article class="profileHighlight">
      <span>主線索</span>
      <strong>${profile.primaryDomain}</strong>
      <p>這次作答裡最常站到前面的方向。</p>
    </article>
    <article class="profileHighlight">
      <span>副線索</span>
      <strong>${profile.secondaryDomain}</strong>
      <p>另一條很有存在感的解題路線。</p>
    </article>
    <article class="profileHighlight profileHighlightWide">
      <span>今天的玩法</span>
      <strong>${profile.strategy}</strong>
      <p>不是固定人格；換一份題目，結果可能會換一種樣子。</p>
    </article>
  `;
}

finishTest = function () {
  saveElapsedBeforeLeave();
  settleTimedQuestions();
  stopTimer();
  stopTotalTimer();

  $("quiz").classList.add("hidden");
  $("result").classList.remove("hidden");

  const scoring = window.IQ_SCORING_V2;
  if (!scoring) throw new Error("Scoring v2 is required but was not loaded.");
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
  const playful = buildPlayfulResult(domains, stats);

  const emoji = $("resultEmoji");
  const title = $("playfulTitle");
  if (emoji) emoji.textContent = playful.emoji;
  if (title) title.textContent = playful.title;
  $("resultDesc").textContent = playful.description;
  $("resultSummary").textContent = playful.summary;
  renderPlayfulHighlights(playful);

  // Keep quantitative diagnostics available to the internal runtime only.
  // The corresponding DOM is hidden from the public result experience.
  $("indexScore").textContent = Math.round(performanceIndex);
  $("metrics").innerHTML = domains.map(d => {
    const row = stats[d];
    return `
      <div class="metric">
        <div class="metricTop"><strong>${d}</strong><strong>${row.perf}</strong></div>
        <div class="track"><div class="fill" style="width:${row.perf}%"></div></div>
        <div class="metricMeta">raw ${row.accuracy}% · weighted ${row.weightedAccuracy}% · ${row.avgTime.toFixed(1)}s</div>
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
        <div class="${isCorrect ? "ok" : "bad"}" style="margin-top:6px">
          ${isCorrect ? "✓ 正確" : "✕ 未答對"} · 你的答案：${yourAnswer}
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
    calibrated: false,
    iqEstimate: null,
    iqStatus: "not-population-normed",
    publicResultMode: "qualitative-playful",
    publicScoreVisible: false,
    publicQuantitativeStandard: false,
    playfulTitle: playful.title,
    playfulEmoji: playful.emoji,
    focusDomains: [playful.primaryDomain, playful.secondaryDomain]
  };

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.IQ_QUALITY_META = {
  memoryStimulusReplay: false,
  speedBonusRequiresCorrect: true,
  scoringVersion: "2.0",
  scoringScale: "0-100-experimental-internal",
  populationNormed: false,
  iqEstimateAvailable: false,
  iqRequiresAgeNorms: true,
  productMode: "qualitative-playful",
  internalScoringMode: "cpi-only",
  publicResultMode: "qualitative-playful",
  publicScoreVisible: false,
  publicQuantitativeStandard: false,
  ageInputRequired: false,
  iqConversionEnabled: false,
  populationPercentileAvailable: false
};
