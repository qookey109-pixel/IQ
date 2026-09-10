// Cognitive IQ Lab — deterministic answer-position balancing for QB v3.2
// Keeps every item's correct answer content unchanged while distributing
// correct positions evenly across A/B/C/D without a visible sequential pattern.

(() => {
  function hash32(value) {
    let h = 2166136261;
    for (const ch of String(value)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rotate(arr, offset) {
    if (!arr.length) return [];
    const n = ((offset % arr.length) + arr.length) % arr.length;
    return [...arr.slice(n), ...arr.slice(0, n)];
  }

  function moveKey(q, target) {
    const options = Array.isArray(q.o) ? q.o.map(String) : [];
    if (options.length !== 4 || !Number.isInteger(q.a) || q.a < 0 || q.a > 3) return q;
    const correct = options[q.a];
    const wrong = rotate(options.filter((_, i) => i !== q.a), hash32(`${q.id}:wrong`) % 3);
    const out = [];
    let wi = 0;
    for (let i = 0; i < 4; i++) out.push(i === target ? correct : wrong[wi++]);
    return { ...q, o: out, a: target, answerPositionBalanced: true };
  }

  const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
  const selected = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  if (!bank.length) return;

  const total = bank.length;
  const base = Math.floor(total / 4);
  const quotas = [base, base, base, base];
  for (let i = 0; i < total % 4; i++) quotas[i] += 1;

  const ranked = bank
    .map(q => ({ id: q.id, h: hash32(`${q.id}:position`) }))
    .sort((a, b) => a.h - b.h || String(a.id).localeCompare(String(b.id)));

  const targetById = new Map();
  for (const row of ranked) {
    const preferred = row.h % 4;
    let chosen = -1;
    for (let step = 0; step < 4; step++) {
      const pos = (preferred + step) % 4;
      if (quotas[pos] > 0) { chosen = pos; break; }
    }
    if (chosen < 0) throw new Error('Answer-position quota exhausted unexpectedly');
    targetById.set(row.id, chosen);
    quotas[chosen] -= 1;
  }

  const balancedBank = bank.map(q => moveKey(q, targetById.get(q.id)));
  const byId = new Map(balancedBank.map(q => [q.id, q]));
  const balancedSelected = selected.map(q => byId.get(q.id) || q);
  const counts = [0,0,0,0];
  balancedBank.forEach(q => { if (Number.isInteger(q.a) && q.a >= 0 && q.a < 4) counts[q.a] += 1; });

  window.IQ_QUESTION_BANK = balancedBank;
  window.IQ_QUESTIONS = balancedSelected;
  window.IQ_OPTION_QUALITY_REPORT = {
    ...(window.IQ_OPTION_QUALITY_REPORT || {}),
    correctPositionCounts: counts,
    correctPositionSpread: Math.max(...counts) - Math.min(...counts),
    answerPositionStrategy: 'hash-quota-balanced'
  };
})();