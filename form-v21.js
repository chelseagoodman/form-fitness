// FORM v2.1: additive, offline-first training and settings extension.
// No external requests, no AI, no changes to the FORM database key.
(function(){
'use strict';
const PREF='form-v21-preferences', META='form-v21-exercise-meta', DRAFT='form-active-workout-v1';
const defaults={compoundRest:150,accessoryRest:75,supersetRest:90,autoRest:true,autoNext:false,rir:2,showPrevious:true,block:'progression',blockWeeks:4,checkinDay:'none',stepGoal:8000};
let prefs={...defaults};try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{}
let meta={};try{meta=JSON.parse(localStorage.getItem(META)||'{}')||{}}catch{}
const $id=id=>document.getElementById(id), safe=s=>esc(String(s??''));
const persist=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs));localStorage.setItem(META,JSON.stringify(meta))}catch{alert('Could not save FORM preferences.')}};
const field=(label,key,values)=>`<label for="v21-${key}">${label}</label><select id="v21-${key}" onchange="formV21Set('${key}',this.value)">${values.map(([v,t])=>`<option value="${v}" ${String(prefs[key])===String(v)?'selected':''}>${t}</option>`).join('')}</select>`;
function settingsPanel(){return `<div class="card"><h2>Training preferences</h2><p class="tiny muted">These settings apply to new workout activity; all existing records remain unchanged.</p>
${field('Heavy compound rest','compoundRest',[[90,'90 seconds'],[120,'2 minutes'],[150,'2 min 30 sec'],[180,'3 minutes']])}
${field('Accessory rest','accessoryRest',[[45,'45 seconds'],[60,'60 seconds'],[75,'75 seconds'],[90,'90 seconds']])}
${field('Superset round rest','supersetRest',[[45,'45 seconds'],[60,'60 seconds'],[90,'90 seconds'],[120,'2 minutes']])}
${field('Automatically start rest timer','autoRest',[['true','On'],['false','Off']])}
${field('Automatically highlight next set','autoNext',[['true','On'],['false','Off']])}
${field('Default reps in reserve (RIR)','rir',[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4']])}
${field('Training block focus','block',[['progression','Progressive overload'],['tempo','Controlled eccentrics'],['hypertrophy','Hypertrophy'],['amrap','Selected AMRAP sets'],['deload','Deload / recovery']])}
${field('Block duration','blockWeeks',[[4,'4 weeks'],[6,'6 weeks'],[8,'8 weeks']])}
${field('Check-in reminder day','checkinDay',[['none','Off'],['0','Sunday'],['1','Monday'],['2','Tuesday'],['3','Wednesday'],['4','Thursday'],['5','Friday'],['6','Saturday']])}
<p class="tiny muted">Reminders appear inside FORM when opened, not as iPhone push notifications. Training blocks are guidance; your routines are not changed automatically.</p></div>`}
window.formV21Set=function(k,v){if(!(k in defaults))return;prefs[k]=['autoRest','autoNext'].includes(k)?v==='true':['compoundRest','accessoryRest','supersetRest','rir','blockWeeks'].includes(k)?Number(v):v;persist();};
// Attach to Settings after the existing theme/data management sections.
const oldRender=render;
render=function(){oldRender();if(page==='settings'){const app=$id('app');if(app&&!$id('v21-settings')){const wrap=document.createElement('div');wrap.id='v21-settings';wrap.innerHTML=settingsPanel();app.appendChild(wrap)}}if(page==='home')showCheckinReminder();};
function showCheckinReminder(){if(prefs.checkinDay==='none'||new Date().getDay()!==Number(prefs.checkinDay))return;const today=TODAY();const already=(db.checkins||[]).some(c=>c.date===today);if(already||$id('v21-checkin-reminder'))return;const wrap=document.createElement('div');wrap.id='v21-checkin-reminder';wrap.className='notice';wrap.style.marginBottom='12px';wrap.textContent='Check-in reminder: today is your selected check-in day. Open Progress to record your measurements and recovery.';$id('app')?.prepend(wrap)}
// A timer appears in the active workout modal; it never blocks set logging.
let restEnd=0,tick=null;
function timerText(){const n=Math.max(0,Math.ceil((restEnd-Date.now())/1000));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function refreshTimer(){const x=$id('v21-rest');if(!x)return;x.textContent=restEnd>Date.now()?`Rest: ${timerText()}`:'Rest timer ready';if(restEnd&&restEnd<=Date.now()){restEnd=0;clearInterval(tick);tick=null}}
window.formV21Rest=function(sec){restEnd=Date.now()+sec*1000;if(tick)clearInterval(tick);refreshTimer();tick=setInterval(refreshTimer,1000)};
window.formV21StopRest=function(){restEnd=0;if(tick)clearInterval(tick);tick=null;refreshTimer()};
function exerciseNames(){return [...new Set((sessionDraft?.sets||[]).map(s=>s.exercise))]}
function groupFor(name){return sessionDraft?.supersets?.[name]||null}
function getDuration(){if(!sessionDraft)return 0;sessionDraft.startedAt=sessionDraft.startedAt||Date.now();return Math.max(0,Math.floor((Date.now()-sessionDraft.startedAt)/1000))}
function durationText(){const n=getDuration();return `${Math.floor(n/3600)}h ${String(Math.floor(n%3600/60)).padStart(2,'0')}m`}
function addWorkoutExtras(){const host=$id('modalContent');if(!host||!sessionDraft)return;
 let header=$id('v21-session-header');if(!header){header=document.createElement('div');header.id='v21-session-header';header.className='notice';host.prepend(header)}
 header.innerHTML=`<div class="row"><b>Workout duration: <span id="v21-duration">${durationText()}</span></b><span id="v21-rest">Rest timer ready</span></div><div class="actions"><button class="button secondary small" onclick="formV21Rest(${Number(prefs.accessoryRest)})">Start rest</button><button class="button secondary small" onclick="formV21StopRest()">Stop rest</button></div><div class="tiny muted">Block: ${safe(prefs.block)} · ${prefs.blockWeeks} weeks. RIR records effort; enter it after each set.</div>`;
 const grids=host.querySelectorAll('.workout-set-grid:not(.workout-set-head)');
 for(const grid of grids){const box=grid.querySelector('input[type="checkbox"]');if(!box)continue;const m=box.getAttribute('onchange')?.match(/formDraftDone\((\d+),/);if(!m)continue;const i=Number(m[1]),set=sessionDraft.sets[i];if(!set||grid.querySelector('.v21-rir'))continue;
 const wrap=document.createElement('label');wrap.className='v21-rir';wrap.style.cssText='display:flex;align-items:center;gap:5px;font-size:11px;margin:0';wrap.textContent='RIR';const input=document.createElement('input');input.type='number';input.min='0';input.max='10';input.step='1';input.value=String(set.rir??prefs.rir);input.style.cssText='width:55px;min-width:0;padding:5px;min-height:30px';input.addEventListener('input',()=>{set.rir=input.value===''?null:Math.max(0,Math.min(10,Number(input.value)||0));persistDraft()});wrap.appendChild(input);grid.appendChild(wrap);
 }
 const groups=exerciseNames();for(const name of groups){const headings=[...host.querySelectorAll('.workout-card strong')].filter(el=>el.textContent.trim()===name);if(!headings.length)continue;const heading=headings[0];if(heading.parentElement.querySelector('.v21-note'))continue;const note=document.createElement('div');note.className='v21-note tiny muted';note.style.marginTop='5px';note.textContent=meta[name]?.note?`Note: ${meta[name].note}`:'';heading.parentElement.appendChild(note)}
 refreshTimer();const dur=$id('v21-duration');if(dur)dur.textContent=durationText();
}
function persistDraft(){if(!sessionDraft)return;try{const old=JSON.parse(localStorage.getItem(DRAFT)||'{}');localStorage.setItem(DRAFT,JSON.stringify({...old,draft:sessionDraft}))}catch{}}
const oldEdit=editSession;editSession=function(){oldEdit();addWorkoutExtras();persistDraft()};
const oldDone=window.formDraftDone;
window.formDraftDone=function(i,v){oldDone(i,v);if(!v||!prefs.autoRest)return;const s=sessionDraft?.sets?.[i];if(!s)return;const label=groupFor(s.exercise);if(label){const same=sessionDraft.sets.filter(x=>groupFor(x.exercise)===label&&x.set===s.set);const last=same[same.length-1];if(last!==s)return;window.formV21Rest(Number(prefs.supersetRest));}else{const isCompound=/press|squat|deadlift|rdl|row|thrust|pulldown/i.test(s.exercise);window.formV21Rest(Number(isCompound?prefs.compoundRest:prefs.accessoryRest));}
 if(prefs.autoNext){const boxes=[...document.querySelectorAll('#modalContent .workout-set-grid input[type="checkbox"]')];const next=boxes.find(x=>!x.checked);next?.closest('.workout-set-grid')?.scrollIntoView({behavior:'smooth',block:'center'});}
};
const oldFinish=finishSession;finishSession=function(){const before=db.sessions.length,seconds=sessionDraft?getDuration():0;oldFinish();if(db.sessions.length>before){db.sessions[db.sessions.length-1].durationSeconds=seconds;save();}};
const oldStart=startSession;startSession=function(id){oldStart(id);if(sessionDraft){sessionDraft.startedAt=sessionDraft.startedAt||Date.now();persistDraft();addWorkoutExtras()}};
// Supplement Coach with non-AI deload guidance based on recent logged performance.
const oldCoach=coach;coach=function(){let result=oldCoach();const recent=[...(db.sessions||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);let note='Log several workouts and RIR values to receive more useful deload guidance.';if(recent.length>=4){const all=recent.flatMap(s=>s.sets||[]);const high=all.filter(s=>s.rir!==null&&s.rir!==undefined&&Number(s.rir)<=1).length;const rated=all.filter(s=>s.rir!==null&&s.rir!==undefined).length;if(rated>=8&&high/rated>=.65)note='Many recent sets were logged at 0–1 RIR. Consider reviewing recovery and whether a lower-volume week is appropriate.';else note='Review performance, fatigue and check-ins before planning a deload; no automatic change has been made.'}return result+`<div class="card"><h2>Training block & deload review</h2><p class="muted tiny">Current focus: ${safe(prefs.block)} · ${prefs.blockWeeks} weeks</p><p>${safe(note)}</p></div>`};
// Exercise categories and persistent notes, saved separately from the existing library.
window.formV21ExerciseLibrary=function(){const names=[...new Set([...(db.routines||[]).flatMap(r=>(r.exercises||[]).map(e=>e.name)),...(db.exerciseLibrary||[]).map(e=>Array.isArray(e)?e[0]:e.name)].filter(Boolean))].sort();const rows=names.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');modal(`<h2>Exercise notes & categories</h2><label>Exercise</label><select id="v21-exercise" onchange="formV21LoadExercise()">${rows}</select><label>Category / muscle group</label><input id="v21-category" placeholder="e.g. Chest, Back, Glutes"><label>Equipment</label><input id="v21-equipment" placeholder="e.g. Dumbbells, Machine"><label>Technique / machine notes</label><textarea id="v21-note" rows="3" placeholder="Seat position, grip, cues..."></textarea><div class="actions"><button class="button" onclick="formV21SaveExercise()">Save notes</button></div>`);window.formV21LoadExercise()};
window.formV21LoadExercise=function(){const n=$id('v21-exercise')?.value||'';const x=meta[n]||{};if($id('v21-category'))$id('v21-category').value=x.category||'';if($id('v21-equipment'))$id('v21-equipment').value=x.equipment||'';if($id('v21-note'))$id('v21-note').value=x.note||''};
window.formV21SaveExercise=function(){const n=$id('v21-exercise')?.value;if(!n)return;meta[n]={category:$id('v21-category').value.slice(0,80),equipment:$id('v21-equipment').value.slice(0,80),note:$id('v21-note').value.slice(0,500)};persist();close();alert('Exercise notes saved on this device.')};
const oldTrain=train;train=function(){return `<div class="actions" style="margin-bottom:12px"><button class="button secondary small" onclick="formV21ExerciseLibrary()">Exercise notes & categories</button></div>`+oldTrain()};
// This extension stores preferences and exercise metadata in localStorage. Its values
// are intentionally not part of legacy FORM JSON backups; see the separate export.
window.formV21ExportPreferences=function(){const payload=JSON.stringify({app:'FORM',type:'v21-preferences',prefs,meta},null,2),blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`FORM-preferences-${TODAY()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};
window.formV21ImportPreferences=function(){modal(`<h2>Restore workout preferences</h2><p class="tiny muted">Only FORM v2.1 preferences and exercise notes are restored. Workouts are not replaced.</p><input id="v21-prefs-file" type="file" accept=".json,application/json"><button class="button" onclick="formV21RestorePreferences()">Restore preferences</button>`)};
window.formV21RestorePreferences=async function(){const f=$id('v21-prefs-file')?.files?.[0];if(!f)return alert('Choose a file.');try{const x=JSON.parse(await f.text());if(x.app!=='FORM'||x.type!=='v21-preferences'||!x.prefs||!x.meta||Array.isArray(x.meta))throw Error('Invalid preferences backup');if(!confirm('Replace current workout preferences and exercise notes?'))return;prefs={...defaults,...x.prefs};meta=x.meta;persist();close();render()}catch(e){alert('Could not restore preferences: '+e.message)}};
const priorRender=render;render=function(){priorRender();if(page==='settings'){const wrap=$id('v21-settings');if(wrap&&!$id('v21-export')){const panel=document.createElement('div');panel.id='v21-export';panel.className='actions';panel.innerHTML='<button class="button secondary small" onclick="formV21ExportPreferences()">Export workout preferences & exercise notes</button><button class="button secondary small" onclick="formV21ImportPreferences()">Restore workout preferences</button>';wrap.appendChild(panel)}}};
})();
