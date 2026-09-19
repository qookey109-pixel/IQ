// Cognitive IQ Lab — assessment quality safeguards
// 1) Working-memory stimuli are presented only once per attempt.
// 2) Scoring v2 remains available internally for engineering consistency.
// 3) The public result is qualitative: no score, IQ, percentile, rank, or age norm is shown.
// 4) Playful titles describe only the relative shape of this attempt.
// 5) Sharing exports only qualitative result text; internal numeric diagnostics stay private to the runtime.

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

function resultTitleEngine() {
  const engine = window.IQ_RESULT_TITLE_ENGINE;
  if (!engine || typeof engine.buildProfile !== "function") {
    throw new Error("Qualitative result title engine is required but was not loaded.");
  }
  return engine;
}

function playfulDomainProfile(domain) {
  return resultTitleEngine().domainProfile(domain);
}

function buildPlayfulResult(domains, stats) {
  return resultTitleEngine().buildProfile(domains, stats);
}

function replayHistory() {
  const history = window.IQ_REPLAY_HISTORY;
  return history && typeof history.record === "function" ? history : null;
}

function renderReplayTrail(profile) {
  const holder = $("recentModes");
  const prompt = $("replayPrompt");
  const history = replayHistory();

  if (!history) {
    if (prompt) prompt.textContent = "再抽一份，看看下一次會去哪裡。";
    if (holder) holder.innerHTML = "";
    return {available:false, entries:[], previous:null, current:null};
  }

  const recorded = history.record(profile);
  if (prompt) prompt.textContent = history.describe(recorded);

  if (holder) {
    holder.innerHTML = recorded.entries.slice(-3).map((entry, index, rows) => {
      const current = index === rows.length - 1;
      return `
        <span class="recentModeChip${current ? " recentModeChipCurrent" : ""}">
          <span aria-hidden="true">${entry.emoji || "✨"}</span>
          <strong>${entry.title}</strong>
          ${current ? "<em>這次</em>" : ""}
        </span>
      `;
    }).join("");
  }

  return recorded;
}

function renderPlayfulHighlights(profile) {
  const holder = $("profileHighlights");
  if (!holder) return;
  holder.innerHTML = `
    <article class="profileHighlight">
      <span>主線索</span>
      <strong>${profile.primaryDomain}</strong>
      <p>今天最常先站到前面的解題方向。</p>
    </article>
    <article class="profileHighlight">
      <span>${profile.coLead ? "並列主線" : "副線索"}</span>
      <strong>${profile.secondaryDomain}</strong>
      <p>${profile.coLead ? "這次和另一條主線幾乎同時亮起來。" : "主線需要確認時，常接手補位的方向。"}</p>
    </article>
    <article class="profileHighlight profileHighlightWide">
      <span>今天的玩法</span>
      <strong>${profile.strategy}</strong>
      <p>換一份題目，路線可能會重新排列。</p>
    </article>
  `;
}

function renderBrainConstellation(domains, profile) {
  const holder = $("brainConstellation");
  if (!holder) return;

  const points = [
    {x:160,y:35,lx:160,ly:16,anchor:"middle"},
    {x:225,y:72,lx:270,ly:67,anchor:"middle"},
    {x:225,y:148,lx:270,ly:166,anchor:"middle"},
    {x:160,y:185,lx:160,ly:218,anchor:"middle"},
    {x:95,y:148,lx:50,ly:166,anchor:"middle"},
    {x:95,y:72,lx:50,ly:67,anchor:"middle"}
  ];
  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
  const nodes = domains.map((domain,index) => {
    const p = points[index];
    const isPrimary = domain === profile.primaryDomain;
    const isSecondary = domain === profile.secondaryDomain && !isPrimary;
    const role = isPrimary ? "主線" : (isSecondary ? (profile.coLead ? "並列主線" : "副線") : "");
    const cls = isPrimary ? "brainHexNode brainHexPrimary" :
      (isSecondary ? (profile.coLead ? "brainHexNode brainHexPrimary" : "brainHexNode brainHexSecondary") : "brainHexNode");
    const radius = isPrimary ? 10 : (isSecondary ? 8 : 6);
    return `
      <g class="${cls}" aria-label="${domain}${role ? `，${role}` : ""}">
        <circle cx="${p.x}" cy="${p.y}" r="${radius}"></circle>
        <text class="brainHexLabel" x="${p.lx}" y="${p.ly}" text-anchor="${p.anchor}">${domain}</text>
        ${role ? `<text class="brainHexRole" x="${p.lx}" y="${p.ly + 12}" text-anchor="${p.anchor}">${role}</text>` : ""}
      </g>
    `;
  }).join("");
  const spokes = points.map(p => `<line class="brainHexSpoke" x1="160" y1="110" x2="${p.x}" y2="${p.y}"></line>`).join("");

  holder.innerHTML = `
    <svg class="brainHexagonMap" viewBox="0 0 320 230" role="img" aria-label="六構面定性六邊形。只標示本次主線與副線，不表示分數高低。">
      <polygon class="brainHexGrid" points="${polygon}"></polygon>
      ${spokes}
      ${nodes}
    </svg>
  `;
}

