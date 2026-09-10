// Cognitive IQ Lab — low-fatigue presentation layer
// Presentation-only rewrite: keeps item IDs, answer keys and scoring intact while
// removing redundant visual clutter from spatial and processing-speed items.

(() => {
  function simplifySpatial(q) {
    // Spatial prompts already contain the information needed to solve the item.
    // Keep their arrow glyphs and wording exactly as authored; remove only the
    // duplicated visual panel that repeated the same transformation sequence.
    q.visual = null;
    q.presentationMode = "text-only";
    q.presentationReason = "duplicate-spatial-visual-removed-arrows-preserved";
  }

  function parseVisualGroups(visual) {
    return String(visual ?? "")
      .trim()
      .split(/\s{2,}|\n+/)
      .map(part => part.trim())
      .filter(Boolean);
  }

  function ordinalFromLabel(label) {
    const m = String(label ?? "").match(/([1-4])/);
    return m ? Number(m[1]) : null;
  }

  function mapBalancedLabelsToValues(labels, values, formatter = value => value) {
    return labels.map((label, fallbackIndex) => {
      const ordinal = ordinalFromLabel(label);
      const sourceIndex = ordinal ? ordinal - 1 : fallbackIndex;
      return formatter(values[sourceIndex], sourceIndex);
    });
  }

  function simplifySpeed(q) {
    const raw = String(q.visual ?? "");
    if (!raw) return;

    if (q.model === "speed-target-match") {
      const lines = raw.split(/\n+/).map(line => line.trim()).filter(Boolean);
      const target = (lines.shift() || "").replace(/^目標：/, "").trim();
      const candidates = parseVisualGroups(lines.join("   "));
      if (target && candidates.length === 4) {
        q.o = mapBalancedLabelsToValues(q.o, candidates, value => String(value));
        q.q = `目標：${target}。找出完全相同的字串。`;
        q.visual = null;
        q.e = `正確答案是 ${target}。`;
        q.presentationMode = "direct-speed";
        q.presentationReason = "candidate-values-moved-into-answer-buttons";
      }
      return;
    }

    if (q.model === "speed-odd-group") {
      const groups = parseVisualGroups(raw);
      if (groups.length === 4) {
        q.o = mapBalancedLabelsToValues(
          q.o,
          groups,
          (value, sourceIndex) => `${sourceIndex + 1} · ${String(value)}`
        );
        q.q = "找出與其他三組不同的一組。";
        q.visual = null;
        q.e = `正確答案是 ${q.o[q.a]}；其中符號順序與其他三組不同。`;
        q.presentationMode = "direct-speed";
        q.presentationReason = "symbol-groups-moved-into-answer-buttons";
      }
    }
  }

  const seen = new Set();
  const collections = [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS];
  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (q.d === "視覺空間") simplifySpatial(q);
      else if (q.d === "處理速度") simplifySpeed(q);
      else if (q.type === "matrix") q.presentationMode = "essential-visual";
      else if (q.type === "memory") q.presentationMode = "single-stimulus";
      else q.presentationMode = "text-first";
    }
  }

  window.IQ_PRESENTATION_CLARITY = {
    version: "1.3",
    palette: ["warm-ivory", "ink-brown", "bronze"],
    spatialTextOnly: true,
    spatialArrowsPreserved: true,
    directSpeedOptions: true,
    principle: "show each piece of information once, where the user acts on it"
  };
})();
