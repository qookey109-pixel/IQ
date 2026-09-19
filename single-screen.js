// Cognitive IQ Lab — Single Screen Edition behavior
// Keeps deep content in viewport overlays and maintains keyboard focus inside open dialogs.

(() => {
  const byId = id => document.getElementById(id);
  let activePanel = null;
  let activeOpener = null;

  function loadStabilityLayer() {
    if (!document.querySelector('link[data-viewport-stability], link[href="viewport-stability.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'viewport-stability.css';
      link.dataset.viewportStability = 'true';
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-navigation-layout-fix], script[src="navigation-layout-fix.js"]')) {
      const script = document.createElement('script');
      script.src = 'navigation-layout-fix.js';
      script.dataset.navigationLayoutFix = 'true';
      document.body.appendChild(script);
    }
  }

  function ensureCloseButton(panel) {
    if (!panel || panel.querySelector(':scope > .screenClose')) return;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'screenClose';
    close.setAttribute('aria-label', '關閉');
    close.textContent = '×';
    panel.prepend(close);
  }

  function ensureDialog(panel, label) {
    if (!panel) return;
    panel.classList.add('screenModal');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (!panel.getAttribute('aria-label') && label) panel.setAttribute('aria-label', label);
    ensureCloseButton(panel);
  }

  function prepareQaPanel() {
    const panel = byId('itemQaPanel');
    if (!panel) return;
    ensureDialog(panel, '題目品質資訊');
  }

  function focusableElements(panel) {
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.closest('.hidden'));
  }

  function focusPanel(panel, opener) {
    if (!panel || panel.classList.contains('hidden')) return;
    ensureDialog(panel, panel.id === 'review' ? '逐題解析' : null);
    activePanel = panel;
    activeOpener = opener || document.activeElement;
    requestAnimationFrame(() => {
      const target = focusableElements(panel)[0] || panel;
      if (target === panel && !panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  function closePanel(panel, restoreFocus = true) {
    if (!panel || panel.classList.contains('hidden')) return;
    panel.classList.add('hidden');
    if (panel === activePanel) {
      const opener = activeOpener;
      activePanel = null;
      activeOpener = null;
      if (restoreFocus && opener && typeof opener.focus === 'function') {
        requestAnimationFrame(() => opener.focus({ preventScroll: true }));
      }
    }
  }

  function handleOpener(selector, panelId, label, event) {
    const opener = event.target.closest(selector);
    if (!opener) return false;
    requestAnimationFrame(() => {
      const panel = byId(panelId);
      if (!panel) return;
      ensureDialog(panel, label);
      if (!panel.classList.contains('hidden')) focusPanel(panel, opener);
    });
    return true;
  }

  document.addEventListener('click', event => {
    const close = event.target.closest('.screenClose');
    if (close) {
      closePanel(close.closest('.screenModal, #itemQaPanel'));
      return;
    }

    if (handleOpener('#aboutBtn', 'about', '測驗說明', event)) return;
    if (handleOpener('#reviewBtn', 'review', '逐題解析', event)) return;

    const qaButton = event.target.closest('#itemQaBtn');
    if (qaButton) {
      requestAnimationFrame(() => {
        prepareQaPanel();
        focusPanel(byId('itemQaPanel'), qaButton);
      });
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activePanel && !activePanel.classList.contains('hidden')) {
      event.preventDefault();
      closePanel(activePanel);
      return;
    }

    if (event.key !== 'Tab' || !activePanel || activePanel.classList.contains('hidden')) return;
    const focusable = focusableElements(activePanel);
    if (!focusable.length) {
      event.preventDefault();
      activePanel.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function install() {
    loadStabilityLayer();
    ensureDialog(byId('about'), '測驗說明');
    ensureDialog(byId('review'), '逐題解析');
    prepareQaPanel();

    const observer = new MutationObserver(() => prepareQaPanel());
    observer.observe(document.body, { childList: true, subtree: true });

    window.IQ_SINGLE_SCREEN_META = {
      version: '1.2',
      documentScrollLocked: true,
      detailPanelsUseViewportModal: true,
      target: 'one viewport per application state',
      viewportStabilityLayer: true,
      forwardNavigationRecovery: true,
      modalFocusManagement: true,
      modalFocusTrap: true,
      restoresOpenerFocus: true
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();