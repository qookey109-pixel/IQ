const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const runtime=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-finalize.js','answer-position-balance.js','answer-quality.js'];
const css=fs.readFileSync('heritage-theme.css','utf8');
const spatialCss=fs.readFileSync('spatial-visual-fix.css','utf8');
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
assert.ok(spatial.every(q=>String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"')),'all QB5 spatial SVGs need stable aspect-ratio containment');
assert.ok(spatial.every(q=>String(q.visual||'').includes('font-size="13"')),'all QB5 spatial SVGs need an explicit root font size so parent CSS cannot enlarge labels');
assert.ok(spatial.every(q=>q.visualSafeArea==='qb5-svg-safe-area-v1'),'all QB5 spatial items need safe-area normalization metadata');
assert.ok(spatial.every(q=>q.presentationMode==='spatial-diagram'),'QB5 spatial items must render as diagram tasks');
assert.strictEqual(new Set(spatial.map(q=>q.diagramType)).size,7,'all seven spatial families should expose diagram types');

const headings=spatial.filter(q=>q.diagramType==='heading-rotation');
assert.strictEqual(headings.length,144);
assert.ok(headings.every(q=>String(q.visual).includes('y="32"')&&String(q.visual).includes('y="202"')),'heading compass labels must stay inside the SVG safe area');
assert.ok(headings.every(q=>!String(q.visual).includes('y="214" text-anchor="middle">S 180°')),'heading south label must not sit on the bottom edge');

const displacement=spatial.filter(q=>q.diagramType==='grid-displacement');
assert.strictEqual(displacement.length,144);
assert.ok(displacement.every(q=>String(q.visual).includes('viewBox="-30 -40 420 300"')),'movement paths need an expanded logical canvas so S/E and labels cannot clip');

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
  if(q.d==='視覺空間'){
    assert.ok(String(q.visual||'').includes('<svg'),`${id}: presentation keeps essential spatial SVG`);
    assert.ok(String(q.visual||'').includes('preserveAspectRatio="xMidYMid meet"'),`${id}: presentation only adds safe rendering metadata`);
  }
}

assert.ok(css.includes('--bg:#e9dfcf'));
assert.ok(css.includes('--text:#241f1a'));
assert.ok(css.includes('--gold:#a96f3e'));
assert.ok(css.includes('.timer.memoryTimer'));
assert.ok(html.indexOf('heritage-theme.css')>html.indexOf('viewport-stability.css'));
assert.strictEqual(html.includes('clarity-theme.css'),false);
assert.ok(html.indexOf('presentation-clarity.js')>html.indexOf('answer-quality.js'));
assert.ok(html.indexOf('presentation-clarity.js')<html.indexOf('app.js'));

assert.ok(spatialCss.includes('max-height: min(32dvh, 300px)'),'non-matrix visual holder must have a bounded height');
assert.ok(spatialCss.includes('width: 100%; max-width: 420px'),'generic spatial wrapper must remain compact on desktop');
assert.ok(spatialCss.includes('max-width: 320px;')&&spatialCss.includes('max-height: min(25dvh, 235px)'),'simple spatial families need a compact desktop cap');
assert.ok(spatialCss.includes('family-shortest-grid-path')&&spatialCss.includes('max-width: 420px'),'dense path grids may keep a larger but bounded reading area');
assert.ok(spatialCss.includes('max-width: 320px; max-height: 240px;'),'tablet/mobile spatial diagrams must use a smaller global cap');
assert.ok(spatialCss.includes('width: min(100%, 205px, 22dvh)'),'matrix tasks must retain their existing compact 205px cap');
assert.ok(spatialCss.includes('overflow: hidden'),'non-matrix diagram holder must contain the visual instead of overlapping answer rows');
assert.ok(spatialCss.includes('margin-top: 8px'),'answer choices need breathing room below diagrams');
assert.ok(spatialCss.includes('questionText-long')&&spatialCss.includes('questionText-very-long'),'dense prompts need length-aware typography');
assert.ok(spatialCss.includes('white-space: pre-line'),'sentence-level line breaks must render clearly');
assert.ok(spatialCss.includes('grid-template-columns: max-content minmax(0, 1fr)'),'footer navigation and hint must have separate layout columns');
assert.ok(spatialCss.includes('max-width: 38ch'),'footer hint must wrap before reaching the card edge');

assert.ok(!spatialCss.includes('max-width: 560px'),'oversized generic spatial wrapper must not return');
assert.ok(!spatialCss.includes('min-height: clamp(340px, 40dvh, 420px)'),'oversized reserved diagram height must not return');

assert.strictEqual(window.IQ_PRESENTATION_CLARITY.version,'3.1-qb5');
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialTextOnly,false);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialDiagrams,true);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialSvgSafety.normalized,1008);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialSvgSafety.headingFixed,144);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.spatialSvgSafety.displacementFixed,144);
assert.strictEqual(window.IQ_PRESENTATION_CLARITY.directSpeedOptions,true);
console.log('QB5 presentation clarity validation PASS');
console.log('1,008 spatial SVG items retained with safe-area normalization; 144 heading + 144 displacement diagrams protected from clipping.');