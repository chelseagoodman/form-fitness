// FORM v3.5.9 — Save newly added exercises to AI routines (test branch only).
// Load after v3.5.8. Uses the existing iPhone workout logger; no new UI framework.
(function(){
 'use strict';
 const PREFIX='form-ai-bridge-';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const originalOpen=window.formAddDuringWorkout;
 const originalConfirm=window.formConfirmAddedExercise;
 if(typeof originalOpen!=='function'||typeof originalConfirm!=='function')return;
 function currentAI(){
  const id=sessionDraft?.formAiWorkoutId||(typeof sessionDraft?.routineId==='string'&&sessionDraft.routineId.startsWith(PREFIX)?sessionDraft.routineId.slice(PREFIX.length):null);
  if(!id)return null;
  const row=(db.universalWorkouts||[]).find(x=>x.id===id&&x.workout&&Array.isArray(x.workout.blocks));
  const routine=(db.routines||[]).find(x=>x.id===PREFIX+id);
  return row&&routine?{id,row,routine}:null;
 }
 window.formAddDuringWorkout=function(){
  const result=originalOpen.apply(this,arguments);
  if(!currentAI())return result;
  const actions=document.querySelector('#modalContent .actions');
  if(!actions||document.getElementById('v359SaveFuture'))return result;
  const label=document.createElement('label');
  label.style.cssText='display:flex;align-items:center;gap:10px;margin:14px 0';
  const check=document.createElement('input');check.type='checkbox';check.id='v359SaveFuture';check.style.cssText='width:auto;min-height:22px';
  label.append(check,document.createTextNode(' Save to this AI workout for future sessions'));
  const note=document.createElement('p');note.className='tiny muted';note.textContent='Unchecked: add only to today\'s session. Checked: also update the saved AI workout.';
  actions.before(label,note);
  return result;
 };
 window.formConfirmAddedExercise=function(){
  const ai=currentAI();
  const permanent=!!document.getElementById('v359SaveFuture')?.checked;
  if(!ai||!permanent)return originalConfirm.apply(this,arguments);
  const name=String(document.getElementById('newWorkoutExercise')?.value||'').trim();
  const sets=Number(document.getElementById('newWorkoutSets')?.value);
  const reps=Number(document.getElementById('newWorkoutReps')?.value);
  if(!name||name.length>90||!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(reps)||reps<1||reps>100)return alert('Enter a name (up to 90 characters), 1–12 sets and 1–100 reps.');
  if((sessionDraft?.sets||[]).some(x=>String(x.exercise).toLowerCase()===name.toLowerCase()))return alert('That exercise is already in this workout.');
  if((ai.row.workout.blocks||[]).some(b=>(b.steps||[]).some(x=>String(x.name||'').toLowerCase()===name.toLowerCase())))return alert('This exercise already exists in the saved AI workout.');
  const beforeRoutine=clone(ai.routine.exercises),beforeWorkout=clone(ai.row.workout),beforeHistory=clone(db.coachPlanHistory||[]);
  // The original handler adds the exercise to today's draft using the familiar logger.
  const result=originalConfirm.apply(this,arguments);
  if(!(sessionDraft?.sets||[]).some(x=>x.exercise===name))return result;
  // A dedicated block makes this addition unambiguous to the AI-workout parser.
  const block={title:'Manually added exercises',repeat:sets,steps:[{name,method:'resistance',seconds:null,reps,distanceMeters:null,loadKg:null,effort:'User-added',cues:'Added manually in Train.'}]};
  ai.row.workout.blocks.push(block);
  if(!(ai.routine.exercises||[]).some(x=>x.name.toLowerCase()===name.toLowerCase()))ai.routine.exercises.push({name,sets,reps,style:'straight',supersetGroup:null});
  db.coachPlanHistory=db.coachPlanHistory||[];
  db.coachPlanHistory.push({id:'manual-edit-'+uid(),date:new Date().toISOString(),kind:'manual-ai-workout-edit',workoutId:ai.id,description:'Added '+name+' ('+sets+' x '+reps+') to saved AI workout'});
  if(save()!==true){ai.routine.exercises=beforeRoutine;ai.row.workout=beforeWorkout;db.coachPlanHistory=beforeHistory;alert('Exercise added to this session only. Saving the permanent change failed. Export a backup and check storage.');}
  else alert(name+' was saved to this AI workout for future sessions.');
  return result;
 };
})();
