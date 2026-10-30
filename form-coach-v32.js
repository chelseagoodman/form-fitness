// FORM v3.2 TEST: opt-in AI conversation + weekly review + goal-plan discussion.
// Loaded after form-coach-consolidated-v31.js. Does not modify routines or macro targets.
(function(){
'use strict';
const E=x=>esc(String(x??''));
const num=(v,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?v:null;
const goal=()=>{let a=db.coachGoal||{};if(a.goal)return a;try{return JSON.parse(localStorage.getItem('form-v30-coach-v1')||'{}')}catch{return {}}};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
const current=()=>Array.isArray(db.coachConversation)?db.coachConversation:[];
let lastRequest=null;
function context(includeCycle,includeTraining,includeNutrition){
 const g=goal(),c={goal:String(g.goal||'').slice(0,1200),deadline:String(g.deadline||'').slice(0,1200),priority:String(g.priority||'').slice(0,1200),roster:String(g.roster||'').slice(0,1200),equipmentCamp:String(g.equipmentCamp||'').slice(0,1200),equipmentHome:String(g.equipmentHome||'').slice(0,1200),trainingDays:Math.max(1,Math.min(7,Math.round(Number(g.trainingDays)||5))),checkins:[],sessions:[],nutrition:[]};
 const allowed=['weight','waist','hips','sleep','energy','stress','recovery',...(includeCycle?['cycle']:[])];
 c.checkins=[...(db.checkins||[])].filter(x=>validDate(x.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).reverse().map(x=>{let o={date:x.date};for(const k of allowed){const v=num(x[k],10000);if(v!==null)o[k]=v}return o});
 if(includeTraining)c.sessions=[...(db.sessions||[])].filter(x=>validDate(String(x.date||'').slice(0,10))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).reverse().map(x=>({date:String(x.date).slice(0,10),durationMinutes:num(x.durationMinutes,1000)||0,sets:(Array.isArray(x.sets)?x.sets:[]).slice(0,40).map(s=>({exercise:String(s.exercise||'').slice(0,90),weight:num(Number(s.weight),1500),reps:num(Number(s.reps),200),rir:s.rir==null?null:num(Number(s.rir),10)})).filter(s=>s.exercise)}));
 if(includeNutrition){const byDay=new Map();for(const f of db.foods||[]){if(!validDate(f.date))continue;let r=byDay.get(f.date)||{date:f.date,calories:0,protein:0,carbs:0,fat:0,entries:0};for(const k of ['calories','protein','carbs','fat'])r[k]+=num(Number(f[k]),10000)||0;r.entries++;byDay.set(f.date,r)}c.nutrition=[...byDay.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14).reverse().map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?Math.round(v*10)/10:v])))}
 return c;
}
function settings(){return {cycle:!!document.getElementById('v32cycle')?.checked,training:!!document.getElementById('v32training')?.checked,nutrition:!!document.getElementById('v32nutrition')?.checked}}
function history(){return current().slice(-8).map(x=>({role:x.role,text:String(x.text).slice(0,1200)}))}
function payload(){const s=settings();return {mode:document.getElementById('v32mode')?.value||'chat',message:document.getElementById('v32message')?.value.trim()||'',context:context(s.cycle,s.training,s.nutrition),history:history()}}
function updatePreview(){const el=document.getElementById('v32preview');if(el)el.textContent=JSON.stringify(payload(),null,2);const consent=document.getElementById('v32consent');if(consent)consent.checked=false}
window.formCoachTalkHub=function(){
 modal(`<h2>Talk to Coach · v3.2 Test</h2><p class="tiny muted">Discuss your goal, request a weekly review or ask for a high-level plan. AI replies are suggestions only. No routines or macro targets change automatically.</p>
 <div id="v32login" hidden><label for="v32password">FORM AI password</label><input id="v32password" type="password" autocomplete="current-password"><button class="button" onclick="formV32Login()">Sign in</button></div>
 <label for="v32mode">Coaching task</label><select id="v32mode" onchange="formV32Preview()"><option value="chat">Talk to Coach</option><option value="weekly">Weekly review</option><option value="plan">Goal-based plan guidance</option></select>
 <label for="v32message">What would you like help with?</label><textarea id="v32message" maxlength="1200" rows="4" oninput="formV32Preview()" placeholder="e.g. I am moving onto night shift. How should I adjust next week's training? "></textarea>
 <label><input id="v32training" type="checkbox" style="width:auto" onchange="formV32Preview()" checked> Include recent workout performance</label>
 <label><input id="v32nutrition" type="checkbox" style="width:auto" onchange="formV32Preview()"> Include food diary daily totals</label>
 <label><input id="v32cycle" type="checkbox" style="width:auto" onchange="formV32Preview()"> Include cycle days (sensitive, optional)</label>
 <details><summary>Exact data to be sent to Gemini</summary><pre id="v32preview" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:270px;overflow:auto"></pre></details>
 <label><input id="v32consent" type="checkbox" style="width:auto"> I approve sending this message, context and recent conversation to Gemini</label>
 <div class="actions"><button class="button" id="v32send" onclick="formV32Send()">Ask Coach</button><button class="button secondary" onclick="formV32Clear()">Clear saved conversation</button></div>
 <p id="v32status" class="tiny muted"></p><div id="v32history"></div>`);
 window.formV32Preview();renderHistory();checkSession();
};
window.formV32Preview=updatePreview;
async function checkSession(){try{const r=await fetch('/api/ai/session',{credentials:'same-origin'});const x=await r.json();document.getElementById('v32login').hidden=!!x.signedIn;if(!x.signedIn)document.getElementById('v32status').textContent='Sign in to FORM AI before requesting coaching.'}catch{document.getElementById('v32status').textContent='Could not check AI session.'}}
window.formV32Login=async function(){const b=document.querySelector('#v32login button');b.disabled=true;try{const r=await fetch('/api/ai/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('v32password').value})});const x=await r.json();if(!r.ok)throw Error(x.error||'Login failed');document.getElementById('v32password').value='';document.getElementById('v32login').hidden=true;document.getElementById('v32status').textContent='Signed in. Review and approve the data preview.'}catch(e){document.getElementById('v32status').textContent=e.message}finally{b.disabled=false}};
function renderHistory(){const el=document.getElementById('v32history');if(!el)return;el.replaceChildren();for(const item of current().slice(-12)){const box=document.createElement('div');box.className='item';const h=document.createElement('b');h.textContent=item.role==='user'?'You':'FORM Coach';const p=document.createElement('p');p.style.whiteSpace='pre-wrap';p.textContent=item.text;box.append(h,p);el.append(box)}}
window.formV32Send=async function(){const p=payload(),consent=document.getElementById('v32consent'),status=document.getElementById('v32status'),b=document.getElementById('v32send');if(!p.message)return alert('Enter a question or coaching request.');if(!consent.checked)return alert('Review the exact data and approve this request first.');b.disabled=true;status.textContent='Asking FORM Coach...';try{const r=await fetch('/api/ai/coach',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const x=await r.json();if(!r.ok)throw Error(x.error||'Coach unavailable');if(!x.review||typeof x.review.reply!=='string')throw Error('Invalid coaching reply');const reply=[x.review.reply,...(x.review.suggestions||[]).map(t=>'• '+t)].join('\n\n').slice(0,3800);const before=current().slice();db.coachConversation=[...before,{role:'user',text:p.message,date:TODAY()},{role:'coach',text:reply,date:TODAY()}].slice(-40);if(!save()){db.coachConversation=before;throw Error('Could not save conversation; check storage and export a backup.')}document.getElementById('v32message').value='';status.textContent='Coaching suggestions saved locally in FORM backup. No changes applied.';renderHistory();updatePreview()}catch(e){status.textContent=e.message;if(/sign in/i.test(e.message))checkSession()}finally{b.disabled=false}};
window.formV32Clear=function(){if(!confirm('Clear locally saved AI conversation history? Your goal and check-ins remain.'))return;const old=current().slice();db.coachConversation=[];if(!save()){db.coachConversation=old;return alert('Unable to save change.')}renderHistory();updatePreview()};
// Replace the placeholder Talk to Coach action. Coach dashboard and other features remain intact.
})();
