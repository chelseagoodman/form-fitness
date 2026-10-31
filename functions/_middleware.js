// FORM v3.8 Stage 1 - Cloudflare Pages middleware (test environment only).
// Requires FORM_AUTH_SESSIONS KV, FORM_AI service binding and FORM_AI_SERVICE_SECRET.
// No passkeys yet. Requires integration testing before production use.
const cookieName='form_app_session';
const enc=new TextEncoder();
const html=(body,status=200,headers={})=>new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...headers}});
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const random=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
const sha=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(x))),b=>b.toString(16).padStart(2,'0')).join('');
const cookie=(req,name)=>((req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))||'').slice(name.length+1);
const expiry=30*24*3600;
const cookieAttrs='; Secure; HttpOnly; SameSite=Strict; Path=/';
const sign=async(secret,value)=>{const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('FORM-PAGES-SESSION-v1:'+value)));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const b64=x=>btoa(String.fromCharCode(...enc.encode(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const page=`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORM - Sign in</title><style>body{background:#101716;color:#edf6f1;font:16px system-ui;margin:0;min-height:100vh;display:grid;place-items:center}main{max-width:360px;width:90%;background:#202a25;padding:24px;border-radius:18px}h1{text-align:center}label,input,button{display:block;width:100%;box-sizing:border-box;margin:14px 0}input,button{font:inherit;padding:14px;border-radius:10px}button{background:linear-gradient(120deg,#f1d48a,#bd8e34);border:0;color:#111;font-weight:bold}p{font-size:13px;color:#c9d3cc}</style><main><h1>FORM</h1><form method="POST" action="/form-login"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Sign in</button></form><p>Private test access. Passkeys are not enabled in this stage.</p></main></html>`;
export async function onRequest(context){
 const {request,env,next}=context;
 if(!env.FORM_AUTH_SESSIONS||!env.FORM_AI||!env.FORM_AI_SERVICE_SECRET)return json({error:'FORM authentication is not configured. Roll back middleware.'},503);
 const url=new URL(request.url),path=url.pathname;
 const token=cookie(request,cookieName);
 const key=token&&/^[a-f0-9]{64}$/.test(token)?'session:'+await sha(token):null;
 const record=key?await env.FORM_AUTH_SESSIONS.get(key,'json'):null;
 const authenticated=!!(record&&record.exp>Date.now());
 if(path==='/form-login'&&request.method==='GET')return authenticated?new Response(null,{status:303,headers:{Location:'/', 'Cache-Control':'no-store'}}):html(page);
 if(path==='/form-login'&&request.method==='POST'){
  const origin=request.headers.get('Origin');
const referer=request.headers.get('Referer');
const sameOrigin=origin
  ? origin===url.origin
  : referer
    ? new URL(referer).origin===url.origin
    : false;
if(!sameOrigin)return json({error:'Origin rejected'},403);
  const data=await request.formData();const password=data.get('password');
  if(typeof password!=='string'||password.length>256||!password)return html(page,400);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  // Existing Worker performs its password validation and rate limiting.
  const auth=await env.FORM_AI.fetch(new Request('https://form-ai-integration-test.internal/internal/auth',{method:'POST',headers:{'Content-Type':'application/json','X-FORM-Service-Secret':env.FORM_AI_SERVICE_SECRET,'X-FORM-Client-IP':ip},body:JSON.stringify({password})}));
  if(!auth.ok)return json({error:'Authentication service unavailable'},502);
  const outcome=await auth.json();if(!outcome.ok)return html(page.replace('</form>','<p>Incorrect password.</p></form>'),401);
  const id=random(),exp=Date.now()+expiry*1000;
  await env.FORM_AUTH_SESSIONS.put('session:'+await sha(id),JSON.stringify({exp}),{expirationTtl:expiry});
  return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':cookieName+'='+id+cookieAttrs+'; Max-Age='+expiry,'Cache-Control':'no-store'}});
 }
 if(path==='/form-logout'&&request.method==='POST'){
  const origin=request.headers.get('Origin');
const referer=request.headers.get('Referer');
const sameOrigin=origin
  ? origin===url.origin
  : referer
    ? new URL(referer).origin===url.origin
    : false;
if(!sameOrigin)return json({error:'Origin rejected'},403);
  if(key)await env.FORM_AUTH_SESSIONS.delete(key);
  return new Response(null,{status:303,headers:{Location:'/form-login','Set-Cookie':cookieName+'='+cookieAttrs+'; Max-Age=0','Cache-Control':'no-store','Clear-Site-Data':'"cache"'}});
 }
 if(!authenticated){
  if(path.startsWith('/api/'))return json({error:'Sign in to FORM'},401);
  return new Response(null,{status:303,headers:{Location:'/form-login','Cache-Control':'no-store'}});
 }
 if(path.startsWith('/api/ai/')){
  // Reuse the existing signed AI session verifier without exposing the Worker.
  const p=b64(JSON.stringify({v:1,exp:Date.now()+10*60*1000}));
  const signed=p+'.'+await sign(env.FORM_AI_SERVICE_SECRET,p);
  const h=new Headers(request.headers);
  h.set('Cookie',(request.headers.get('Cookie')||'')+'; form_ai_test_session='+signed);
  return next(new Request(request,{headers:h}));
 }
 const response=await next();
 const h=new Headers(response.headers);h.set('Cache-Control','private, no-store');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
