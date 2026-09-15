'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const anchorCore=require('../calibration/anchor-core.js');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','qb5-compact-bank.js','qb5-verbal-surface-expansion.js','natural-language-v2.js','question-language-finalize.js','answer-position-balance.js','answer-quality.js','memory-integrity.js','hard-construct-integrity.js','processing-speed-integrity.js','full-bank-polish.js','memory-usability.js','spatial-reliability.js','spatial-task-refinement.js','presentation-clarity.js','qb5-42-form.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
const form=window.IQ_QUESTIONS;
assert.strictEqual(bank.length,2058,'production bank authority must remain 2,058');
assert.strictEqual(form.length,42,'formal assessment must remain exactly 42 scored items');

const formalIds=form.map(q=>q.id);
const anchors=anchorCore.selectAnchorSet(bank,{excludeIds:formalIds});
const validation=anchorCore.validateAnchorSet(anchors,{excludeIds:formalIds});
assert.strictEqual(validation.ok,true,validation.errors.join('; '));
assert.strictEqual(anchors.length,6,'anchor block must contain six unscored research items');
assert.deepStrictEqual(new Set(anchors.map(x=>x.domain)),new Set(anchorCore.DOMAINS),'one anchor per domain');
assert.strictEqual(new Set(anchors.map(x=>x.id)).size,6,'anchor IDs must be unique');
assert.ok(anchors.every(x=>x.question.difficulty==='medium'),'anchors should use medium-difficulty linking items');
assert.ok(anchors.every(x=>Array.isArray(x.question.o)&&x.question.o.length===4),'anchors must remain normal four-option QB5 items');
assert.ok(anchors.every(x=>!formalIds.includes(x.id)),'anchor block must not repeat an item from the same formal form');

const anchorsAgain=anchorCore.selectAnchorSet(bank,{excludeIds:formalIds});
assert.deepStrictEqual(anchorsAgain.map(x=>[x.id,x.role,x.fingerprint]),anchors.map(x=>[x.id,x.role,x.fingerprint]),'anchor selection must be deterministic for the same bank/form');

for(const domain of anchorCore.DOMAINS){
  const ordered=anchorCore.orderedCandidates(bank,domain);
  assert.ok(ordered.length>1,`${domain}: needs fallback candidates`);
  const fallback=anchorCore.selectAnchorSet(bank,{excludeIds:[ordered[0].id]});
  const row=fallback.find(x=>x.domain===domain);
  assert.notStrictEqual(row.id,ordered[0].id,`${domain}: excluded primary must not repeat`);
  assert.strictEqual(row.role,'bridge-fallback',`${domain}: fallback must be explicitly marked`);
}

const sample=anchors[0].question;
const baseFingerprint=anchorCore.fingerprint(sample);
const changed={...sample,q:`${sample.q}（內容變更）`};
assert.notStrictEqual(anchorCore.fingerprint(changed),baseFingerprint,'content edits must change the anchor fingerprint');

const source=fs.readFileSync('calibration-anchor-study.js','utf8');
assert.ok(source.includes('plannedAnchors:6'),'runtime metadata must declare six planned anchors');
assert.ok(source.includes('不影響 CPI'),'UI must state anchors do not affect CPI');
assert.ok(source.includes('optin')||source.includes('optIn'),'anchor study must be opt-in');
assert.ok(!/IQ_QUESTIONS\s*=/.test(source),'anchor study must not replace or enlarge the 42-item scored form');
assert.ok(!/performanceIndex\s*=/.test(source),'anchor study must not mutate CPI');
assert.ok(!/iqEstimate\s*:\s*(?!null)/.test(source),'anchor study must not fabricate an IQ estimate');
assert.ok(source.includes("formId:`anchor:${core.VERSION}`"),'anchor rows must be distinguishable in calibration exports');

const html=fs.readFileSync('index.html','utf8');
const studyPos=html.indexOf('calibration-study.js');
const corePos=html.indexOf('calibration/anchor-core.js');
const anchorPos=html.indexOf('calibration-anchor-study.js');
assert.ok(studyPos>=0&&corePos>studyPos&&anchorPos>corePos,'anchor modules must load after calibration-study and core before UI');
assert.ok(html.includes('42 題正式測驗完成後再做 6 題不計分 Anchor'),'public explanation must disclose optional anchor block');

console.log('Calibration anchor study validation PASS');
console.log(`formal=${form.length}; anchors=${anchors.length}; version=${anchorCore.VERSION}; domains=${anchors.map(x=>x.domain).join('/')}`);