function resultShareText(profile) {
  const pageUrl = (typeof window !== "undefined" && window.location)
    ? `${window.location.origin || ""}${window.location.pathname || ""}`
    : "";

  return [
    `${profile.emoji} 今天我的大腦模式：${profile.title}`,
    profile.signature,
    profile.summary,
    "Cognitive IQ Lab｜42 題認知遊戲",
    "不構成任何標準，好玩就好。",
    pageUrl
  ].filter(Boolean).join("\n");
}

async function copyResultText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = typeof document.execCommand === "function" && document.execCommand("copy");
  textarea.remove();
  return Boolean(ok);
}

function setShareStatus(message) {
  const status = $("shareStatus");
  if (!status) return;
  status.textContent = message || "";
  if (message) {
    window.setTimeout?.(() => {
      if (status.textContent === message) status.textContent = "";
    }, 2600);
  }
}

function bindResultSharing(profile) {
  const text = resultShareText(profile);
  const copyButton = $("copyResultBtn");
  const shareButton = $("shareResultBtn");

  if (copyButton) {
    copyButton.onclick = async () => {
      try {
        const copied = await copyResultText(text);
        setShareStatus(copied ? "結果文字已複製。" : "這個瀏覽器無法自動複製。");
      } catch {
        setShareStatus("這次沒有成功複製，可以直接截圖分享。");
      }
    };
  }

  if (shareButton) {
    shareButton.onclick = async () => {
      try {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          await navigator.share({
            title: `Cognitive IQ Lab · ${profile.title}`,
            text
          });
          setShareStatus("分享面板已開啟。");
          return;
        }

        const copied = await copyResultText(text);
        setShareStatus(copied ? "這個瀏覽器沒有分享面板，已改成複製結果。" : "可以直接截圖分享這張結果卡。");
      } catch (error) {
        if (error?.name !== "AbortError") setShareStatus("分享沒有完成，可以改用複製或截圖。");
      }
    };
  }

  return text;
}

function revealResultExperience() {
  const card = $("resultShareCard");
  if (!card) return;
  card.classList.remove("resultReveal");
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => card.classList.add("resultReveal"));
  } else {
    card.classList.add("resultReveal");
  }
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
  const signature = $("resultSignature");
  if (emoji) emoji.textContent = playful.emoji;
  if (title) title.textContent = playful.title;
  if (signature) signature.textContent = playful.signature;
  $("resultDesc").textContent = playful.description;
  $("resultSummary").textContent = playful.summary;
  renderPlayfulHighlights(playful);
  renderBrainConstellation(domains, playful);
  const replayRecord = renderReplayTrail(playful);
  const publicShareText = bindResultSharing(playful);
  revealResultExperience();

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
    const correctAnswer = q.o[q.a];
    return `
      <div class="reviewItem">
        <strong>${i+1}. [${q.d}] ${q.q}</strong>
        <div class="reviewVerdict ${isCorrect ? "ok" : "bad"}">
          ${isCorrect ? "✓ 正確" : "✕ 未答對"}
        </div>
        <div class="reviewAnswers">
          <span><b>你的答案：</b>${yourAnswer}</span>
          <span><b>正確答案：</b>${correctAnswer}</span>
        </div>
        <p class="reviewExplanation"><b>解析：</b>${q.e}</p>
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
    titleEngineVersion: playful.engineVersion,
    titleVariantId: playful.variantId,
    publicSignature: playful.signature,
    publicSummary: playful.summary,
    publicShareText,
    publicReplayHistoryAvailable: Boolean(replayRecord?.available),
    publicReplayHistoryCount: replayRecord?.entries?.length || 0,
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
  publicDomainVisualization: "qualitative-hexagon-no-scale",
  resultExperienceVersion: "1.3",
  titleEngineMode: "deterministic-30-directional-combinations",
  titleCombinationCount: 30,
  resultShareEnabled: true,
  shareIncludesNumericScore: false,
  replayHistoryEnabled: true,
  replayHistoryStorage: "local-browser-only",
  replayHistoryMaxEntries: 4,
  replayHistoryStoresNumericScores: false,
  replayHistoryStoresAnswers: false,
  replayHistoryUploadsAutomatically: false,
  ageInputRequired: false,
  practiceEnabled: false,
  practiceCount: 0,
  iqConversionEnabled: false,
  populationPercentileAvailable: false
};
