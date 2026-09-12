const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const window={};
const context={window,console,Math,Number,Object,Array,Set};
vm.createContext(context);
vm.runInContext(fs.readFileSync('scoring-v2.js','utf8'),context,{filename:'scoring-v2.js'});
const S=window.IQ_SCORING_V2;
assert.ok(S);
assert.deepStrictEqual(JSON.parse(JSON.stringify(S.difficultyWeights)),{easy:1,medium:1.25,hard:1.5});
assert.strictEqual(S.speedShare,0.05);

const q1={d:'A',difficulty:'easy',a:0};
const q2={d:'A',difficulty:'medium',a:1};
const q3={d:'A',difficulty:'hard',a:2};
let r=S.scoreAssessment([q1,q2,q3],[0,0,2],[8,8,8]);
assert.strictEqual(r.rawCorrect,2);
assert.strictEqual(r.rawAccuracy,66.7);
assert.strictEqual(r.domains.A.weightedAccuracy,66.7);
assert.strictEqual(r.domains.A.score,66.7);
assert.strictEqual(r.scale,'0-100-experimental');
assert.strictEqual(r.calibrated,false);

const timed=[
  {d:'處理速度',difficulty:'easy',a:0,limit:20},
  {d:'處理速度',difficulty:'medium',a:0,limit:20}
];
r=S.scoreAssessment(timed,[0,1],[10,1]);
assert.strictEqual(r.rawAccuracy,50);
assert.ok(r.domains['處理速度'].speedEfficiency>0);
assert.ok(r.domains['處理速度'].score<r.domains['處理速度'].weightedAccuracy,'speed component must not reward an incorrect fast response');

r=S.scoreAssessment(timed,[0,0],[0,0]);
assert.strictEqual(r.domains['處理速度'].score,100);
assert.strictEqual(r.performanceIndex,100);

r=S.scoreAssessment(timed,[1,1],[0,0]);
assert.strictEqual(r.domains['處理速度'].score,0);
assert.strictEqual(r.performanceIndex,0);

console.log('Scoring v2 validation PASS');
console.log('0–100 transparent performance scale; raw accuracy retained; speed contributes only after correct timed responses.');
