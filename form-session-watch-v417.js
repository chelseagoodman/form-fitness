// FORM v4.17: notice server-side weekly session expiry while the app is open.
(function(){
'use strict';
let checking=false,redirecting=false;
async function checkSession(){
 if(checking||redirecting||document.hidden)return;
 checking=true;
 try{
  const response=await fetch('/api/session',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'}});
  if(response.status===401){redirecting=true;window.location.replace('/form-login')}
 }catch(_){/* Keep local app open during brief network interruptions; retry on the next check. */}
 finally{checking=false}
}
setInterval(checkSession,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession()});
window.addEventListener('focus',checkSession);
checkSession();
})();
