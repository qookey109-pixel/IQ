// Cognitive IQ Lab — Calibration Study Export v1
// Local-only, age-aware item-level research rows for psychometric calibration.
// No automatic upload. No name, account, birthday, IP, or location.
(() => {
  'use strict';

  const meta = window.IQ_BANK_META || {};
  const bankVersion = String(meta.version || 'unknown');
  const bankRevision = String(meta.revision || 'unknown');
  const STORAGE_KEY = `cognitive-iq-lab:calibration-study:v1:${bankVersion}:${bankRevision}`;
  const SOURCE_KEY_STORAGE = 'cognitive-iq-lab:calibration-source-key';
  const MAX_SESSIONS = 100;
  let recordedForAttempt = false;

  function uid(prefix) {
    try {
      if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    } catch {}
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function sourceKey() {
    try {
      let key = localStorage.getItem(SOURCE_KEY_STORAGE);
      if (!key) {
        key = uid('local');
        localStorage.setItem(SOURCE_KEY_STORAGE, key);
      }
      return key;
    } catch {
      return 'local-unavailable';
    }
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.sessions)) {
        return { schemaVersion: 1, bankVersion, bankRevision, sourceKey: sourceKey(), sessions: [] };
      }
      return parsed;
    } catch {
      return { schemaVersion: 1, bankVersion, bankRevision, sourceKey: sourceKey(), sessions: [] };
    }
  }

  function saveStore(store) {
    try {
      store.sessions = store.sessions.slice(-MAX_SESSIONS);
      store.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn('Unable to persist calibration study data', error);
    }
  }

  function validProfile() {
    const p = window.IQ_PARTICIPANT_PROFILE || null;
    const age = Number(p?.ageYears);
    if (!Number.isInteger(age) || age < 18 || age > 65) return null;
    return {
      ageYears: age,
      ageBand: String(p.ageBand || ''),
      dateOfBirthCollected: false
    };
  }

  function seconds(value) {
    return Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
  }

  function buildSession() {
    const profile = validProfile();
    if (!profile || !Array.isArray(questions) || questions.length !== 42) return null;

    const locks = typeof expiredQuestionsLock !== 'undefined' && Array.isArray(expiredQuestionsLock)
      ? expiredQuestionsLock
      : [];
    const result = window.IQ_LAST_RESULT || null;
    const sessionId = uid('session');
    const createdAt = new Date().toISOString();

    const rows = questions.map((q, i) => {
      const selected = Number.isInteger(answers?.[i]) ? Number(answers[i]) : null;
      const correctOption = Number.isInteger(q.a) ? Number(q.a) : null;
      return {
        schemaVersion: 1,
        sourceKey: sourceKey(),
        sessionId,
        ageYears: profile.ageYears,
        ageBand: profile.ageBand,
        bankVersion,
        bankRevision,
        scoringVersion: result?.scoringVersion || window.IQ_SCORING_V2?.version || null,
        formId: window.QB5_FORM_META?.formId || null,
        itemId: String(q.id || ''),
        domain: String(q.d || ''),
        family: q.taskFamily || null,
        semanticKey: q.semanticKey || null,
        difficulty: q.difficulty || null,
        selectedOption: selected,
        correctOption,
        correct: selected != null && selected === correctOption ? 1 : 0,
        skipped: selected == null ? 1 : 0,
        timeout: locks[i] ? 1 : 0,
        seconds: seconds(elapsedTimes?.[i]),
        cpi: Number.isFinite(Number(result?.performanceIndex)) ? Number(result.performanceIndex) : null,
        iqEstimate: null
      };
    });

    return {
      sessionId,
      createdAt,
      sourceKey: sourceKey(),
      ageYears: profile.ageYears,
      ageBand: profile.ageBand,
      bankVersion,
      bankRevision,
      scoringVersion: result?.scoringVersion || null,
      cpi: Number.isFinite(Number(result?.performanceIndex)) ? Number(result.performanceIndex) : null,
      iqEstimate: null,
      iqStatus: 'not-population-normed',
      rows
    };
  }

  function recordCurrentSession() {
    if (recordedForAttempt) return null;
    const session = buildSession();
    if (!session) return null;
    const store = loadStore();
    store.sessions.push(session);
    saveStore(store);
    recordedForAttempt = true;
    return session;
  }

  function allRows() {
    return loadStore().sessions.flatMap(session => Array.isArray(session.rows) ? session.rows : []);
  }

  function csvCell(value) {
    if (value == null) return '';
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  }

  const CSV_COLUMNS = [
    'schemaVersion','sourceKey','sessionId','ageYears','ageBand','bankVersion','bankRevision',
    'scoringVersion','formId','itemId','domain','family','semanticKey','difficulty',
    'selectedOption','correctOption','correct','skipped','timeout','seconds','cpi','iqEstimate'
  ];

  function toCsv(rows = allRows()) {
    const header = CSV_COLUMNS.join(',');
    const body = rows.map(row => CSV_COLUMNS.map(key => csvCell(row[key])).join(',')).join('\n');
    return `${header}\n${body}${body ? '\n' : ''}`;
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    download(
      `cognitive-iq-lab-calibration-${bankVersion}-${bankRevision}.csv`,
      toCsv(),
      'text/csv;charset=utf-8'
    );
  }

  function exportJson() {
    const store = loadStore();
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      privacy: {
        automaticUpload: false,
        containsName: false,
        containsAccount: false,
        containsDateOfBirth: false,
        containsIp: false,
        containsLocation: false
      },
      productStatus: {
        cpiAvailable: true,
        iqEstimateAvailable: false,
        populationNormed: false
      },
      ...store
    };
    download(
      `cognitive-iq-lab-calibration-${bankVersion}-${bankRevision}.json`,
      JSON.stringify(report, null, 2),
      'application/json'
    );
  }

  function installUi() {
    // Research exports remain available through IQ_CALIBRATION_STUDY, but are not
    // shown as public result-page actions.
    return;
  }

  if (typeof finishTest === 'function') {
    const previousFinish = finishTest;
    finishTest = function () {
      const value = previousFinish();
      recordCurrentSession();
      return value;
    };
  }

  if (typeof initState === 'function') {
    const previousInit = initState;
    initState = function () {
      recordedForAttempt = false;
      return previousInit();
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUi, { once: true });
    else installUi();
  }

  window.IQ_CALIBRATION_STUDY = {
    version: '1.0',
    storageKey: STORAGE_KEY,
    maxSessions: MAX_SESSIONS,
    csvColumns: [...CSV_COLUMNS],
    loadStore,
    buildSession,
    recordCurrentSession,
    allRows,
    toCsv,
    exportCsv,
    exportJson
  };
})();
