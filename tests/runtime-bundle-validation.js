'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const {
  renderJekyllIncludes,
  getProductionRuntimeSources,
  getProductionStyleSources
} = require('./runtime-bundle-helper');

const html = fs.readFileSync('index.html', 'utf8');

const expectedRuntime = [
  'question-bank.js',
  'qb5-core.js',
  'qb5-verbal.js',
  'qb5-fluid.js',
  'qb5-spatial.js',
  'qb5-memory.js',
  'qb5-speed.js',
  'qb5-quant.js',
  'qb5-parameter-diversity.js',
  'qb5-ordering-diversity-fix.js',
  'qb5-form-equivalence.js',
  'qb5-finalize.js',
  'qb5-compact-bank.js',
  'qb5-verbal-surface-expansion.js',
  'natural-language-v2.js',
  'question-language-finalize.js',
  'answer-position-balance.js',
  'answer-quality.js',
  'memory-integrity.js',
  'hard-construct-integrity.js',
  'processing-speed-integrity.js',
  'full-bank-polish.js',
  'memory-usability.js',
  'spatial-reliability.js',
  'spatial-task-refinement.js',
  'presentation-clarity.js',
  'calibration/anchor-core.js',
  'qb5-42-form.js',
  'calibration/matrix-form-core.js',
  'calibration-matrix-form.js',
  'app.js',
  'pretest-flow.js',
  'timeout-lock.js',
  'memory-exposure.js',
  'scoring-v2.js',
  'assessment-quality.js',
  'item-analytics.js',
  'item-quality-v2.js',
  'calibration-readiness.js',
  'calibration-study.js',
  'calibration-anchor-study.js',
  'navigation-layout-fix.js',
  'single-screen.js'
];

const expectedStyles = [
  'styles.css',
  'single-screen.css',
  'matrix-layout-fix.css',
  'viewport-stability.css',
  'heritage-theme.css',
  'spatial-visual-fix.css',
  'pretest-flow.css'
];

const runtimeSources = getProductionRuntimeSources(html);
const styleSources = getProductionStyleSources(html);
assert.deepStrictEqual(runtimeSources, expectedRuntime, 'runtime bundle source order must remain exact');
assert.deepStrictEqual(styleSources, expectedStyles, 'stylesheet bundle source order must remain exact');

for (const file of [...runtimeSources, ...styleSources]) {
  assert.ok(fs.existsSync(file), 'bundle source must exist: ' + file);
}

const renderedRuntime = renderJekyllIncludes('runtime.bundle.js');
assert.ok(!renderedRuntime.includes('{% include_relative'), 'rendered runtime must not retain Jekyll include tags');
new vm.Script(renderedRuntime, {filename: 'runtime.bundle.rendered.js'});

const renderedStyles = renderJekyllIncludes('styles.bundle.css');
assert.ok(!renderedStyles.includes('{% include_relative'), 'rendered styles must not retain Jekyll include tags');
assert.ok(renderedStyles.length > 1000, 'rendered stylesheet bundle must contain the production styles');

console.log('Runtime bundle validation PASS');
console.log('Production requests: 43 JS + 7 CSS -> 1 deferred JS bundle + 1 CSS bundle; canonical source modules remain separate.');
