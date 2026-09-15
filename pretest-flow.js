// Cognitive IQ Lab — pre-test age + practice flow.
// Age is collected as whole years only (18–65), stored locally, and never alters CPI scoring.
// Practice items are unscored and never enter the 42-item production form, timing, analytics, or results.
(() => {
  'use strict';

  const PROFILE_KEY = 'cognitive-iq-lab:participant-profile:v1';
  const FLOW_VERSION = '1.0';
  const PRACTICE_VERSION = '1.0';
  const AGE_MIN = 18;
  const AGE_MAX = 65;
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

  function ageBand(age) {
    const n = Number(age);
    if (n <= 24) return '18–24';
    if (n <= 34) return '25–34';
    if (n <= 44) return '35–44';
    if (n <= 54) return '45–54';
    return '55–65';
  }

  function loadProfile() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (!parsed || !Number.isInteger(Number(parsed.ageYears))) return null;
      const age = Number(parsed.ageYears);
      if (age < AGE_MIN || age > AGE_MAX) return null;
      return {
        schemaVersion: 1,
        ageYears: age,
        ageBand: ageBand(age),
        practiceVersion: parsed.practiceVersion || null,
        updatedAt: parsed.updatedAt || null,
        dateOfBirthCollected: false,
        scoreAdjustedForAge: false
      };
    } catch {
      return null;
    }
  }

  function saveProfile(age, practiceVersion = null) {
    const previous = loadProfile();
    const profile = {
      schemaVersion: 1,
      ageYears: Number(age),
      ageBand: ageBand(age),
      practiceVersion: practiceVersion || previous?.practiceVersion || null,
      updatedAt: new Date().toISOString(),
      dateOfBirthCollected: false,
      scoreAdjustedForAge: false
    };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
    window.IQ_PARTICIPANT_PROFILE = profile;
    return profile;
  }

  function clearPracticeTimers() {
    if (practiceTimer) clearInterval(practiceTimer);
    practiceTimer = null;
    practiceDeadline = null;
  }

  function setOnlyVisible(id) {
    for (const sectionId of ['start','pretestAge','pretestIntro','pretestPractice','quiz','result']) {
      const el = document.getElementById(sectionId);
      if (el) el.classList.toggle('hidden', sectionId !== id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPanels() {
    const start = document.getElementById('start');
    const quiz = document.getElementById('quiz');
    if (!start || !quiz || document.getElementById('pretestAge')) return;

    const ageSection = document.createElement('section');
    ageSection.id = 'pretestAge';
    ageSection.className = 'card screenPanel hidden pretestPanel';
    ageSection.innerHTML = `
      <div class="sectionKicker">STEP 1 · AGE</div>
      <h2>先選擇你的實足年齡</h2>
      <p class="pretestLead">目前成人試行範圍為 18–65 歲。只選歲數，不收集生日；年齡不會直接替 CPI 加分或扣分。</p>
      <label class="ageField" for="ageSelect"><span>實足年齡</span><select id="ageSelect" aria-label="實足年齡"><option value="">請選擇</option></select></label>
      <div class="pretestNotice"><strong>用途：</strong>只用於本機研究資料分層，以及未來建立同齡常模時的比較。現階段結果仍是 CPI，不是 IQ。</div>
      <div class="pretestActions"><button id="ageBackBtn" class="btn secondary">返回首頁</button><button id="ageContinueBtn" class="btn primary" disabled>下一步</button></div>`;

    const introSection = document.createElement('section');
    introSection.id = 'pretestIntro';
    introSection.className = 'card screenPanel hidden pretestPanel';
    introSection.innerHTML = `
      <div class="sectionKicker">STEP 2 · INSTRUCTIONS</div>
      <h2>正式測驗前，先熟悉規則</h2>
      <div class="pretestRuleGrid">
        <article><strong>42 題正式測驗</strong><span>六構面各 7 題；每個題型家族各出 1 題。</span></article>
        <article><strong>一般題不限時</strong><span>推理、語文、空間與量化可依自己的節奏作答。</span></article>
        <article><strong>記憶只看一次</strong><span>依難度顯示 4／5／6 秒；內容消失後作答不限時。</span></article>
        <article><strong>速度題限時 18 秒</strong><span>首次顯示後連續倒數；離開題目不暫停，提交後固定答案。</span></article>
      </div>
      <div class="pretestNotice">接下來有 ${practiceItems.length} 題不計分練習。練習答案不會寫入正式 42 題成績、CPI、總時間或 item analytics。</div>
      <div class="pretestActions"><button id="introBackBtn" class="btn secondary">返回年齡</button><button id="practiceStartBtn" class="btn primary">開始 ${practiceItems.length} 題練習</button><button id="practiceSkipBtn" class="btn ghost hidden">已熟悉，直接開始正式測驗</button></div>`;

    const practiceSection = document.createElement('section');
    practiceSection.id = 'pretestPractice';
    practiceSection.className = 'card screenPanel hidden pretestPanel';
    practiceSection.innerHTML = `
      <div class="practiceHeader"><div><div class="sectionKicker">STEP 3 · PRACTICE</div><div id="practiceProgress" class="counter">練習 1 / ${practiceItems.length}</div></div><div id="practiceBadge" class="practiceBadge">不計分</div></div>
      <div id="practiceStimulus" class="practiceStimulus hidden"></div>
      <h2 id="practiceQuestion"></h2>
      <p id="practiceHelp" class="pretestLead"></p>
      <div id="practiceOptions" class="practiceOptions"></div>
      <div id="practiceFeedback" class="practiceFeedback hidden" role="status"></div>
      <div class="pretestActions"><button id="practiceBackBtn" class="btn secondary">返回說明</button><button id="practiceNextBtn" class="btn primary" disabled>下一題</button></div>`;

    start.insertAdjacentElement('afterend', ageSection);
    ageSection.insertAdjacentElement('afterend', introSection);
    introSection.insertAdjacentElement('afterend', practiceSection);
  }

  function populateAges() {
    const select = document.getElementById('ageSelect');
    if (!select || select.options.length > 1) return;
    for (let age = AGE_MIN; age <= AGE_MAX; age++) {
      const option = document.createElement('option');
      option.value = String(age);
      option.textContent = `${age} 歲`;
      select.appendChild(option);
    }
    const profile = loadProfile();
    if (profile) select.value = String(profile.ageYears);
    document.getElementById('ageContinueBtn').disabled = !select.value;
  }

  function showAgeStep() {
    clearPracticeTimers();
    populateAges();
    const profile = loadProfile();
    const select = document.getElementById('ageSelect');
    if (profile && select) select.value = String(profile.ageYears);
    if (document.getElementById('ageContinueBtn')) document.getElementById('ageContinueBtn').disabled = !select?.value;
    setOnlyVisible('pretestAge');
  }

  function showIntroStep() {
    clearPracticeTimers();
    const profile = loadProfile();
    const skip = document.getElementById('practiceSkipBtn');
    if (skip) skip.classList.toggle('hidden', profile?.practiceVersion !== PRACTICE_VERSION);
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
      help.textContent = item.limitSeconds ? '這是限時操作示範；答對或答錯都不計入正式成績。' : '選一個答案即可；這些練習不計分。';
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
    const profile = loadProfile();
    if (profile) saveProfile(profile.ageYears, PRACTICE_VERSION);
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
    document.getElementById('startBtn').onclick = showAgeStep;
    document.getElementById('ageSelect')?.addEventListener('change', event => {
      const age = Number(event.target.value);
      document.getElementById('ageContinueBtn').disabled = !(Number.isInteger(age) && age >= AGE_MIN && age <= AGE_MAX);
    });
    document.getElementById('ageBackBtn')?.addEventListener('click', () => setOnlyVisible('start'));
    document.getElementById('ageContinueBtn')?.addEventListener('click', () => {
      const age = Number(document.getElementById('ageSelect')?.value);
      if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) return;
      saveProfile(age);
      showIntroStep();
    });
    document.getElementById('introBackBtn')?.addEventListener('click', showAgeStep);
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
      .ageField{display:grid;gap:10px;max-width:360px;margin:28px 0 20px;font-weight:900;color:var(--navy)}
      .ageField select{appearance:none;width:100%;font:inherit;font-size:20px;padding:15px 16px;border-radius:16px;border:1px solid var(--line);background:#fff;color:var(--navy);box-shadow:var(--shadow-soft)}
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
  populateAges();
  bindEvents();
  window.IQ_PARTICIPANT_PROFILE = loadProfile();
  window.IQ_PRETEST_FLOW = {
    version: FLOW_VERSION,
    practiceVersion: PRACTICE_VERSION,
    profileStorageKey: PROFILE_KEY,
    ageMin: AGE_MIN,
    ageMax: AGE_MAX,
    practiceCount: practiceItems.length,
    practiceItems: practiceItems.map(({id,label,question,options,answer,explanation,exposureMs,limitSeconds}) => ({id,label,question,options:[...options],answer,explanation,exposureMs:exposureMs||null,limitSeconds:limitSeconds||null})),
    loadProfile,
    saveProfile,
    ageBand,
    startFormalAssessment
  };
})();
