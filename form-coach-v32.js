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
 c.plan={macro:Object.fromEntries(['calories','protein','carbs','fat'].map(k=>[k,Number(db.macro?.[k])||0])),routines:(db.routines||[]).slice(0,20).map(r=>({id:String(r.id||'').slice(0,80),name:String(r.name||'').slice(0,100),exercises:(r.exercises||[]).slice(0,30).map((e,index)=>({index,name:String(e.name||'').slice(0,100),sets:Number(e.sets)||3,reps:Number(e.reps)||10,targetRir:Number.isInteger(e.targetRir)?e.targetRir:null}))}))};
 return c;
}
function settings(){return {cycle:!!document.getElementById('v32cycle')?.checked,training:!!document.getElementById('v32training')?.checked,nutrition:!!document.getElementById('v32nutrition')?.checked}}
function history(){return current().slice(-8).map(x=>({role:x.role,text:String(x.text).slice(0,1200)}))}
function payload(){const s=settings();return {mode:document.getElementById('v32mode')?.value||'change',message:document.getElementById('v32message')?.value.trim()||'',context:context(s.cycle,s.training,s.nutrition),history:history()}}
function updatePreview(){const el=document.getElementById('v32preview');if(el)el.textContent=JSON.stringify(payload(),null,2);const consent=document.getElementById('v32consent');if(consent)consent.checked=false}
window.formCoachTalkHub=function(){
 modal(`<h2>Talk to Coach · v3.3.1 Test</h2><p class="tiny muted">Ask for changes, request a review, or get advice. When you explicitly request a change, FORM will propose supported edits for your approval rather than defaulting to keeping the plan. Nothing is applied automatically.</p>
 <div id="v32login" hidden><label for="v32password">FORM AI password</label><input id="v32password" type="password" autocomplete="current-password"><button class="button" onclick="formV32Login()">Sign in</button></div>
 <label for="v32mode">Coaching task</label><select id="v32mode" onchange="formV32Preview()"><option value="change">Request changes</option><option value="review">Review my plan</option><option value="advice">Ask for advice</option></select>
 <label for="v32message">What would you like help with?</label><textarea id="v32message" maxlength="1200" rows="4" oninput="formV32Preview()" placeholder="e.g. I am moving onto night shift. How should I adjust next week's training? "></textarea>
 <label><input id="v32training" type="checkbox" style="width:auto" onchange="formV32Preview()" checked> Include recent workout performance</label>
 <label><input id="v32nutrition" type="checkbox" style="width:auto" onchange="formV32Preview()"> Include food diary daily totals</label>
 <label><input id="v32cycle" type="checkbox" style="width:auto" onchange="formV32Preview()"> Include cycle days (sensitive, optional)</label>
 <details><summary>Exact data to be sent to Gemini</summary><pre id="v32preview" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:270px;overflow:auto"></pre></details>
 <label><input id="v32consent" type="checkbox" style="width:auto"> I approve sending this message, context and recent conversation to Gemini</label>
 <div class="actions"><button class="button" id="v32send" onclick="formV32Send()">Ask Coach</button><button class="button secondary" onclick="formV32Clear()">Clear saved conversation</button></div>
 <p id="v32status" class="tiny muted"></p><div id="v33proposals" class="card"></div><h3>Recent coaching conversations</h3><div id="v32history"></div>`);
 window.formV32Preview();renderHistory();checkSession();
};
window.formV32Preview=updatePreview;
async function checkSession(){try{const r=await fetch('/api/ai/session',{credentials:'same-origin'});const x=await r.json();document.getElementById('v32login').hidden=!!x.signedIn;if(!x.signedIn)document.getElementById('v32status').textContent='Sign in to FORM AI before requesting coaching.'}catch{document.getElementById('v32status').textContent='Could not check AI session.'}}
window.formV32Login=async function(){const b=document.querySelector('#v32login button');b.disabled=true;try{const r=await fetch('/api/ai/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('v32password').value})});const x=await r.json();if(!r.ok)throw Error(x.error||'Login failed');document.getElementById('v32password').value='';document.getElementById('v32login').hidden=true;document.getElementById('v32status').textContent='Signed in. Review and approve the data preview.'}catch(e){document.getElementById('v32status').textContent=e.message}finally{b.disabled=false}};
function renderHistory(){
 const el=document.getElementById('v32history');if(!el)return;el.replaceChildren();
 const rows=current().slice(-24);const pairs=[];
 for(let i=0;i<rows.length;i++){
  const item=rows[i];if(item.role==='user'&&rows[i+1]?.role==='coach'){pairs.push({question:item,answer:rows[++i]});}
  else pairs.push({question:null,answer:item});
 }
 pairs.reverse().forEach((pair,index)=>{
  const wrap=document.createElement('details');wrap.className='item';wrap.open=index===0;
  const summary=document.createElement('summary');summary.style.cursor='pointer';summary.style.fontWeight='700';
  const question=pair.question?.text||'Coach response';
  summary.textContent=(index===0?'Latest · ':'')+question.slice(0,110)+(question.length>110?'…':'');wrap.append(summary);
  if(pair.question){const q=document.createElement('p');q.className='tiny muted';q.textContent='You: '+question;wrap.append(q)}
  const answer=document.createElement('p');answer.style.whiteSpace='pre-wrap';answer.style.lineHeight='1.55';answer.textContent=pair.answer?.text||'';wrap.append(answer);
  const time=document.createElement('p');time.className='tiny muted';time.textContent=pair.answer?.date||'';wrap.append(time);el.append(wrap);
 });
}
window.formV32Send=async function(){const p=payload(),consent=document.getElementById('v32consent'),status=document.getElementById('v32status'),b=document.getElementById('v32send');if(!p.message)return alert('Enter a question or coaching request.');if(!consent.checked)return alert('Review the exact data and approve this request first.');b.disabled=true;status.textContent='Asking FORM Coach...';try{const r=await fetch('/api/ai/coach',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const x=await r.json();if(!r.ok)throw Error(x.error||'Coach unavailable');if(!x.review||typeof x.review.reply!=='string')throw Error('Invalid coaching reply');const reply=[x.review.reply,...(x.review.suggestions||[]).map(t=>'• '+t)].join('\n\n').slice(0,3800);const before=current().slice();db.coachConversation=[...before,{role:'user',text:p.message,date:TODAY()},{role:'coach',text:reply,date:TODAY()}].slice(-40);if(!save()){db.coachConversation=before;throw Error('Could not save conversation; check storage and export a backup.')}document.getElementById('v32message').value='';status.textContent=(p.mode==='change'?'Requested change reviewed. ':'Coaching response saved. ')+(x.review.changes?.length?'Review the proposed edits below; nothing has been applied.':'No supported structured edits were returned. Check the response for alternatives or missing information.');renderHistory();formV33ShowChanges(x.review.changes||[],p.context.plan);updatePreview()}catch(e){status.textContent=e.message;if(/sign in/i.test(e.message))checkSession()}finally{b.disabled=false}};
window.formV32Clear=function(){if(!confirm('Clear locally saved AI conversation history? Your goal and check-ins remain.'))return;const old=current().slice();db.coachConversation=[];if(!save()){db.coachConversation=old;return alert('Unable to save change.')}renderHistory();updatePreview()};
// Replace the placeholder Talk to Coach action. Coach dashboard and other features remain intact.

// FORM v3.3: proposal review and atomic, user-approved local changes.
let pending=[];
const fieldLabel={calories:'Calories',protein:'Protein',carbs:'Carbohydrates',fat:'Fat',sets:'Sets',reps:'Repetitions',targetRir:'Target RIR'};
window.formV33ShowChanges=function(changes,snapshot){
 const root=document.getElementById('v33proposals');if(!root)return;
 pending=[];root.replaceChildren();
 for(const x of changes.slice(0,6)){
  let before,label;
  if(x.type==='macro'){before=snapshot.macro[x.field];label=fieldLabel[x.field]}
  else {const r=snapshot.routines.find(r=>r.id===x.routineId),e=r?.exercises.find(e=>e.index===x.exerciseIndex);if(!e)continue;before=e[x.field];label=r.name+' / '+e.name+' / '+fieldLabel[x.field]}
  if(before===x.value)continue;
  const idx=pending.length;pending.push({change:x,before});
  const line=document.createElement('label');line.className='item';line.style.display='block';
  const check=document.createElement('input');check.type='checkbox';check.checked=true;check.style.width='auto';check.dataset.v33Index=String(idx);
  const desc=document.createElement('span');desc.textContent=' '+label+': '+(before??'not set')+' → '+x.value+' — '+x.reason;
  line.append(check,desc);root.append(line);
 }
 if(pending.length){const btn=document.createElement('button');btn.className='button';btn.textContent='Apply selected changes';btn.onclick=window.formV33Apply;root.append(btn);const note=document.createElement('p');note.className='tiny muted';note.textContent='Changes apply only after approval. Existing completed workouts are never edited. A local rollback snapshot is saved.';root.append(note)}
 else root.textContent='No directly applicable changes were proposed. If you requested an unsupported change (such as scheduling, cardio or exercise swaps), FORM should explain the limitation and offer a plan to implement it; it cannot apply those edits yet.';
};
window.formV33Apply=function(){
 const root=document.getElementById('v33proposals');const picks=[...root.querySelectorAll('input[data-v33-index]:checked')].map(e=>pending[Number(e.dataset.v33Index)]).filter(Boolean);
 if(!picks.length)return alert('Select at least one change.');
 const oldMacro=structuredClone(db.macro),oldRoutines=structuredClone(db.routines),oldHistory=structuredClone(db.coachPlanHistory||[]);
 // Validate against current values, not merely the model's response.
 for(const {change:x,before} of picks){
  const current=x.type==='macro'?db.macro?.[x.field]:db.routines.find(r=>r.id===x.routineId)?.exercises?.[x.exerciseIndex]?.[x.field]??null;
  if(current!==before)return alert('Your plan has changed since the AI review. Please request a new review before applying changes.');
  if(x.type==='macro'){
   if(!['calories','protein','carbs','fat'].includes(x.field)||!Number.isFinite(x.value)||x.value<0||x.value>1000*(x.field==='calories'?10:1))return alert('Invalid macro recommendation.');
   if(x.field==='calories'&&x.value<1200)return alert('Calorie changes below 1200 are not supported by automatic approval. Discuss an appropriate target with a qualified professional.');
  }else if(x.type==='exercise'){
   if(!['sets','reps','targetRir'].includes(x.field)||!Number.isInteger(x.value)||x.value<(x.field==='targetRir'?0:1)||x.value>(x.field==='sets'?12:x.field==='reps'?100:10))return alert('Invalid exercise recommendation.');
  }else return alert('Unsupported recommendation.');
 }
 if(!confirm('Apply '+picks.length+' selected changes? FORM will save a rollback snapshot first.'))return;
 const stamp=new Date().toISOString();
 try{
  for(const {change:x} of picks){if(x.type==='macro')db.macro[x.field]=x.value;else db.routines.find(r=>r.id===x.routineId).exercises[x.exerciseIndex][x.field]=x.value}
  db.coachPlanHistory=[...oldHistory,{id:stamp,date:stamp,macro:oldMacro,routines:oldRoutines,changes:picks.map(p=>p.change)}].slice(-10);
  if(!save())throw Error('Storage full');
  root.textContent='Approved changes saved. Open My Plan to review or undo this update.';pending=[];
 }catch(e){db.macro=oldMacro;db.routines=oldRoutines;db.coachPlanHistory=oldHistory;alert('Changes were not saved. Export a backup and check storage.')}
};
window.formV33Rollback=function(){
 const history=db.coachPlanHistory||[],last=history[history.length-1];if(!last)return alert('No plan snapshot to restore.');
 if(!confirm('Restore the routines and macro targets saved before the last AI adjustment? This does not change workout history.'))return;
 const macro=structuredClone(db.macro),routines=structuredClone(db.routines),oldHistory=structuredClone(history);
 db.macro=structuredClone(last.macro);db.routines=structuredClone(last.routines);db.coachPlanHistory=history.slice(0,-1);
 if(!save()){db.macro=macro;db.routines=routines;db.coachPlanHistory=oldHistory;return alert('Rollback could not be saved.')}close();render();
};
const previousOverview=window.formCoachOverview;
window.formCoachOverview=function(){previousOverview();const host=document.getElementById('modalContent');if(!host)return;const n=(db.coachPlanHistory||[]).length;const div=document.createElement('div');div.className='item';div.textContent=n+' AI plan adjustment snapshot(s) saved. ';if(n){const b=document.createElement('button');b.className='button secondary';b.textContent='Undo last approved adjustment';b.onclick=window.formV33Rollback;div.append(b)}host.append(div)};

})();
