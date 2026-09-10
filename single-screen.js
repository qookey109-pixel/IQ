// Cognitive IQ Lab — Single Screen Edition behavior
// Keeps deep content in viewport overlays so the main document does not need page scrolling.

(() => {
  const byId = id => document.getElementById(id);

  function ensureCloseButton(panel) {
    if (!panel || panel.querySelector(':scope > .screenClose')) return;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'screenClose';
    close.setAttribute('aria-label', '關閉');
    close.textContent = '×';
    panel.prepend(close);
  }

  function prepareQaPanel() {
    const panel = byId('itemQaPanel');
    if (!panel) return;
    panel.classList.add('screenModal');
    ensureCloseButton(panel);
  }

  function closePanel(panel) {
    if (!panel) return;
    panel.classList.add('hidden');
  }

  function closeOpenPanels() {
    ['about', 'review', 'itemQaPanel'].forEach(id => closePanel(byId(id)));
  }

  document.addEventListener('click', event => {
    const close = event.target.closest('.screenClose');
    if (close) {
      closePanel(close.closest('.screenModal, #itemQaPanel'));
      return;
    }

    if (event.target.closest('#reviewBtn')) {
      requestAnimationFrame(() => {
        const review = byId('review');
        if (review && !review.classList.contains('hidden')) ensureCloseButton(review);
      });
    }

    if (event.target.closest('#itemQaBtn')) {
      requestAnimationFrame(prepareQaPanel);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeOpenPanels();
  });

  function install() {
    ensureCloseButton(byId('about'));
    ensureCloseButton(byId('review'));
    prepareQaPanel();

    // itemQaPanel is injected by item-analytics.js. Watch for it without changing analytics logic.
    const observer = new MutationObserver(() => prepareQaPanel());
    observer.observe(document.body, { childList: true, subtree: true });

    // Expose a tiny QA surface for future layout smoke tests.
    window.IQ_SINGLE_SCREEN_META = {
      version: '1.0',
      documentScrollLocked: true,
      detailPanelsUseViewportModal: true,
      target: 'one viewport per application state'
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
