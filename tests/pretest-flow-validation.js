const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const flow = fs.readFileSync('pretest-flow.js', 'utf8');
const scoring = fs.readFileSync('scoring-v2.js', 'utf8');
const assessment = fs.readFileSync('assessment-quality.js', 'utf8');

const appPos = html.indexOf('<script src="app.js"></script>');
const pretestPos = html.indexOf('<script src="pretest-flow.js"></script>');
const timingPos = html.indexOf('<script src="timeout-lock.js?v=timing-2.1"></script>');
assert.ok(appPos >= 0 && pretestPos > appPos && timingPos > pretestPos,
  'pretest flow must load after app.js and before timing wrappers');

assert.ok(flow.includes("const AGE_MIN = 18"), 'adult pilot minimum age must be 18');
assert.ok(flow.includes("const AGE_MAX = 65"), 'adult pilot maximum age must be 65');
assert.ok(flow.includes("dateOfBirthCollected: false"), 'full date of birth must not be collected');
assert.ok(flow.includes("scoreAdjustedForAge: false"), 'age must not directly adjust score');
assert.ok(flow.includes("PROFILE_KEY = 'cognitive-iq-lab:participant-profile:v1'"), 'age profile must use local versioned storage');
assert.ok(flow.includes("practice-verbal-01") && flow.includes("practice-memory-01") && flow.includes("practice-spatial-01") && flow.includes("practice-speed-01"),
  'practice must cover verbal, memory, spatial, and speed interactions');
assert.ok(flow.includes('exposureMs: 4000'), 'memory practice must demonstrate one-time exposure');
assert.ok(flow.includes('limitSeconds: 18'), 'speed practice must demonstrate the 18-second limit');
assert.ok(flow.includes("totalQuestions !== 42"), 'formal entry must guard the 42-item production form');
assert.ok(flow.includes("initState();") && flow.includes("renderQuestion('slide-in-right')"), 'formal entry must initialize the production attempt before rendering question 1');
assert.ok(flow.includes('練習答案不會寫入正式 42 題成績、CPI、總時間或 item analytics'), 'UI must state practice isolation');

// Age must never enter the score calculation. It may be read later by the result UI only
// to explain which future norm group would be relevant once real norms exist.
assert.ok(!/ageYears|ageBand|IQ_PARTICIPANT_PROFILE/.test(scoring), 'Scoring v2 must remain completely age-independent');
assert.ok(assessment.includes('const performanceIndex = report.performanceIndex;'), 'result must consume the age-independent Scoring v2 result');
assert.ok(assessment.includes('renderIqCalibrationStatus(performanceIndex);'), 'age context may only be used in the post-score IQ calibration notice');
assert.ok(assessment.includes('iqEstimate: null'), 'age context must not produce a fabricated IQ estimate');
assert.ok(assessment.includes("iqStatus: 'not-population-normed'"), 'result must retain the not-normed IQ status');
assert.ok(assessment.includes('iqRequiresAgeNorms: true'), 'age is reserved for future norming, not current score adjustment');

assert.ok(html.includes('只收集歲數，不收集生日'), 'public instructions must disclose age data minimization');
assert.ok(html.includes('年齡現階段不會直接替 CPI 加分或扣分'), 'public instructions must disclose no age-based score adjustment');

console.log('Pre-test age/practice flow validation PASS');
console.log('18–65 whole-year age -> 4 unscored practices -> unchanged 42-item formal assessment; Scoring v2 remains age-independent and age is display-only norming context.');
