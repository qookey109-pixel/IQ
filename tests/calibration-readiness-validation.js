const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const storage = {};
const window = {
  IQ_BANK_META: { version:'QB-2026.09.5', revision:'5.0', semanticTemplates:4, taskFamilies:2 }
};
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(storage,k) ? storage[k] : null; },
  setItem(k,v){ storage[k] = String(v); },
  removeItem(k){ delete storage[k]; }
};
const context = { window, localStorage, console, Math, Date, JSON, Set, Map, Array, Number, String, Object, RegExp };
vm.createContext(context);
vm.runInContext(fs.readFileSync('calibration-readiness.js','utf8'), context, {filename:'calibration-readiness.js'});

const C = window.IQ_CALIBRATION_READINESS;
assert.ok(C, 'Calibration Readiness API must be exposed');
assert.strictEqual(C.version, '1.0');
assert.strictEqual(C.maxAttempts, 500);

const questions = [
  {id:'q1',taskFamily:'f1',semanticKey:'f1:v1',difficulty:'easy',a:1,d:'語文理解'},
  {id:'q2',taskFamily:'f2',semanticKey:'f2:v1',difficulty:'hard',a:0,d:'流體推理'}
];
const record = C.buildAttemptRecord({
  questions,
  answers:[1,null],
  elapsedTimes:[4.26,9.91],
  expiredQuestionsLock:[false,true],
  scoring:{performanceIndex:55.5,rawAccuracy:50,domains:{語文理解:{score:100,rawAccuracy:100,weightedAccuracy:100}}},
  formMetrics:{rmsPct:1.2,maxAbsPct:2.5}
});
assert.strictEqual(record.performanceIndex,55.5);
assert.strictEqual(record.items[0].correct,1);
assert.strictEqual(record.items[1].skipped,1);
assert.strictEqual(record.items[1].timeout,1);
assert.strictEqual(record.items[0].seconds,4.3);
assert.ok(!('answer' in record.items[0]), 'calibration record must not store selected answer index');
assert.ok(!('option' in record.items[0]), 'calibration record must not store selected option text');

const bank = [
  {id:'q1',taskFamily:'f1',semanticKey:'f1:v1'},
  {id:'q2',taskFamily:'f2',semanticKey:'f2:v1'},
  {id:'q3',taskFamily:'f1',semanticKey:'f1:v2'},
  {id:'q4',taskFamily:'f2',semanticKey:'f2:v2'}
];
function attempt(i){
  return {
    performanceIndex:40 + (i%20),
    formLoad:{maxAbsPct:1+(i%3)},
    items: bank.map((q,j)=>({
      id:q.id,family:q.taskFamily,semanticKey:q.semanticKey,
      difficulty:j<2?'easy':j===2?'medium':'hard',correct:(i+j)%2,skipped:0,timeout:0,seconds:5+j
    }))
  };
}

let r=C.buildReadiness({bank,attempts:Array.from({length:10},(_,i)=>attempt(i)),qaReport:null});
assert.strictEqual(r.phase,'本機 QA 可初步判讀');
assert.strictEqual(r.familyCoverage,1);
assert.strictEqual(r.templateCoverage,1);
assert.strictEqual(r.itemsN10,4);
assert.strictEqual(r.formalCalibrationReady,false);
assert.ok(r.blockers.some(x=>x.includes('獨立受測者')));

r=C.buildReadiness({bank,attempts:Array.from({length:30},(_,i)=>attempt(i)),qaReport:{evaluableItems:4,calibratedItems:4,meanDiscrimination:.31,meanDistractorEfficiency:.75,flaggedItems:0}});
assert.strictEqual(r.phase,'本機 pilot 可分析');
assert.strictEqual(r.itemsN30,4);
assert.strictEqual(r.qa.meanDiscrimination,.31);
assert.ok(r.score.sd>0);
assert.ok(r.tiers.easy.n>0 && r.tiers.hard.n>0);

r=C.buildReadiness({bank,attempts:Array.from({length:100},(_,i)=>attempt(i)),qaReport:null});
assert.strictEqual(r.phase,'可匯出 pooled pilot 候選');
assert.strictEqual(r.formalCalibrationReady,false,'local repeated sessions must never be labelled formally calibrated');
assert.strictEqual(r.independentParticipants,null,'independent participant count is intentionally unknown');

console.log('Calibration Readiness v1 validation PASS');
console.log('Local-only session matrix, privacy guardrails, coverage/readiness phases, and no false calibration claim verified.');
