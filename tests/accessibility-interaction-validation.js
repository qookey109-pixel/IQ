'use strict';

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html','utf8');
const app = fs.readFileSync('app.js','utf8');
const timing = fs.readFileSync('timeout-lock.js','utf8');
const nav = fs.readFileSync('navigation-layout-fix.js','utf8');
const single = fs.readFileSync('single-screen.js','utf8');
const css = fs.readFileSync('single-screen.css','utf8');

assert.ok(!html.includes('navigator compactNavigator" aria-hidden="true"'),
  'focusable question navigation must not sit inside aria-hidden content');
assert.ok(html.includes('<nav class="navigator compactNavigator" aria-label="題目導覽">'),
  'question navigation needs a named nav landmark');
assert.ok(html.includes('id="quizProgress" class="progress" role="progressbar"'),
  'quiz progress needs progressbar semantics');
assert.ok(html.includes('aria-valuemin="1" aria-valuemax="42" aria-valuenow="1"'),
  'progressbar needs an explicit 1–42 range');
assert.ok(html.includes('id="question" class="question" tabindex="-1"'),
  'question prompt must accept programmatic focus');
assert.ok(html.includes('id="options" class="options" role="group" aria-labelledby="question"'),
  'answer options must be grouped under the current question');

for (const id of ['startBtn','aboutBtn','prevBtn','skipBtn','restartBtn','reviewBtn']) {
  assert.ok(new RegExp('<button type="button"[^>]*id="' + id + '"').test(html),
    id + ': static action buttons need type=button');
}
assert.ok(!html.includes('id="copyResultBtn"')&&!html.includes('id="shareResultBtn"'),
  'removed public share controls must not return');

for (const source of [app,timing]) {
  assert.ok(source.includes('type="button" class="${cls}" aria-label="第 '),
    'dynamic question nav buttons need explicit type and labels');
  assert.ok(source.includes('aria-current="step"'),
    'current question nav button needs aria-current=step');
  assert.ok(source.includes('aria-pressed="${answers[currentIndex] === idx ? "true" : "false"}"'),
    'answer buttons need aria-pressed state');
  assert.ok(source.includes('el.setAttribute("aria-pressed", selected ? "true" : "false")'),
    'answer selection must update aria-pressed without waiting for rerender');
  assert.ok(source.includes('progress.setAttribute("aria-valuenow", String(currentIndex + 1))'),
    'progressbar aria-valuenow must track the current question');
}

assert.ok(nav.includes('function focusQuestionPrompt()'));
assert.ok(nav.includes('question.focus({ preventScroll: true })'),
  'question transitions must hand keyboard focus to the new prompt');

for (const marker of [
  "panel.setAttribute('role', 'dialog')",
  "panel.setAttribute('aria-modal', 'true')",
  "event.key === 'Escape'",
  "event.key !== 'Tab'",
  "restoresOpenerFocus: true",
  "modalFocusTrap: true"
]) {
  assert.ok(single.includes(marker),'modal keyboard guard missing: '+marker);
}
assert.ok(single.includes("opener.focus({ preventScroll: true })"),
  'closing a modal must restore focus to its opener');

assert.ok(css.includes(':where(.btn, .option, .dot, .screenClose):focus-visible'),
  'keyboard controls need a visible focus ring');
assert.ok(css.includes('@media (forced-colors: active)'),
  'focus/selection state should remain visible in forced-colors mode');

console.log('Interaction accessibility validation PASS');
console.log('Named navigation, pressed/current state, progress semantics, question focus, modal focus containment, and visible keyboard focus are protected.');
