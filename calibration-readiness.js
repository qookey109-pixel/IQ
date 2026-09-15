// Cognitive IQ Lab — Calibration Readiness v1
// Local-only calibration preparation. No automatic upload, no name/account/IP/location.
// Keeps anonymous/pseudonymous session data so future consented pooled studies can be built
// without pretending that repeated sessions from one browser are independent participants.
(() => {
  'use strict';

  const meta = window.IQ_BANK_META || {};
  const bankVersion = meta.version || 'unknown';
  const bankRevision = meta.revision || 'unknown';
  const STORAGE_KEY = `cognitive-iq-lab:calibration-readiness:${bankVersion}:${bankRevision}`;
  const SOURCE_KEY_STORAGE = 'cognitive-iq-lab:calibration-source-key';
  const MAX_ATTEMPTS = 500;
  let recordedForAttempt = false;

  function newSourceKey() {
    try {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    } catch {}
    return `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }

  function sourceKey() {
    try {
      let key = localStorage.getItem(SOURCE_KEY_STORAGE);
      if (!key) {
        key = newSourceKey();
        localStorage.setItem(SOURCE_KEY_STORAGE, key);
      }
      return key;
    } catch {
      return 'local-unavailable';
    }
  }

  function emptyStore() {
    return {
      schemaVersion: 1,
      bankVersion,
      bankRevision,
      sourceKey: sourceKey(),
      attempts: [],
      updatedAt: null
    };
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.attempts)) return emptyStore();
      if (!parsed.sourceKey) parsed.sourceKey = sourceKey();
      return parsed;
    } catch {
      return emptyStore();
    }
  }

  function saveStore(store) {
    try {
      store.attempts = (store.attempts || []).slice(-MAX_ATTEMPTS);
      store.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn('Unable to persist calibration-readiness data', error);
    }
  }

  function roundedSeconds(value) {
    return Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
  }

  function buildAttemptRecord({ questions, answers, elapsedTimes, expiredQuestionsLock, scoring, formMetrics }) {
    const qs = Array.isArray(questions) ? questions : [];
    const ans = Array.isArray(answers) ? answers : [];
    const times = Array.isArray(elapsedTimes) ? elapsedTimes : [];
    const locks = Array.isArray(expiredQuestionsLock) ? expiredQuestionsLock : [];
    const score = scoring || null;

    return {
      bankVersion,
      bankRevision,
      performanceIndex: score?.performanceIndex ?? null,
      rawAccuracy: score?.rawAccuracy ?? null,
      totalSeconds: roundedSeconds(typeof finalTotalSeconds !== 'undefined' ? finalTotalSeconds : times.reduce((a,b)=>a+(Number(b)||0),0)),
      formLoad: formMetrics ? {
        rmsPct: Number(formMetrics.rmsPct) || 0,
        maxAbsPct: Number(formMetrics.maxAbsPct) || 0
      } : null,
      domains: score?.domains ? Object.fromEntries(Object.entries(score.domains).map(([domain, row]) => [domain, {
        score: row.score,
        rawAccuracy: row.rawAccuracy,
        weightedAccuracy: row.weightedAccuracy
      }])) : {},
      items: qs.map((q, i) => ({
        id: q.id,
        family: q.taskFamily || null,
        semanticKey: q.semanticKey || null,
        difficulty: q.difficulty || null,
        correct: ans[i] === q.a ? 1 : 0,
        skipped: ans[i] == null ? 1 : 0,
        timeout: Boolean(locks[i]) ? 1 : 0,
        seconds: roundedSeconds(times[i])
      }))
    };
  }

  function scoreStats(attempts) {
    const xs = attempts.map(x => Number(x.performanceIndex)).filter(Number.isFinite);
    if (!xs.length) return { n:0, mean:null, sd:null, min:null, max:null, floorShare:null, ceilingShare:null };
    const mean = xs.reduce((a,b)=>a+b,0)/xs.length;
    const variance = xs.reduce((s,x)=>s+(x-mean)**2,0)/xs.length;
    return {
      n: xs.length,
      mean: Math.round(mean*10)/10,
      sd: Math.round(Math.sqrt(variance)*10)/10,
      min: Math.min(...xs),
      max: Math.max(...xs),
      floorShare: xs.filter(x=>x<=20).length/xs.length,
      ceilingShare: xs.filter(x=>x>=90).length/xs.length
    };
  }

  function tierStats(attempts) {
    const out = { easy:{n:0,correct:0}, medium:{n:0,correct:0}, hard:{n:0,correct:0} };
    for (const attempt of attempts) for (const item of attempt.items || []) {
      if (!out[item.difficulty]) continue;
      out[item.difficulty].n += 1;
      out[item.difficulty].correct += Number(item.correct) || 0;
    }
    for (const row of Object.values(out)) row.accuracy = row.n ? row.correct/row.n : null;
    return out;
  }

  function buildReadiness({ bank, attempts, qaReport }) {
    const items = Array.isArray(bank) ? bank : [];
    const sessions = Array.isArray(attempts) ? attempts : [];
    const byId = new Map(items.map(q => [q.id, q]));
    const exposure = new Map();
    const observedFamilies = new Set();
    const observedTemplates = new Set();

    for (const attempt of sessions) {
      for (const row of attempt.items || []) {
        exposure.set(row.id, (exposure.get(row.id) || 0) + 1);
        const q = byId.get(row.id);
        const family = row.family || q?.taskFamily;
        const key = row.semanticKey || q?.semanticKey;
        if (family) observedFamilies.add(family);
        if (key) observedTemplates.add(key);
      }
    }

    const observedItems = exposure.size;
    const n10 = [...exposure.values()].filter(n => n >= 10).length;
    const n30 = [...exposure.values()].filter(n => n >= 30).length;
    const totalTemplates = Number(meta.semanticTemplates) || new Set(items.map(q=>q.semanticKey).filter(Boolean)).size || 1;
    const totalFamilies = Number(meta.taskFamilies) || new Set(items.map(q=>q.taskFamily).filter(Boolean)).size || 1;
    const score = scoreStats(sessions);
    const tiers = tierStats(sessions);
    const formLoads = sessions.map(x=>x.formLoad?.maxAbsPct).filter(Number.isFinite);
    const maxFormLoadDeviation = formLoads.length ? Math.max(...formLoads) : null;
    const meanFormLoadDeviation = formLoads.length ? formLoads.reduce((a,b)=>a+b,0)/formLoads.length : null;
    const templateCoverage = Math.min(1, observedTemplates.size / totalTemplates);
    const familyCoverage = Math.min(1, observedFamilies.size / totalFamilies);
    const itemCoverage = items.length ? observedItems/items.length : 0;

    let phase = '尚未累積';
    if (sessions.length > 0) phase = '本機資料累積中';
    if (sessions.length >= 10 && familyCoverage >= 0.75) phase = '本機 QA 可初步判讀';
    if (sessions.length >= 30 && templateCoverage >= 0.70) phase = '本機 pilot 可分析';
    if (sessions.length >= 100 && templateCoverage >= 0.90 && familyCoverage >= 0.99) phase = '可匯出 pooled pilot 候選';

    const blockers = [
      '單一瀏覽器的重複測驗不能當成獨立受測者樣本',
      '尚無人口代表性抽樣、年齡／語言等常模分層',
      '尚未進行正式 IRT/CAT、信度、重測信度與效度研究'
    ];
    if (n30 < Math.min(294, Math.max(1, Math.floor(items.length*0.1)))) blockers.unshift('目前仍有大量題目未達 N≥30 的穩定 QA 門檻');

    return {
      version: '1.0',
      phase,
      localSessions: sessions.length,
      independentParticipants: null,
      itemCoverage,
      observedItems,
      totalItems: items.length,
      familyCoverage,
      observedFamilies: observedFamilies.size,
      totalFamilies,
      templateCoverage,
      observedTemplates: observedTemplates.size,
      totalTemplates,
      itemsN10: n10,
      itemsN30: n30,
      score,
      tiers,
      formLoad: {
        meanMaxAbsPct: meanFormLoadDeviation == null ? null : Math.round(meanFormLoadDeviation*100)/100,
        worstMaxAbsPct: maxFormLoadDeviation
      },
      qa: qaReport ? {
        evaluableItems: qaReport.evaluableItems ?? null,
        calibratedItems: qaReport.calibratedItems ?? null,
        meanDiscrimination: qaReport.meanDiscrimination ?? null,
        meanDistractorEfficiency: qaReport.meanDistractorEfficiency ?? null,
        flaggedItems: qaReport.flaggedItems ?? null
      } : null,
      formalCalibrationReady: false,
      blockers
    };
  }

  function recordCurrentForm() {
    if (recordedForAttempt || typeof questions === 'undefined' || !Array.isArray(questions) || !questions.length) return;
    const score = window.IQ_SCORING_V2?.scoreAssessment?.(questions, answers, elapsedTimes) || null;
    const metrics = window.QB5_FORM_EQUIVALENCE?.evaluate?.(questions) || null;
    const locks = typeof expiredQuestionsLock !== 'undefined' && Array.isArray(expiredQuestionsLock) ? expiredQuestionsLock : [];
    const attempt = buildAttemptRecord({ questions, answers, elapsedTimes, expiredQuestionsLock: locks, scoring: score, formMetrics: metrics });
    const store = loadStore();
    store.attempts.push(attempt);
    saveStore(store);
    recordedForAttempt = true;
  }

  function getReport() {
    const store = loadStore();
    const bank = Array.isArray(window.IQ_QUESTION_BANK) ? window.IQ_QUESTION_BANK : [];
    const qaReport = window.IQ_ITEM_QA_V2?.getReport?.() || null;
    return {
      schemaVersion: 1,
      bankVersion,
      bankRevision,
      sourceKey: store.sourceKey,
      generatedAt: new Date().toISOString(),
      privacy: {
        automaticUpload: false,
        containsName: false,
        containsAccount: false,
        containsIp: false,
        containsLocation: false,
        sourceKeyPurpose: 'deduplicate voluntary local exports; not an identity claim'
      },
      readiness: buildReadiness({ bank, attempts: store.attempts, qaReport }),
      attempts: store.attempts
    };
  }

  const pct = x => x == null ? '—' : `${Math.round(x*100)}%`;
  const num = x => x == null || !Number.isFinite(Number(x)) ? '—' : Number(x).toFixed(2);
  const esc = x => String(x ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function renderDashboard() {
    const panel = document.getElementById('calibrationReadinessPanel');
    if (!panel) return;
    const report = getReport();
    const r = report.readiness;
    panel.innerHTML = `
      <button class="screenClose" type="button" aria-label="關閉">×</button>
      <div class="sectionKicker">CALIBRATION READINESS · V1</div>
      <h3>校準準備度</h3>
      <p>這裡只回答「資料是否開始具備研究價值」，不會把本機重複作答當成人口常模。所有資料預設只留在這台瀏覽器，不會自動上傳。</p>
      <div class="calibrationStatus"><strong>${esc(r.phase)}</strong><span>正式校準：尚未完成</span></div>
      <div class="itemQaCards calibrationCards">
        <div class="itemQaCard"><strong>${r.localSessions}</strong><span>本機測驗 session</span></div>
        <div class="itemQaCard"><strong>${pct(r.itemCoverage)}</strong><span>5,124 題覆蓋</span></div>
        <div class="itemQaCard"><strong>${pct(r.templateCoverage)}</strong><span>294 模板覆蓋</span></div>
        <div class="itemQaCard"><strong>${r.itemsN30}</strong><span>達 N≥30 題目</span></div>
      </div>
      <div class="qaPreflight calibrationPreflight">
        <strong>分布與設計負荷</strong>
        <span>CPI 平均 / SD：${r.score.mean ?? '—'} / ${r.score.sd ?? '—'}</span>
        <span>easy 答對率：${pct(r.tiers.easy.accuracy)}</span>
        <span>medium 答對率：${pct(r.tiers.medium.accuracy)}</span>
        <span>hard 答對率：${pct(r.tiers.hard.accuracy)}</span>
        <span>最差 form-load 偏差：${r.formLoad.worstMaxAbsPct == null ? '—' : `${r.formLoad.worstMaxAbsPct.toFixed(2)}%`}</span>
        <span>QA item-rest 平均：${num(r.qa?.meanDiscrimination)}</span>
      </div>
      <div class="itemQaNotice"><strong>為什麼還不能叫「已校準」：</strong>${r.blockers.map(x=>`<span class="calibrationBlocker">${esc(x)}</span>`).join('')}</div>
      <div class="calibrationPrivacy">匯出內容包含：匿名 source key、每次測驗的 0/1 正誤、題目 ID、難度、作答秒數、CPI 與 form-load。<strong>不包含姓名、帳號、IP、位置，也不會自動送出。</strong></div>
      <div class="itemQaActions calibrationActions">
        <button class="btn secondary" id="exportCalibrationBtn">匯出校準快照 JSON</button>
        <button class="btn ghost" id="resetCalibrationBtn">清除本機校準紀錄</button>
      </div>`;
    panel.querySelector('.screenClose')?.addEventListener('click',()=>panel.classList.add('hidden'));
    document.getElementById('exportCalibrationBtn')?.addEventListener('click', exportReport);
    document.getElementById('resetCalibrationBtn')?.addEventListener('click', resetReport);
  }

  function exportReport() {
    const blob = new Blob([JSON.stringify(getReport(), null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognitive-iq-lab-calibration-readiness-${bankVersion}-${bankRevision}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function resetReport() {
    if (!window.confirm('確定清除這台裝置的校準準備資料嗎？題庫本身不會受影響。')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    renderDashboard();
  }

  function installUI() {
    const actions = document.querySelector('#result .actions');
    if (!actions || document.getElementById('calibrationReadinessBtn')) return;
    const button = document.createElement('button');
    button.id = 'calibrationReadinessBtn';
    button.className = 'btn secondary';
    button.textContent = '校準準備度';
    actions.appendChild(button);
    const panel = document.createElement('div');
    panel.id = 'calibrationReadinessPanel';
    panel.className = 'screenModal hidden calibrationReadinessPanel';
    document.getElementById('result')?.appendChild(panel);
    button.addEventListener('click',()=>{ panel.classList.toggle('hidden'); if(!panel.classList.contains('hidden')) renderDashboard(); });
  }

  if (typeof finishTest === 'function') {
    const previousFinish = finishTest;
    finishTest = function () {
      const result = previousFinish();
      recordCurrentForm();
      return result;
    };
  }
  if (typeof initState === 'function') {
    const previousInit = initState;
    initState = function () { recordedForAttempt = false; return previousInit(); };
  }

  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      .calibrationStatus{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:16px 0;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:rgba(255,252,244,.82)}
      .calibrationStatus strong{font-size:20px}.calibrationStatus span{color:var(--muted);font-weight:800}
      .calibrationBlocker{display:block;margin-top:6px}.calibrationPrivacy{margin:16px 0;line-height:1.65;color:var(--muted)}
      .calibrationActions{margin-top:14px}.calibrationCards{margin-top:18px}.calibrationPreflight{margin-top:14px}
      @media(max-width:700px){.calibrationStatus{align-items:flex-start;flex-direction:column}}
    `;
    document.head?.appendChild(style);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUI, { once:true }); else installUI();
  }

  window.IQ_CALIBRATION_READINESS = {
    version:'1.0', storageKey:STORAGE_KEY, maxAttempts:MAX_ATTEMPTS,
    buildAttemptRecord, buildReadiness, scoreStats, tierStats,
    getReport, recordCurrentForm, renderDashboard, exportReport, resetReport
  };
})();
