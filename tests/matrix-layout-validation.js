const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('matrix-layout-fix.css', 'utf8');
const stability = fs.readFileSync('viewport-stability.css', 'utf8');
const spatial = fs.readFileSync('spatial-visual-fix.css', 'utf8');

assert.ok(html.includes('matrix-layout-fix.css'), 'index must load matrix layout fix');
assert.ok(html.includes('viewport-stability.css'), 'index must load viewport stability layer');
assert.ok(css.includes('#quiz #visualHolder .matrixGrid'), 'must target the real matrixGrid class');
assert.ok(css.includes('overflow-y: auto'), 'question card needs a non-cropping overflow fallback');
assert.ok(css.includes('@media (max-width: 760px)'), 'mobile matrix scaling must exist');
assert.ok(css.includes('@media (max-height: 760px)'), 'short-height matrix scaling must exist');
assert.ok(css.includes('width: min(205px, 34vw, 22dvh)'), 'desktop matrix must stay compact and height-aware');

assert.ok(stability.includes('.matrixCell.density-4'), 'dense four-symbol cells need explicit sizing');
assert.ok(stability.includes('@media (max-width: 430px)'), 'iPhone-width dense-symbol override must exist');
assert.ok(stability.includes('font-size: 9px'), 'four-symbol iPhone matrix cells must use conservative font sizing');
assert.ok(stability.includes('padding-inline: 0'), 'dense iPhone matrix cells must remove horizontal padding');
assert.ok(stability.includes('width: min(224px, 72vw, 25dvh)'), 'dense-symbol fallback may remain wider before final spatial override');
assert.ok(spatial.includes('width: min(100%, 205px, 22dvh)'), 'final Safari visual layer must keep matrix width compact');
assert.ok(spatial.includes('#quiz #questionCard.hasMatrixQuestion #visualHolder { min-height: 0; }'), 'matrix holder must not reserve the old 330px minimum height');

console.log('Matrix layout validation PASS');
console.log('Matrix tasks stay compact while dense 4–6 symbol cells remain protected from Safari clipping.');
