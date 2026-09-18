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
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT?.version,'STR-2026.09.2');
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT?.total,168);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT?.gridDisplacement,56);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT?.mirrorCoordinate,56);
assert.strictEqual(window.IQ_SPATIAL_TASK_REFINEMENT?.scaleDrawing,56);
assert.strictEqual(window.IQ_BANK_META?.spatialTaskRefinement,'STR-2026.09.2');

const grids=bank.filter(q=>q.taskFamily==='grid-displacement');
assert.strictEqual(grids.length,56);
for(const q of grids){
  const d=q.spatialIntegrityData;
  assert.strictEqual(q.spatialTaskRefinement,'STR-2026.09.2',q.id);
  assert.strictEqual(d.measurement,'path-integration-from-known-start',q.id);
  assert.strictEqual(d.endpointCoordinatesShown,false,q.id);
  assert.strictEqual(d.gridUnit,1,q.id);
  assert.match(q.q,/起點 S = \(-?\d+, -?\d+\)/,q.id);
  assert.ok(!q.q.includes('依右側座標圖'),`${q.id}: direct endpoint-reading wording removed`);
  let [x,y]=d.start;
  for(const [dx,dy] of d.moves){x+=dx;y+=dy;}
  assert.deepStrictEqual(Array.from(d.end),[x,y],`${q.id}: endpoint recompute`);
  assert.strictEqual(q.correctContent,`(${x}, ${y})`,`${q.id}: endpoint answer`);
  assert.strictEqual(String(q.o[q.a]),q.correctContent,`${q.id}: answer binding`);
  assert.ok(q.visual.includes('viewBox="0 0 360 270"'),`${q.id}: non-negative fixed canvas`);
  assert.ok(q.visual.includes('每格 = 1'),`${q.id}: grid scale disclosed`);
  assert.ok(q.visual.includes('>S</text>')&&q.visual.includes('>E</text>'),`${q.id}: endpoints visible`);
  assert.ok(!/>-?\d+<\/text>/.test(q.visual),`${q.id}: endpoint coordinate cannot be read from numeric axis labels`);
}

const mirrors=bank.filter(q=>q.taskFamily==='mirror-coordinate');
assert.strictEqual(mirrors.length,56);
for(const q of mirrors){
  const d=q.spatialIntegrityData;
  assert.strictEqual(q.spatialTaskRefinement,'STR-2026.09.2',q.id);
  assert.strictEqual(d.axesLabeled,true,q.id);
  assert.deepStrictEqual(Array.from(d.tickRange),[-8,8],q.id);
  assert.strictEqual(d.tickStep,2,q.id);
  assert.ok(q.visual.includes('viewBox="0 0 360 280"'),`${q.id}: mirror fixed canvas`);
  assert.ok(q.visual.includes('font-weight="700">x</text>'),`${q.id}: x axis label`);
  assert.ok(q.visual.includes('font-weight="700">y</text>'),`${q.id}: y axis label`);
  assert.ok(q.visual.includes('>-8</text>')&&q.visual.includes('>8</text>'),`${q.id}: coordinate ticks`);
  assert.ok(q.visual.includes(`P(${d.point[0]}, ${d.point[1]})`),`${q.id}: source point label`);
  assert.strictEqual(String(q.o[q.a]),q.correctContent,`${q.id}: mirror answer binding`);
}

const scales=bank.filter(q=>q.taskFamily==='scale-drawing');
assert.strictEqual(scales.length,56);
for(const q of scales){
  const d=q.spatialIntegrityData;
  assert.strictEqual(q.spatialTaskRefinement,'STR-2026.09.2',q.id);
  assert.strictEqual(d.translationExplicit,true,q.id);
  assert.strictEqual(String(q.o[q.a]),q.correctContent,`${q.id}: scale answer binding`);
  const expected=`(${d.w*d.sx+d.tx}, ${d.h*d.sy+d.ty})`;
  assert.strictEqual(q.correctContent,expected,`${q.id}: scale coordinate recompute`);
  if(Number(d.tx)||Number(d.ty)){
    assert.deepStrictEqual(Array.from(d.transformationSequence),['scale','translate'],q.id);
    assert.ok(q.q.includes(`平移 (${d.tx}, ${d.ty})`),`${q.id}: translation vector must be explicit`);
  }else{
    assert.deepStrictEqual(Array.from(d.transformationSequence),['scale'],q.id);
    assert.ok(q.q.includes('不做平移'),`${q.id}: no-translation case must say so explicitly`);
    assert.ok(!q.q.includes('縮放與平移後'),`${q.id}: cannot imply an unspecified translation`);
  }
}

const css=fs.readFileSync('spatial-visual-fix.css','utf8');
assert.ok(css.includes('-webkit-overflow-scrolling: touch'),'Safari momentum scroll must remain enabled');
assert.ok(css.includes('scroll-padding-block: 16px 88px'),'scroll target needs bottom breathing room');
assert.ok(css.includes('max-height: 100%'),'visual question card must fit its stage before scrolling');
assert.ok(css.includes('(min-width: 900px) and (max-height: 780px)'),'short desktop windows need an explicit layout rule');
assert.ok(css.includes('padding-bottom: max'),'safe-area bottom padding must keep final choices reachable');

assert.ok(scriptFiles.indexOf('spatial-task-refinement.js')>scriptFiles.indexOf('spatial-reliability.js'));
assert.ok(scriptFiles.indexOf('spatial-task-refinement.js')<scriptFiles.indexOf('presentation-clarity.js'));

console.log('Spatial Task Refinement v2 PASS');
console.log('56 path-integration + 56 mirror + 56 scale/translation items are explicit and independently checkable; Safari scroll guards present.');
