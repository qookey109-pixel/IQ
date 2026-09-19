const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {getProductionRuntimeSources}=require('./runtime-bundle-helper');

const store={},window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);

const html=fs.readFileSync('index.html','utf8');
const scriptFiles=getProductionRuntimeSources(html);
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

// Result QA: public surface is playful and qualitative while IQ governance stays locked.
const assessment=fs.readFileSync('assessment-quality.js','utf8');
const titleEngine=fs.readFileSync('result-title-engine.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const resultCss=fs.readFileSync('single-screen.css','utf8');
for(const marker of ['論點拼圖師','結構偵探','腦內製圖師','快閃記錄員','快速估算手']){
  assert.ok(titleEngine.includes(marker),'combination title missing: '+marker);
}
assert.ok(titleEngine.includes("combinationCount: Object.keys(COMBINATIONS).length"),'title engine must expose its finite combination set');
assert.ok(assessment.includes('publicScoreVisible: false'),'public score must stay hidden');
assert.ok(assessment.includes('publicQuantitativeStandard: false'),'public quantitative standard must stay disabled');
assert.ok(assessment.includes('ageInputRequired: false'),'age input must stay disabled');
assert.ok(assessment.includes('iqEstimate: null'),'current result must not invent a numeric IQ');
assert.ok(assessment.includes('iqEstimateAvailable: false'),'quality metadata must disable IQ estimates');
assert.ok(assessment.includes('iqConversionEnabled: false'),'IQ conversion must remain disabled');
assert.ok(assessment.includes('populationPercentileAvailable: false'),'population percentile must remain unavailable');
assert.ok(index.includes('id="playfulTitle"'),'public result needs a playful title slot');
assert.ok(index.includes('id="profileHighlights"'),'public result needs qualitative highlight cards');
assert.ok(index.includes('id="resultSignature"'),'public result needs a qualitative signature');
assert.ok(index.includes('id="brainConstellation"'),'public result needs a no-scale six-domain view');
assert.ok(!index.includes('id="copyResultBtn"')&&!index.includes('id="shareResultBtn"'),'public result copy/share actions must stay removed');
assert.ok(index.includes('publicResultActions')&&index.includes('id="restartBtn"')&&index.includes('id="reviewBtn"'),'public result keeps only the minimal static action row');
assert.ok(index.includes('沒有分數，只有這次作答的趣味輪廓。'),'public result must state the no-score direction');
assert.ok(resultCss.includes('.internalResultDiagnostics')&&resultCss.includes('display: none !important'),'internal quantitative diagnostics must be hidden from the public surface');
assert.ok(resultCss.includes('.brainHexagonMap')&&resultCss.includes('.brainHexPrimary')&&resultCss.includes('.brainHexSecondary'),'public domain view must use role-only hexagon styling');
assert.ok(assessment.includes('resultShareEnabled: false'),'public sharing controls must stay disabled');
assert.ok(assessment.includes('shareIncludesNumericScore: false'),'internal share helper must exclude numeric scores');
assert.ok(assessment.includes('publicDomainVisualization: "qualitative-hexagon-no-scale"'),'public domain hexagon must remain scale-free');

console.log('Screenshot QA regression validation PASS');
console.log('Matrix evidence, explicit speed/packing wording, and qualitative hexagon public-result integrity are protected.');
