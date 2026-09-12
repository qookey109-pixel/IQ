const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,5124);
assert.strictEqual(window.IQ_BANK_META.naturalLanguageRevision,'NL-2026.09.2');
assert.strictEqual(window.IQ_BANK_VALIDATION.uniqueTaskSignatures,5124);

const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
assert.strictEqual(new Set(bank.map(sig)).size,5124,'Natural-language pass must preserve 5,124 unique concrete items');

const machines=bank.filter(q=>q.taskFamily==='machine-composition');
assert.ok(machines.every(q=>!q.q.includes('規則機器')),'machine-composition should not use verbose 規則機器 wording');
assert.ok(machines.every(q=>q.q.startsWith('X = ')),'machine-composition should use concise X notation');

const negation=bank.filter(q=>q.taskFamily==='scope-negation');
assert.ok(negation.every(q=>!q.q.includes('的紀錄中')),'scope-negation should not inject irrelevant place-record context');
assert.ok(negation.some(q=>q.q.includes('不是所有完成 A 的人都完成 B')));

const transfer=bank.filter(q=>q.taskFamily==='invariant-transfer');
assert.ok(transfer.every(q=>!q.q.includes('三個容器中共有')),'invariant-transfer should use natural container wording');
assert.ok(transfer.some(q=>q.q.includes('甲、乙、丙三個容器分別有')));

const unit=bank.filter(q=>q.taskFamily==='quant-unit-rate');
assert.ok(unit.every(q=>!q.q.includes('這組資料為情境')),'unit-rate items should integrate the concrete noun into the sentence');
assert.ok(unit.some(q=>/機器 \d+ 分鐘製作 \d+ .+，速率固定。每分鐘製作幾/.test(q.q)));

const artificial=bank.filter(q=>q.q.includes('這組資料為情境'));
assert.strictEqual(artificial.length,0,`remaining artificial quant wrapper(s): ${artificial.slice(0,3).map(q=>q.id).join(', ')}`);

const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,1008);
assert.ok(spatial.every(q=>String(q.visual||'').includes('class="qb5-spatial-svg"')));
assert.ok(spatial.every(q=>String(q.visual||'').includes('width="360"')&&String(q.visual||'').includes('height="220"')),'all spatial SVGs need intrinsic Safari-safe dimensions');
const css=fs.readFileSync('spatial-visual-fix.css','utf8');
assert.match(css,/\.qb5-spatial-svg/);
assert.match(css,/width:\s*min\(100%,\s*400px\)/);

console.log('Natural Language / Visual validation PASS');
console.log('Applied de-templating:',JSON.stringify(window.IQ_NATURAL_LANGUAGE.applied));
console.log('Retained for uniqueness:',JSON.stringify(window.IQ_NATURAL_LANGUAGE.retained));
console.log('Spatial SVG sized:',window.IQ_NATURAL_LANGUAGE.spatialSvgSized);
