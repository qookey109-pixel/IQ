const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-finalize.js'];
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const selectedIdsBefore=window.IQ_QUESTIONS.map(q=>q.id);
vm.runInContext(fs.readFileSync('answer-position-balance.js','utf8'),context,{filename:'answer-position-balance.js'});
vm.runInContext(fs.readFileSync('answer-quality.js','utf8'),context,{filename:'answer-quality.js'});

assert.strictEqual(window.IQ_BANK_META.version,'QB-2026.09.5');
assert.strictEqual(window.IQ_BANK_META.revision,'5.0');
assert.strictEqual(window.IQ_QUESTION_BANK.length,5124);
assert.deepStrictEqual(Array.from(window.IQ_QUESTIONS,q=>q.id),Array.from(selectedIdsBefore),'balancing/audit must preserve selected IDs');

const positions=[0,0,0,0];
for(const q of window.IQ_QUESTION_BANK){
  assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: options unique`);
  assert.ok(Number.isInteger(q.a)&&q.a>=0&&q.a<4,`${q.id}: valid answer`);
  assert.ok(Array.isArray(q.optionCueFlags),`${q.id}: audit flags`);
  positions[q.a]++;
}
assert.deepStrictEqual(positions,[1281,1281,1281,1281],'QB5 A/B/C/D must be exactly balanced');

for(const q of window.IQ_QUESTION_BANK.filter(q=>q.taskFamily==='necessary-condition')){
  assert.ok(String(q.o[q.a]).includes('不具備'),`${q.id}: correct answer should stay at qualification level`);
}
for(const q of window.IQ_QUESTION_BANK.filter(q=>q.taskFamily==='reported-vs-fact')){
  if(q.q.includes('打算'))assert.ok(String(q.o[q.a]).includes('打算'),`${q.id}: preserve reported wording`);
  assert.ok(!String(q.o[q.a]).includes('表示想'),`${q.id}: do not weaken 打算 to 想`);
}
for(const family of ['scope-negation','evidence-strength']){
  for(const q of window.IQ_QUESTION_BANK.filter(x=>x.taskFamily===family))assert.ok(!q.optionCueFlags.includes('length-cue'),`${q.id}: no obvious length cue`);
}
for(const q of window.IQ_QUESTION_BANK.filter(q=>q.taskFamily==='quant-remainder')){
  let d=null;
  let m=q.q.match(/每袋裝\s*(\d+)/);if(m)d=Number(m[1]);
  m=q.q.match(/除以\s*(\d+)/);if(m)d=Number(m[1]);
  if(d&&(/還剩幾顆|餘數是多少/.test(q.q))){
    const vals=q.o.map(Number);
    assert.ok(vals.every(x=>Number.isInteger(x)&&x>=0&&x<d),`${q.id}: remainder options must be legal residues for divisor ${d}`);
  }
}

const report=window.IQ_OPTION_QUALITY_REPORT;
assert.strictEqual(report.totalItems,5124);
assert.strictEqual(report.answerPositionStrategy,'hash-quota-balanced');
assert.deepStrictEqual(Array.from(report.correctPositionCounts),positions);
console.log('QB5 option-quality validation PASS');
console.log(`positions=${positions.join('/')}; targeted verbal/remainder cue checks PASS`);