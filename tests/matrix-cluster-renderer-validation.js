const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync('matrix-cluster-renderer-v2.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('viewport-stability.css', 'utf8');

const window = {};
const context = {
  window,
  buildMatrix: () => '<div>legacy</div>',
  console,
  Array,
  Number,
  String,
  Object,
  RegExp
};
vm.createContext(context);
vm.runInContext(code, context);

const rendered = context.buildMatrix([
  '@@cluster:●:2',
  '@@cluster:●:4',
  '@@cluster:○:6',
  '7',
  '?'
]);

assert.ok(rendered.includes('matrixSymbolCluster count-2'), '2-symbol cluster should render');
assert.ok(rendered.includes('matrixSymbolCluster count-4'), '4-symbol cluster should render');
assert.ok(rendered.includes('matrixSymbolCluster count-6'), '6-symbol cluster should render');
assert.ok(!rendered.includes('@@cluster:'), 'internal cluster markers must never reach rendered HTML');
assert.strictEqual((rendered.match(/matrixSymbolGlyph/g) || []).length, 12, 'expected all cluster glyphs to render');
assert.ok(rendered.includes('matrixCell missing'), 'missing matrix cell must still render correctly');

const navAt = html.indexOf('navigation-layout-fix.js?v=matrix-cluster-v2');
const rendererAt = html.indexOf('matrix-cluster-renderer-v2.js');
assert.ok(navAt > -1 && rendererAt > navAt, 'v2 renderer must load after navigation override');
assert.ok(html.includes('matrix-cluster-items.js?v=matrix-cluster-v2'), 'cluster item normalizer must be cache-busted');
assert.ok(html.includes('viewport-stability.css?v=matrix-cluster-v2'), 'cluster CSS must be cache-busted');
assert.ok(css.includes('.matrixSymbolCluster.count-4'), '2x2 four-symbol cluster CSS is required');

assert.ok(window.IQ_MATRIX_CLUSTER_RENDERER, 'renderer metadata should be exported');
assert.strictEqual(window.IQ_MATRIX_CLUSTER_RENDERER.internalMarkersVisible, false);

console.log('Matrix cluster renderer v2 validation PASS');
console.log('Internal @@cluster markers cannot appear in rendered matrix HTML.');
