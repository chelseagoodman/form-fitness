// FORM v3.5.7 test: unified original-style workout cards for mixed AI sessions.
// Load last. No Worker or AI changes. No migration of existing records.
(function(){
'use strict';
const DRAFT='form-active-workout-v1', ACTIVITY='form-ai-mixed-draft-v357', PREFIX='form-ai-bridge-';
const previousView=window.formUniversalView, previousEdit=editSession, previousFinish=finishSession, previousTrain=train;
const cp=x=>JSON.parse(JSON.stringify(x));
const safe=x=>esc(String(x??''));
const list=()=>Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
const find=id=>list().find(x=>x&&x.id===id&&x.workout&&Array.isArray(x.workout.blocks));
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{alert('Browser storage is full. Export a backup before continuing.');return false}};
let solo=null;
const nonnegative=(v,max)=>{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=max?n:null};
function parse(workout){
 const resistance=[], map=new Map(), activity=[];
 for(let bi=0;bi<workout.blocks.length;bi++){
  const block=workout.blocks[bi];if(!block||!Array.isArray(block.steps)||!Number.isInteger(block.repeat)||block.repeat<1||block.repeat>12)return null;
  for(let si=0;si<block.steps.length;si++){
   const st=block.steps[si],name=String(st?.name||'').trim();if(!name||name.length>100)return null;
   const method=String(st.method||'').toLowerCase(),title=String(block.title||'').toLowerCase();
   const timed=st.seconds!=null||st.distanceMeters!=null||/hold|stretch|yoga|mobility|cardio|interval|warm.?up|cool.?down|breath|run|row|cycle|walk|hiit|pilates/.test(method+' '+title);
   const reps=Number(st.reps),load=st.loadKg==null?0:Number(st.loadKg);
   if(!timed&&st.reps!=null&&Number.isInteger(reps)&&reps>=1&&reps<=100&&Number.isFinite(load)&&load>=0&&load<=1500){
    const key=name.toLowerCase();if(!map.has(key)){const ex={name,sets:0,reps,style:'straight',supersetGroup:null,formAiTargetWeightKg:load};map.set(key,ex);resistance.push(ex)}
    map.get(key).sets+=block.repeat;if(map.get(key).sets>12)return null;
   }else{
    for(let round=1;round<=block.repeat;round++)activity.push({key:bi+'-'+si+'-'+round,name,block:String(block.title||'Activity'),round,method:String(st.method||''),cues:String(st.cues||''),targetReps:st.reps??null,seconds:st.seconds??null,distanceMeters:st.distanceMeters??null,effort:null,done:false});
   }
  }
 }
 if(resistance.length>30||activity.length>200)return null;
 return {resistance,activity};
}
function activityCard(a,i,mode){
 const kind=a.distanceMeters!=null?'distance':a.seconds!=null?'time':a.targetReps!=null?'reps':'completion';
 const field=kind==='distance'?'Distance (m)':kind==='time'?'Seconds':kind==='reps'?'Reps':'';
 const value=kind==='distance'?a.distanceMeters:kind==='time'?a.seconds:a.targetReps;
 return `<section class="workout-card" style="margin-bottom:16px" data-ai-activity="${i}"><div class="workout-card-heading" style="cursor:default"><span><span class="tiny muted">${safe(a.block)} · ROUND ${a.round}</span><strong>${safe(a.name)}</strong><span class="tiny muted">${safe(a.method)}</span></span></div><p class="tiny muted">${safe(a.cues)}</p><div class="actions" style="align-items:end;gap:10px">${field?`<label style="flex:1;min-width:100px">${field}<input type="number" min="0" step="any" data-ai-field="value" data-ai-index="${i}" value="${value==null?'':safe(value)}"></label>`:''}<label style="flex:1;min-width:95px">Effort (1–10)<input type="number" min="1" max="10" data-ai-field="effort" data-ai-index="${i}" value="${a.effort??''}"></label><label style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><input type="checkbox" style="width:24px;min-height:24px" data-ai-field="done" data-ai-index="${i}" ${a.done?'checked':''}> Done</label></div></section>`;
}
function activeForDraft(){const id=sessionDraft?.formAiWorkoutId||(typeof sessionDraft?.routineId==='string'&&sessionDraft.routineId.startsWith(PREFIX)?sessionDraft.routineId.slice(PREFIX.length):null);const state=read(ACTIVITY);return id&&state?.workoutId===id?state:null}
function renderActivities(state){return `<div id="form-ai-extra"><h3>Mobility, conditioning & timed activities</h3><p class="tiny muted">Same workout, separate activity-specific fields. These entries are saved with your completed session.</p>${state.activities.map((a,i)=>activityCard(a,i)).join('')}</div>`}
function appendActivities(){const state=activeForDraft();if(!state?.activities?.length)return;const root=document.getElementById('modalContent');if(!root)return;const buttons=root.querySelector('.actions:last-child');if(!buttons)return;buttons.insertAdjacentHTML('beforebegin',renderActivities(state))}
editSession=function(){const result=previousEdit.apply(this,arguments);appendActivities();return result};
function prepare(id,item,parts){
 const rid=PREFIX+id;let routine=(db.routines||[]).find(r=>r.id===rid);
 if(!routine){const before=cp(db.routines||[]);routine={id:rid,name:item.workout.name,exercises:cp(parts.resistance),formAiBridge:true,formAiWorkoutId:id,formPlanStatus:'active'};db.routines.push(routine);if(save()!==true){db.routines=before;return false}}
 return rid;
}
window.formUniversalView=function(id){
 const item=find(id);if(!item)return alert('AI workout not found.');const parts=parse(item.workout);if(!parts)return alert('This generated workout has an unsupported structure. Your saved plan was not changed.');
 // Standard strength-only workouts use the existing v3.5.5 bridge without changes.
 if(parts.activity.length===0)return previousView(id);
 const existing=read(ACTIVITY);if(existing&&existing.workoutId!==id){alert('Another AI activity workout is unfinished. Resume or discard that draft before starting a different one.');return}
 const state=existing?.workoutId===id?existing:{workoutId:id,workoutName:item.workout.name,startedAt:Date.now(),activities:parts.activity};
 if(parts.resistance.length){
  const rid=PREFIX+id;
  const existingStrength=read(DRAFT);if(existingStrength&&existingStrength.draft?.routineId!==rid){alert('Another strength workout is unfinished. Resume or finish it before starting this AI workout.');return}
  if(!write(ACTIVITY,state))return;
  if(!prepare(id,item,parts))return;
  if(existingStrength?.draft?.routineId===rid){if(typeof window.formResumeDraft==='function')window.formResumeDraft();return}
  startSession(rid);
  if(sessionDraft?.routineId===rid){sessionDraft.formAiWorkoutId=id;sessionDraft.formAiGenerated=true;const saved=read(DRAFT);if(saved?.draft?.routineId===rid){saved.draft.formAiWorkoutId=id;saved.draft.formAiGenerated=true;write(DRAFT,saved)}appendActivities()}
 }else{if(!write(ACTIVITY,state))return;solo=state;renderSolo()}
};
function renderSolo(){const state=solo||read(ACTIVITY);if(!state)return;solo=state;modal(`<h2>${safe(state.workoutName)}</h2><p class="tiny muted">AI workout · Original FORM-style cards · Your progress is saved as you log.</p>${renderActivities(state)}<div class="actions"><button class="button" onclick="formAiMixedFinishSolo()">Finish & save</button><button class="button secondary" onclick="formAiMixedPauseSolo()">Save & close</button><button class="button danger" onclick="formAiMixedDiscardSolo()">Discard draft</button></div>`)}
function updateActivity(el){const index=Number(el.dataset.aiIndex),field=el.dataset.aiField;const state=activeForDraft()||solo||read(ACTIVITY);if(!state||!Number.isInteger(index)||!state.activities[index])return;const a=state.activities[index];if(field==='done')a.done=el.checked;else if(field==='effort')a.effort=nonnegative(el.value,10);else if(field==='value'){if(a.distanceMeters!=null)a.distanceMeters=nonnegative(el.value,1000000);else if(a.seconds!=null)a.seconds=nonnegative(el.value,86400);else a.targetReps=nonnegative(el.value,1000)}write(ACTIVITY,state);if(solo)solo=state}
document.addEventListener('input',e=>{if(e.target?.matches?.('[data-ai-field]'))updateActivity(e.target)});document.addEventListener('change',e=>{if(e.target?.matches?.('[data-ai-field]'))updateActivity(e.target)});
function activityRecord(state){return state.activities.filter(a=>a.done).map(a=>({name:a.name,block:a.block,round:a.round,method:a.method,reps:a.targetReps,seconds:a.seconds,distanceMeters:a.distanceMeters,effort:a.effort,completed:true}))}
// Extend the existing finish flow; do not save or clear anything unless the original save succeeded.
finishSession=function(){const state=activeForDraft(),before=new Set((db.sessions||[]).map(s=>s.id));const result=previousFinish.apply(this,arguments);if(!state)return result;const record=(db.sessions||[]).find(s=>!before.has(s.id));if(record&&!sessionDraft){record.activityDetails=[...(record.activityDetails||[]),...activityRecord(state)];record.universalWorkoutId=state.workoutId;if(save()===true){localStorage.removeItem(ACTIVITY);solo=null;render()}}return result};
window.formAiMixedFinishSolo=function(){const state=solo||read(ACTIVITY);if(!state)return;const completed=activityRecord(state);if(!completed.length)return alert('Mark at least one activity complete.');if(!confirm('Finish and save this workout?'))return;const minutes=Math.max(1,Math.round((Date.now()-state.startedAt)/60000));const record={id:uid(),date:TODAY(),name:state.workoutName,sets:[],activityDetails:completed,durationMinutes:minutes,universalWorkoutId:state.workoutId};db.sessions.push(record);if(save()!==true){db.sessions.pop();return}localStorage.removeItem(ACTIVITY);solo=null;close();render()};
window.formAiMixedPauseSolo=function(){solo=null;close();render()};
window.formAiMixedDiscardSolo=function(){if(!confirm('Discard this unfinished workout? Completed sessions will remain saved.'))return;localStorage.removeItem(ACTIVITY);solo=null;close();render()};
train=function(){let html=previousTrain.apply(this,arguments);const state=read(ACTIVITY);if(!state)return html;const original=read(DRAFT);if(original?.draft?.formAiWorkoutId===state.workoutId||original?.draft?.routineId===PREFIX+state.workoutId)return html;const root=document.createElement('div');root.innerHTML=html;const resume=document.createElement('div');resume.className='card';resume.innerHTML=`<h2>Unfinished AI activity workout</h2><p class="tiny muted">${safe(state.workoutName)}</p><button class="button" onclick="formUniversalView('${safe(state.workoutId)}')">Resume workout</button>`;root.prepend(resume);return root.innerHTML};
})();
