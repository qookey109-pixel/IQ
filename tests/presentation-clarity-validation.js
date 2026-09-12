const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-finalize.js','answer-position-balance.js','answer-quality.js'];
const css=fs.readFileSync('heritage-theme.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
for(const file of runtime)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const snapshots=new Map(window.IQ_QUESTION_BANK.slice(0,160).map(q=>[q.id,{q:q.q,e:q.e,a:q.a,o:[...q.o],visual:q.visual}]));
vm.runInContext(fs.readFileSync('presentation-clarity.js','utf8'),context,{filename:'presentation-clarity.js'});

const bank=window.IQ_QUESTION_BANK;
assert.strictEqual(bank.length,5124);
const spatial=bank.filter(q=>q.d==='視覺空間');
assert.strictEqual(spatial.length,1008);
assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')),'all QB5 spatial items must retain their essential SVG');
assert.ok(spatial.every(q=>q.presentationMode==='spatial-diagram'),'QB5 spatial items must render as diagram tasks');
assert.strictEqual(new Set(spatial.map(q=>q.diagramType)).size,7,'all seven spatial families should expose diagram types');

const speed=bank.filter(q=>q.d==='處理速度');
assert.strictEqual(speed.length,1008);
assert.ok(speed.every(q=>q.presentationMode==='direct-speed'));
assert.ok(speed.every(q=>q.visual==null));
assert.ok(speed.every(q=>q.o.length===4&&new Set(q.o.map(String)).size===4));

const memory=bank.filter(q=>q.d==='工作記憶');
assert.strictEqual(memory.length,1008);
assert.ok(memory.every(q=>q.presentationMode==='single-stimulus'));
const matrix=bank.filter(q=>q.type==='matrix');
assert.strictEqual(matrix.length,144);
assert.ok(matrix.every(q=>Array.isArray(q.cells)&&q.cells.length===9));
assert.ok(matrix.every(q=>q.presentationMode==='essential-visual'));

for(const [id,before] of snapshots){
  const q=bank.find(x=>x.id===id);
  assert.strictEqual(q.q,before.q,`${id}: presentation preserves prompt`);
  assert.strictEqual(q.e,before.e,`${id}: presentation preserves explanation`);
  assert.strictEqual(q.a,before.a,`${id}: presentation preserves key`);
  assert.deepStrictEqual([...q.o],before.o,`${id}: presentation preserves options`);
  if(q.d==='視覺空間')assert.strictEqual(q.visual,before.visual,`${id}: presentation preserves spatial SVG`);
}

assert.ok(css.includes('--bg:#e9dfcf'));
assert.ok(css.includes('--text:#241f1a'));
assert.ok(css.includes('--gold:#a96f3e'));
assert.ok(css.includes('.timer.memoryTimer'));
assert.ok(html.indexOf('heritage-theme.css')>html.indexOf('viewport-stability.css'));
assert.strictEqual(html.includes('clarity-theme.css'),false);
assert.ok(html.indexOf('presentation-clarity.js')>html.indexOf('answer-quality.js'));
assert.ok(html.indexOf('presentation-clarity.js')<html.indexOf('app.js'));

assert.strictEqual(window.IQ_PRESENTATION_CLARITY.version,'3.0-qb5');
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialTextOnly,false);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialDiagrams,true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.directSpeedOptions,true);
console.log('QB5 presentation clarity validation PASS');
console.log('1,008 spatial SVG items retained; speed/memory low-fatigue presentation preserved; warm editorial palette active.');