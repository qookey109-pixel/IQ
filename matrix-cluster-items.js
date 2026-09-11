// Cognitive IQ Lab — symbol-cluster normalization for matrix items
// Converts repeated-symbol strings in the matrix-symbol-addition model into
// structured cluster markers so mobile rendering never depends on fitting
// 4–6 wide glyphs on one text line.

(() => {
  const PREFIX = "@@cluster:";

  function encodeRepeatedSymbol(value) {
    const chars = Array.from(String(value ?? ""));
    if (chars.length < 2 || chars.length > 6) return value;
    if (!chars.every(ch => ch === chars[0])) return value;
    return `${PREFIX}${chars[0]}:${chars.length}`;
  }

  const seen = new Set();
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (q.model !== "matrix-symbol-addition" || !Array.isArray(q.cells)) continue;
      q.cells = q.cells.map(cell => cell === "?" ? cell : encodeRepeatedSymbol(cell));
      q.matrixCellEncoding = "symbol-cluster-v1";
    }
  }

  window.IQ_MATRIX_CLUSTER_POLICY = {
    version: "1.0",
    prefix: PREFIX,
    model: "matrix-symbol-addition",
    maxClusterCount: 6,
    structuredQuestionBankCells: true
  };
})();
