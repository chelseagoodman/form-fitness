// FORM v3.1 test — Unified weekly check-in; additive and reversible.
// Loads AFTER checkins.js, checkin-layout.js and form-coach-v30.js.
(function(){
'use strict';
const E=v=>esc(String(v??''));
const dateOK=d=>/^\d{4}-\d{2}-\d{2}$/.test(d);
const weekStart=d=>{const x=new Date(d+'T12:00:00');if(Number.isNaN(x.getTime()))return d;x.setDate(x.getDate()-(x.getDay()+6)%7);return x.toLocaleDateString('en-CA')};
const inWeek=(d,start)=>d>=start&&d<=new Date(new Date(start+'T12:00:00').getTime()+6*86400000).toLocaleDateString('en-CA');
const stored=()=>{try{return JSON.parse(localStorage.getItem('form-v30-coach-v1')||'{}')}catch{return {}}};
// Mirror the existing v3.0 goal into FORM's standard db backup. Never delete the original.
function syncGoal(){const s=stored();if(!s.goal)return;const copy={goal:s.goal,deadline:s.deadline||'',priority:s.priority||'',roster:s.roster||'',equipmentCamp:s.equipmentCamp||'',equipmentHome:s.equipmentHome||'',trainingDays:s.trainingDays||5,notes:s.notes||''};if(!db.coachGoal){db.coachGoal=copy;save()}}
syncGoal();
const oldSaveGoal=window.formCoachSaveGoal;
window.formCoachSaveGoal=function(){oldSaveGoal.apply(this,arguments);const s=stored();if(s.goal){db.coachGoal={goal:s.goal,deadline:s.deadline||'',priority:s.priority||'',roster:s.roster||'',equipmentCamp:s.equipmentCamp||'',equipmentHome:s.equipmentHome||'',trainingDays:s.trainingDays||5,notes:s.notes||''};save()}};
const oldCoachWeekly=window.formCoachWeekly;
window.formCoachWeekly=function(){
 if(!stored().goal&&!db.coachGoal?.goal)return alert('Save your primary goal first.');
 const today=TODAY();const existing=(db.checkins||[]).find(x=>x.date===today);
 window.formCheckinEdit(existing?.id||'');
 const root=document.getElementById('modalContent');if(!root)return;
 const item=existing||{};const extra=document.createElement('section');extra.id='v31coach';
 extra.style.cssText='border:1px solid #665735;border-radius:12px;padding:12px;margin:14px 0';
 extra.innerHTML=`<h3>Weekly Coach Feedback</h3><p class="tiny muted">Body Composition and Lifestyle & Recovery above are the same fields used in Progress. This check-in is saved once to your FORM backup.</p>
 <label for="v31shift">Current FIFO setting</label><select id="v31shift"><option value="">Not specified</option><option value="days">Day shift</option><option value="nights">Night shift</option><option value="home">R&R / Home</option><option value="travel">Travel</option></select>
 <label for="v31worked">What went well?</label><textarea id="v31worked" rows="2" maxlength="1200">${E(item.coach?.worked||'')}</textarea>
 <label for="v31difficult">What was difficult?</label><textarea id="v31difficult" rows="2" maxlength="1200">${E(item.coach?.difficult||'')}</textarea>
 <label for="v31request">What would you like your coach to focus on?</label><textarea id="v31request" rows="2" maxlength="1200">${E(item.coach?.request||'')}</textarea>
 <p class="tiny muted">Coaching feedback is saved locally in this check-in and included in FORM JSON exports. It is NOT transmitted to Gemini by this update.</p>`;
 const shift=extra.querySelector('#v31shift');shift.value=item.coach?.shift||'';
 const actions=root.querySelector('.actions');if(actions)actions.before(extra);else root.append(extra);
 const dateField=document.getElementById('ci_date');if(dateField)dateField.addEventListener('change',()=>{
   const d=dateField.value;const match=(db.checkins||[]).find(x=>x.date===d);
   if(match&&match.id!==existing?.id){const notice=document.getElementById('v31existing');if(!notice){const p=document.createElement('p');p.id='v31existing';p.className='tiny muted';p.textContent='A check-in already exists on that date. Open it from Progress to edit instead of creating a duplicate.';extra.prepend(p)}}
 });
};
const originalSave=window.formCheckinSave;
window.formCheckinSave=function(id){
 const extra=document.getElementById('v31coach');
 if(!extra)return originalSave.apply(this,arguments);
 const d=document.getElementById('ci_date')?.value;
 if(!dateOK(d))return alert('Choose a valid check-in date.');
 const conflict=(db.checkins||[]).find(x=>x.date===d&&x.id!==id);
 if(conflict)return alert('A check-in already exists for this date. Open it from Progress and edit it.');
 const coach={shift:document.getElementById('v31shift')?.value||'',worked:document.getElementById('v31worked')?.value.slice(0,1200)||'',difficult:document.getElementById('v31difficult')?.value.slice(0,1200)||'',request:document.getElementById('v31request')?.value.slice(0,1200)||''};
 const before=new Set((db.checkins||[]).map(x=>x.id));
 originalSave.apply(this,arguments);
 const row=id?(db.checkins||[]).find(x=>x.id===id):(db.checkins||[]).find(x=>!before.has(x.id)&&x.date===d);
 if(!row)return; // Original validation failed; don't write coaching data.
 row.coach=coach;
 if(!save())alert('Coaching feedback could not be saved. Export a backup and check available storage.');
 else render();
};
// Coach dashboard: current check-in, read-only training and food summaries.
const oldCoach=coach;
coach=function(){
 const d=TODAY(),start=weekStart(d),ci=[...(db.checkins||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
 const sessions=(db.sessions||[]).filter(x=>inWeek(String(x.date||'').slice(0,10),start));
 const foods=(db.foods||[]).filter(x=>inWeek(String(x.date||'').slice(0,10),start));
 const total=foods.reduce((a,f)=>a+(Number(f.calories)||0),0);
 const summary=`<div class="card"><h2>Unified Weekly Check-in · v3.1 test</h2><p class="tiny muted">Enter measurements once. Progress and Coach use the same check-in record; completed training and food entries are read automatically.</p>
 <div class="grid"><div><div class="label">Latest weight</div><b>${ci?.weight??'—'} kg</b></div><div><div class="label">Latest recovery</div><b>${ci?.recovery??'—'}/10</b></div><div><div class="label">Workouts this week</div><b>${sessions.length}</b></div><div><div class="label">Logged food this week</div><b>${foods.length} entries</b></div></div>
 <p class="tiny muted">Food logged: ${Math.round(total)} kcal total across recorded entries (not a full-week intake estimate unless every meal is logged).</p>
 <div class="actions"><button class="button" onclick="formCoachWeekly()">Open unified check-in</button><button class="button secondary" onclick="formV23Open()">Review AI check-in (optional)</button></div>
 <p class="tiny muted">AI review uses its existing separate consent and numeric-only preview. Photos and coaching notes are excluded.</p></div>`;
 return summary+oldCoach();
};

// Consolidated Coach home. Keep existing AI endpoints; remove duplicate cards from Coach.
coach=function(){
 const s=stored(),goal=db.coachGoal?.goal||s.goal||'';
 const last=[...(db.checkins||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
 const start=weekStart(TODAY());
 const sessions=(db.sessions||[]).filter(x=>inWeek(String(x.date||'').slice(0,10),start));
 const linked=(db.routines||[]).filter(x=>x.aiProgramId||x.programId);
 return `<div class="card"><h2>Personal AI Coach</h2><p class="tiny muted">One goal. One evolving plan. Your existing AI features are grouped here.</p>
 ${goal?`<div class="item"><b>Active goal</b><p>${E(goal)}</p></div>`:'<p class="tiny muted">Start by setting your primary goal.</p>'}
 <div class="grid"><div class="item"><div class="label">Workouts this week</div><b>${sessions.length}</b></div><div class="item"><div class="label">Latest weight</div><b>${last?.weight??'—'} kg</b></div><div class="item"><div class="label">Recovery</div><b>${last?.recovery??'—'}/10</b></div><div class="item"><div class="label">AI routines</div><b>${linked.length}</b></div></div>
 <div class="actions"><button class="button" onclick="formCoachGoal()">My Goal</button><button class="button" onclick="formCoachWeekly()">Weekly Check-in</button><button class="button secondary" onclick="formCoachPlanHub()">My Plan</button><button class="button secondary" onclick="formCoachTalkHub()">Talk to Coach</button></div>
 <p class="tiny muted">Check-in measurements save to Progress and your standard backup. AI analyses require consent; photos and notes are excluded from existing AI reviews.</p></div>`;
};
window.formCoachPlanHub=function(){
 const linked=(db.routines||[]).filter(x=>x.aiProgramId||x.programId);
 modal(`<h2>My Plan</h2><p class="tiny muted">The existing working tools are grouped here rather than repeated on Coach.</p><p>AI-linked routines: ${linked.length}</p>
 <div class="actions"><button class="button" onclick="formV25Open()">Build complete program</button><button class="button secondary" onclick="formV24Open()">Training & progression review</button><button class="button secondary" onclick="formV23Open()">Recovery and deload review</button><button class="button secondary" onclick="formCoachOverview()">Plan and weekly history</button></div>
 <p class="tiny muted">Deload advice remains a recommendation. Full goal-aware nutrition and automatic weekly plan changes are not implemented yet.</p>`);
};
window.formCoachTalkHub=function(){
 modal(`<h2>Talk to Coach — planned</h2><p>The conversational Gemini endpoint has not yet been deployed. This page does not send messages to AI.</p><p class="tiny muted">Use My Plan for existing AI recommendations and Weekly Check-in to save progress. Conversational coaching will be added after secure testing.</p><div class="actions"><button class="button secondary" onclick="formCoachPlanHub()">Open My Plan</button></div>`);
};

})();
