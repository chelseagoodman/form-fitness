// FORM v3.5.4 — Interactive universal workout logger, test branch only.
// Load AFTER form-v353-ai-workout-visibility.js. Does not modify AI generation or macros.
(function(){
'use strict';
const KEY='form-universal-active-session-v354';
const escHTML=x=>esc(String(x??''));
let draft=null,ticker=null;
const list=()=>Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
const find=id=>list().find(x=>x&&x.id===id&&x.workout&&Array.isArray(x.workout.blocks));
const getSaved=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const persist=()=>{try{if(draft)localStorage.setItem(KEY,JSON.stringify(draft));return true}catch{alert('Unable to save workout draft. Check browser storage.');return false}};
const clear=()=>{try{localStorage.removeItem(KEY)}catch{}draft=null;stopTick()};
function stopTick(){if(ticker){clearInterval(ticker);ticker=null}}
const asNum=(v,max)=>{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=max?n:null};
function latest(name,index){for(const session of [...(db.sessions||[])].reverse()){const hit=(session.sets||[]).find(x=>x.exercise===name&&Number(x.set)===index);if(hit)return hit}return null}
function makeDraft(row){
 const entries=[];row.workout.blocks.forEach((block,bi)=>{
  for(let round=1;round<=Math.min(12,Number(block.repeat)||1);round++){
   (block.steps||[]).forEach((step,si)=>{
    const name=String(step.name||'Movement').slice(0,100);
    const method=String(step.method||'').toLowerCase();
    const isResistance=step.loadKg!==null&&step.loadKg!==undefined||/resistance|strength|weight|lift|reps/.test(method)&&step.reps!==null;
    const last=isResistance?latest(name,round):null;
    entries.push({key:bi+'-'+round+'-'+si,blockIndex:bi,round,stepIndex:si,name,method:step.method||'',cues:step.cues||'',effort:step.effort||'',planned:{reps:step.reps??null,seconds:step.seconds??null,distanceMeters:step.distanceMeters??null,loadKg:step.loadKg??null},kind:isResistance?'strength':step.distanceMeters!==null?'distance':step.seconds!==null?'timed':step.reps!==null?'reps':'completion',done:false,reps:step.reps??null,weight:last?.weight??step.loadKg??null,rir:last?.rir??null,seconds:step.seconds??null,distanceMeters:step.distanceMeters??null,effortRating:null});
   });
  }
 });
 return {version:1,workoutId:row.id,workoutName:row.workout.name,startedAt:Date.now(),entries,overallEffort:null};
}
function labelInput(label,value,key,field,max,step='1'){
 return `<label style="flex:1;min-width:85px">${label}<input data-u-key="${escHTML(key)}" data-u-field="${field}" type="number" min="0" max="${max}" step="${step}" value="${value===null||value===undefined?'':escHTML(value)}" placeholder="—"></label>`;
}
function elapsed(){if(!draft)return '0:00';const s=Math.max(0,Math.floor((Date.now()-draft.startedAt)/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function updateTime(){const el=document.getElementById('u354Timer');if(el)el.textContent=elapsed();else stopTick()}
function renderDraft(){
 if(!draft)return;
 const row=find(draft.workoutId);if(!row){alert('Saved workout no longer exists. Draft was preserved.');return}
 const w=row.workout;
 const completed=draft.entries.filter(x=>x.done).length;
 let html=`<h2>${escHTML(w.name)}</h2><p class="tiny muted">${escHTML(w.description||'')}</p><div class="notice">Workout timer: <b id="u354Timer">${elapsed()}</b> · ${completed}/${draft.entries.length} movements completed. Changes save automatically on this device.</div>`;
 let lastBlock=-1,lastRound=-1;
 for(const e of draft.entries){
  if(e.blockIndex!==lastBlock){lastBlock=e.blockIndex;lastRound=-1;const block=w.blocks[e.blockIndex];html+=`<h3 style="margin-top:20px">${escHTML(block.title)} · ${Number(block.repeat)||1} round(s)</h3>`}
  if(e.round!==lastRound){lastRound=e.round;html+=`<p class="tiny muted">Round ${e.round}</p>`}
  html+=`<div class="item" style="padding:12px;border:1px solid #405447;border-radius:12px;margin:8px 0"><label style="display:flex;align-items:center;gap:9px"><input type="checkbox" data-u-key="${escHTML(e.key)}" data-u-field="done" ${e.done?'checked':''} style="width:20px;min-height:20px;accent-color:#18ae81"><b>${escHTML(e.name)}</b></label>`;
  const planned=[e.planned.reps!=null?e.planned.reps+' reps':'',e.planned.loadKg!=null?e.planned.loadKg+' kg':'',e.planned.seconds!=null?e.planned.seconds+' sec':'',e.planned.distanceMeters!=null?e.planned.distanceMeters+' m':'',e.effort].filter(Boolean).join(' · ');
  if(planned)html+=`<p class="tiny muted">Target: ${escHTML(planned)}</p>`;
  if(e.cues)html+=`<p class="tiny muted">${escHTML(e.cues)}</p>`;
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px">';
  if(e.kind==='strength')html+=labelInput('Reps',e.reps,e.key,'reps',200)+labelInput('Weight (kg)',e.weight,e.key,'weight',1500,'0.5')+labelInput('RIR',e.rir,e.key,'rir',10);
  else if(e.kind==='reps')html+=labelInput('Reps',e.reps,e.key,'reps',200)+labelInput('RIR (optional)',e.rir,e.key,'rir',10);
  else if(e.kind==='timed')html+=labelInput('Seconds',e.seconds,e.key,'seconds',7200)+labelInput('Effort 1–10',e.effortRating,e.key,'effortRating',10);
  else if(e.kind==='distance')html+=labelInput('Distance (m)',e.distanceMeters,e.key,'distanceMeters',100000,'0.1')+labelInput('Seconds',e.seconds,e.key,'seconds',7200)+labelInput('Effort 1–10',e.effortRating,e.key,'effortRating',10);
  else html+=labelInput('Effort 1–10 (optional)',e.effortRating,e.key,'effortRating',10);
  html+='</div></div>';
 }
 html+=`<label>Overall effort (1–10, optional)<input type="number" id="u354Overall" min="1" max="10" value="${draft.overallEffort??''}"></label><div class="actions"><button class="button" onclick="formU354Finish()">Finish & save workout</button><button class="button secondary" onclick="formU354Pause()">Close & resume later</button><button class="button secondary" onclick="formU354Discard()">Discard draft</button></div>`;
 modal(html);stopTick();ticker=setInterval(updateTime,1000);
}
function setField(key,field,value){const e=draft?.entries.find(x=>x.key===key);if(!e)return;if(field==='done')e.done=!!value;else{const max={reps:200,weight:1500,rir:10,seconds:7200,distanceMeters:100000,effortRating:10}[field];if(!max)return;const n=asNum(value,max);if(value!==''&&n===null)return;e[field]=n}persist();if(field==='done'){const count=draft.entries.filter(x=>x.done).length;const status=document.querySelector('#modalContent .notice');if(status)status.innerHTML=`Workout timer: <b id="u354Timer">${elapsed()}</b> · ${count}/${draft.entries.length} movements completed. Changes save automatically on this device.`}}
document.addEventListener('change',e=>{if(!draft)return;const el=e.target;if(!el?.dataset?.uKey)return;setField(el.dataset.uKey,el.dataset.uField,el.type==='checkbox'?el.checked:el.value)});
document.addEventListener('input',e=>{if(!draft)return;const el=e.target;if(!el?.dataset?.uKey||el.type==='checkbox')return;setField(el.dataset.uKey,el.dataset.uField,el.value)});
window.formUniversalView=function(id){const row=find(id);if(!row)return alert('Workout not found.');const saved=getSaved();if(saved&&saved.workoutId!==id){if(!confirm('Another workout is in progress. Discard that unsaved workout and start this one?'))return;clear()}
 if(saved&&saved.workoutId===id&&Array.isArray(saved.entries))draft=saved;else{draft=makeDraft(row);if(!persist())return}
 renderDraft();};
window.formU354Pause=function(){if(!draft)return;const effort=document.getElementById('u354Overall')?.value;draft.overallEffort=asNum(effort,10);persist();stopTick();close();render()};
window.formU354Discard=function(){if(!draft||!confirm('Discard this unfinished workout? Completed workout history will not be affected.'))return;clear();close();render()};
window.formU354Finish=function(){if(!draft)return;const effort=document.getElementById('u354Overall')?.value;draft.overallEffort=asNum(effort,10);const done=draft.entries.filter(e=>e.done);if(!done.length)return alert('Mark at least one movement complete before saving.');if(done.length<draft.entries.length&&!confirm('Some movements are not marked complete. Save this as a partial workout?'))return;
 const durationMinutes=Math.max(1,Math.round((Date.now()-draft.startedAt)/60000));
 const sets=done.filter(e=>e.kind==='strength'||e.kind==='reps').map(e=>({exercise:e.name,set:e.round,reps:e.reps??0,weight:e.weight??0,rir:e.rir??null}));
 const activityDetails=done.map(e=>({blockIndex:e.blockIndex,round:e.round,stepIndex:e.stepIndex,name:e.name,method:e.method,kind:e.kind,reps:e.reps,weight:e.weight,rir:e.rir,seconds:e.seconds,distanceMeters:e.distanceMeters,effort:e.effortRating,completed:true}));
 const record={id:uid(),date:TODAY(),name:draft.workoutName,sets,durationMinutes,universalWorkoutId:draft.workoutId,effort:draft.overallEffort,activityDetails,startedAt:new Date(draft.startedAt).toISOString(),finishedAt:new Date().toISOString()};
 const before=[...(db.sessions||[])];db.sessions.push(record);if(save()!==true){db.sessions=before;return alert('Could not save workout. Draft is still available.')}
 clear();close();render();alert('Workout saved: '+done.length+' movement(s), '+durationMinutes+' minute(s).');};
// Surface unfinished workout in Train without touching the existing strength-workout draft.
const previousTrain=train;
train=function(){const html=previousTrain.apply(this,arguments);const saved=getSaved();if(!saved)return html;const row=find(saved.workoutId);if(!row)return html;const button=`<div class="card" id="u354Resume"><h2>Resume AI workout</h2><p class="tiny muted">${escHTML(row.workout.name)} · ${saved.entries?.filter(x=>x.done).length||0} movements complete</p><button class="button" onclick="formUniversalView('${escHTML(row.id)}')">Resume workout</button></div>`;const holder=document.createElement('div');holder.innerHTML=html;const first=holder.querySelector('.card');if(first){first.insertAdjacentHTML('afterend',button)}else holder.insertAdjacentHTML('afterbegin',button);return holder.innerHTML};
})();
