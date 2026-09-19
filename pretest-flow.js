// Cognitive IQ Lab — pre-test practice flow.
// No age or demographic input is required for the public experience.
// Practice items are unscored and never enter the 42-item production form, timing, analytics, or results.
(() => {
  'use strict';

  const STATE_KEY = 'cognitive-iq-lab:pretest-state:v2';
  const FLOW_VERSION = '2.0';
  const PRACTICE_VERSION = '1.0';
  let practiceIndex = 0;
  let practiceLocked = false;
  let practiceTimer = null;
  let practiceDeadline = null;

  const practiceItems = [
    {
      id: 'practice-verbal-01',
      label: '不限時練習',
      question: '公告寫著：「明日上午 9 點到 11 點因設備維修暫停開放。」哪一項最符合公告？',
      options: [
        '明日上午 9 點到 11 點暫停開放',
        '明日上午整天停止開放',
        '今天上午 9 點到 11 點暫停開放',
        '明日上午一定會提前重新開放'
      ],
      answer: 0,
      explanation: '公告只說明天上午 9–11 點暫停開放，不能擴大成整天，也不能改成今天或推測提前開放。'
    },
    {
      id: 'practice-memory-01',
      label: '記憶練習',
      exposureMs: 4000,
      stimulus: 'K7　M2　R5　P4',
      question: '剛才序列的第 2 個項目是哪一個？',
      options: ['K7', 'M2', 'R5', 'P4'],
      answer: 1,
      explanation: '第 2 個項目是 M2。正式記憶題會依難度顯示 4／5／6 秒，內容只呈現一次，之後作答不限時。'
    },
    {
      id: 'practice-spatial-01',
      label: '空間練習',
      question: '面向北方，向右轉 90° 後會面向哪個方向？',
      options: ['北', '東', '南', '西'],
      answer: 1,
      explanation: '從北方順時針轉 90° 會面向東方。正式空間題會使用圖示作為必要資訊來源。'
    },
    {
      id: 'practice-speed-01',
      label: '限時操作示範 · 18 秒',
      limitSeconds: 18,
      question: '快速比對：哪一組左右代碼完全相同？',
      options: ['K4Q8 ／ K4Q8', 'M7P2 ／ M7R2', 'T5N3 ／ T5M3', 'B9L6 ／ B9L8'],
      answer: 0,
      explanation: 'K4Q8 與 K4Q8 完全相同。正式處理速度題首次顯示後會連續倒數 18 秒，離開題目也不會暫停。'
    }
  ];

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        schemaVersion: 2,
        practiceVersion: parsed.practiceVersion || null,
        updatedAt: parsed.updatedAt || null
      };
    } catch {
      return null;
    }
  }

  function saveState(practiceVersion = null) {
    const previous = loadState();
    const state = {
      schemaVersion: 2,
      practiceVersion: practiceVersion || previous?.practiceVersion || null,
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
    window.IQ_PRETEST_STATE = state;
    return state;
  }

  function clearPracticeTimers() {
    if (practiceTimer) clearInterval(practiceTimer);
    practiceTimer = null;
    practiceDeadline = null;
  }

  function setOnlyVisible(id) {
    for (const sectionId of ['start','pretestIntro','pretestPractice','quiz','result']) {
      const el = document.getElementById(sectionId);
      if (el) el.classList.toggle('hidden', sectionId !== id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPanels() {
    const start = document.getElementById('start');
    const quiz = document.getElementById('quiz');
    if (!start || !quiz || document.getElementById('pretestIntro')) return;

    const introSection = document.createElement('section');
    introSection.id = 'pretestIntro';
    introSection.className = 'card screenPanel hidden pretestPanel';
    introSection.innerHTML = `
      <div class="sectionKicker">READY?</div>
      <h2>先熟悉玩法，再開始 42 題</h2>
      <p class="pretestLead">不用填年齡，也不用建立個人資料。先看一下規則；第一次玩可以做 4 題不計分練習。</p>
      <div class="pretestRuleGrid">
        <article><strong>42 題正式測驗</strong><span>六個方向各 7 題；每個題型家族各出 1 題。</span></article>
        <article><strong>一般題不限時</strong><span>語文、推理、空間與量化可以照自己的節奏作答。</span></article>
        <article><strong>記憶只看一次</strong><span>依難度顯示 4／5／6 秒；內容消失後再作答。</span></article>
        <article><strong>速度題限時 18 秒</strong><span>首次顯示後連續倒數；離開題目也不暫停。</span></article>
      </div>
      <div class="pretestNotice">練習答案不會寫入正式 42 題結果、總時間或 item analytics；正式完成後也不會顯示 IQ、CPI、百分比、排名或總分。</div>
      <div class="pretestActions">
        <button id="introBackBtn" class="btn secondary">返回首頁</button>
        <button id="practiceStartBtn" class="btn primary">開始 ${practiceItems.length} 題練習</button>
        <button id="practiceSkipBtn" class="btn ghost hidden">已熟悉，直接開始正式測驗</button>
      </div>`;

    const practiceSection = document.createElement('section');
    practiceSection.id = 'pretestPractice';
    practiceSection.className = 'card screenPanel hidden pretestPanel';
    practiceSection.innerHTML = `
      <div class="practiceHeader"><div><div class="sectionKicker">PRACTICE</div><div id="practiceProgress" class="counter">練習 1 / ${practiceItems.length}</div></div><div id="practiceBadge" class="practiceBadge">不計分</div></div>
      <div id="practiceStimulus" class="practiceStimulus hidden"></div>
      <h2 id="practiceQuestion"></h2>
      <p id="practiceHelp" class="pretestLead"></p>
      <div id="practiceOptions" class="practiceOptions"></div>
      <div id="practiceFeedback" class="practiceFeedback hidden" role="status"></div>
      <div class="pretestActions"><button id="practiceBackBtn" class="btn secondary">返回說明</button><button id="practiceNextBtn" class="btn primary" disabled>下一題</button></div>`;

    start.insertAdjacentElement('afterend', introSection);
    introSection.insertAdjacentElement('afterend', practiceSection);
  }

  function showIntroStep() {
    clearPracticeTimers();
    const state = loadState();
    const skip = document.getElementById('practiceSkipBtn');
    if (skip) skip.classList.toggle('hidden', state?.practiceVersion !== PRACTICE_VERSION);
    setOnlyVisible('pretestIntro');
  }

  function renderPractice() {
    clearPracticeTimers();
    practiceLocked = false;
    const item = practiceItems[practiceIndex];
    if (!item) return;
    const progress = document.getElementById('practiceProgress');
    const badge = document.getElementById('practiceBadge');
    const stimulus = document.getElementById('practiceStimulus');
    const question = document.getElementById('practiceQuestion');
    const help = document.getElementById('practiceHelp');
    const options = document.getElementById('practiceOptions');
    const feedback = document.getElementById('practiceFeedback');
    const next = document.getElementById('practiceNextBtn');

    progress.textContent = `練習 ${practiceIndex + 1} / ${practiceItems.length}`;
    badge.textContent = item.label || '不計分';
    feedback.className = 'practiceFeedback hidden';
    feedback.textContent = '';
    next.disabled = true;
    next.textContent = practiceIndex === practiceItems.length - 1 ? '進入 42 題正式測驗' : '下一題';
    options.innerHTML = '';
    stimulus.classList.add('hidden');
    stimulus.textContent = '';

    const showQuestion = () => {
      question.textContent = item.question;
      help.textContent = item.limitSeconds ? '這是限時操作示範；答對或答錯都不計入正式結果。' : '選一個答案即可；這些練習不計分。';
      options.innerHTML = item.options.map((opt, idx) => `<button type="button" class="option practiceOption" data-practice-choice="${idx}"><span style="opacity:.55;margin-right:8px">${String.fromCharCode(65 + idx)}.</span>${opt}</button>`).join('');
      options.querySelectorAll('[data-practice-choice]').forEach(btn => btn.addEventListener('click', () => submitPractice(Number(btn.dataset.practiceChoice))));
      if (item.limitSeconds) startPracticeCountdown(item.limitSeconds);
    };

    if (item.exposureMs) {
      question.textContent = '先記住以下內容';
      help.textContent = `內容顯示 ${Math.round(item.exposureMs / 1000)} 秒，只呈現一次；消失後再作答。`;
      stimulus.textContent = item.stimulus;
      stimulus.classList.remove('hidden');
      const startedAt = Date.now();
      const duration = item.exposureMs;
      practiceTimer = setInterval(() => {
        const left = Math.max(0, duration - (Date.now() - startedAt));
        badge.textContent = `記憶呈現 ${Math.ceil(left / 1000)} 秒`;
        if (left <= 0) {
          clearPracticeTimers();
          stimulus.textContent = '••••••';
          badge.textContent = '作答不限時';
          showQuestion();
        }
      }, 100);
    } else {
      showQuestion();
    }
  }

  function startPracticeCountdown(seconds) {
    clearPracticeTimers();
    practiceDeadline = Date.now() + seconds * 1000;
    const badge = document.getElementById('practiceBadge');
    const update = () => {
      const left = Math.max(0, (practiceDeadline - Date.now()) / 1000);
      badge.textContent = `練習倒數 ${Math.ceil(left)} 秒`;
      if (left <= 0) expirePracticeItem();
    };
    update();
    practiceTimer = setInterval(update, 150);
  }

  function submitPractice(choice) {
    if (practiceLocked) return;
    const item = practiceItems[practiceIndex];
    if (!item || !Number.isInteger(choice)) return;
    if (item.limitSeconds && practiceDeadline != null && Date.now() >= practiceDeadline) {
      expirePracticeItem();
      return;
    }
    clearPracticeTimers();
    practiceLocked = true;
    const correct = choice === item.answer;
    const options = document.querySelectorAll('#practiceOptions .practiceOption');
    options.forEach((btn, idx) => {
      btn.disabled = true;
      btn.classList.toggle('selected', idx === choice);
      if (idx === item.answer) btn.classList.add('practiceCorrect');
    });
    const feedback = document.getElementById('practiceFeedback');
    feedback.className = `practiceFeedback ${correct ? 'practiceFeedbackOk' : 'practiceFeedbackReview'}`;
    feedback.textContent = `${correct ? '操作正確。' : '這題是練習，不計分。'} ${item.explanation}`;
    document.getElementById('practiceNextBtn').disabled = false;
  }

  function expirePracticeItem() {
    if (practiceLocked) return;
    clearPracticeTimers();
    practiceLocked = true;
    const item = practiceItems[practiceIndex];
    document.querySelectorAll('#practiceOptions .practiceOption').forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === item.answer) btn.classList.add('practiceCorrect');
    });
    const feedback = document.getElementById('practiceFeedback');
    feedback.className = 'practiceFeedback practiceFeedbackReview';
    feedback.textContent = `練習時間到。${item.explanation}`;
    document.getElementById('practiceNextBtn').disabled = false;
    document.getElementById('practiceBadge').textContent = '時間到 · 不計分';
  }

  function beginPractice() {
    practiceIndex = 0;
    setOnlyVisible('pretestPractice');
    renderPractice();
  }

  function advancePractice() {
    if (!practiceLocked) return;
    if (practiceIndex < practiceItems.length - 1) {
      practiceIndex++;
      renderPractice();
      return;
    }
    saveState(PRACTICE_VERSION);
    startFormalAssessment();
  }

  function startFormalAssessment() {
    clearPracticeTimers();
    if (typeof totalQuestions !== 'undefined' && totalQuestions !== 42) {
      console.error(`Formal assessment expected 42 questions, received ${totalQuestions}.`);
      return;
    }
    initState();
    document.getElementById('result')?.classList.add('hidden');
    setOnlyVisible('quiz');
    renderQuestion('slide-in-right');
  }

  function bindEvents() {
    document.getElementById('startBtn').onclick = showIntroStep;
    document.getElementById('introBackBtn')?.addEventListener('click', () => setOnlyVisible('start'));
    document.getElementById('practiceStartBtn')?.addEventListener('click', beginPractice);
    document.getElementById('practiceSkipBtn')?.addEventListener('click', startFormalAssessment);
    document.getElementById('practiceBackBtn')?.addEventListener('click', showIntroStep);
    document.getElementById('practiceNextBtn')?.addEventListener('click', advancePractice);
    if (document.getElementById('restartBtn')) {
      document.getElementById('restartBtn').onclick = () => window.location.reload();
    }
  }

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pretestPanel{max-width:980px;margin-inline:auto;padding:clamp(24px,4vw,44px)}
      .pretestPanel h2{font-size:clamp(30px,5vw,52px);line-height:1.08;margin:10px 0 14px;color:var(--navy)}
      .pretestLead{font-size:18px;line-height:1.7;color:var(--muted);max-width:760px}
      .pretestNotice{margin:18px 0;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:rgba(255,252,244,.82);line-height:1.65;color:var(--muted)}
      .pretestActions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:24px}
      .pretestRuleGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:22px 0}
      .pretestRuleGrid article{padding:18px;border-radius:18px;border:1px solid var(--line);background:#fff;display:grid;gap:7px}
      .pretestRuleGrid strong{font-size:17px;color:var(--navy)}
      .pretestRuleGrid span{line-height:1.55;color:var(--muted)}
      .practiceHeader{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
      .practiceBadge{padding:10px 14px;border-radius:999px;border:1px solid #d6dfeb;background:#f2f6fb;color:#52677f;font-weight:900;text-align:center}
      .practiceStimulus{font-size:clamp(30px,6vw,54px);font-weight:950;letter-spacing:.08em;text-align:center;padding:32px 18px;margin:20px 0;border-radius:20px;border:1px solid #d9d7f4;background:#f5f4ff;color:#3f3a88}
      .practiceOptions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}
      .practiceOptions .option{width:100%;text-align:left;min-height:64px}
      .practiceOptions .practiceCorrect{border-color:#70a88b!important;background:#eef8f2!important;box-shadow:0 0 0 3px rgba(73,142,102,.08)!important}
      .practiceFeedback{margin:18px 0 0;padding:15px 17px;border-radius:16px;line-height:1.6;font-weight:800}
      .practiceFeedbackOk{background:#eef8f2;border:1px solid #b9dec7;color:#2f6845}
      .practiceFeedbackReview{background:#fff8e8;border:1px solid #ead49a;color:#725919}
      @media(max-width:700px){.pretestRuleGrid,.practiceOptions{grid-template-columns:1fr}.practiceHeader{flex-direction:column}.pretestActions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  buildPanels();
  installStyles();
  bindEvents();
  window.IQ_PARTICIPANT_PROFILE = null;
  window.IQ_PRETEST_STATE = loadState();
  window.IQ_PRETEST_FLOW = {
    version: FLOW_VERSION,
    practiceVersion: PRACTICE_VERSION,
    stateStorageKey: STATE_KEY,
    ageInputRequired: false,
    demographicInputRequired: false,
    practiceCount: practiceItems.length,
    practiceItems: practiceItems.map(({id,label,question,options,answer,explanation,exposureMs,limitSeconds}) => ({id,label,question,options:[...options],answer,explanation,exposureMs:exposureMs||null,limitSeconds:limitSeconds||null})),
    loadState,
    saveState,
    startFormalAssessment
  };
})();
