// FORM v3.6.0 test — permanent warm-up removal and mixed draft discard fix.
// Load after form-ai-permanent-add-v359.js. No AI Worker changes.
(function(){
'use strict';
const PREFIX='form-ai-bridge-', MIXED='form-ai-mixed-draft-v357', ORIGINAL='form-active-workout-v1', ACTIVITY='form-universal-active-session-v354';
const clone=x=>JSON.parse(JSON.stringify(x));
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const aiId=()=>sessionDraft?.formAiWorkoutId||(typeof sessionDraft?.routineId==='string'&&sessionDraft.routineId.startsWith(PREFIX)?sessionDraft.routineId.slice(PREFIX.length):null);
const warm=a=>/warm.?up|activation|preparation|prep|mobility warm/i.test(String(a?.block||''));
const root=document.getElementById('modalContent');
if(!root)return;
let decorating=false;
function decorate(){
 if(decorating)return;
 const id=aiId(),state=read(MIXED);
 if(!id||state?.workoutId!==id||!Array.isArray(state.activities))return;
 decorating=true;
 try{
  for(const card of root.querySelectorAll('[data-ai-activity]')){
   const index=Number(card.getAttribute('data-ai-activity'));
   const item=state.activities[index];
   if(!item||!warm(item)||card.querySelector('[data-v360-remove]'))continue;
   const actions=card.querySelector('.actions')||card;
   const button=document.createElement('button');
   button.type='button';button.className='button secondary small';
   button.textContent='Remove warm-up permanently';
   button.dataset.v360Remove=String(index);
   actions.append(button);
  }
 }finally{decorating=false}
}
const observer=new MutationObserver(decorate);
observer.observe(root,{childList:true,subtree:true});
decorate();
root.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-v360-remove]');if(!button)return;
 e.preventDefault();
 const index=Number(button.dataset.v360Remove),id=aiId(),state=read(MIXED);
 const row=(db.universalWorkouts||[]).find(x=>x.id===id&&x.workout&&Array.isArray(x.workout.blocks));
 const activity=state?.workoutId===id?state.activities?.[index]:null;
 if(!row||!activity||!warm(activity))return alert('Warm-up could not be found. Reopen the workout and try again.');
 if(!confirm('Remove "'+activity.name+'" from this workout now AND from future sessions? Completed workout history will remain unchanged.'))return;
 const match=/^(\d+)-(\d+)-(\d+)$/.exec(String(activity.key||''));
 if(!match)return alert('This activity cannot be safely matched to the saved plan. No changes made.');
 const bi=Number(match[1]),si=Number(match[2]);
 const block=row.workout.blocks[bi],step=block?.steps?.[si];
 if(!step||String(step.name||'')!==String(activity.name||''))return alert('Saved plan no longer matches this activity. No changes made.');
 const beforeWorkout=clone(row.workout),beforeHistory=clone(db.coachPlanHistory||[]),beforeState=clone(state);
 // Remove the movement from the saved workout, across all its repeated rounds.
 block.steps.splice(si,1);
 if(block.steps.length===0)row.workout.blocks.splice(bi,1);
 if(row.workout.blocks.length===0){row.workout=beforeWorkout;return alert('Cannot remove the last movement from a workout.');}
 db.coachPlanHistory=db.coachPlanHistory||[];
 db.coachPlanHistory.push({id:'manual-edit-'+uid(),date:new Date().toISOString(),kind:'manual-ai-workout-edit',workoutId:id,description:'Removed warm-up '+activity.name+' from saved AI workout'});
 if(save()!==true){row.workout=beforeWorkout;db.coachPlanHistory=beforeHistory;return alert('Could not save the permanent change. No changes applied.');}
 state.activities=state.activities.filter(a=>{
  const m=/^(\d+)-(\d+)-(\d+)$/.exec(String(a.key||''));
  return !(m&&Number(m[1])===bi&&Number(m[2])===si);
 });
 try{localStorage.setItem(MIXED,JSON.stringify(state))}catch{
  row.workout=beforeWorkout;db.coachPlanHistory=beforeHistory;save();
  try{localStorage.setItem(MIXED,JSON.stringify(beforeState))}catch{}
  return alert('Could not update the active workout draft. Permanent change reverted.');
 }
 // Re-render the original logger; the v3.5.8 activity layout hook redraws remaining cards.
 if(typeof editSession==='function')editSession();
});
const previousDiscard=window.formDiscardDraft;
window.formDiscardDraft=function(){
 const id=aiId(),state=read(MIXED);
 const result=previousDiscard?.apply(this,arguments);
 // The original handler asks for confirmation. Only clear matching activity drafts
 // once its original strength draft is actually gone.
 if(id&&state?.workoutId===id&&!sessionDraft&&!read(ORIGINAL)){
  try{localStorage.removeItem(MIXED)}catch(e){console.warn('Could not clear mixed workout draft',e)}
  const old=read(ACTIVITY);
  if(old?.workoutId===id)try{localStorage.removeItem(ACTIVITY)}catch(e){console.warn('Could not clear legacy AI draft',e)}
  if(typeof render==='function')render();
 }
 return result;
};
})();
