'use strict';

const DEFAULT_POLICY = require('./item-review-policy.json');

const ACTION_RANK = Object.freeze({ KEEP: 0, WATCH: 1, REVIEW: 2, REWRITE: 3, RETIRE: 4 });

function finite(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function truthy(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') return ['true', '1', 'yes', 'y', 'flagged'].includes(value.trim().toLowerCase());
  return false;
}

function escalate(current, candidate) {
  return ACTION_RANK[candidate] > ACTION_RANK[current] ? candidate : current;
}

function normalizeRow(row = {}) {
  return {
    itemId: String(row.itemId ?? row.id ?? ''),
    n: finite(row.n ?? row.exposures) ?? 0,
    p: finite(row.p ?? row.accuracy ?? row.proportionCorrect),
    discrimination: finite(row.discrimination ?? row.itemRest ?? row.a),
    skipRate: finite(row.skipRate),
    timeoutRate: finite(row.timeoutRate),
    medianLimitShare: finite(row.medianLimitShare),
    weakDistractors: finite(row.weakDistractors),
    wrongResponses: finite(row.wrongResponses),
    difFlag: truthy(row.difFlag ?? row.materialDif),
    difDeltaR2: finite(row.difDeltaR2 ?? row.deltaR2),
    difReplications: finite(row.difReplications) ?? 0,
    unresolvedFairness: truthy(row.unresolvedFairness),
    domain: row.domain ?? null,
    family: row.family ?? null,
    semanticKey: row.semanticKey ?? null
  };
}

function classifyItem(input, policy = DEFAULT_POLICY) {
  const row = normalizeRow(input);
  const reasons = [];
  let action = 'KEEP';

  if (!row.itemId) {
    return { ...row, action: 'REVIEW', reasons: ['missing item id'], autoMutationAllowed: false };
  }

  if (row.n < policy.minimumN.watch) {
    action = 'WATCH';
    reasons.push(`insufficient exposure N=${row.n} < ${policy.minimumN.watch}`);
  } else if (row.n < policy.minimumN.review) {
    action = 'WATCH';
    reasons.push(`collect more data before stable review N=${row.n}`);
  }

  const enoughReview = row.n >= policy.minimumN.review;
  const enoughRewrite = row.n >= policy.minimumN.rewrite;

  if (enoughReview && row.p != null) {
    if (row.p >= policy.difficulty.veryEasyP) {
      action = escalate(action, enoughRewrite ? 'REWRITE' : 'REVIEW');
      reasons.push(`very easy p=${row.p.toFixed(3)}`);
    } else if (row.p >= policy.difficulty.easyReviewP) {
      action = escalate(action, 'REVIEW');
      reasons.push(`easy item p=${row.p.toFixed(3)}`);
    }

    if (row.p <= policy.difficulty.veryHardP) {
      action = escalate(action, enoughRewrite ? 'REWRITE' : 'REVIEW');
      reasons.push(`very hard p=${row.p.toFixed(3)}`);
    } else if (row.p <= policy.difficulty.hardReviewP) {
      action = escalate(action, 'REVIEW');
      reasons.push(`hard item p=${row.p.toFixed(3)}`);
    }
  }

  if (enoughReview && row.discrimination != null) {
    if (row.discrimination < 0 && policy.discrimination.negativeAlwaysReview) {
      action = escalate(action, enoughRewrite ? 'REWRITE' : 'REVIEW');
      reasons.push(`negative discrimination ${row.discrimination.toFixed(3)}`);
    } else if (row.discrimination < policy.discrimination.rewriteBelow && enoughRewrite) {
      action = escalate(action, 'REWRITE');
      reasons.push(`very low discrimination ${row.discrimination.toFixed(3)}`);
    } else if (row.discrimination < policy.discrimination.reviewBelow) {
      action = escalate(action, 'REVIEW');
      reasons.push(`low discrimination ${row.discrimination.toFixed(3)}`);
    }
  }

  if (enoughReview && row.skipRate != null && row.skipRate >= policy.timing.skipRateReview) {
    action = escalate(action, 'REVIEW');
    reasons.push(`high skip rate ${(row.skipRate * 100).toFixed(1)}%`);
  }
  if (enoughReview && row.timeoutRate != null && row.timeoutRate >= policy.timing.timeoutRateReview) {
    action = escalate(action, 'REVIEW');
    reasons.push(`high timeout rate ${(row.timeoutRate * 100).toFixed(1)}%`);
  }
  if (enoughReview && row.medianLimitShare != null && row.medianLimitShare >= policy.timing.medianLimitShareReview) {
    action = escalate(action, 'REVIEW');
    reasons.push(`median response time near limit ${(row.medianLimitShare * 100).toFixed(1)}%`);
  }

  if (
    enoughReview &&
    row.wrongResponses != null &&
    row.wrongResponses >= policy.distractors.minimumWrongResponses &&
    row.weakDistractors != null &&
    row.weakDistractors > 0
  ) {
    action = escalate(action, 'REVIEW');
    reasons.push(`${row.weakDistractors} weak distractor(s)`);
  }

  const materialDif = row.difFlag || (row.difDeltaR2 != null && row.difDeltaR2 >= policy.dif.materialDeltaR2);
  if (enoughReview && materialDif) {
    action = escalate(action, enoughRewrite ? 'REWRITE' : 'REVIEW');
    reasons.push(`material age DIF${row.difDeltaR2 == null ? '' : ` ΔR²=${row.difDeltaR2.toFixed(3)}`}`);
  }

  if (
    policy.dif.unresolvedRepeatedFlagAction === 'RETIRE' &&
    row.unresolvedFairness &&
    row.difReplications >= 2
  ) {
    action = 'RETIRE';
    reasons.push(`unresolved fairness issue replicated ${row.difReplications} times`);
  }

  if (action === 'KEEP' && !reasons.length) reasons.push('no current engineering review signal');

  return {
    ...row,
    action,
    reasons,
    autoMutationAllowed: false
  };
}

function buildReviewQueue(rows, policy = DEFAULT_POLICY) {
  const items = (Array.isArray(rows) ? rows : []).map(row => classifyItem(row, policy));
  const counts = Object.fromEntries(Object.keys(ACTION_RANK).map(action => [action, 0]));
  items.forEach(item => { counts[item.action] += 1; });
  const queue = items
    .filter(item => item.action !== 'KEEP')
    .sort((a, b) => ACTION_RANK[b.action] - ACTION_RANK[a.action] || b.n - a.n || a.itemId.localeCompare(b.itemId));

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    safety: {
      autoRewrite: false,
      autoChangeAnswerKey: false,
      requiresGeneratorLevelFix: true,
      requiresRegressionGates: true
    },
    counts,
    queue,
    items
  };
}

module.exports = {
  ACTION_RANK,
  DEFAULT_POLICY,
  normalizeRow,
  classifyItem,
  buildReviewQueue
};
