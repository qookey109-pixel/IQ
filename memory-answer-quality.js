// Cognitive IQ Lab — Working Memory Answer Quality v2
// Makes memory choices harder to guess from formatting alone.
// Each distractor follows the requested transformation but contains a small
// memory error, so the user must remember the stimulus rather than spot an
// obviously unsorted / malformed option.

(() => {
  const DIGITS = ["1","2","3","4","5","6","7","8","9"];
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

  const tokens = value => String(value || "").trim().split(/\s+/).filter(Boolean);
  const join = arr => arr.join(" ");
  const asc = arr => [...arr].sort((a,b) => Number(a) - Number(b));
  const desc = arr => [...arr].sort((a,b) => Number(b) - Number(a));

  function deriveCorrect(q) {
    const stim = tokens(q.stim);
    switch (q.model) {
      case "memory-sort":
        return asc(stim);
      case "memory-reverse":
        return [...stim].reverse();
      case "memory-extract-letters":
        return stim.filter(x => /^[A-Z]$/.test(x));
      case "memory-extract-sort":
        return desc(stim.filter(x => /^\d$/.test(x)));
      case "memory-select-reverse": {
        const picked = [1,3,5,7].map(i => stim[i]);
        return picked.reverse();
      }
      case "memory-select-sort": {
        const picked = [0,2,4,6].map(i => stim[i]);
        return asc(picked);
      }
      default:
        return null;
    }
  }

  function numericReplacement(current, used, directionSeed = 1) {
    const n = Number(current);
    const candidates = [];
    for (let delta = 1; delta <= 8; delta++) {
      const first = directionSeed % 2 ? n - delta : n + delta;
      const second = directionSeed % 2 ? n + delta : n - delta;
      if (first >= 1 && first <= 9) candidates.push(String(first));
      if (second >= 1 && second <= 9) candidates.push(String(second));
    }
    return candidates.find(x => !used.has(x) && x !== current) ||
      DIGITS.find(x => !used.has(x) && x !== current) || current;
  }

  function letterReplacement(current, used, directionSeed = 1) {
    const idx = Math.max(0, LETTERS.indexOf(current));
    for (let delta = 1; delta < LETTERS.length; delta++) {
      const offsets = directionSeed % 2 ? [-delta, delta] : [delta, -delta];
      for (const offset of offsets) {
        const candidate = LETTERS[(idx + offset + LETTERS.length) % LETTERS.length];
        if (!used.has(candidate) && candidate !== current) return candidate;
      }
    }
    return current;
  }

  function mutateOne(correct, model, seed) {
    const out = [...correct];
    const pos = ((seed * 2 + correct.length) % correct.length + correct.length) % correct.length;
    const used = new Set(correct);
    const current = out[pos];

    if (/^[0-9]$/.test(current)) {
      out[pos] = numericReplacement(current, used, seed);
    } else {
      out[pos] = letterReplacement(current, used, seed);
    }

    if (model === "memory-sort" || model === "memory-select-sort") return asc(out);
    if (model === "memory-extract-sort") return desc(out);
    return out;
  }

  function buildDistractors(correct, model, seed) {
    const values = [];
    for (let attempt = 0; attempt < 24 && values.length < 3; attempt++) {
      const candidate = join(mutateOne(correct, model, seed + attempt));
      if (candidate !== join(correct) && !values.includes(candidate)) values.push(candidate);
    }

    // Defensive fallback: use a two-position near miss only if three unique
    // one-position variants were not possible.
    for (let attempt = 0; values.length < 3 && attempt < 24; attempt++) {
      let candidate = mutateOne(correct, model, seed + attempt + 31);
      candidate = mutateOne(candidate, model, seed + attempt + 67);
      const value = join(candidate);
      if (value !== join(correct) && !values.includes(value)) values.push(value);
    }

    return values.slice(0,3);
  }

  function upgradeMemoryItem(q) {
    if (!q || q.d !== "工作記憶" || q.type !== "memory") return;
    const correct = deriveCorrect(q);
    if (!correct || !correct.length) return;

    const correctText = join(correct);
    const distractors = buildDistractors(correct, q.model, Number(String(q.id).match(/(\d+)$/)?.[1] || 1));
    if (distractors.length !== 3) return;

    const options = Array(4);
    options[q.a] = correctText;
    let di = 0;
    for (let i = 0; i < 4; i++) {
      if (i === q.a) continue;
      options[i] = distractors[di++];
    }

    q.o = options;
    q.e = `依照剛才看到的內容與指定規則，正確答案為 ${correctText}。`;
    q.memoryOptionQuality = "task-consistent-near-miss-v2";
  }

  const seen = new Set();
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      upgradeMemoryItem(q);
    }
  }

  window.IQ_MEMORY_OPTION_QUALITY = {
    version: "2.0",
    upgradedItems: [...seen].filter(q => q?.d === "工作記憶" && q?.memoryOptionQuality).length,
    principle: "all choices follow the task; distractors contain small recall errors",
    deriveCorrect
  };
})();
