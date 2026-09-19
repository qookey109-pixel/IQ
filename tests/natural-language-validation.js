const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-parameter-diversity.js','qb5-ordering-diversity-fix.js','qb5-form-equivalence.js','qb5-finalize.js','natural-language-v2.js','question-language-finalize.js'];
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});

const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,5124);
assert.strictEqual(window.IQ_BANK_META.naturalLanguageRevision,'NL-2026.09.3');
assert.strictEqual(window.IQ_BANK_META.languageStyle,'direct-taiwan-zh-hant');
assert.strictEqual(window.IQ_BANK_VALIDATION.uniqueTaskSignatures,5124);
assert.match(window.IQ_NATURAL_LANGUAGE.reference,/speak-human-tw/);
assert.strictEqual(window.IQ_NATURAL_LANGUAGE.finalized,true);

const sig=q=>JSON.stringify([q.q,q.stim||'',q.cells||[],q.visual||'',[...(q.o||[])].map(String).sort()]);
assert.strictEqual(new Set(bank.map(sig)).size,5124,'Language pass must preserve 5,124 unique concrete items');

const machines=bank.filter(q=>q.taskFamily==='machine-composition');
assert.ok(machines.every(q=>!q.q.includes('規則機器')),'machine-composition should not use verbose 規則機器 wording');
assert.ok(machines.every(q=>q.q.startsWith('X = ')),'machine-composition should use concise X notation');

const negation=bank.filter(q=>q.taskFamily==='scope-negation');
assert.ok(negation.every(q=>!q.q.includes('的紀錄中')),'scope-negation should not inject irrelevant place-record context');
assert.ok(negation.every(q=>/邏輯|等價/.test(q.q)),'scope-negation should use concise but logically precise wording');

const transfer=bank.filter(q=>q.taskFamily==='invariant-transfer');
assert.ok(transfer.every(q=>!q.q.includes('三個容器中共有')),'invariant-transfer should use natural container wording');
assert.ok(transfer.some(q=>q.q.includes('甲、乙、丙三個容器分別有')));
// Hard-only external add/remove variants are applied later by hard-construct-integrity.js
// in the production runtime. Their actor/system-boundary wording is guarded in
// tests/hard-construct-integrity-validation.js, not in this earlier language-stage test.

const unit=bank.filter(q=>q.taskFamily==='quant-unit-rate');
assert.ok(unit.every(q=>!q.q.includes('這組資料為情境')),'unit-rate items should integrate the concrete noun into the sentence');
assert.ok(unit.every(q=>!q.q.includes('個信封')),'mail unit-rate should not use generic 個信封 wording');
assert.ok(unit.some(q=>q.q.includes('封信件')),'mail unit-rate should use natural Taiwan noun and measure word');
assert.ok(unit.filter(q=>q.q.includes('封信件')&&q.q.includes('每分鐘製作')).every(q=>q.q.includes('每分鐘製作幾封？')),'mail production rate should ask in 封');

const overlap=bank.filter(q=>q.taskFamily==='set-overlap');
assert.ok(overlap.every(q=>!q.q.includes('的這個案例中')));
assert.ok(overlap.every(q=>!q.q.includes('的調查：')));
assert.ok(overlap.some(q=>q.q.includes('閱讀課')||q.q.includes('公車')||q.q.includes('咖啡')));

const pairing=bank.filter(q=>q.taskFamily==='pairing-capacity');
assert.ok(pairing.every(q=>!q.q.includes('的這個案例中')));
const decorativePlaces=['圖書館','車站','展館','劇院','球館','工坊','書店','碼頭','畫廊','山屋','市集','茶館','教室','工作室','博物館','實驗室','運動中心','社區中心'];
assert.ok(pairing.every(q=>!decorativePlaces.some(place=>q.q.startsWith(place+'：'))),
  'pairing-capacity must not use irrelevant random-place prefixes');

const pairingV1=pairing.filter(q=>Number(q.constructVariant)===1);
assert.ok(pairingV1.every(q=>q.q.includes('每把鎖也最多配一把鑰匙')),
  'one-to-one pairing must state the lock-side uniqueness constraint');
const pairingV2=pairing.filter(q=>Number(q.constructVariant)===2);
assert.ok(pairingV2.every(q=>q.q.includes('其餘鑰匙可各自配到不同的鎖')&&q.q.includes('每把鎖與每把鑰匙都只能用一次')),
  'partially unusable-key items must make distinct matching assumptions explicit');
const pairingV3=pairing.filter(q=>Number(q.constructVariant)===3);
assert.ok(pairingV3.every(q=>q.q.includes('每把鎖與每把鑰匙都只能用一次')),
  'typed matching items must state that both sides are single-use');
const pairingV5=pairing.filter(q=>Number(q.constructVariant)===5);
assert.ok(pairingV5.every(q=>q.q.includes('每件只能放入一個')),
  'capacity items must state that an object cannot be counted in multiple containers');
const pairingV6=pairing.filter(q=>Number(q.constructVariant)===6);
assert.ok(pairingV6.every(q=>q.q.includes('保留席')&&q.q.includes('不開放給現場一般觀眾')),
  'reserved-seat items must state exactly who cannot use the reserved seats');

const memUpdate=bank.filter(q=>q.taskFamily==='memory-update');
assert.ok(memUpdate.every(q=>q.q==='照剛才的順序計算，最後是多少？'));
const memRelative=bank.filter(q=>q.taskFamily==='memory-relative');
assert.ok(memRelative.every(q=>!q.q.includes('這個完整項目為基準')));
const memReorder=bank.filter(q=>q.taskFamily==='memory-reorder');
assert.ok(memReorder.every(q=>!q.q.includes('做以下操作')));

