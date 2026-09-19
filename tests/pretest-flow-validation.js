const fs = require('fs');
const assert = require('assert');
const { getProductionRuntimeSources } = require('./runtime-bundle-helper');

const html = fs.readFileSync('index.html', 'utf8');
const flow = fs.readFileSync('pretest-flow.js', 'utf8');
const scoring = fs.readFileSync('scoring-v2.js', 'utf8');
const assessment = fs.readFileSync('assessment-quality.js', 'utf8');

const scriptFiles = getProductionRuntimeSources(html);
const appPos = scriptFiles.indexOf('app.js');
const flowPos = scriptFiles.indexOf('pretest-flow.js');
const timingPos = scriptFiles.indexOf('timeout-lock.js');
assert.ok(appPos >= 0 && flowPos > appPos && timingPos > flowPos,
  'direct-entry flow must load after app.js and before timing wrappers');

assert.ok(flow.includes("const FLOW_VERSION = '3.0'"), 'direct-entry flow version must be current');
assert.ok(flow.includes("mode: 'direct-formal-entry'"), 'public flow must identify direct formal entry');
assert.ok(flow.includes('ageInputRequired: false'), 'public flow must not require age');
assert.ok(flow.includes('demographicInputRequired: false'), 'public flow must not require demographics');
assert.ok(flow.includes('practiceEnabled: false'), 'practice must be disabled');
assert.ok(flow.includes('practiceCount: 0'), 'practice count must be zero');
assert.ok(!flow.includes('practice-verbal-01') && !flow.includes('practice-memory-01') &&
  !flow.includes('practice-spatial-01') && !flow.includes('practice-speed-01'),
  'legacy practice items must be removed from runtime');
assert.ok(!flow.includes('pretestIntro') && !flow.includes('pretestPractice'),
  'no pretest/practice panels may remain in the direct-entry flow');
assert.ok(!flow.includes('ageSelect') && !flow.includes('AGE_MIN') && !flow.includes('AGE_MAX'),
  'age intake must remain absent');
assert.ok(flow.includes("start.onclick = startFormalAssessment"), 'start button must enter the formal assessment directly');
assert.ok(flow.includes('totalQuestions !== 42'), 'formal entry must guard the 42-item production form');
assert.ok(flow.includes('initState();') && flow.includes("renderQuestion('slide-in-right')"),
  'formal entry must initialize and render question 1');
assert.ok(flow.includes('window.location.reload()'), 'restart must reset the full attempt');
assert.ok(flow.includes('window.IQ_PARTICIPANT_PROFILE = null'), 'runtime must not synthesize an age profile');

assert.ok(!/ageYears|ageBand|IQ_PARTICIPANT_PROFILE/.test(scoring), 'Scoring v2 must remain age-independent');
assert.ok(assessment.includes('ageInputRequired: false'), 'result quality metadata must keep age input disabled');
assert.ok(assessment.includes('publicScoreVisible: false'), 'public result must hide quantitative score');
assert.ok(assessment.includes('publicQuantitativeStandard: false'), 'public result must not claim a quantitative standard');

assert.ok(html.includes('不用填年齡、不用建立個人資料，也沒有前置練習題'), 'public instructions must disclose direct entry');
assert.ok(html.includes('直接開始 42 題'), 'homepage CTA must communicate direct formal entry');
assert.ok(!html.includes('pretest-flow.css'), 'obsolete practice stylesheet must not be bundled');
assert.ok(html.includes('不顯示 IQ、CPI、百分比、排名、同齡換算或總分'), 'public instructions must preserve the qualitative result boundary');

console.log('Direct-entry flow validation PASS');
console.log('Homepage -> 42-item formal assessment; no age intake and no practice questions.');
