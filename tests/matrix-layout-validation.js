const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('matrix-layout-fix.css', 'utf8');
const stability = fs.readFileSync('viewport-stability.css', 'utf8');

assert.ok(html.includes('matrix-layout-fix.css'), 'index must load matrix layout fix');
assert.ok(html.includes('viewport-stability.css'), 'index must load viewport stability layer');
assert.ok(css.includes('#quiz #visualHolder .matrixGrid'), 'must target the real matrixGrid class');
assert.ok(css.includes('overflow-y: auto'), 'question card needs a non-cropping overflow fallback');
assert.ok(css.includes('@media (max-width: 760px)'), 'mobile matrix scaling must exist');
assert.ok(css.includes('@media (max-height: 760px)'), 'short-height matrix scaling must exist');
assert.ok(css.includes('width: min(250px, 42vw, 25dvh)'), 'desktop matrix must be height-aware');

assert.ok(stability.includes('.matrixCell.density-4'), 'dense four-symbol cells need explicit sizing');
assert.ok(stability.includes('@media (max-width: 430px)'), 'iPhone-width dense-symbol override must exist');
assert.ok(stability.includes('font-size: 9px'), 'four-symbol iPhone matrix cells must use conservative font sizing');
assert.ok(stability.includes('padding-inline: 0'), 'dense iPhone matrix cells must remove horizontal padding');
assert.ok(stability.includes('width: min(224px, 72vw, 25dvh)'), 'mobile matrix should use a slightly wider safe width');

console.log('Matrix layout validation PASS');
console.log('Dense 4–6 symbol matrix cells are explicitly protected from iPhone Safari clipping.');
