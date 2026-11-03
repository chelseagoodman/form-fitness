// FORM v3.9.6 — mobile scroll clearance and safe automatic update refresh.
// Load after all other FORM scripts.
(function () {
  'use strict';

  const nav = document.querySelector('.nav');
  const shell = document.querySelector('.shell');
  const style = document.createElement('style');
  style.id = 'form-mobile-ux-v396-style';
  style.textContent = `
    #modal { overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch; }
    .nav { will-change: bottom; transform: translateZ(0); }
    #formUpdateNotice button { min-height: 40px; }
  `;
  document.head.appendChild(style);

  // Keep the fixed tab bar inside the visible mobile viewport and reserve
  // enough room beneath page content so the last items can scroll clear of it.
  function syncMobileLayout() {
    if (!nav) return;
    const viewport = window.visualViewport;
    const bottomInset = viewport
      ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      : 0;
    nav.style.bottom = bottomInset + 'px';
    if (shell) {
      const clearance = Math.max(110, Math.ceil(nav.getBoundingClientRect().height) + 18);
      shell.style.paddingBottom = clearance + 'px';
    }
  }
  let layoutFrame = 0;
  const scheduleLayout = () => {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      syncMobileLayout();
    });
  };
  syncMobileLayout();
  window.addEventListener('resize', scheduleLayout, { passive: true });
  window.addEventListener('orientationchange', scheduleLayout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleLayout, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleLayout, { passive: true });
  }

  // The current release process adds versioned scripts to index.html. Compare
  // the script list served by Pages with this tab's list to detect a deployment.
  const currentScripts = [...document.scripts]
    .map(script => script.getAttribute('src'))
    .filter(Boolean);
  let updateFound = false;
  let notice;
  let reloadTimer = 0;

  function isSafeToReload() {
    const dialog = document.getElementById('modal');
    const active = document.activeElement;
    const editing = active && active.matches?.('input, textarea, select, [contenteditable="true"]');
    return !dialog?.open && !editing;
  }

  function showUpdateNotice() {
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'formUpdateNotice';
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:12px;right:12px;z-index:10000;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid #10b981;border-radius:14px;background:#17211d;color:#edf6f1;box-shadow:0 6px 24px #0008;font:600 14px system-ui,sans-serif';
      const message = document.createElement('span');
      message.id = 'formUpdateMessage';
      message.textContent = 'FORM update available.';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button';
      button.textContent = 'Refresh now';
      button.addEventListener('click', () => window.location.reload());
      notice.append(message, button);
      document.body.appendChild(notice);
    }
    if (isSafeToReload()) {
      const message = document.getElementById('formUpdateMessage');
      if (message) message.textContent = 'FORM is refreshing with the latest update…';
      if (!reloadTimer) reloadTimer = window.setTimeout(() => window.location.reload(), 1200);
    } else {
      const message = document.getElementById('formUpdateMessage');
      if (message) message.textContent = 'FORM update ready. It will refresh when this screen is closed.';
    }
  }

  async function checkForUpdate() {
    if (updateFound || document.visibilityState === 'hidden') return;
    try {
      const url = new URL('index.html', window.location.href);
      url.searchParams.set('_form_update_check', String(Date.now()));
      const response = await fetch(url.href, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return;
      const text = await response.text();
      if (!text.includes('<script src="app.js"')) return;
      const freshDoc = new DOMParser().parseFromString(text, 'text/html');
      const freshScripts = [...freshDoc.scripts]
        .map(script => script.getAttribute('src'))
        .filter(Boolean);
      if (!freshScripts.length) return;
      const same = currentScripts.length === freshScripts.length &&
        currentScripts.every((src, index) => src === freshScripts[index]);
      if (!same) {
        updateFound = true;
        showUpdateNotice();
      }
    } catch {
      // A temporary connection failure should not disturb the current session.
    }
  }

  window.setInterval(checkForUpdate, 120000);
  window.addEventListener('focus', checkForUpdate);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  const dialog = document.getElementById('modal');
  if (dialog) dialog.addEventListener('close', () => {
    if (updateFound && isSafeToReload() && !reloadTimer) {
      showUpdateNotice();
    }
  });
  checkForUpdate();
})();
