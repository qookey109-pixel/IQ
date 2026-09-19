// Cognitive IQ Lab — local qualitative replay history v1.
// Stores only a few recent public title identities in this browser.
// No scores, answers, timing data, demographics, or participant identifiers are stored here.
(() => {
  'use strict';

  const VERSION = '1.0';
  const STORAGE_KEY = 'cognitive-iq-lab:public-result-history:v1';
  const MAX_ENTRIES = 4;

  function storage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const probe = STORAGE_KEY + ':probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch {
      return null;
    }
  }

  function sanitize(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const title = String(entry.title || '').slice(0, 40);
    const emoji = String(entry.emoji || '').slice(0, 8);
    const variantId = String(entry.variantId || '').slice(0, 80);
    const primaryDomain = String(entry.primaryDomain || '').slice(0, 24);
    const secondaryDomain = String(entry.secondaryDomain || '').slice(0, 24);
    if (!title || !variantId || !primaryDomain || !secondaryDomain) return null;
    return {title, emoji, variantId, primaryDomain, secondaryDomain};
  }

  function read() {
    const store = storage();
    if (!store) return [];
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitize).filter(Boolean).slice(-MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  function write(entries) {
    const store = storage();
    if (!store) return false;
    try {
      const safe = entries.map(sanitize).filter(Boolean).slice(-MAX_ENTRIES);
      store.setItem(STORAGE_KEY, JSON.stringify(safe));
      return true;
    } catch {
      return false;
    }
  }

  function record(profile) {
    const current = sanitize({
      title: profile?.title,
      emoji: profile?.emoji,
      variantId: profile?.variantId,
      primaryDomain: profile?.primaryDomain,
      secondaryDomain: profile?.secondaryDomain
    });
    if (!current) return {available:false, previous:null, entries:[]};

    const before = read();
    const previous = before.length ? before[before.length - 1] : null;
    const entries = [...before, current].slice(-MAX_ENTRIES);
    const available = write(entries);
    return {available, previous, current, entries};
  }

  function describe(recorded) {
    if (!recorded?.current) {
      return '這個瀏覽器目前不保存重玩紀錄；你仍然可以直接抽新題再測。';
    }
    if (!recorded.previous) {
      return '第一次留下腦內路線。再抽一份，看看下一次會不會換線。';
    }
    if (recorded.previous.variantId === recorded.current.variantId) {
      return '這次和上次走到同一種主副線組合。再抽一份，看看路線會不會改變。';
    }
    return `這次換路線了：上次是「${recorded.previous.title}」。再抽一份，看看下一次會去哪裡。`;
  }

  function clear() {
    const store = storage();
    if (!store) return false;
    try {
      store.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  window.IQ_REPLAY_HISTORY = Object.freeze({
    version: VERSION,
    storageKey: STORAGE_KEY,
    maxEntries: MAX_ENTRIES,
    storedFields: Object.freeze(['title','emoji','variantId','primaryDomain','secondaryDomain']),
    storesNumericScores: false,
    storesAnswers: false,
    uploadsAutomatically: false,
    read,
    record,
    describe,
    clear
  });
})();
