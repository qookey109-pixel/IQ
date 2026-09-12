// QB5 form-equivalence layer.
// Keeps the fixed 6×5 / 2 easy + 2 medium + 1 hard blueprint, then minimizes
// residual load differences between random forms using only design metadata.
(() => {
  'use strict';
  const E = window.QB5E;
  if (!E) return;

  const DOMAINS = ['語文理解','流體推理','視覺空間','工作記憶','處理速度','量化推理'];
  const BASE = { easy: 1, medium: 2, hard: 3 };

  function countTokens(value) {
    return String(value || '').split(/[　\s；;，,]+/).filter(Boolean).length;
  }

  function itemLoad(q) {
    let load = BASE[q?.difficulty] || 2;
    const promptLength = [...String(q?.q || '')].length;
    load += Math.min(0.45, Math.max(0, promptLength - 48) / 220);

    if (q?.type === 'memory') {
      load += Math.min(0.55, Math.max(0, countTokens(q.stim) - 4) * 0.08);
    }

    if (q?.d === '視覺空間') {
      const size = Number(q?.diagramData?.size);
      if (Number.isFinite(size)) load += Math.max(0, size - 6) * 0.12;
      const blocked = Array.isArray(q?.diagramData?.blocked) ? q.diagramData.blocked.length : 0;
      load += Math.min(0.35, blocked * 0.025);
      if (q?.type === 'matrix') load += 0.18;
    }

    if (q?.d === '流體推理') {
      const constraints = (String(q.q || '').match(/；/g) || []).length;
      load += Math.min(0.3, constraints * 0.06);
    }

    return Math.round(load * 1000) / 1000;
  }

  function attach(bank) {
    for (const q of bank) q.formLoad = itemLoad(q);
    const targets = {};
    for (const domain of DOMAINS) {
      const group = bank.filter(q => q.d === domain);
      const mean = level => {
        const xs = group.filter(q => q.difficulty === level).map(q => q.formLoad);
        return xs.length ? xs.reduce((a,b) => a+b, 0) / xs.length : BASE[level];
      };
      const easy = mean('easy'), medium = mean('medium'), hard = mean('hard');
      targets[domain] = {
        easy, medium, hard,
        total: 2 * easy + 2 * medium + hard
      };
    }
    window.IQ_FORM_EQUIVALENCE_TARGETS = targets;
    return targets;
  }

  function evaluate(form, targets = window.IQ_FORM_EQUIVALENCE_TARGETS || {}) {
    const domains = {};
    let squared = 0, maxAbsPct = 0;
    for (const domain of DOMAINS) {
      const items = form.filter(q => q.d === domain);
      const total = items.reduce((sum,q) => sum + itemLoad(q), 0);
      const target = Number(targets?.[domain]?.total) || total || 1;
      const delta = total - target;
      const pct = delta / target;
      squared += pct * pct;
      maxAbsPct = Math.max(maxAbsPct, Math.abs(pct));
      domains[domain] = {
        total: Math.round(total * 1000) / 1000,
        target: Math.round(target * 1000) / 1000,
        delta: Math.round(delta * 1000) / 1000,
        deltaPct: Math.round(pct * 10000) / 100
      };
    }
    return {
      rmsPct: Math.round(Math.sqrt(squared / DOMAINS.length) * 10000) / 100,
      maxAbsPct: Math.round(maxAbsPct * 10000) / 100,
      domains
    };
  }

  function pickBest(generateCandidate, trials = 64) {
    let best = null;
    for (let i = 0; i < trials; i++) {
      const form = generateCandidate();
      const metrics = evaluate(form);
      const score = metrics.maxAbsPct * 10 + metrics.rmsPct;
      if (!best || score < best.score) best = { form, metrics, score, trials };
    }
    return best;
  }

  window.QB5_FORM_EQUIVALENCE = {
    version: '1.0',
    domains: [...DOMAINS],
    itemLoad,
    attach,
    evaluate,
    pickBest,
    trials: 64,
    principle: 'fixed quotas plus minimum residual design-load deviation'
  };
})();
