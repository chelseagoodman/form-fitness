// FORM v3.5 test: one goal-based training + nutrition plan, with explicit approval.
// Requires app.js, form-coach-v32.js, form-universal-workouts.js (optional), form-stability-v332.js.
(function(){'use strict';
const escape=x=>esc(String(x??''));
const copy=x=>JSON.parse(JSON.stringify(x));
const rows=()=>Array.isArray(db.coachUnifiedPlans)?db.coachUnifiedPlans:[];
const workouts=()=>Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
let proposed=null, requestSnapshot=null;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const latestCheckins=()=>[...(db.checkins||[])].filter(c=>validDate(c.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).reverse().map(c=>{const x={date:c.date};for(const k of ['weight','height','waist','hips','sleep','energy','stress','recovery','steps']){const n=Number(c[k]);if(c[k]!==null&&c[k]!==undefined&&c[k]!==''&&Number.isFinite(n)&&n>=0)x[k]=n}return x});
const active=()=>rows().findLast(p=>p.status==='active')||null;
function payload(){
 const current=active();const recent=[...(db.sessions||[])].filter(s=>validDate(String(s.date||'').slice(0,10))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).reverse().map(s=>({date:String(s.date).slice(0,10),name:String(s.name||'').slice(0,100),durationMinutes:Math.max(0,Math.min(1000,Number(s.durationMinutes)||0)),sets:(s.sets||[]).slice(0,35).map(x=>({exercise:String(x.exercise||'').slice(0,100),weight:Number.isFinite(Number(x.weight))?Math.min(1500,Math.max(0,Number(x.weight))):null,reps:Number.isFinite(Number(x.reps))?Math.min(200,Math.max(0,Number(x.reps))):null,rir:x.rir===undefined||x.rir===null||!Number.isFinite(Number(x.rir))?null:Math.max(0,Math.min(10,Number(x.rir)))}))}));
 return {mode:document.getElementById('upMode').value,goal:document.getElementById('upGoal').value.trim(),sessionsPerWeek:Number(document.getElementById('upDays').value),durationMinutes:Number(document.getElementById('upMinutes').value),weeks:Number(document.getElementById('upWeeks').value),equipment:document.getElementById('upEquipment').value.trim(),location:document.getElementById('upLocation').value.trim(),checkins:document.getElementById('upCheckins').checked?latestCheckins():[],currentMacro:Object.fromEntries(['calories','protein','carbs','fat'].map(k=>[k,Math.max(0,Number(db.macro?.[k])||0)])),recentSessions:document.getElementById('upTraining').checked?recent:[],currentPlan:{summary:String(current?.plan?.summary||'').slice(0,600),workouts:(current?.plan?.workouts||[]).map(w=>String(w.name).slice(0,120)).slice(0,7),nutrition:current?Object.fromEntries(['calories','protein','carbs','fat'].map(k=>[k,Number(current.plan.nutrition[k])||0])):null}};
}
function preview(){const el=document.getElementById('upPreview');if(el)el.textContent=JSON.stringify(payload(),null,2);const consent=document.getElementById('upConsent');if(consent)consent.checked=false}
window.formUnifiedPlanOpen=function(mode='create'){
 proposed=null;requestSnapshot=null;
 const g=db.coachGoal||{};
 const current=active();
 modal(`<h2>Build My Training & Nutrition Plan</h2><p class="tiny muted">One coordinated weekly plan with any workout style and proposed daily macros. Nothing changes without approval. Progress photos and notes are excluded.</p>
 <input type="hidden" id="upMode" value="${mode==='review'?'review':'create'}">
 <label for="upGoal">What do you want to achieve?</label><textarea id="upGoal" rows="4" maxlength="1200">${escape(g.goal||'')}</textarea>
 <div class="grid"><div><label for="upDays">Sessions per week</label><select id="upDays">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${n===(current?.plan?.workouts?.length||Number(g.trainingDays)||5)?'selected':''}>${n}</option>`).join('')}</select></div><div><label for="upMinutes">Minutes per session</label><input id="upMinutes" type="number" min="10" max="180" value="60"></div>
 <div><label for="upWeeks">Program length</label><select id="upWeeks">${[4,6,8,12,16,24].map(n=>`<option value="${n}" ${n===8?'selected':''}>${n} weeks</option>`).join('')}</select></div><div><label for="upLocation">Location</label><input id="upLocation" maxlength="150" value="${escape(g.roster||'Home / FIFO')}"></div></div>
 <label for="upEquipment">Available equipment</label><textarea id="upEquipment" maxlength="600" rows="2">${escape([g.equipmentCamp,g.equipmentHome].filter(Boolean).join(' / '))}</textarea>
 <label><input id="upCheckins" type="checkbox" style="width:auto" checked> Include up to four recent numerical check-ins</label>
 <label><input id="upTraining" type="checkbox" style="width:auto" checked> Include up to eight recent logged sessions</label>
 <details><summary>Exact information to be shared with Gemini</summary><pre id="upPreview" style="max-height:250px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere"></pre></details>
 <label><input id="upConsent" type="checkbox" style="width:auto"> I approve sending this exact preview to Gemini</label>
 <div class="actions"><button class="button" id="upGenerate" onclick="formUnifiedPlanGenerate()">${mode==='review'?'Generate revised plan':'Generate complete plan'}</button></div>
 <p id="upStatus" class="tiny muted" role="status"></p><div id="upResult"></div>`);
 for(const id of ['upGoal','upDays','upMinutes','upWeeks','upLocation','upEquipment','upCheckins','upTraining'])document.getElementById(id).addEventListener('change',preview);
 for(const id of ['upGoal','upMinutes','upLocation','upEquipment'])document.getElementById(id).addEventListener('input',preview);
 preview();
};
window.formUnifiedPlanGenerate=async function(){
 const p=payload(),status=document.getElementById('upStatus'),btn=document.getElementById('upGenerate');
 if(!p.goal||p.goal.length>1200||p.durationMinutes<10||p.durationMinutes>180||!Number.isInteger(p.durationMinutes))return alert('Describe your goal and enter a valid session length.');
 if(!document.getElementById('upConsent').checked)return alert('Review and approve the information being sent to Gemini first.');
 btn.disabled=true;status.textContent='Generating coordinated workouts and nutrition...';
 try{const r=await fetch('/api/ai/plan',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const x=await r.json();if(!r.ok)throw Error(x.error||'Unable to generate plan');if(!valid(x.plan,p.sessionsPerWeek))throw Error('Gemini returned an invalid plan. No data was changed.');proposed=copy(x.plan);requestSnapshot=p;renderProposal();status.textContent='Proposal ready. Review each workout and your daily macros before saving.'}catch(e){status.textContent=e.message}finally{btn.disabled=false}
};
function valid(p,count){const n=p?.nutrition;return p&&Array.isArray(p.workouts)&&p.workouts.length===count&&p.workouts.every(w=>typeof w.name==='string'&&w.name.trim()&&Array.isArray(w.blocks)&&w.blocks.length>0&&w.blocks.every(b=>Array.isArray(b.steps)&&b.steps.length>0&&b.steps.every(s=>typeof s.name==='string'&&s.name.trim())))&&n&&['calories','protein','carbs','fat'].every(k=>Number.isFinite(Number(n[k]))&&Number(n[k])>=0)}
function renderProposal(){const host=document.getElementById('upResult');if(!host||!proposed)return;host.replaceChildren();
 const h=document.createElement('h3');h.textContent='Proposed complete plan';host.append(h);
 const description=document.createElement('p');description.className='tiny muted';description.textContent=proposed.summary;host.append(description);
 const n=document.createElement('div');n.className='card';const nh=document.createElement('h3');nh.textContent='Daily nutrition targets — editable';n.append(nh);
 const grid=document.createElement('div');grid.className='grid';for(const [key,label] of [['calories','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbohydrates (g)'],['fat','Fat (g)']]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.min='0';input.max=key==='calories'?'8000':'1000';input.step='1';input.value=proposed.nutrition[key];input.addEventListener('input',()=>{proposed.nutrition[key]=Number(input.value)});wrap.append(input);grid.append(wrap)}n.append(grid);
 const check=document.createElement('label');check.innerHTML='<input type="checkbox" id="upApplyMacro" style="width:auto" checked> Apply approved daily macro targets';n.append(check);const rationale=document.createElement('p');rationale.className='tiny muted';rationale.textContent=proposed.nutrition.rationale||'';n.append(rationale);host.append(n);
 for(const [i,w] of proposed.workouts.entries()){const card=document.createElement('details');card.className='item';card.open=i===0;const summary=document.createElement('summary');summary.textContent='Day '+(i+1)+' · '+w.name+' · '+w.category;card.append(summary);
 const name=document.createElement('input');name.value=w.name;name.maxLength=90;name.setAttribute('aria-label','Workout name');name.addEventListener('input',()=>w.name=name.value);card.append(name);
 const detail=document.createElement('p');detail.className='tiny muted';detail.textContent=w.description+' · '+w.durationMinutes+' minutes';card.append(detail);
 for(const b of w.blocks){const bhead=document.createElement('p');bhead.textContent=b.title+' · '+b.repeat+' round(s)';card.append(bhead);for(const s of b.steps){const field=document.createElement('input');field.value=s.name;field.maxLength=100;field.setAttribute('aria-label','Movement name');field.addEventListener('input',()=>s.name=field.value);card.append(field);const line=document.createElement('p');line.className='tiny muted';line.textContent=[s.method,s.seconds===null?'':s.seconds+' sec',s.reps===null?'':s.reps+' reps',s.distanceMeters===null?'':s.distanceMeters+' m',s.effort,s.cues].filter(Boolean).join(' · ');card.append(line)}}host.append(card)}
 const explain=document.createElement('p');explain.className='tiny muted';explain.textContent='Why: '+proposed.rationale+'\n'+(proposed.uncertainties||[]).join(' · ');host.append(explain);
 const label=document.createElement('label');label.textContent='What should happen to your current workouts?';const select=document.createElement('select');select.id='upSaveMode';for(const [value,text] of [['replace','Replace current plan (archive previous workouts)'],['keep','Keep both plans'],['draft','Save as draft — do not activate']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o)}label.append(select);host.append(label);
 const btn=document.createElement('button');btn.className='button';btn.textContent='Approve and save complete plan';btn.onclick=window.formUnifiedPlanSave;host.append(btn);
}
window.formUnifiedPlanSave=function(){if(!proposed||!requestSnapshot||!valid(proposed,requestSnapshot.sessionsPerWeek))return alert('The proposal is incomplete. Regenerate or check workout names.');
 const n=proposed.nutrition;const applyMacro=!!document.getElementById('upApplyMacro')?.checked;const mode=document.getElementById('upSaveMode')?.value;
 if(!['replace','keep','draft'].includes(mode))return alert('Choose how to save the plan.');
 if(applyMacro&&(n.calories<1200||n.calories>8000||n.protein<0||n.protein>500||n.carbs<0||n.carbs>1000||n.fat<0||n.fat>300||Math.abs(4*n.protein+4*n.carbs+9*n.fat-n.calories)>Math.max(150,n.calories*.12)))return alert('Macro totals are inconsistent or outside supported ranges. Please review them before approval.');
 if(!confirm('Save '+proposed.workouts.length+' workouts as '+mode+'? '+(applyMacro&&mode!=='draft'?'Apply new daily macros. ':'')+'Previous records will be retained.'))return;
 const before={routines:copy(db.routines||[]),universalWorkouts:copy(workouts()),macro:copy(db.macro),coachUnifiedPlans:copy(rows()),formManualPrograms:copy(db.formManualPrograms||[]),coachPlanHistory:copy(db.coachPlanHistory||[])};
 try{const id=uid(),timestamp=new Date().toISOString();if(mode==='replace'){for(const r of db.routines||[])if(r.formPlanStatus!=='archived')r.formPlanStatus='archived';for(const w of workouts())if(w.status==='active')w.status='archived';for(const p of rows())if(p.status==='active')p.status='archived';for(const p of db.formManualPrograms||[])if(p.status==='active')p.status='archived'}
 const newWorkouts=proposed.workouts.map((w,i)=>({id:uid(),createdAt:timestamp,status:mode==='draft'?'draft':'active',unifiedPlanId:id,day:i+1,workout:copy(w)}));db.universalWorkouts=[...workouts(),...newWorkouts];
 const savedPlan={id,createdAt:timestamp,status:mode==='draft'?'draft':'active',goal:requestSnapshot.goal,source:requestSnapshot.mode,plan:copy(proposed),workoutIds:newWorkouts.map(w=>w.id)};db.coachUnifiedPlans=[...rows(),savedPlan];
 if(applyMacro&&mode!=='draft')db.macro={...db.macro,...Object.fromEntries(['calories','protein','carbs','fat'].map(k=>[k,n[k]]))};
 db.coachPlanHistory=[...(db.coachPlanHistory||[]),{id:'unified-'+id,date:timestamp,kind:'unified-plan',description:'Unified plan '+mode,previous:{routines:before.routines,universalWorkouts:before.universalWorkouts,macro:before.macro,coachUnifiedPlans:before.coachUnifiedPlans,formManualPrograms:before.formManualPrograms}}].slice(-12);
 if(!save())throw Error('Browser storage could not save plan');close();render();alert('Saved '+newWorkouts.length+' workouts. '+(mode==='draft'?'Draft is inactive.':'Open Train to see the new workouts.'));
 }catch(e){for(const k of Object.keys(before))db[k]=before[k];alert('Save failed. Previous data restored. '+e.message)}
};
window.formUnifiedUndo=function(){const h=db.coachPlanHistory||[],entry=[...h].reverse().find(x=>x.kind==='unified-plan'&&x.previous);if(!entry)return alert('No unified plan change available to undo.');if(h[h.length-1]!==entry)return alert('A newer plan adjustment exists. Restore from a verified backup instead of overwriting later changes.');if(!confirm('Undo the last unified plan save? Current workout history will remain untouched.'))return;const prev=copy(entry.previous),snapshot={routines:copy(db.routines),universalWorkouts:copy(workouts()),macro:copy(db.macro),coachUnifiedPlans:copy(rows()),formManualPrograms:copy(db.formManualPrograms||[]),coachPlanHistory:copy(h)};for(const k of ['routines','universalWorkouts','macro','coachUnifiedPlans','formManualPrograms'])db[k]=prev[k];db.coachPlanHistory=h.slice(0,-1);if(!save()){for(const k of Object.keys(snapshot))db[k]=snapshot[k];return alert('Could not save undo.')}close();render()};
const oldHub=window.formCoachPlanHub;
window.formCoachPlanHub=function(){modal(`<h2>My Plan</h2><p class="tiny muted">Build a complete weekly training and nutrition plan, or regenerate it after your check-in. Supports yoga, HIIT, strength, cardio, mobility and mixed training.</p><div class="actions"><button class="button" onclick="formUnifiedPlanOpen('create')">Build complete plan</button><button class="button" onclick="formUnifiedPlanOpen('review')">AI training & nutrition review</button><button class="button secondary" onclick="formUnifiedUndo()">Undo last unified plan change</button></div><p class="tiny muted">Existing programs and workout history are retained. Old standalone builders remain in the code for rollback, but are no longer the main workflow.</p>`)};
// Remove duplicate standalone generator card from Coach after the existing render completes.
const priorRender=render;
render=function(){const x=priorRender.apply(this,arguments);if(page==='coach'){for(const h of document.querySelectorAll('#app h2')){if(/^Create Any Workout$/i.test(h.textContent.trim())||/^AI Program Builder\s*[·-]/i.test(h.textContent.trim()))h.closest('.card')?.remove()}}return x};
})();
