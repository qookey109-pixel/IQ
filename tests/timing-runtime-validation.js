// Exercise the actual runtime with a controlled wall clock and delayed callbacks.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function runtime() {
  let now = 1000, nextId = 1;
  const jobs = new Map(), nodes = new Map();
  function element() {
    return { textContent: '', innerHTML: '', style: {}, dataset: {}, className: '',
      classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
      appendChild(){}, addEventListener(){} };
  }
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    createElement: element, head: element(), querySelectorAll(){return [];}, querySelector(){return null;}
  };
  const questions = [
    { id:'speed', d:'處理速度', difficulty:'easy', type:'normal', q:'Find', o:['A','B','C','D'], a:0, limit:18 },
    { id:'normal', d:'推理', difficulty:'easy', type:'normal', q:'Think', o:['A','B','C','D'], a:0, limit:null },
    { id:'speed2', d:'處理速度', difficulty:'easy', type:'normal', q:'Find', o:['A','B','C','D'], a:0, limit:18 }
  ];
  const c = { console, document, Math, Number, Object, Array, Set, Map, Date:{now:()=>now},
    setTimeout(fn, ms) {const id=nextId++; jobs.set(id,{fn,at:now+ms}); return id;},
    clearTimeout(id){jobs.delete(id);},
    setInterval(fn, ms){const id=nextId++; jobs.set(id,{fn,at:now+ms,ms}); return id;},
    clearInterval(id){jobs.delete(id);},
    scrollTo(){}, IQ_QUESTIONS:questions
  };
  c.window = c;
  vm.createContext(c);
  for(const file of ['app.js','timeout-lock.js','memory-exposure.js','scoring-v2.js','result-title-engine.js','assessment-quality.js']) {
    vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
  }
  const run = code => vm.runInContext(code,c);
  run('initState(); renderQuestion()');
  return {run, nodes, now(value){now=value;}, tick(ms){
    const until=now+ms;
    while(true){
      const entry=[...jobs].filter(([,j])=>j.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry)break;
      const [id,job]=entry; now=job.at;
      if(job.ms)job.at+=job.ms;else jobs.delete(id);
      job.fn();
    }
    now=until;
  }};
}

let r=runtime();
r.now(19110); // Simulates background throttling: no interval callback has run.
r.run('selectAnswer(0)');
assert.strictEqual(r.run('answers[0]'),null,'late click must never earn accuracy credit');
assert.strictEqual(r.run('expiredQuestionsLock[0]'),true);

r=runtime();
r.now(5000); r.run('saveElapsedBeforeLeave(); currentIndex=1; renderQuestion()');
r.now(19001); r.run('saveElapsedBeforeLeave(); currentIndex=0; renderQuestion()');
assert.strictEqual(r.run('expiredQuestionsLock[0]'),true,'navigation must not pause deadline');
assert.strictEqual(r.run('elapsedTimes[0]'),18);

r=runtime();
r.tick(8000); r.run('selectAnswer(0)'); r.tick(1000);
assert.strictEqual(r.run('elapsedTimes[0]'),8,'auto-advance must not add 170ms');
r.run('saveElapsedBeforeLeave(); currentIndex=0; renderQuestion(); selectAnswer(1)');
assert.strictEqual(r.run('answers[0]'),0,'timed submission must remain fixed on revisit');
r.tick(20000);
assert.strictEqual(r.run('elapsedTimes[0]'),8);
assert.strictEqual(r.run('expiredQuestionsLock[0]'),false,'submitted answer must not expire later');

r=runtime();
r.now(18999); r.run('selectAnswer(0)');
assert.strictEqual(r.run('answers[0]'),0,'answer just before deadline accepted');
r=runtime(); r.now(19000); r.run('selectAnswer(0)');
assert.strictEqual(r.run('answers[0]'),null,'answer exactly at deadline rejected');

r=runtime();
r.tick(17800);
assert.strictEqual(r.nodes.get('timer').textContent,'00:01','do not show zero while time remains');

r=runtime();
r.run('saveElapsedBeforeLeave(); currentIndex=1; renderQuestion()');
r.now(30000); r.run('finishTest()');
assert.strictEqual(r.run('expiredQuestionsLock[0]'),true,'finish must settle offscreen deadlines');
assert.strictEqual(r.run('expiredQuestionsLock[2]'),false,'unvisited timed question is not a timeout');

r=runtime();
r.tick(1000); r.run('selectAnswer(0); initState(); renderQuestion()'); r.tick(180);
assert.strictEqual(r.run('currentIndex'),0,'old submit callback must not advance a restarted attempt');
assert.strictEqual(r.run('answers[0]'),null);

r=runtime();
r.run('saveElapsedBeforeLeave(); currentIndex=1; renderQuestion()');
r.tick(2000); r.run('selectAnswer(0)'); r.tick(1000);
assert.strictEqual(r.run('elapsedTimes[1]'),2,'untimed answer also stops at click');
r.run('saveElapsedBeforeLeave(); currentIndex=1; renderQuestion(); selectAnswer(1)');
assert.strictEqual(r.run('answers[1]'),1,'untimed answers remain editable');
console.log('Timing runtime validation PASS: deadlines, navigation, submission, restart, and result settlement.');
