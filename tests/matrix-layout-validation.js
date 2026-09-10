const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('matrix-layout-fix.css', 'utf8');

assert.ok(html.includes('matrix-layout-fix.css'), 'index must load matrix layout fix');
assert.ok(css.includes('#quiz #visualHolder .matrixGrid'), 'must target the real matrixGrid class');
assert.ok(css.includes('overflow-y: auto'), 'question card needs a non-cropping overflow fallback');
assert.ok(css.includes('@media (max-width: 760px)'), 'mobile matrix scaling must exist');
assert.ok(css.includes('@media (max-height: 760px)'), 'short-height matrix scaling must exist');
assert.ok(css.includes('width: min(250px, 42vw, 25dvh)'), 'desktop matrix must be height-aware');

console.log('Matrix layout validation PASS');
