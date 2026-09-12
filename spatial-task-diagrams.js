// QB4 spatial task diagrams
// Adds a compact, responsive diagram to shortest-grid-path items and removes
// the wording ambiguity between "counting grid cells" and "moving one step".
(() => {
  'use strict';

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function buildGridDiagram(east, north) {
    const eastLabel = `向東 ${east} 格`;
    const northLabel = `向北 ${north} 格`;
    return `
      <svg class="spatialDiagram" viewBox="0 0 620 260" role="img"
           aria-label="起點在左下，終點位於東方 ${esc(east)} 格、北方 ${esc(north)} 格的格線示意圖"
           style="display:block;width:min(100%,620px);height:auto;margin:0 auto;overflow:visible">
        <defs>
          <pattern id="grid-${east}-${north}" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(120,91,60,.18)" stroke-width="1"/>
          </pattern>
          <marker id="arrow-${east}-${north}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#a96f3e"/>
          </marker>
        </defs>

        <rect x="42" y="30" width="470" height="175" rx="16" fill="rgba(255,252,244,.54)" stroke="rgba(169,111,62,.28)"/>
        <rect x="58" y="46" width="438" height="143" fill="url(#grid-${east}-${north})"/>

        <line x1="78" y1="172" x2="476" y2="172" stroke="#a96f3e" stroke-width="3" stroke-dasharray="7 7" opacity=".78"/>
        <line x1="476" y1="172" x2="476" y2="62" stroke="#a96f3e" stroke-width="3" stroke-dasharray="7 7" opacity=".78"/>

        <circle cx="78" cy="172" r="8" fill="#5e4029"/>
        <circle cx="476" cy="62" r="8" fill="#a96f3e"/>
        <text x="78" y="198" text-anchor="middle" font-size="14" font-weight="800" fill="#3a2a20">起點 (0,0)</text>
        <text x="476" y="46" text-anchor="middle" font-size="14" font-weight="800" fill="#3a2a20">終點</text>

        <line x1="80" y1="221" x2="474" y2="221" stroke="#a96f3e" stroke-width="2" marker-end="url(#arrow-${east}-${north})"/>
        <text x="277" y="246" text-anchor="middle" font-size="16" font-weight="900" fill="#6b492f">${esc(eastLabel)}</text>

        <line x1="542" y1="170" x2="542" y2="64" stroke="#a96f3e" stroke-width="2" marker-end="url(#arrow-${east}-${north})"/>
        <text x="560" y="120" font-size="16" font-weight="900" fill="#6b492f">${esc(northLabel)}</text>

        <g transform="translate(567 187)" fill="#6b492f" stroke="#6b492f" stroke-width="1.5">
          <line x1="0" y1="18" x2="0" y2="-12"/>
          <line x1="-15" y1="3" x2="15" y2="3"/>
          <path d="M0 -16 l-4 7 h8 z" fill="#6b492f"/>
          <text x="0" y="-22" text-anchor="middle" font-size="11" stroke="none">北</text>
          <text x="20" y="7" font-size="11" stroke="none">東</text>
        </g>
      </svg>`;
  }

  function upgrade(q) {
    if (!q || q.taskFamily !== 'shortest-grid-path') return false;
    const match = String(q.q || '').match(/東方\s*(\d+)\s*格、北方\s*(\d+)\s*格/);
    if (!match) return false;

    const east = Number(match[1]);
    const north = Number(match[2]);
    if (!Number.isFinite(east) || !Number.isFinite(north)) return false;

    q.q = `起點座標視為 (0,0)。終點相對起點向東 ${east} 格、向北 ${north} 格。每次只能沿格線水平或垂直移動 1 格。從起點到終點，最少需要移動幾格？`;
    q.e = `向東 ${east} 格代表水平移動 ${east} 次，向北 ${north} 格代表垂直移動 ${north} 次；起點本身不算一次移動。因此最短距離＝${east}+${north}=${east+north} 格。`;
    q.visual = buildGridDiagram(east, north);
    q.presentationMode = 'spatial-diagram';
    q.diagramType = 'grid-shortest-path';
    q.diagramData = { east, north };
    return true;
  }

  const seen = new Set();
  let upgradedItems = 0;
  for (const collection of [window.IQ_QUESTION_BANK, window.IQ_QUESTIONS]) {
    if (!Array.isArray(collection)) continue;
    for (const q of collection) {
      if (!q || seen.has(q)) continue;
      seen.add(q);
      if (upgrade(q)) upgradedItems += 1;
    }
  }

  window.IQ_SPATIAL_DIAGRAMS = {
    version: '1.0',
    upgradedItems,
    family: 'shortest-grid-path',
    principle: 'diagram clarifies displacement without changing the answer key'
  };
})();