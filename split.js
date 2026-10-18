// FORM 1.3: user-requested 5-day split; additive to the existing v1.2 generator.
// Routine exercises remain compatible with the original {name,sets,reps} schema.
const FORM_FIVE_DAY_SPLIT = [
 {name:'Day 1 · Chest / Shoulders / Triceps',groups:[
  ['Chest Supported Press','Dumbbell Bench Press','Push-up'],['DB Shoulder Press','Dumbbell Shoulder Press','Pike Push-up'],
  ['Chest Fly Machine','Dumbbell Chest Fly','Push-up'],['Lateral Raise','Dumbbell Lateral Raise','Wall Slide'],
  ['Tricep Rope Pulldown','Dumbbell Triceps Extension','Close Grip Push-up'],['Cable Chest Fly','Dumbbell Chest Fly','Push-up']]},
 {name:'Day 2 · Back / Biceps',groups:[
  ['Lat Pulldown (Close Grip)','Dumbbell Row','Inverted Row'],['Chest Supported Cable Row','Dumbbell Row','Inverted Row'],
  ['Seated Cable Row','One Arm Dumbbell Row','Prone Y Raise'],['Face Pulls','Rear Delt Dumbbell Fly','Reverse Snow Angel'],
  ['Bicep Curls','Dumbbell Bicep Curls','Towel Curl'],['Hammer Curl','Dumbbell Hammer Curl','Towel Curl']]},
 {name:'Day 3 · Glutes / Hamstrings',groups:[
  ['DB RDL','DB RDL','Single Leg Hip Hinge'],['Hip Thrust','Dumbbell Hip Thrust','Glute Bridge'],
  ['Leg Curl','Dumbbell Leg Curl','Sliding Hamstring Curl'],['Bulgarian Split Squat','Dumbbell Split Squat','Split Squat'],
  ['Hip Abduction Machine','Side Lying Hip Abduction','Side Lying Hip Abduction'],['Glute Kickback','Donkey Kick','Donkey Kick']]},
 {name:'Day 4 · Quads / Calves',groups:[
  ['Front Squats','Dumbbell Goblet Squat','Bodyweight Squat'],['Leg Press','Dumbbell Reverse Lunge','Reverse Lunge'],
  ['Leg Extension','Heel Elevated Goblet Squat','Wall Sit'],['Close Stance Hack Squat','Dumbbell Step Up','Step Up'],
  ['DB Calf Raise','DB Calf Raise','Calf Raise'],['Sissy Squat','Bodyweight Sissy Squat','Wall Sit']]},
 {name:'Day 5 · Full Body (lighter)',groups:[
  ['Bench Press','Dumbbell Bench Press','Push-up'],['Lat Pulldown (Close Grip)','Dumbbell Row','Inverted Row'],
  ['Leg Press','Goblet Squat','Bodyweight Squat'],['DB RDL','DB RDL','Single Leg Hip Hinge'],
  ['Lateral Raise','Dumbbell Lateral Raise','Wall Slide'],['Bicep Curls','Dumbbell Bicep Curls','Towel Curl'],
  ['Tricep Rope Pulldown','Dumbbell Triceps Extension','Close Grip Push-up'],['DB Calf Raise','DB Calf Raise','Calf Raise']]}
];
const formMakePlanOriginal = formMakePlan;
formMakePlan = function(p){
 if(Number(p.days)!==5)return formMakePlanOriginal(p);
 const exclusions=p.exclude.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 const idx=p.equipment==='bodyweight'?2:(p.equipment==='dumbbell'||p.environment==='home')?1:0;
 const limit=p.duration<=30?3:p.duration<=45?4:p.duration<=60?6:8;
 const baseSets=p.level==='beginner'?2:p.level==='advanced'?4:3;
 const baseReps=p.goal==='strength'?6:p.goal==='fitness'?12:10;
 return FORM_FIVE_DAY_SPLIT.map((day,di)=>{
  const exercises=day.groups.map((variants,i)=>{
   const name=[variants[idx],...variants].find(v=>!exclusions.some(e=>v.toLowerCase().includes(e)));
   if(!name)return null;
   const accessory=i>=2 || (di===4 && i>=4);
   return {name,sets:di===4?2:(accessory?Math.min(baseSets,3):baseSets),reps:di===4?12:(accessory?12:baseReps),style:accessory?'superset':'straight',supersetGroup:accessory?'S'+(Math.floor((i-2)/2)+1):null};
  }).filter(Boolean).slice(0,limit);
  return {id:uid(),name:day.name,exercises};
 });
};
const formPreviewPlanOriginal=formPreviewPlan;
formPreviewPlan=function(){
 if(Number($('fgDays').value)!==5){formPreviewPlanOriginal();return;}
 const p=formPlanSettings(),routines=formMakePlan(p);
 if(routines.some(r=>!r.exercises.length)){alert('All exercises were excluded. Remove some exclusions.');return;}
 formPendingPlan={p,routines};
 $('modalContent').innerHTML=`<h2>Your five-day split</h2><p class="muted tiny">Heavy compound exercises use straight sets. Accessory pairs are suggested supersets. Adjust exercises, weights and rest to suit your recovery. Day 5 is deliberately lighter.</p>${routines.map(r=>`<div class="item"><b>${esc(r.name)}</b>${r.exercises.map(e=>`<div class="tiny muted" style="margin-top:6px">${esc(e.name)} · ${e.sets} × ${e.reps} · ${e.style==='superset'?'Superset '+esc(e.supersetGroup):'Straight sets'}</div>`).join('')}</div>`).join('')}<div class="notice">Suggested rest: 2–3 minutes after heavy compound sets; 60–90 seconds after an accessory superset pair. The fifth day should not be maximal-effort. Superset labels are planning notes; FORM still logs exercises individually.</div><div class="actions"><button class="button" onclick="formInstallPlan()">Add these routines</button><button class="button secondary" onclick="formGenerator()">Change settings</button></div>`;
};
const formGeneratorOriginal=formGenerator;
formGenerator=function(){formGeneratorOriginal();const h=$('modalContent');if(h)h.insertAdjacentHTML('afterbegin','<div class="notice">Your preferred five-day split: Push · Pull · Glutes/Hamstrings · Quads/Calves · Full Body. Compounds first, then accessory supersets.</div>')};
