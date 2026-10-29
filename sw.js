const CACHE='form-v2.2';const ASSETS=['./','./index.html','./app.js','./upgrade.js','./generator.js','./split.js','./personal-library.js','./workout-ui.js','./checkins.js','./progress-unified.js','./checkin-layout.js','./form-settings.js','./photo-privacy.js',
'./settings-refinements.js','./accent-only-fix.js','./form-v21.js',
'./brand-v21.js','./library-v22.js',
'./brand-v22.js','./brand-exact.js',
'./form-logo.png',
'./form-icon-180.png',
'./form-icon-512.png','./icon.svg','./form-v213.js',
'./form-ai-v22.js',
'./manifest.webmanifest'];self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('form-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
