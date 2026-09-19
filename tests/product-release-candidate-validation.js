'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {
  renderJekyllIncludes,
  getProductionRuntimeSources,
  getProductionStyleSources
}=require('./runtime-bundle-helper');

const html=fs.readFileSync('index.html','utf8');
const status=fs.readFileSync('PRODUCT_STATUS.md','utf8');
const readme=fs.readFileSync('README.md','utf8');
const app=fs.readFileSync('app.js','utf8');
const timing=fs.readFileSync('timeout-lock.js','utf8');
const quality=fs.readFileSync('assessment-quality.js','utf8');
const form=fs.readFileSync('qb5-42-form.js','utf8');
const scoring=fs.readFileSync('scoring-v2.js','utf8');
const titleEngine=fs.readFileSync('result-title-engine.js','utf8');
const replay=fs.readFileSync('replay-history.js','utf8');
const spatialCss=fs.readFileSync('spatial-visual-fix.css','utf8');

assert.ok(html.includes('styles.bundle.css?v=20260919-rc8'),'RC CSS cache key must be current');
assert.ok(html.includes('runtime.bundle.js?v=20260919-rc8'),'RC runtime cache key must be current');
assert.strictEqual((html.match(/<script\b[^>]*\bsrc=/g)||[]).length,1,'release page must request one JS bundle');
assert.strictEqual((html.match(/<link\b[^>]*\brel="stylesheet"/g)||[]).length,1,'release page must request one CSS bundle');
assert.ok(!/<script\b[^>]*\bsrc="https?:\/\//i.test(html),'release runtime must not depend on a remote script CDN');
assert.ok(!/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="https?:\/\//i.test(html),'release styles must not depend on a remote stylesheet CDN');

const runtimeSources=getProductionRuntimeSources(html);
const styleSources=getProductionStyleSources(html);
assert.strictEqual(runtimeSources.length,45);
assert.strictEqual(styleSources.length,6);
const renderedRuntime=renderJekyllIncludes('runtime.bundle.js');
new vm.Script(renderedRuntime,{filename:'runtime.bundle.rc-rendered.js'});
const renderedStyles=renderJekyllIncludes('styles.bundle.css');
assert.ok(renderedStyles.length>1000);

for(const marker of [
  'RC-2026.09.19-8',
  '2,058 items',
  '42 items = 6 domains × 7 families',
  'Public result: **share-friendly qualitative title card + 30 deterministic directional combination titles**',
  'Title engine: **6 primary domains × 5 secondary domains = 30 unique combinations**',
  'Public six-domain view: **qualitative hexagon (主線／副線), no scale and no numeric values**',
  'Public sharing: **copy/share qualitative text only; no internal score is included**',
  'Public numeric score: **none**',
  'Public age input: **none**',
  'Public practice questions: **none**',
  'Entry flow: **homepage → 42-item formal assessment**',
  'productNormEligible=false',
  'productIqUnlocked=false',
  'autoCpiToIq=false',
  'iqConversionEnabled=false',
  'populationPercentileAvailable=false',
  'frozen'
]) assert.ok(status.includes(marker),'PRODUCT_STATUS missing authority marker: '+marker);

assert.ok(readme.includes('RC-2026.09.19-8'));
assert.ok(readme.includes('Product mainline — playful qualitative result'));
assert.ok(readme.includes('不用填年齡'));
assert.ok(readme.includes('沒有前置練習題'));
assert.ok(html.includes('直接開始 42 題'));
assert.ok(!html.includes('pretest-flow.css'));
assert.ok(form.includes('selectedItems:42'));
assert.ok(form.includes("blueprint:'6x7 / 2 easy + 3 medium + 2 hard'"));
assert.ok(scoring.includes("scale: '0-100-experimental'"));
assert.ok(scoring.includes('const SPEED_SHARE = 0.05'));

for(const [file,source] of [['app.js',app],['timeout-lock.js',timing],['assessment-quality.js',quality]]){
  for(const forbidden of ['Math.max(70','Math.min(130','70 + overall * 0.6','index >= 120','index >= 110','index < 90']){
    assert.ok(!source.includes(forbidden),file+': pseudo-IQ release blocker returned: '+forbidden);
  }
}
assert.ok(quality.includes('productMode: "qualitative-playful"'));
assert.ok(quality.includes('internalScoringMode: "cpi-only"'));
assert.ok(quality.includes('publicScoreVisible: false'));
assert.ok(quality.includes('publicQuantitativeStandard: false'));
assert.ok(quality.includes('ageInputRequired: false'));
assert.ok(quality.includes('iqConversionEnabled: false'));
assert.ok(quality.includes('populationPercentileAvailable: false'));
assert.ok(quality.includes('publicDomainVisualization: "qualitative-hexagon-no-scale"'));
assert.ok(quality.includes('const correctAnswer = q.o[q.a]'));
assert.ok(quality.includes('class="brainHexagonMap"'));
assert.ok(quality.includes('resultShareEnabled: true'));
assert.ok(quality.includes('shareIncludesNumericScore: false'));
assert.ok(quality.includes('titleEngineMode: "deterministic-30-directional-combinations"'));
assert.ok(quality.includes('titleCombinationCount: 30'));
assert.ok(titleEngine.includes("const COMBINATIONS = {"));
assert.ok(titleEngine.includes("combinationCount: Object.keys(COMBINATIONS).length"));
assert.ok(replay.includes("MAX_ENTRIES = 4"));
assert.ok(replay.includes("storesNumericScores: false"));
assert.ok(replay.includes("storesAnswers: false"));
assert.ok(replay.includes("uploadsAutomatically: false"));
assert.ok(quality.includes('replayHistoryEnabled: true'));
assert.ok(html.includes('id="recentModes"'));
assert.ok(html.includes('id="brainConstellation"'));
assert.ok(html.includes('id="shareResultBtn"'));
assert.ok(!html.includes('navigator compactNavigator" aria-hidden="true"'));
assert.ok(html.includes('id="quizProgress" class="progress" role="progressbar"'));
assert.ok(html.includes('id="question" class="question" tabindex="-1"'));
assert.ok(timing.includes('return timingBaseFinishTest();'));

assert.ok(spatialCss.includes('max-height: min(32dvh, 300px)'),'RC spatial holder must stay bounded');
assert.ok(spatialCss.includes('max-width: 320px; max-height: 240px;'),'RC narrow-screen diagrams must stay compact');
assert.ok(spatialCss.includes('width: min(100%, 205px, 22dvh)'),'RC matrix cap must remain 205px');
assert.ok(!spatialCss.includes('max-width: 560px'),'RC must not restore oversized spatial wrappers');
assert.ok(spatialCss.includes('overflow: hidden'),'RC diagram holder must not spill into answer choices');

console.log('Product Release Candidate validation PASS');
console.log('RC-2026.09.19-8: direct entry, real-play wording/layout QA, qualitative hexagon results, replay history, accessibility, governance locks, and fallback boundaries are consistent.');
