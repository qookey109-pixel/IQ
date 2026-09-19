// Cognitive IQ Lab — Scoring v2
// Transparent 0–100 experimental performance scoring. This is not an IQ norm.
(() => {
  'use strict';

  const DIFFICULTY_WEIGHT = Object.freeze({ easy: 1.0, medium: 1.25, hard: 1.5 });
  const SPEED_SHARE = 0.05;

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const round1 = value => Math.round((Number(value) || 0) * 10) / 10;

  function itemWeight(q) {
    return DIFFICULTY_WEIGHT[q?.difficulty] || 1;
  }

  function isTimed(q) {
    const limit = Number(q?.limit);
    return Number.isFinite(limit) && limit > 0;
  }

  function speedEfficiency(q, answerIndex, elapsedSeconds) {
    if (!isTimed(q) || answerIndex !== q.a) return 0;
    if (elapsedSeconds == null || elapsedSeconds === '') return 0;
    const numericSpent = Number(elapsedSeconds);
    if (!Number.isFinite(numericSpent) || numericSpent < 0) return 0;
    const limit = Number(q.limit);
    return clamp01(1 - numericSpent / limit);
  }

  function scoreDomain(items, answers = [], elapsedTimes = []) {
    const answerList = Array.isArray(answers) ? answers : [];
    const elapsedList = Array.isArray(elapsedTimes) ? elapsedTimes : [];
    const rows = items.map(({ q, index }) => {
      const weight = itemWeight(q);
      const correct = answerList[index] === q.a;
      return {
        q,
        index,
        weight,
        correct,
        speedEfficiency: speedEfficiency(q, answerList[index], elapsedList[index])
      };
    });

    const maxWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
    const earnedWeight = rows.reduce((sum, row) => sum + (row.correct ? row.weight : 0), 0);
    const weightedAccuracy = earnedWeight / maxWeight;
    const rawAccuracy = rows.length ? rows.filter(row => row.correct).length / rows.length : 0;
    const timed = rows.filter(row => isTimed(row.q));

    let speed = null;
    let score = weightedAccuracy * 100;
    if (timed.length) {
      const timedWeight = timed.reduce((sum, row) => sum + row.weight, 0) || 1;
      speed = timed.reduce((sum, row) => sum + row.speedEfficiency * row.weight, 0) / timedWeight;
      // Processing-speed score remains accuracy-dominant. Speed only refines the final 5%.
      score = (weightedAccuracy * (1 - SPEED_SHARE) + speed * SPEED_SHARE) * 100;
    }

    return {
      score: round1(score),
      rawAccuracy: round1(rawAccuracy * 100),
      weightedAccuracy: round1(weightedAccuracy * 100),
      speedEfficiency: speed == null ? null : round1(speed * 100),
      maxWeight: round1(maxWeight),
      earnedWeight: round1(earnedWeight),
      timed: timed.length > 0
    };
  }

  function scoreAssessment(questions = [], answers = [], elapsedTimes = []) {
    const questionList = Array.isArray(questions) ? questions : [];
    const answerList = Array.isArray(answers) ? answers : [];
    const elapsedList = Array.isArray(elapsedTimes) ? elapsedTimes : [];
    const domains = [...new Set(questionList.map(q => q.d))];
    const domainScores = {};

    for (const domain of domains) {
      const items = questionList
        .map((q, index) => ({ q, index }))
        .filter(row => row.q.d === domain);
      domainScores[domain] = scoreDomain(items, answerList, elapsedList);
    }

    const values = domains.map(domain => domainScores[domain].score);
    const performanceIndex = values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const rawCorrect = questionList.filter((q, i) => answerList[i] === q.a).length;
    const skipped = questionList.filter((_, i) => answerList[i] == null).length;

    return {
      version: '2.0',
      scale: '0-100-experimental',
      performanceIndex,
      rawCorrect,
      rawTotal: questionList.length,
      rawAccuracy: questionList.length ? round1(rawCorrect / questionList.length * 100) : 0,
      skipped,
      domains: domainScores,
      difficultyWeights: { ...DIFFICULTY_WEIGHT },
      speedShare: SPEED_SHARE,
      calibrated: false,
      note: 'Experimental cognitive-play score; not population-normed IQ.'
    };
  }

  window.IQ_SCORING_V2 = {
    version: '2.0',
    difficultyWeights: { ...DIFFICULTY_WEIGHT },
    speedShare: SPEED_SHARE,
    itemWeight,
    isTimed,
    speedEfficiency,
    scoreDomain,
    scoreAssessment
  };
})();
