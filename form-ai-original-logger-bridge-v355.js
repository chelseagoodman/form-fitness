// FORM v3.5.5 test: AI strength workouts use the ORIGINAL workout-ui.js logger.
// Non-strength or mixed timed/distance workouts retain the v3.5.4 activity logger.
// No Worker, Gemini, macros, completed sessions or AI plan data are rewritten.
(function(){
 'use strict';
 const PREFIX='form-ai-bridge-';
 const oldUniversalView=window.formUniversalView;
 const oldFinish=finishSession;
 const oldTrain=train;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const entries=()=>Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
 const bridgeId=id=>PREFIX+id;
 function exerciseList(workout){
  const list=[],map=new Map();
  for(const block of workout.blocks||[]){
   const repeat=Number(block.repeat);
   if(!Number.isInteger(repeat)||repeat<1||repeat>12||!Array.isArray(block.steps))return null;
   for(const step of block.steps){
    const name=String(step.name||'').trim();
    if(!name||name.length>100)return null;
    // Never coerce duration or distance into resistance repetitions.
    if(step.seconds!=null||step.distanceMeters!=null||step.reps==null)return null;
    const reps=Number(step.reps),weight=step.loadKg==null?0:Number(step.loadKg);
    if(!Number.isInteger(reps)||reps<1||reps>100||!Number.isFinite(weight)||weight<0||weight>1500)return null;
    const key=name.toLowerCase();
    if(!map.has(key)){
     const e={name,sets:0,reps,style:'straight',supersetGroup:null,formAiTargetWeightKg:weight};
     map.set(key,e);list.push(e);
    }
    const e=map.get(key);
    // Preserve block repetition count; do not guess supersets from proximity.
    e.sets+=repeat;
    if(e.sets>12)return null;
   }
  }
  return list.length&&list.length<=30?list:null;
 }
 window.formUniversalView=function(id){
  const item=entries().find(x=>x.id===id&&x.workout);
  if(!item)return alert('AI workout not found.');
  const exercises=exerciseList(item.workout);
  if(!exercises){
   // Existing activity logger handles time, distance and mixed workouts.
   if(typeof oldUniversalView==='function')return oldUniversalView(id);
   return alert('This activity requires the timed/distance workout logger.');
  }
  const idForRoutine=bridgeId(id);
  let routine=(db.routines||[]).find(r=>r.id===idForRoutine);
  if(!routine){
   const before=clone(db.routines||[]);
   routine={id:idForRoutine,name:item.workout.name,exercises:clone(exercises),formAiBridge:true,formAiWorkoutId:id,formPlanStatus:'active'};
   db.routines.push(routine);
   if(save()!==true){db.routines=before;return alert('Could not prepare the workout. Your saved data is unchanged.');}
  }
  // The original startSession handles existing drafts, RIR, progressive targets,
  // exercise swaps, pairing, autosave, and the original iPhone card layout.
  startSession(idForRoutine);
  if(sessionDraft&&sessionDraft.routineId===idForRoutine){
   sessionDraft.formAiWorkoutId=id;
   sessionDraft.formAiGenerated=true;
   try{
    const key='form-active-workout-v1';
    const previous=JSON.parse(localStorage.getItem(key)||'null');
    if(previous&&previous.draft?.routineId===idForRoutine){previous.draft.formAiWorkoutId=id;previous.draft.formAiGenerated=true;localStorage.setItem(key,JSON.stringify(previous));}
   }catch(e){console.warn('AI workout draft metadata could not be updated',e)}
  }
 };
 // Attach the AI workout identifier to completed original-logger sessions.
 // Do not remove the bridge routine: keeping it preserves resume, swaps and history.
 finishSession=function(){
  const beforeId=sessionDraft?.routineId;
  const aiId=sessionDraft?.formAiWorkoutId||(typeof beforeId==='string'&&beforeId.startsWith(PREFIX)?beforeId.slice(PREFIX.length):null);
  const prior=new Set((db.sessions||[]).map(s=>s.id));
  oldFinish.apply(this,arguments);
  if(!aiId||sessionDraft)return; // cancelled or save failed
  const recorded=(db.sessions||[]).find(s=>!prior.has(s.id));
  if(recorded){recorded.universalWorkoutId=aiId;recorded.formAiOriginalLogger=true;save();}
 };
 // Hide internal bridge routines from the normal manual-routine cards.
 train=function(){
  const html=oldTrain.apply(this,arguments);
  const root=document.createElement('div');root.innerHTML=html;
  for(const button of root.querySelectorAll('button[onclick]')){
   const action=button.getAttribute('onclick')||'';
   if(action.includes("startSession('"+PREFIX)){
    const card=button.closest('.card');
    if(card&&card.querySelector('h3'))card.remove();
   }
  }
  return root.innerHTML;
 };
})();
