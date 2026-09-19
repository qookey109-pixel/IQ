const fs = require('fs');
const assert = require('assert');
const { getProductionRuntimeSources } = require('./runtime-bundle-helper');

const html = fs.readFileSync('index.html', 'utf8');
const flow = fs.readFileSync('pretest-flow.js', 'utf8');
const scoring = fs.readFileSync('scoring-v2.js', 'utf8');
const assessment = fs.readFileSync('assessment-quality.js', 'utf8');

const scriptFiles = getProductionRuntimeSources(html);
const appPos = scriptFiles.indexOf('app.js');
const pretestPos = scriptFiles.indexOf('pretest-flow.js');
const timingPos = scriptFiles.indexOf('timeout-lock.js');
assert.ok(appPos >= 0 && pretestPos > appPos && timingPos > pretestPos,
  'pretest flow must load after app.js and before timing wrappers');

assert.ok(flow.includes("STATE_KEY = 'cognitive-iq-lab:pretest-state:v2'"), 'practice state must use local versioned storage');
assert.ok(flow.includes('ageInputRequired: false'), 'public flow must not require age');
assert.ok(flow.includes('demographicInputRequired: false'), 'public flow must not require demographics');
assert.ok(!flow.includes('ageSelect'), 'age selector must be absent');
assert.ok(!flow.includes('AGE_MIN') && !flow.includes('AGE_MAX'), 'age-range gate must be absent');
assert.ok(flow.includes("document.getElementById('startBtn').onclick = showIntroStep"), 'start must go directly to instructions');
assert.ok(flow.includes("setOnlyVisible('pretestIntro')"), 'instructions must be the first pretest state');
assert.ok(flow.includes("setOnlyVisible('pretestPractice')"), 'practice must have its own state');
assert.ok(flow.includes('practice-verbal-01') && flow.includes('practice-memory-01') && flow.includes('practice-spatial-01') && flow.includes('practice-speed-01'),
  'practice must cover verbal, memory, spatial, and speed interactions');
assert.ok(flow.includes('exposureMs: 4000'), 'memory practice must demonstrate one-time exposure');
assert.ok(flow.includes('limitSeconds: 18'), 'speed practice must demonstrate the 18-second limit');
assert.ok(flow.includes('totalQuestions !== 42'), 'formal entry must guard the 42-item production form');
assert.ok(flow.includes('initState();') && flow.includes("renderQuestion('slide-in-right')"), 'formal entry must initialize the production attempt');
assert.ok(flow.includes('練習答案不會寫入正式 42 題結果、總時間或 item analytics'), 'UI must state practice isolation');
assert.ok(flow.includes('window.IQ_PARTICIPANT_PROFILE = null'), 'public runtime must not synthesize an age profile');

assert.ok(!/ageYears|ageBand|IQ_PARTICIPANT_PROFILE/.test(scoring), 'Scoring v2 must remain age-independent');
assert.ok(assessment.includes('ageInputRequired: false'), 'result quality metadata must keep age input disabled');
assert.ok(assessment.includes('publicScoreVisible: false'), 'public result must hide quantitative score');
assert.ok(assessment.includes('publicQuantitativeStandard: false'), 'public result must not claim a quantitative standard');

assert.ok(html.includes('不用填年齡'), 'public instructions must state that age is not required');
assert.ok(html.includes('不顯示 IQ、CPI、百分比、排名、同齡換算或總分'), 'public instructions must state the qualitative result boundary');

console.log('Pre-test age-free practice flow validation PASS');
console.log('No age input -> optional 4-item practice -> unchanged 42-item formal assessment; public result remains qualitative.');
