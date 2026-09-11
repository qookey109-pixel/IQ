// Cognitive IQ Lab — compact symbol normalization for matrix items
// Repeated symbols are converted to narrower visual equivalents directly in the
// question data. No internal marker string is ever exposed to renderers, so
// old/new Safari asset mixes still show valid symbols rather than debug text.

(() => {
  const COMPACT = Object.freeze({
    "●": "•",
    "○": "◦",
    "■": "▪",
    "□": "▫",
    "★": "✦",
    "☆": "✧",
    "▲": "▴",
    "△": "▵",
    "◆": "♦",
    "◇": "♢"
  });

  function compactRepeatedSymbol(value) {
    const chars = Array.from(String(value ?? ""));
    if (chars.length < 2 || chars.length > 6) return value;
    if (!chars.every(ch => ch === chars[0])) return value;
    const compact = COMPACT[chars[0]] || chars[0];
    return compact.repeat(chars.length);
  }

  const seen = new Set();
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (q.model !== "matrix-symbol-addition" || !Array.isArray(q.cells)) continue;
      q.cells = q.cells.map(cell => cell === "?" ? cell : compactRepeatedSymbol(cell));
      q.matrixCellEncoding = "compact-glyph-v2";
    }
  }

  window.IQ_MATRIX_CLUSTER_POLICY = {
    version: "2.0",
    model: "matrix-symbol-addition",
    maxSymbolCount: 6,
    internalMarkers: false,
    compactVisibleGlyphs: true
  };
})();