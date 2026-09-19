'use strict';

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'artifacts', 'visual-audit-42');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const INCLUDE_RE = /{%\s*include_relative\s+([^\s%]+)\s*%}/g;
const stripFrontMatter = source => source.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
function renderIncludes(file) {
  const source = stripFrontMatter(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  return source.replace(INCLUDE_RE, (_m, rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}
const runtimeBundle = renderIncludes('runtime.bundle.js');
const styleBundle = renderIncludes('styles.bundle.css');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

function serveFile(req, res) {
  const raw = new URL(req.url, 'http://127.0.0.1').pathname;
  const pathname = raw === '/' ? '/index.html' : raw;
  if (pathname === '/runtime.bundle.js') {
    res.writeHead(200, { 'content-type': MIME['.js'], 'cache-control': 'no-store' });
    res.end(runtimeBundle);
    return;
  }
  if (pathname === '/styles.bundle.css') {
    res.writeHead(200, { 'content-type': MIME['.css'], 'cache-control': 'no-store' });
    res.end(styleBundle);
    return;
  }
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(serveFile);
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));

function findChrome() {
  const names = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const name of names) {
    if (path.isAbsolute(name) && fs.existsSync(name)) return name;
    const p = spawnSync('which', [name], { encoding: 'utf8' });
    if (p.status === 0 && p.stdout.trim()) return p.stdout.trim();
  }
  throw new Error('No Chrome/Chromium executable found on runner');
}

const chromePath = findChrome();
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/iq-visual-audit-chrome',
  '--window-size=1536,960',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += String(d); });

async function waitForDebugger() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9222/json/version');
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 125));
  }
  throw new Error('Chrome remote debugger did not start\n' + chromeErr.slice(-4000));
}

await waitForDebugger();
const created = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
if (!created.ok) throw new Error('Unable to create Chrome tab: ' + created.status);
const target = await created.json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let seq = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const item = pending.get(msg.id);
  pending.delete(msg.id);
  if (msg.error) item.reject(new Error(JSON.stringify(msg.error)));
  else item.resolve(msg.result);
});

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error('Runtime exception: ' + JSON.stringify(result.exceptionDetails));
  return result.result && result.result.value;
}

async function waitFor(condition, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await evaluate('Boolean(' + condition + ')')) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Timeout waiting for: ' + condition);
}

async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 72,
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1536,
  height: 960,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1536,
  screenHeight: 960
});
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: "(() => { let s = 0x5eeda11; Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();"
});

await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await waitFor("document.readyState === 'complete'", 15000);
await waitFor("typeof renderQuestion === 'function' && Array.isArray(window.IQ_QUESTIONS) && window.IQ_QUESTIONS.length === 42", 15000);

await evaluate("document.getElementById('startBtn').click();");
await new Promise(r => setTimeout(r, 400));
await evaluate("stopTimer(); startTimer = function(){ stopTimer(); enteredAt = 0; };");

const metrics = [];
const critical = [];
const warnings = [];

const metricExpression = "(() => {" +
" const rect = el => { if (!el) return null; const r=el.getBoundingClientRect(); return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}; };" +
" const card=document.getElementById('questionCard');" +
" const question=document.getElementById('question');" +
" const visual=document.getElementById('visualHolder');" +
" const options=document.getElementById('options');" +
" const footer=card&&card.querySelector('.footerActions');" +
" const hint=footer&&footer.querySelector('.hint');" +
" const optionEls=[...document.querySelectorAll('#options .option')];" +
" const cs=question?getComputedStyle(question):null;" +
" const lineHeight=cs?parseFloat(cs.lineHeight):0;" +
" const q=questions[currentIndex];" +
" const vr=rect(visual),or=rect(options),fr=rect(footer),cr=rect(card),qr=rect(question),hr=rect(hint);" +
" const optionRects=optionEls.map(rect);" +
" const visibleVisual=visual&&visual.children.length>0&&vr&&vr.height>1;" +
" const issues=[];" +
" if(visibleVisual&&or&&vr.bottom>or.y-3)issues.push('visual-options-overlap');" +
" if(or&&fr&&or.bottom>fr.y-2)issues.push('options-footer-overlap');" +
" if(fr&&cr&&fr.bottom>cr.bottom+1)issues.push('footer-outside-card');" +
" if(hr&&cr&&(hr.right>cr.right+1||hr.left<cr.left-1))issues.push('hint-outside-card');" +
" if(hr&&hint&&hint.scrollWidth>hint.clientWidth+2)issues.push('hint-horizontal-clipping');" +
" if(qr&&cr&&(qr.right>cr.right+1||qr.left<cr.left-1))issues.push('question-outside-card');" +
" optionRects.forEach((r,i)=>{if(!r||!cr)return;if(r.right>cr.right+1||r.left<cr.left-1||r.bottom>cr.bottom+1)issues.push('option-'+(i+1)+'-outside-card');});" +
" const prompt=String(q&&q.q||'');" +
" const lines=qr&&lineHeight>0?+(qr.height/lineHeight).toFixed(1):null;" +
" return {index:currentIndex+1,id:q&&q.id||null,domain:q&&q.d||null,type:q&&q.type||null,family:q&&q.taskFamily||null,promptChars:Array.from(prompt).length,questionFontPx:cs?+parseFloat(cs.fontSize).toFixed(1):null,questionLines:lines,hasVisual:visibleVisual,card:cr,question:qr,visual:vr,options:or,footer:fr,hint:hr,optionRects,cardScrollExtra:card?Math.max(0,card.scrollHeight-card.clientHeight):null,visualWidth:visibleVisual?vr.width:0,visualHeight:visibleVisual?vr.height:0,footerGap:or&&fr?+(fr.y-or.bottom).toFixed(1):null,bottomInset:cr&&fr?+(cr.bottom-fr.bottom).toFixed(1):null,issues};" +
"})()";

