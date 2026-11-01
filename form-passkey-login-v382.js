// FORM v3.8.2 DEVELOPMENT ONLY — login-page enhancement.
// Intended to be loaded only on /form-login after middleware CSP is updated safely.
(function(){
'use strict';
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const toB64=b=>{let s='';for(const c of new Uint8Array(b))s+=String.fromCharCode(c);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
async function call(path,data){const r=await fetch('/api/passkeys/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})});const j=await r.json();if(!r.ok)throw Error(j.error||'Passkey sign-in failed');return j}
async function login(){if(!navigator.credentials?.get)throw Error('Passkeys are not supported here');const {options,token}=await call('authenticate-options');const publicKey={...options,challenge:fromB64(options.challenge),allowCredentials:(options.allowCredentials||[]).map(x=>({...x,id:fromB64(x.id)}))};const c=await navigator.credentials.get({publicKey});if(!c)throw Error('Passkey sign-in cancelled');const r=c.response;await call('authenticate-verify',{token,credential:{id:c.id,rawId:toB64(c.rawId),type:c.type,response:{clientDataJSON:toB64(r.clientDataJSON),authenticatorData:toB64(r.authenticatorData),signature:toB64(r.signature),userHandle:r.userHandle?toB64(r.userHandle):undefined},clientExtensionResults:c.getClientExtensionResults()}});location.assign('/')}
const form=document.querySelector('form[action="/form-login"]');if(!form)return;const b=document.createElement('button');b.type='button';b.textContent='Sign in with Passkey';b.addEventListener('click',async()=>{b.disabled=true;try{await login()}catch(e){alert(e.message)}finally{b.disabled=false}});form.after(b);
})();
