'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const matrixCore=require('../calibration/matrix-form-core.js');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js','qb5-verbal-surface-expansion.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js','spatial-task-refinement.js','presentation-clarity.js','calibration/anchor-core.js','qb5-42-form.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
const formal=window.IQ_QUESTIONS;
const anchorCore=window.IQ_CALIBRATION_ANCHOR_CORE;
assert.strictEqual(bank.length,2058,'bank authority must remain 2,058');
assert.strictEqual(formal.length,42,'default scored form remains 42');
assert.ok(anchorCore,'anchor core must load before the formal selector');

const anchors=anchorCore.selectAnchorSet(bank);
const reservedIds=anchors.map(x=>x.id);
assert.strictEqual(anchors.length,6,'six stable anchors must be reserved');
assert.ok(anchors.every(x=>x.role==='core'),'reserved anchors must use their stable primary IDs');
assert.ok(formal.every(q=>!reservedIds.includes(q.id)),'default formal form must exclude stable research anchors');
assert.strictEqual(window.IQ_42_FORM.anchorReserve.count,6,'production metadata must expose six reserved anchors');
assert.deepStrictEqual(new Set(window.IQ_42_FORM.anchorReserve.ids),new Set(reservedIds),'production reserve IDs must match anchor core');

const cycle=matrixCore.buildCycle(bank,{reservedIds,epoch:0});
assert.strictEqual(cycle.forms.length,56,'matrix cycle must contain 56 planned forms');
assert.strictEqual(cycle.coverage.totalResponses,56*42,'56-slot cycle must contain 2,352 formal responses');
assert.ok(cycle.coverage.uniqueItems>=1500,`matrix cycle should spread exposure broadly; got ${cycle.coverage.uniqueItems} unique items`);
assert.ok(cycle.coverage.maxExposure<=8,`no item should dominate the matrix cycle; max exposure=${cycle.coverage.maxExposure}`);

for(let slot=0;slot<cycle.forms.length;slot++){
  const form=cycle.forms[slot];
  const validation=matrixCore.validateForm(form,{reservedIds});
  assert.strictEqual(validation.ok,true,`slot ${slot}: ${validation.errors.join('; ')}`);
  assert.strictEqual(form.length,42,`slot ${slot}: must remain 42 items`);
  assert.strictEqual(new Set(form.map(q=>q.id)).size,42,`slot ${slot}: IDs must be unique`);
  assert.ok(form.every(q=>!reservedIds.includes(q.id)),`slot ${slot}: must not contain reserved anchor`);
  for(const domain of matrixCore.DOMAINS){
    const group=form.filter(q=>q.d===domain);
    assert.strictEqual(group.length,7,`${domain}: seven items per slot`);
    assert.strictEqual(new Set(group.map(q=>q.taskFamily)).size,7,`${domain}: seven families per slot`);
    assert.strictEqual(group.filter(q=>q.difficulty==='easy').length,2,`${domain}: two easy per slot`);
    assert.strictEqual(group.filter(q=>q.difficulty==='medium').length,3,`${domain}: three medium per slot`);
    assert.strictEqual(group.filter(q=>q.difficulty==='hard').length,2,`${domain}: two hard per slot`);
  }
}

const sampleA=matrixCore.buildForm(bank,{sourceKey:'participant-alpha',reservedIds,epoch:0});
const sampleB=matrixCore.buildForm(bank,{sourceKey:'participant-alpha',reservedIds,epoch:0});
assert.strictEqual(sampleA.formId,sampleB.formId,'same pseudonymous source must map to same matrix slot');
assert.deepStrictEqual(sampleA.form.map(q=>q.id),sampleB.form.map(q=>q.id),'matrix form must be deterministic for same source/epoch');
assert.ok(/^matrix:CIL-MATRIX-2026\.09\.1:epoch-0:slot-\d{2}$/.test(sampleA.formId),'formId must preserve matrix version/epoch/slot');

const runtimeSource=fs.readFileSync('calibration-matrix-form.js','utf8');
assert.ok(runtimeSource.includes("params.get('calibration')==='matrix'"),'matrix mode must be explicitly opt-in');
assert.ok(runtimeSource.includes("mode:'production-random'"),'normal mode must remain available');
assert.ok(runtimeSource.includes("mode:'calibration-matrix'"),'research mode must be labeled');
assert.ok(!/performanceIndex\s*=/.test(runtimeSource),'matrix selector must not mutate CPI');
assert.ok(!/iqEstimate\s*=/.test(runtimeSource),'matrix selector must not fabricate IQ');

const html=fs.readFileSync('index.html','utf8');
const anchorPos=html.indexOf('calibration/anchor-core.js');
const formPos=html.indexOf('qb5-42-form.js');
const matrixCorePos=html.indexOf('calibration/matrix-form-core.js');
const matrixRuntimePos=html.indexOf('calibration-matrix-form.js');
const appPos=html.indexOf('app.js');
assert.ok(anchorPos>=0&&anchorPos<formPos,'anchor reserve must be known before selecting the scored form');
assert.ok(formPos<matrixCorePos&&matrixCorePos<matrixRuntimePos&&matrixRuntimePos<appPos,'matrix mode must replace the form before app.js captures IQ_QUESTIONS');
assert.ok(html.includes('56 槽位 matrix sampling'),'public explanation must disclose matrix sampling research mode');
assert.ok(html.includes('6 個中等難度題目保留為固定研究 Anchor'),'public explanation must disclose reserved anchors');

console.log('Calibration matrix form validation PASS');
console.log(`cycle=${cycle.forms.length}; uniqueItems=${cycle.coverage.uniqueItems}; maxExposure=${cycle.coverage.maxExposure}; reservedAnchors=${reservedIds.length}`);