const speed=bank.filter(q=>q.d==='處理速度');
assert.ok(speed.every(q=>!q.q.includes('快速掃描組中')),'speed items should not use fake place-based scan contexts');
const speedCount=bank.filter(q=>q.taskFamily==='speed-count');
assert.ok(speedCount.every(q=>q.q.startsWith('符號列：')),'speed-count should show the actual scan row directly');

const scale=bank.filter(q=>q.taskFamily==='scale-drawing');
assert.strictEqual(scale.length,144);
assert.ok(scale.every(q=>!q.q.includes('的尺寸如下')),'scale-drawing should not use irrelevant product-size wrappers');
assert.ok(scale.every(q=>String(q.visual||'').includes('?')),'every scale diagram should mark the requested result as unknown');
const reverseScale=scale.filter(q=>Number(q.constructVariant)===6);
assert.strictEqual(reverseScale.length,18);
assert.ok(reverseScale.every(q=>/^線段 [A-Z] 放大/.test(q.q)),'reverse scale items should ask directly for the original length with a meaningful line label');
assert.ok(reverseScale.every(q=>String(q.visual||'').includes('原長 ?')),'reverse scale diagrams must hide the original length');
assert.ok(reverseScale.every(q=>!String(q.visual||'').includes(`原長 ${q.correctContent}`)),'reverse scale diagrams must never print the correct original length');
assert.strictEqual(window.IQ_NATURAL_LANGUAGE.scaleDrawingVisualGuard,'unknown-target-must-use-question-mark');

const artificialPatterns=[/這組資料為情境/,/的這個案例中/,/快速掃描組中/,/規則機器/,/的紀錄中，句子/];
const artificial=bank.filter(q=>artificialPatterns.some(re=>re.test(String(q.q))));
assert.strictEqual(artificial.length,0,`remaining artificial wrapper(s): ${artificial.slice(0,5).map(q=>q.id).join(', ')}`);
assert.strictEqual(window.IQ_NATURAL_LANGUAGE.metrics.artificialWrapperCount,0);

const mainlandTerms=['視頻','信息','網絡','軟件','硬件','數據庫','服務器','屏幕','鼠標','默認','兼容','卸載','反饋','性價比'];
const mainlandHits=[];
for(const q of bank){
  const text=[q.q,q.e,...(q.o||[])].join(' ');
  for(const term of mainlandTerms)if(text.includes(term))mainlandHits.push(`${q.id}:${term}`);
}
assert.deepStrictEqual(mainlandHits,[],'generated items should use stable Taiwan terminology');

assert.ok(window.IQ_NATURAL_LANGUAGE.metrics.avgStemChars<70,'average stem should remain concise');
assert.ok(window.IQ_NATURAL_LANGUAGE.metrics.p95StemChars<100,'95% of stems should stay under 100 characters');
assert.ok(window.IQ_NATURAL_LANGUAGE.metrics.maxStemChars<150,'no question stem should become an essay');

const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,1008);
assert.ok(spatial.every(q=>String(q.visual||'').includes('class="qb5-spatial-svg"')));
assert.ok(spatial.every(q=>String(q.visual||'').includes('width="360"')&&String(q.visual||'').includes('height="220"')),'all spatial SVGs need intrinsic Safari-safe dimensions');
const css=fs.readFileSync('spatial-visual-fix.css','utf8');
assert.match(css,/\.qb5-spatial-svg/);
assert.match(css,/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(340px,\s*1fr\)/,'desktop visual questions must reserve half the content width for diagrams');
assert.match(css,/grid-column:\s*2;/,'diagram holder should live in the right column on desktop');
assert.match(css,/max-height:\s*clamp\(340px,\s*40dvh,\s*420px\)/,'desktop spatial diagrams must not be compressed below their readable size');
assert.match(css,/#visualHolder \.matrixGrid/,'matrix visuals need split-layout sizing too');
assert.match(css,/@media \(max-width: 899px\)/,'tablet and phone layouts must fall back to stacking');
assert.match(css,/overflow-y:\s*auto/,'short screens must scroll instead of shrinking the diagrams');
assert.ok(!/transform:\s*scale\(/.test(css),'diagram enlargement must not rely on a clipping-prone transform');
assert.match(css,/border:\s*0;[\s\S]*box-shadow:\s*none;\s*background:\s*none/,'remove decorative diagram frames, not table lines');
assert.ok(!/\.memory[^\{]*\{[^\}]*grid-column:\s*2/s.test(css),'working-memory stimulus must not be forced into the desktop diagram split');

console.log('Natural Language v3 / Visual validation PASS');
console.log('Reference:',window.IQ_NATURAL_LANGUAGE.reference);
console.log('Applied:',JSON.stringify(window.IQ_NATURAL_LANGUAGE.applied));
console.log('Retained:',JSON.stringify(window.IQ_NATURAL_LANGUAGE.retained));
console.log('Metrics:',JSON.stringify(window.IQ_NATURAL_LANGUAGE.metrics));
console.log('Spatial SVG sized:',window.IQ_NATURAL_LANGUAGE.spatialSvgSized);
console.log('Scale drawings: unknown target hidden in all 144 visuals; reverse-scale original length never leaked');
console.log('Visual layout: desktop = question left / diagram right; tablet and phone = stacked; memory exposure unchanged');
