// FORM v3.5.6 — AI workout finish/resume cleanup. Load AFTER v3.5.5.
// Does not alter workouts, macros, history, or drafts for other workouts.
(function(){
 'use strict';
 const originalKey='form-active-workout-v1';
 const activityKey='form-universal-active-session-v354';
 const prefix='form-ai-bridge-';
 const previousFinish=finishSession;
 const previousTrain=train;
 const safeParse=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 // Only remove a draft when it belongs to the AI workout that was just saved.
 function clearMatchingDrafts(aiId){
   const original=safeParse(originalKey);
   if(original && (original.draft?.formAiWorkoutId===aiId || original.draft?.routineId===prefix+aiId)){
     try{localStorage.removeItem(originalKey)}catch(e){console.warn('Unable to clear completed FORM draft',e)}
   }
   const activity=safeParse(activityKey);
   if(activity?.workoutId===aiId){
     try{localStorage.removeItem(activityKey)}catch(e){console.warn('Unable to clear completed AI draft',e)}
   }
 }
 finishSession=function(){
   const routineId=sessionDraft?.routineId;
   const aiId=sessionDraft?.formAiWorkoutId || (typeof routineId==='string'&&routineId.startsWith(prefix)?routineId.slice(prefix.length):null);
   if(!aiId)return previousFinish.apply(this,arguments);
   const existing=new Set((db.sessions||[]).map(s=>s.id));
   const result=previousFinish.apply(this,arguments);
   const saved=(db.sessions||[]).find(s=>!existing.has(s.id) && (s.universalWorkoutId===aiId || (s.name && typeof s.name==='string')));
   if(saved && !sessionDraft){
     // Attach provenance if a legacy wrapper did not already do so.
     if(saved.universalWorkoutId!==aiId){saved.universalWorkoutId=aiId;saved.formAiOriginalLogger=true;save()}
     clearMatchingDrafts(aiId);
     // Re-render so a stale resume card cannot remain after a completed save.
     if(typeof render==='function')render();
   }
   return result;
 };
 train=function(){
   const html=previousTrain.apply(this,arguments);
   const holder=document.createElement('div');holder.innerHTML=html;
   const panel=holder.querySelector('#v353-active-ai-plan');
   if(panel){
     panel.querySelectorAll('button[data-v353-workout]').forEach(button=>{button.textContent='Start Workout'});
     panel.querySelectorAll('p').forEach(p=>{if(p.textContent.includes('Select View / log to open a session.'))p.textContent=p.textContent.replace('Select View / log to open a session.','Select Start Workout to begin logging.');});
   }
   return holder.innerHTML;
 };
})();
