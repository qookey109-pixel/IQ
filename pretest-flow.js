// Cognitive IQ Lab — direct-entry flow.
// Public experience: homepage -> 42-item formal assessment.
// No age intake, demographics, or practice questions are required.
(() => {
  'use strict';

  const FLOW_VERSION = '3.0';

  function setOnlyVisible(id) {
    for (const sectionId of ['start','quiz','result']) {
      const el = document.getElementById(sectionId);
      if (el) el.classList.toggle('hidden', sectionId !== id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startFormalAssessment() {
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
    const start = document.getElementById('startBtn');
    if (start) start.onclick = startFormalAssessment;

    const restart = document.getElementById('restartBtn');
    if (restart) restart.onclick = () => window.location.reload();
  }

  bindEvents();

  // Kept for runtime compatibility with existing measurement/research modules.
  // There is intentionally no participant profile or practice state in the public flow.
  window.IQ_PARTICIPANT_PROFILE = null;
  window.IQ_PRETEST_STATE = null;
  window.IQ_PRETEST_FLOW = {
    version: FLOW_VERSION,
    mode: 'direct-formal-entry',
    ageInputRequired: false,
    demographicInputRequired: false,
    practiceEnabled: false,
    practiceCount: 0,
    startFormalAssessment
  };
})();
