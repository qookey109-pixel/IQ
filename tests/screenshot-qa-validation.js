const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={},window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);

const html=fs.readFileSync('index.html','utf8');
const scriptTags=[...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g)];
assert.strictEqual(scriptTags.length,43,'production page must expose the expected deferred runtime surface');
assert.ok(scriptTags.every(match=>/\bdefer\b/.test(match[0])),'all production scripts must use defer');
const scriptFiles=scriptTags.map(match=>match[1]);
const appIndex=scriptFiles.indexOf('app.js');
assert.ok(appIndex>0,'app.js must remain after the question-bank construction layers');
for(const file of scriptFiles.slice(0,appIndex)){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,2058);

// Screenshot QA: matrix items must provide three complete examples before the target row.
const matrices=bank.filter(q=>q.taskFamily==='matrix-difference');
assert.strictEqual(matrices.length,56);
for(const q of matrices){
  assert.strictEqual(q.matrixClarityVersion,'MC-2026.09.1',q.id);
  assert.strictEqual(q.cells.length,12,`${q.id}: matrix should be 4×3`);
  assert.strictEqual(q.cells.filter(x=>x==='?').length,1,`${q.id}: exactly one missing cell`);
  assert.strictEqual(q.cells[11],'?',`${q.id}: missing cell should be final cell`);
  assert.ok(q.q.includes('前三列完整顯示同一個規則'),`${q.id}: three-example wording`);
  assert.strictEqual(String(q.o[q.a]),q.correctContent,`${q.id}: answer binding`);
  assert.strictEqual(q.matrixClarityData.examples,3,q.id);
}

// Screenshot QA: speed boundary wording is explicit about first/last positions.
const speedBoundary=bank.filter(q=>q.taskFamily==='speed-boundary');
assert.strictEqual(speedBoundary.length,56);
assert.strictEqual(speedBoundary.filter(q=>String(q.q).includes('首尾字母相同')).length,0,'ambiguous 首尾 wording must be removed');
assert.ok(speedBoundary.some(q=>String(q.q).includes('第一個字母與最後一個字母相同')),'explicit first/last wording must exist');

// Screenshot QA: packing items explicitly state that leftovers do not count as a full box.
const packing=bank.filter(q=>String(q.q).includes('每箱放')&&String(q.q).includes('裝滿幾箱'));
assert.ok(packing.length>0,'expected packing items in final bank');
for(const q of packing){
  assert.ok(q.q.includes('剩餘不足一箱不計'),`${q.id}: packing remainder policy must be explicit`);
}

// Result QA: do not fabricate an IQ number before population norming.
const assessment=fs.readFileSync('assessment-quality.js','utf8');
assert.ok(assessment.includes('IQ ESTIMATE'),'result must expose an IQ-specific status area');
assert.ok(assessment.includes('尚未校準'),'result must say IQ is not calibrated');
assert.ok(assessment.includes('iqEstimate: null'),'current result must not invent a numeric IQ');
assert.ok(assessment.includes("iqStatus: 'not-population-normed'"),'result metadata must state the norming limitation');
assert.ok(assessment.includes('iqEstimateAvailable: false'),'quality metadata must disable IQ estimates before norms');
assert.ok(assessment.includes('常模完成後，這裡才會顯示 IQ 估計、百分位與信賴區間'),'future IQ output requirements should be explicit');

console.log('Screenshot QA regression validation PASS');
console.log('Matrix evidence, explicit speed/packing wording, and honest IQ-result status are protected.');
