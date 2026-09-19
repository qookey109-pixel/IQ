'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const { getProductionRuntimeSources } = require('./runtime-bundle-helper');

const html = fs.readFileSync('index.html','utf8');
const pretest = fs.readFileSync('pretest-flow.js','utf8');
const timing = fs.readFileSync('timeout-lock.js','utf8');
const nav = fs.readFileSync('navigation-layout-fix.js','utf8');
const single = fs.readFileSync('single-screen.js','utf8');
const quality = fs.readFileSync('assessment-quality.js','utf8');

const sources = getProductionRuntimeSources(html);
const pos = name => sources.indexOf(name);
assert.ok(pos('app.js') >= 0);
assert.ok(pos('pretest-flow.js') > pos('app.js'));
assert.ok(pos('timeout-lock.js') > pos('pretest-flow.js'));
assert.ok(pos('memory-exposure.js') > pos('timeout-lock.js'));
assert.ok(pos('scoring-v2.js') > pos('memory-exposure.js'));
assert.ok(pos('result-title-engine.js') > pos('scoring-v2.js'));
assert.ok(pos('replay-history.js') > pos('result-title-engine.js'));
assert.ok(pos('assessment-quality.js') > pos('replay-history.js'));
assert.ok(pos('navigation-layout-fix.js') > pos('assessment-quality.js'));

assert.ok(pretest.includes('totalQuestions !== 42'),'formal entry must reject non-42 production forms');
assert.ok(pretest.includes("mode: 'direct-formal-entry'"),'release path must use direct formal entry');
assert.ok(pretest.includes('start.onclick = startFormalAssessment'),'start button must enter the 42-item form directly');
assert.ok(pretest.includes('practiceEnabled: false'),'practice must remain disabled');
assert.ok(pretest.includes('practiceCount: 0'),'practice count must remain zero');
assert.ok(!pretest.includes('pretestIntro')&&!pretest.includes('pretestPractice'),'release path must contain no pretest panels');
assert.ok(!pretest.includes('practice-verbal-01')&&!pretest.includes('practice-memory-01')&&!pretest.includes('practice-spatial-01')&&!pretest.includes('practice-speed-01'),'legacy practice items must be absent');
assert.ok(!pretest.includes('ageSelect'),'release path must not collect age');
assert.ok(pretest.includes('window.location.reload()'),'restart must reset the full direct-entry attempt');

assert.ok(nav.includes('skipQuestion = nextQuestion'),'forward control must not be a destructive skip');
assert.ok(!nav.includes('answers[currentIndex] = null'),'forward control must preserve an existing answer');
assert.ok(nav.includes('button.disabled = false'),'expired timed items must remain navigable');

assert.ok(single.includes("event.key === 'Escape'"),'Escape must close the active viewport detail panel');
assert.ok(single.includes("handleOpener('#aboutBtn', 'about'"),'about dialog must participate in shared modal focus handling');
assert.ok(single.includes("handleOpener('#reviewBtn', 'review'"),'review dialog must participate in shared modal focus handling');
assert.ok(single.includes("focusPanel(byId('itemQaPanel'), qaButton)"),'QA panel must participate in shared modal focus handling');
assert.ok(single.includes("opener.focus({ preventScroll: true })"),'closing a modal must restore focus to its opener');

for(const forbidden of ['Math.max(70','Math.min(130','70 + overall * 0.6','index >= 120','index >= 110','index < 90']){
  assert.ok(!timing.includes(forbidden),'timing fallback must not contain pseudo-IQ logic: '+forbidden);
}
assert.ok(timing.includes('const timingBaseFinishTest = finishTest;'));
assert.ok(timing.includes('return timingBaseFinishTest();'));
assert.ok(quality.includes('publicScoreVisible: false'));
assert.ok(quality.includes('publicQuantitativeStandard: false'));
assert.ok(quality.includes('iqConversionEnabled: false'));

// Exercise the fallback chain without assessment-quality.js.
// Production normally loads assessment-quality later; this proves the lower timing fallback
// still returns a non-quantitative public message if that final layer does not take over.
function element(){
  return {
    textContent:'', innerHTML:'', className:'', disabled:false, onclick:null,
    style:{}, dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    appendChild(){}, insertAdjacentElement(){}, addEventListener(){}
  };
}
const nodes=new Map();
const document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},
  createElement:element,
  head:element(),
  querySelectorAll(){return [];},
  querySelector(){return null;}
};
const questions=[
  {id:'v',d:'語文理解',difficulty:'easy',q:'V',o:['A','B','C','D'],a:0,limit:null},
  {id:'f',d:'流體推理',difficulty:'medium',q:'F',o:['A','B','C','D'],a:1,limit:null},
  {id:'s',d:'視覺空間',difficulty:'hard',q:'S',o:['A','B','C','D'],a:2,limit:null},
  {id:'m',d:'工作記憶',difficulty:'easy',q:'M',o:['A','B','C','D'],a:0,limit:null},
  {id:'p',d:'處理速度',difficulty:'medium',q:'P',o:['A','B','C','D'],a:1,limit:18},
  {id:'q',d:'量化推理',difficulty:'hard',q:'Q',o:['A','B','C','D'],a:2,limit:null}
];
let timerId=0;
const c={
  console,document,IQ_QUESTIONS:questions,Math,Number,Object,Array,Set,Map,JSON,RegExp,String,
  Date:{now:()=>1000},
  setInterval(){return ++timerId;},clearInterval(){},
  setTimeout(){return ++timerId;},clearTimeout(){},
  scrollTo(){}
};
c.window=c;
vm.createContext(c);
for(const file of ['app.js','timeout-lock.js','scoring-v2.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
}
vm.runInContext(`
  initState();
  answers = questions.map(q => q.a);
  elapsedTimes = questions.map(q => Number(q.limit) > 0 ? Number(q.limit) : 1);
  finishTest();
`,c);
assert.ok(c.IQ_LAST_RESULT,'fallback must publish a result');
assert.strictEqual(c.IQ_LAST_RESULT.scale,'0-100-experimental');
assert.strictEqual(c.IQ_LAST_RESULT.iqEstimate,null);
assert.strictEqual(c.IQ_LAST_RESULT.iqStatus,'disabled-cpi-only');
assert.ok(c.IQ_LAST_RESULT.performanceIndex>=0&&c.IQ_LAST_RESULT.performanceIndex<=100);
assert.ok(String(nodes.get('resultDesc').textContent).includes('公開結果不顯示總分'));

console.log('Release UX smoke validation PASS');
console.log('Release path order, direct 42-item entry with no practice, non-destructive navigation, modal close behavior, and non-quantitative timing fallback are protected.');
