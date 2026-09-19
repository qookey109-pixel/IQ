const fs = require('fs');
const assert = require('assert');

const nav = fs.readFileSync('navigation-layout-fix.js', 'utf8');
const css = fs.readFileSync('viewport-stability.css', 'utf8');
const single = fs.readFileSync('single-screen.js', 'utf8');

assert(nav.includes('button.textContent = currentIndex >= totalQuestions - 1 ? "完成" : "下一題"'), 'forward control must be visible');
assert(nav.includes('skipQuestion = nextQuestion'), 'legacy skip binding must become forward navigation');
assert(!nav.includes('answers[currentIndex] = null'), 'forward navigation must not erase existing answers');
assert(nav.includes('button.disabled = false'), 'expired items must still allow navigation forward');
assert(nav.includes('density-6') && nav.includes('density-5') && nav.includes('density-4'), 'matrix cells need density classes');
assert(nav.includes('buildMatrix = function'), 'matrix renderer must be upgraded');
assert(nav.includes('function focusQuestionPrompt()'), 'question transitions must manage focus');
assert(nav.includes('question.focus({ preventScroll: true })'), 'question focus handoff must avoid page jumps');

assert(nav.includes('function formatQuestionPrompt()'), 'long prompts need presentation-only formatting');
assert(nav.includes('questionText-medium')&&nav.includes('questionText-long')&&nav.includes('questionText-very-long'), 'prompt length classes must exist');
assert(nav.includes('replace(/([。；])\\s*/g, "$1\\n")'), 'long multi-step prompts must break at complete sentence boundaries');
assert(nav.includes('question.textContent = formatted'), 'visual line breaks must not rewrite the source question object');

assert(css.includes('.matrixCell.density-4'), 'dense matrix CSS missing');
assert(css.includes('overflow: hidden'), 'matrix symbols must be contained');
assert(css.includes('contain: paint'), 'matrix cell paint containment missing');
assert(css.includes('#quiz .footerActions') && css.includes('position: sticky'), 'navigation row must remain reachable');
assert(css.includes('@media (max-width: 760px)'), 'mobile stability rules missing');

assert(single.includes('viewport-stability.css'), 'single-screen loader must load viewport CSS');
assert(single.includes('navigation-layout-fix.js'), 'single-screen loader must load navigation fix');

console.log('Navigation/layout regression validation passed.');
