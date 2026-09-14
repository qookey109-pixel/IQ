const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={},window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const html=fs.readFileSync('index.html','utf8');
const bankScripts=html.split('<script src="app.js">')[0];
for(const [,file] of bankScripts.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const items=window.IQ_QUESTION_BANK.filter(q=>q.taskFamily==='reported-vs-fact');
assert.strictEqual(items.length,14,'reported-vs-fact final bank count');
assert.strictEqual(new Set(items.map(q=>q.semanticKey)).size,2,'two evidence-language constructs');

function normalize(s){return String(s||'').replace(/[「」『』，。！？：；、\s]/g,'');}
for(const q of items){
  const correct=String(q.correctContent);
  const wrong=q.o.filter((_,i)=>i!==q.a).map(String);
  assert.strictEqual(String(q.o[q.a]),correct,`${q.id}: answer binding`);
  assert.strictEqual(new Set(q.o.map(String)).size,4,`${q.id}: unique options`);
  assert.match(q.q,/只根據這份(?:文字|紀錄|公告)|只根據這份文字|只根據這份紀錄|只根據這份公告/,`${q.id}: evidence-only instruction`);
  assert.ok(!normalize(q.q).includes(normalize(correct)),`${q.id}: correct answer must paraphrase rather than copy the stem`);
  assert.ok(!/主辦方預測明天可能有|一份書店公告|讀者取書/.test(q.q),`${q.id}: remove unnatural legacy announcement framing`);
  assert.ok(!/一定|已經完成|已完成|今天已經/.test(correct),`${q.id}: correct answer must preserve uncertainty/report status`);
  const joinedWrong=wrong.join('｜');
  assert.ok(/一定|所有|全部/.test(joinedWrong),`${q.id}: at least one certainty/scope overclaim distractor`);
  assert.ok(/已經|已完成|今天|現在已/.test(joinedWrong),`${q.id}: at least one occurred-fact overclaim distractor`);
  assert.ok(correct.length>=18,`${q.id}: answer should be a meaningful inference, not a copied keyword`);
}

const legacy=items.filter(q=>/最忠實保留原文的證據強度/.test(q.q)&&normalize(q.q).includes(normalize(q.correctContent)));
assert.strictEqual(legacy.length,0,'literal-copy evidence questions must not return');
console.log('Verbal Evidence Integrity PASS');
console.log('14 reported-vs-fact items use natural contexts, paraphrased correct inferences, and distinct certainty/occurrence/scope distractor errors.');
