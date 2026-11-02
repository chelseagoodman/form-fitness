// FORM v3.8.5: restore the last app tab after Access re-authentication.
(function () {
  'use strict';

  const KEY = 'form-last-page-v385';
  const ALLOWED = new Set(['home', 'train', 'nutrition', 'progress', 'coach', 'settings']);
  let lastPage = '';
  try { lastPage = sessionStorage.getItem(KEY) || ''; } catch (_) {}

  function remember(value) {
    if (ALLOWED.has(String(value || ''))) {
      try { sessionStorage.setItem(KEY, String(value)); } catch (_) {}
    }
  }

  const previousGo = window.go;
  if (typeof previousGo === 'function') {
    window.go = function (target) {
      remember(target);
      return previousGo.apply(this, arguments);
    };
  }

  try {
    if (typeof page !== 'undefined' && !ALLOWED.has(lastPage)) remember(page);
  } catch (_) {}
  window.addEventListener('pagehide', function () {
    try { if (typeof page !== 'undefined') remember(page); } catch (_) {}
  });

  // Access may return its login page to fetch() after an AI session expires.
  // Start a top-level navigation so Access can authenticate, then return to FORM.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const response = await nativeFetch(input, init);
    let requested;
    try { requested = new URL(typeof input === 'string' ? input : input.url, location.href); }
    catch (_) { return response; }
    if (requested.origin === location.origin && requested.pathname.startsWith('/api/ai/') && response.redirected) {
      try {
        const finalUrl = new URL(response.url);
        if (finalUrl.origin === location.origin && finalUrl.pathname.startsWith('/cdn-cgi/access/login')) {
          try { if (typeof page !== 'undefined') remember(page); } catch (_) {}
          location.assign(location.pathname + location.search + location.hash);
        }
      } catch (_) {}
    }
    return response;
  };

  if (ALLOWED.has(lastPage) && lastPage !== 'home' && typeof window.go === 'function') {
    setTimeout(function () { window.go(lastPage); }, 0);
  }
})();