for (let i = 0; i < 42; i++) {
  const type = await evaluate("questions[" + i + "] && questions[" + i + "].type || null");
  await evaluate("currentIndex=" + i + "; renderQuestion();");
  await new Promise(r => setTimeout(r, type === 'memory' ? 3150 : 380));
  const m = await evaluate(metricExpression);
  metrics.push(m);
  for (const issue of m.issues) critical.push({ question: i + 1, id: m.id, issue });
  if ((m.cardScrollExtra || 0) > 8) warnings.push({ question: i + 1, id: m.id, issue: 'card-scroll-required', px: m.cardScrollExtra });
  if (m.promptChars >= 78 && (m.questionFontPx || 0) > 27) warnings.push({ question: i + 1, id: m.id, issue: 'long-prompt-font-large', px: m.questionFontPx });
  if (m.footerGap !== null && m.footerGap < 6) warnings.push({ question: i + 1, id: m.id, issue: 'options-footer-gap-tight', px: m.footerGap });
  await screenshot('q' + String(i + 1).padStart(2, '0') + '.jpg');
}

await evaluate("answers = Array(totalQuestions).fill(0); elapsedTimes = Array(totalQuestions).fill(1); remainingTimes = Array(totalQuestions).fill(30); finishTest();");
await new Promise(r => setTimeout(r, 500));

const resultMetrics = await evaluate("(() => {" +
" const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};};" +
" const result=document.getElementById('result');const shell=document.querySelector('.appShell');const hero=document.querySelector('.playfulResultHero');const bottom=document.querySelector('.resultBottom');const issues=[];" +
" const rr=rect(result),sr=rect(shell),hr=rect(hero),br=rect(bottom);" +
" if(rr&&sr&&(rr.right>sr.right+1||rr.bottom>sr.bottom+1))issues.push('result-outside-shell');" +
" if(br&&rr&&br.bottom>rr.bottom+1)issues.push('result-bottom-clipped');" +
" return {result:rr,shell:sr,hero:hr,bottom:br,scrollExtra:result?Math.max(0,result.scrollHeight-result.clientHeight):null,issues};" +
"})()");

for (const issue of resultMetrics.issues) critical.push({ question: 'result', issue });
if ((resultMetrics.scrollExtra || 0) > 8) warnings.push({ question: 'result', issue: 'result-scroll-required', px: resultMetrics.scrollExtra });
await screenshot('result.jpg');

const summary = {
  auditVersion: 'VA42-2026.09.19.1',
  viewport: { width: 1536, height: 960, deviceScaleFactor: 1 },
  form: metrics.map(m => ({ index:m.index,id:m.id,domain:m.domain,type:m.type,family:m.family })),
  counts: {
    questions: metrics.length,
    visualQuestions: metrics.filter(m => m.hasVisual).length,
    critical: critical.length,
    warnings: warnings.length
  },
  critical,
  warnings,
  result: resultMetrics,
  metrics
};

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'summary.txt'), [
  '42-item browser visual audit',
  'viewport: 1536x960',
  'questions: ' + metrics.length,
  'visual questions: ' + summary.counts.visualQuestions,
  'critical: ' + critical.length,
  'warnings: ' + warnings.length,
  '',
  ...critical.map(x => 'CRITICAL q' + x.question + ' ' + (x.id || '') + ' ' + x.issue),
  ...warnings.map(x => 'WARN q' + x.question + ' ' + (x.id || '') + ' ' + x.issue + (x.px != null ? ' ' + x.px + 'px' : ''))
].join('\n'));

console.log('42-item browser visual audit');
console.log(JSON.stringify(summary.counts));
if (critical.length) console.error(JSON.stringify(critical, null, 2));

ws.close();
chrome.kill('SIGTERM');
server.close();

if (critical.length) process.exitCode = 1;
