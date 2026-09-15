const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
const EQ=window.QB5_FORM_EQUIVALENCE;
assert.ok(EQ);
assert.strictEqual(EQ.version,'1.0');
assert.strictEqual(bank.length,5124);
assert.ok(bank.every(q=>Number.isFinite(Number(q.formLoad))&&q.formLoad>0),'every item must have a finite design-load score');
assert.strictEqual(Object.keys(window.IQ_FORM_EQUIVALENCE_TARGETS).length,6);
assert.ok(window.IQ_FORM_EQUIVALENCE_LAST);
assert.ok(window.IQ_FORM_EQUIVALENCE_LAST.maxAbsPct<=20,`initial form load deviation too large: ${window.IQ_FORM_EQUIVALENCE_LAST.maxAbsPct}%`);

let seed=0x5eed1234;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const history=[];
for(let i=0;i<24;i++){
  const form=window.IQ_DIVERSITY.selectForm({history,random,pool:bank});
  const valid=window.IQ_DIVERSITY.validateForm(form);
  assert.strictEqual(valid.ok,true,valid.errors.join('; '));
  const report=EQ.evaluate(form);
  assert.ok(report.maxAbsPct<=20,`form ${i+1} max domain load deviation ${report.maxAbsPct}%`);
  assert.ok(report.rmsPct<=12,`form ${i+1} RMS load deviation ${report.rmsPct}%`);
  history.push(form.map(q=>q.id));
  if(history.length>8)history.shift();
}

assert.strictEqual(window.IQ_BANK_META.formEquivalence,'64-candidate-design-load-matching');
console.log('QB5 form-equivalence validation PASS');
console.log('Fixed quotas retained; 64-candidate design-load matching keeps residual domain load within guardrails.');
