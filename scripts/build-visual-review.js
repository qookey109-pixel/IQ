// Development-only fixture: real production HTML, CSS and rendering stack.
// Never linked from index.html; generated output is gitignored.
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<script src="app.js"></script>', `<script>
window.IQ_QUESTIONS = window.IQ_QUESTION_BANK.filter(q => q.d === '視覺空間' || q.type === 'matrix');
</script><script src="app.js"></script>`);
html = html.replace('</body>', `<script>
const picker = document.createElement('select');
picker.setAttribute('aria-label', '檢查題型');
picker.style.cssText = 'position:fixed;right:8px;top:8px;width:200px;font-size:12px;padding:6px;z-index:100';
questions.forEach((q,i) => picker.add(new Option(q.taskFamily+' / '+q.difficulty+' / '+q.id, i)));
document.querySelector('.topbar').append(picker);
picker.addEventListener('change', () => {currentIndex=Number(picker.value); renderQuestion();});
const audit = document.createElement('button');
audit.textContent = '全部圖示邊界檢查';
audit.style.cssText = 'position:fixed;right:8px;bottom:4px;z-index:100;font-size:10px';
document.querySelector('.topbar').append(audit);
audit.onclick = () => {
  const gallery = document.createElement('section');
  gallery.id = 'diagramAudit';
  gallery.style.cssText = 'position:fixed;inset:0;z-index:100;background:#faf3e7;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;padding:24px';
  for(const q of questions.filter(q=>q.d==='視覺空間')){
    const fig = document.createElement('figure');
    fig.dataset.item = q.id;
    fig.style.cssText = 'margin:0;color:#30271f';
    fig.innerHTML = q.visual;
    const drawing = fig.querySelector('svg');
    drawing.style.cssText = 'display:block;width:100%;height:350px;font-family:system-ui';
    gallery.append(fig);
  }
  document.body.append(gallery);
};
</script></body>`);
fs.writeFileSync('.visual-review.html', html);
console.log('Open http://127.0.0.1:8891/.visual-review.html for deterministic visual QA.');
