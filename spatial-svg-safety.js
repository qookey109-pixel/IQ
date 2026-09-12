// QB5 spatial SVG safety layer.
// Keeps diagram content inside a stable visual safe-area across Safari and other browsers.
(() => {
  'use strict';

  const bank = window.IQ_QUESTION_BANK;
  if (!Array.isArray(bank)) return;

  function normalizeRoot(markup) {
    let out = String(markup || '');
    if (!out.includes('class="qb5-spatial-svg"')) return out;
    if (!out.includes('preserveAspectRatio=')) {
      out = out.replace(
        '<svg class="qb5-spatial-svg"',
        '<svg class="qb5-spatial-svg" preserveAspectRatio="xMidYMid meet" font-size="13"'
      );
    } else if (!/class="qb5-spatial-svg"[^>]*font-size=/.test(out)) {
      out = out.replace('class="qb5-spatial-svg"', 'class="qb5-spatial-svg" font-size="13"');
    }
    return out;
  }

  function fixHeading(markup) {
    return markup
      .replace('cx="180" cy="110" r="78"', 'cx="180" cy="110" r="68"')
      .replace('<text x="180" y="20" text-anchor="middle">N 0°</text>', '<text x="180" y="32" text-anchor="middle" font-size="14" font-weight="700">N 0°</text>')
      .replace('<text x="337" y="115" text-anchor="end">E 90°</text>', '<text x="306" y="115" text-anchor="end" font-size="14" font-weight="700">E 90°</text>')
      .replace('<text x="180" y="214" text-anchor="middle">S 180°</text>', '<text x="180" y="202" text-anchor="middle" font-size="14" font-weight="700">S 180°</text>')
      .replace('<text x="20" y="115">W 270°</text>', '<text x="54" y="115" font-size="14" font-weight="700">W 270°</text>');
  }

  function fixDisplacement(markup) {
    // The generator intentionally draws one schematic segment per movement instruction.
    // Some 3–4 step paths can extend beyond the original 360×220 frame. Expand the
    // logical viewBox instead of shrinking the UI panel, so S/E and distance labels stay visible.
    return markup.replace('viewBox="0 0 360 220"', 'viewBox="-30 -40 420 300"');
  }

  let normalized = 0;
  let headingFixed = 0;
  let displacementFixed = 0;

  for (const item of bank) {
    if (!String(item.visual || '').includes('class="qb5-spatial-svg"')) continue;
    let visual = normalizeRoot(item.visual);
    normalized++;

    if (item.diagramType === 'heading-rotation') {
      visual = fixHeading(visual);
      headingFixed++;
    }
    if (item.diagramType === 'grid-displacement') {
      visual = fixDisplacement(visual);
      displacementFixed++;
    }

    item.visual = visual;
  }

  window.IQ_SPATIAL_SVG_SAFETY = {
    version: '1.0',
    normalized,
    headingFixed,
    displacementFixed,
    rootFontSize: 13,
    displacementViewBox: '-30 -40 420 300',
    policy: 'safe-area-first-no-label-clipping'
  };
})();
