'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = {};
const window = { addEventListener(){} };
const context = {
  window,
  document:{getElementById(){return null;}},
  localStorage:{
    getItem(k){return store[k] ?? null;},
    setItem(k,v){store[k]=v;},
    removeItem(k){delete store[k];}
  },
  console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp
};
vm.createContext(context);

const runtime=[
  'question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js',
  'qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js',
  'qb5-verbal-surface-expansion.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js',
  'memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js',
  'spatial-reliability.js','spatial-task-refinement.js','presentation-clarity.js','calibration/anchor-core.js','qb5-42-form.js','scoring-v2.js'
];
for(const file of runtime) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const S=window.IQ_SCORING_V2;
const D=window.IQ_DIVERSITY;
assert.ok(S&&D);
assert.strictEqual(D.productionFormSize,42);
assert.strictEqual(S.speedShare,0.05);

function seeded(seed){
  let state=seed>>>0;
  return function(){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
}
function wrongIndex(q){ return (Number(q.a)+1)%4; }
function familyHash(value){
  let h=2166136261>>>0;
  for(const ch of String(value||'')){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}
  return h>>>0;
}
function answerFamilyProfile(form){
  return form.map(q => (familyHash(q.taskFamily)%2===0 ? q.a : wrongIndex(q)));
}
function answerDifficultyProfile(form){
  return form.map(q => q.difficulty==='hard' ? wrongIndex(q) : q.a);
}
function elapsedHalfLimit(form){
  return form.map(q => Number(q.limit)>0 ? Number(q.limit)/2 : 0);
}
function elapsedAtLimit(form){
  return form.map(q => Number(q.limit)>0 ? Number(q.limit) : 0);
}
function elapsedFast(form){
  return form.map(q => Number(q.limit)>0 ? 0 : 0);
}

const familyScores=[];
const blueprintScores=[];
const history=[];
for(let i=0;i<16;i++){
  const form=D.selectForm({history,random:seeded(0x51a7e000+i)});
  const valid=D.validateForm(form);
  assert.strictEqual(valid.ok,true,valid.errors.join('; '));
  assert.strictEqual(form.length,42);
  const load=D.evaluate(form);
  assert.ok(load.maxAbsPct<=20,'form-load maximum deviation must remain bounded');

  const familyReport=S.scoreAssessment(form,answerFamilyProfile(form),elapsedHalfLimit(form));
  assert.ok(Number.isFinite(familyReport.performanceIndex));
  assert.ok(familyReport.performanceIndex>=0&&familyReport.performanceIndex<=100);
  assert.strictEqual(familyReport.calibrated,false);
  familyScores.push(familyReport.performanceIndex);

  const blueprintReport=S.scoreAssessment(form,answerDifficultyProfile(form),elapsedHalfLimit(form));
  blueprintScores.push(blueprintReport.performanceIndex);

  history.push(form.map(q=>q.id));
  if(history.length>8)history.shift();
}

assert.strictEqual(new Set(blueprintScores).size,1,'fixed difficulty quotas must produce an invariant difficulty-only synthetic CPI');
const familyRange=Math.max(...familyScores)-Math.min(...familyScores);
assert.ok(familyRange<=12,'seeded family-profile CPI spread is unexpectedly large: '+familyRange);

const form=D.selectForm({history:[],random:seeded(0x42c0ffee)});
const allCorrect=form.map(q=>q.a);
const fast=S.scoreAssessment(form,allCorrect,elapsedFast(form));
const atLimit=S.scoreAssessment(form,allCorrect,elapsedAtLimit(form));
const speedEffect=fast.performanceIndex-atLimit.performanceIndex;
assert.ok(speedEffect>=0);
assert.ok(speedEffect<=0.9,'processing-speed timing must change total CPI by no more than about 0.83 points');

const allWrong=form.map(wrongIndex);
const wrong=S.scoreAssessment(form,allWrong,elapsedFast(form));
assert.strictEqual(wrong.performanceIndex,0);

const skipped=S.scoreAssessment(form,[],[]);
assert.strictEqual(skipped.rawCorrect,0);
assert.strictEqual(skipped.skipped,42);
assert.strictEqual(skipped.performanceIndex,0);

const invalidTimes=S.scoreAssessment(form,allCorrect,form.map(q=>Number(q.limit)>0?undefined:0));
assert.ok(invalidTimes.performanceIndex<=fast.performanceIndex,'missing speed evidence must never improve CPI');

console.log('Measurement hardening validation PASS');
console.log('16 seeded 42-item forms; blueprint invariance, bounded synthetic-profile spread, conservative missing-time handling, skip integrity, and speed-share ceiling protected.');
