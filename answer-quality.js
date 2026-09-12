// Cognitive IQ Lab — QB4 option-quality audit
// Audits option structure and obvious answer cues without rewriting authored QB4 items.
(() => {
  'use strict';

  function classifyOption(value) {
    const s = String(value ?? '').trim();
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return 'number';
    if (/^\d+\s*:\s*\d+$/.test(s)) return 'ratio';
    if (/^[↑↗→↘↓↙←↖]+$/.test(s)) return 'direction';
    if (/^[●■▲◆○□△◇★✦◆◇□■▲△•◦]+$/u.test(s)) return 'symbol';
    if (/^\(?-?\d+\s*,\s*-?\d+\)?$/.test(s)) return 'coordinate';
    return 'text';
  }

  function optionCueFlags(q) {
    const flags = [];
    const opts = Array.isArray(q.o) ? q.o.map(String) : [];
    if (opts.length !== 4 || new Set(opts).size !== 4) flags.push('option-uniqueness');
    if (!Number.isInteger(q.a) || q.a < 0 || q.a >= opts.length) return [...flags, 'invalid-key'];

    const correct = opts[q.a];
    const wrong = opts.filter((_, i) => i !== q.a);
    const types = opts.map(classifyOption);
    const counts = new Map();
    types.forEach(type => counts.set(type, (counts.get(type) || 0) + 1));
    const majorityType = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if (majorityType && classifyOption(correct) !== majorityType) flags.push('format-cue');

    const compactLen = value => Array.from(String(value).replace(/\s/g, '')).length;
    const clen = compactLen(correct);
    const wlens = wrong.map(compactLen).sort((a,b)=>a-b);
    const median = wlens[1] || 1;
    if (Math.abs(clen - median) >= 5 && (clen > median * 1.9 || clen < median * 0.48)) flags.push('length-cue');

    return flags;
  }

  const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
  const selected = Array.isArray(window.IQ_QUESTIONS) ? window.IQ_QUESTIONS : [];
  if (!bank.length) return;

  const byId = new Map();
  let cueRiskItems = 0;
  const positions = [0,0,0,0];
  const modelSummary = {};

  for (const q of bank) {
    q.optionCueFlags = optionCueFlags(q);
    q.distractorDesign = q.distractorDesign || 'qb4-family-native';
    if (q.optionCueFlags.length) cueRiskItems += 1;
    if (Number.isInteger(q.a) && q.a >= 0 && q.a < 4) positions[q.a] += 1;
    modelSummary[q.model] = (modelSummary[q.model] || 0) + 1;
    byId.set(q.id, q);
  }

  window.IQ_QUESTIONS = selected.map(q => byId.get(q.id) || q);
  window.IQ_BANK_META = {
    ...(window.IQ_BANK_META || {}),
    optionQualityVersion: '4.0-audit',
    optionQualityMode: 'audit-only-no-item-rewrite'
  };
  window.IQ_OPTION_QUALITY_REPORT = {
    revision: window.IQ_BANK_META?.revision || '4.0',
    totalItems: bank.length,
    cueRiskItems,
    correctPositionCounts: positions,
    correctPositionSpread: Math.max(...positions) - Math.min(...positions),
    modelSummary,
    generatedAt: new Date().toISOString()
  };
  window.IQ_OPTION_AUDIT = { version:'4.0', classifyOption, optionCueFlags };
})();