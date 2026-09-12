const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'dist','qb5-export');
fs.mkdirSync(OUT,{recursive:true});
const store={};
const window={addEventListener(){}};
const context={window,document:{getElementById(){return null;}},localStorage:{getItem(k){return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},console,Math,JSON,Set,Map,Array,Number,String,Object,Date,RegExp};
vm.createContext(context);
const runtimeFiles=['question-bank.js','qb5-core.js','qb5-verbal.js','qb5-fluid.js','qb5-spatial.js','qb5-memory.js','qb5-speed.js','qb5-quant.js','qb5-finalize.js','answer-position-balance.js','answer-quality.js','presentation-clarity.js'];
for(const file of runtimeFiles)vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
const bank=window.IQ_QUESTION_BANK,meta=window.IQ_BANK_META,validation=window.IQ_BANK_VALIDATION,qb5=window.IQ_QB5;
assert.ok(Array.isArray(bank));assert.strictEqual(bank.length,5124);assert.strictEqual(meta.version,'QB-2026.09.5');assert.strictEqual(meta.revision,'5.0');assert.strictEqual(meta.semanticTemplates,294);
const positions=[0,0,0,0];for(const q of bank)positions[q.a]++;assert.deepStrictEqual(positions,[1281,1281,1281,1281]);
const spatial=bank.filter(q=>q.d==='視覺空間');assert.strictEqual(spatial.length,1008);assert.ok(spatial.every(q=>String(q.visual||'').includes('<svg')));
const exportedAt=new Date().toISOString();
const exportMeta={...meta,exportedAt,sourceBranch:'feature/cognitive-iq-lab-v6',runtimeOrder:runtimeFiles,answerPositionCounts:positions,spatialSvgItems:spatial.length,note:'QB5 construct-expanded export: 42 families, 294 semantic templates, construct-linked difficulty, and SVG visuals for all spatial items.'};
fs.writeFileSync(path.join(OUT,'QB5-5124-construct-expanded.json'),JSON.stringify({meta:exportMeta,validation,qb5,items:bank},null,2));
fs.writeFileSync(path.join(OUT,'QB5-5124-items.json'),JSON.stringify(bank,null,2));
function cell(v){if(v==null)return '';const s=typeof v==='string'?v:JSON.stringify(v);return `"${s.replaceAll('"','""')}"`;}
const headers=['id','bankVersion','bankRevision','constructRevision','constructVariant','complexityScore','domain','difficulty','taskFamily','taskLabel','semanticKey','model','type','limit','question','optionA','optionB','optionC','optionD','answerIndex','answerLetter','correctAnswer','explanation','stimulus','cells','visual','diagramType','diagramData','source'];
const rows=[headers.map(cell).join(',')];
for(const q of bank){const values=[q.id,q.bankVersion,q.bankRevision,q.constructRevision,q.constructVariant,q.complexityScore,q.d,q.difficulty,q.taskFamily,q.taskLabel,q.semanticKey,q.model,q.type,q.limit??'',q.q,q.o?.[0]??'',q.o?.[1]??'',q.o?.[2]??'',q.o?.[3]??'',q.a,String.fromCharCode(65+q.a),q.o?.[q.a]??'',q.e,q.stim??'',q.cells??'',q.visual??'',q.diagramType??'',q.diagramData??'',q.source??''];rows.push(values.map(cell).join(','));}
fs.writeFileSync(path.join(OUT,'QB5-5124-construct-expanded.csv'),rows.join('\n'));
const readme=`Cognitive IQ Lab — QB5 Construct Expansion\n\nVersion: ${meta.version}\nRevision: ${meta.revision}\nItems: ${bank.length}\nTask families: ${meta.taskFamilies}\nSemantic templates: ${meta.semanticTemplates}\nSpatial SVG items: ${spatial.length}\nAnswer positions A/B/C/D: ${positions.join(' / ')}\nUnique task signatures: ${validation.uniqueTaskSignatures}\nExported: ${exportedAt}\n\nQB5 no longer treats a number swap as a new semantic template. Verbal families have 2 reasoning archetypes each; the other 35 families have 8 archetypes each, for 294 semantic templates. Non-verbal difficulty labels are tied to construct variants (easy variants 1–3, medium 4–6, hard 7–8), while memory span / constraint load / operation count also scale where applicable.\n\nAll 1,008 spatial items include an inline SVG task diagram.\n\nImportant: this remains an uncalibrated experimental cognitive-play bank. Difficulty labels are design tiers, not population-calibrated psychometric parameters.\n`;
fs.writeFileSync(path.join(OUT,'README.txt'),readme);
console.log(`QB5 export PASS: ${bank.length} items / ${meta.semanticTemplates} templates`);console.log(`A/B/C/D: ${positions.join('/')}`);console.log(`Spatial SVG: ${spatial.length}`);console.log(`Output: ${OUT}`);