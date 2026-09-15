// Cognitive IQ Lab — matrix symbol-cluster renderer v2
// Final renderer override. New filename intentionally busts stale mobile Safari asset caches.
// Internal @@cluster markers must never be visible to the user.

(() => {
  const PREFIX = "@@cluster:";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseCluster(value) {
    const text = String(value ?? "");
    if (text.indexOf(PREFIX) !== 0) return null;
    const payload = text.slice(PREFIX.length);
    const splitAt = payload.lastIndexOf(":");
    if (splitAt <= 0) return null;

    const symbol = payload.slice(0, splitAt);
    const count = Number(payload.slice(splitAt + 1));
    if (!symbol || !Number.isInteger(count) || count < 2 || count > 6) return null;
    return { symbol, count };
  }

  function renderCluster(cluster) {
    let glyphs = "";
    for (let i = 0; i < cluster.count; i++) {
      glyphs += `<span class="matrixSymbolGlyph" aria-hidden="true">${escapeHtml(cluster.symbol)}</span>`;
    }
    return `<span class="matrixSymbolCluster count-${cluster.count}" role="img" aria-label="${escapeHtml(cluster.symbol)} 共 ${cluster.count} 個">${glyphs}</span>`;
  }

  function densityClass(value) {
    const cluster = parseCluster(value);
    if (cluster) return `cluster-cell cluster-${cluster.count}`;
    const length = Array.from(String(value ?? "").replace(/\s/g, "")).length;
    if (length >= 6) return "density-6";
    if (length === 5) return "density-5";
    if (length === 4) return "density-4";
    if (length === 3) return "density-3";
    return "density-normal";
  }

  buildMatrix = function (cells) {
    return `<div class="matrixGrid">${cells.map(cell => {
      const cluster = parseCluster(cell);
      const missing = cell === "?" ? " missing" : "";
      const density = densityClass(cell);
      const body = cluster ? renderCluster(cluster) : escapeHtml(cell);
      return `<div class="matrixCell${missing} ${density}">${body}</div>`;
    }).join("")}</div>`;
  };

  window.IQ_MATRIX_CLUSTER_RENDERER = {
    version: "2.0",
    prefix: PREFIX,
    cacheSafeFilename: true,
    internalMarkersVisible: false
  };
})();
