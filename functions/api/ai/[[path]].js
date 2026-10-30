// FORM v2.2 AI test: authenticated same-origin Pages gateway.
const enc=new TextEncoder();
const json=(x,status=200,extra={})=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const eq=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0};
const b64=x=>btoa(String.fromCharCode(...new Uint8Array(x))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function sign(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode('FORM-PAGES-SESSION-v1:'+value)))}
async function valid(req,secret){const cookie=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('form_ai_test_session='))?.slice(21);if(!cookie)return false;const [p,s,...extra]=cookie.split('.');if(!p||!s||extra.length||!eq(s,await sign(secret,p)))return false;try{const obj=JSON.parse(new TextDecoder().decode(unb64(p)));return obj.v===1&&obj.exp>Date.now()}catch{return false}}
function originOK(req){return req.headers.get('Origin')===new URL(req.url).origin}
async function internal(env,path,data,ip){return env.FORM_AI.fetch(new Request('https://form-ai-integration-test.internal/internal/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-FORM-Service-Secret':env.FORM_AI_SERVICE_SECRET,'X-FORM-Client-IP':ip||'unknown'},body:JSON.stringify(data)}))}
export async function onRequest({request,env,params}){
 try{
  if(!env.FORM_AI||!env.FORM_AI_SERVICE_SECRET||env.FORM_AI_SERVICE_SECRET.length<32)return json({error:'AI gateway not configured'},503);
  const path=Array.isArray(params.path)?params.path.join('/'):params.path||'';
  if(request.method==='GET'&&path==='session')return json({signedIn:await valid(request,env.FORM_AI_SERVICE_SECRET)});
  if(request.method!=='POST'||!['login','logout','analyze','checkin','training','program','coach'].includes(path))return json({error:'Not found'},404);
  if(!originOK(request))return json({error:'Origin rejected'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
  if(Number(request.headers.get('Content-Length')||0)>3000000)return json({error:'Request too large'},413);
  const raw=await request.text();if(raw.length>3000000)return json({error:'Request too large'},413);
  let data;try{data=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
  const cookieBase='Path=/api/ai; HttpOnly; Secure; SameSite=Strict';
  if(path==='logout')return json({ok:true},200,{'Set-Cookie':'form_ai_test_session=; '+cookieBase+'; Max-Age=0'});
  if(path==='login'){
   if(typeof data.password!=='string'||data.password.length>256)return json({error:'Invalid password'},400);
   const response=await internal(env,'auth',{password:data.password},request.headers.get('CF-Connecting-IP'));
   if(!response.ok)return json({error:'Login service unavailable'},502);
   const result=await response.json();if(!result.ok)return json({error:'Incorrect password'},401);
   const p=b64(enc.encode(JSON.stringify({v:1,exp:Date.now()+12*3600000})));
   return json({ok:true},200,{'Set-Cookie':'form_ai_test_session='+p+'.'+await sign(env.FORM_AI_SERVICE_SECRET,p)+'; '+cookieBase+'; Max-Age=43200'});
  }
  if(!await valid(request,env.FORM_AI_SERVICE_SECRET))return json({error:'Please sign in to FORM AI'},401);
  if(path==='checkin'){
   if(!data||!Array.isArray(data.checkins)||data.checkins.length>8||!Array.isArray(data.training))return json({error:'Invalid check-in request'},400);
   const response=await internal(env,'checkin',data,request.headers.get('CF-Connecting-IP'));
   return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='training'){
   if(!data||!Array.isArray(data.sessions)||data.sessions.length>12||!Array.isArray(data.checkins)||data.checkins.length>8)return json({error:'Invalid training review request'},400);
   const response=await internal(env,'training',data,request.headers.get('CF-Connecting-IP'));
   return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='coach'){
   if(!data||!['chat','weekly','plan'].includes(data.mode)||typeof data.message!=='string'||data.message.length>1200)return json({error:'Invalid coach request'},400);
   const response=await internal(env,'coach',data,request.headers.get('CF-Connecting-IP'));
   return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='program'){
   if(!data||!Array.isArray(data.sessions)||data.sessions.length>12||!Array.isArray(data.checkins)||data.checkins.length>8||!Array.isArray(data.library)||data.library.length>120)return json({error:'Invalid program request'},400);
   const response=await internal(env,'program',data,request.headers.get('CF-Connecting-IP'));
   return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(typeof data.description!=='string'||data.description.length>1200||(!data.description.trim()&&!data.image))return json({error:'Enter a meal description or photo'},400);
  const response=await internal(env,'analyze',data,request.headers.get('CF-Connecting-IP'));
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error('FORM Pages gateway error',e?.message);return json({error:'AI gateway unavailable'},502)}
}
