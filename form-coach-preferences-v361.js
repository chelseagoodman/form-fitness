// FORM v3.6.1 — adaptive coaching preferences. Test branch only.
// Load AFTER v3.6.0. Local-first, no automatic sharing with Gemini.
(function(){
'use strict';
const PREFIX='form-ai-bridge-';
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=x=>esc(String(x??''));
const record=()=>{if(!db.formCoachPreferences||typeof db.formCoachPreferences!=='object')db.formCoachPreferences={confirmed:[],events:[],lastHistoryId:null};return db.formCoachPreferences};
function remember(action,name,context){
 if(!name)return;
 const store=record(),key=action+'|'+name.toLowerCase().trim()+'|'+(context||'');
 store.events.push({id:uid(),at:new Date().toISOString(),action,name:String(name).slice(0,90),context:String(context||'').slice(0,80),key});
 store.events=store.events.slice(-150);
 save();
}
function currentAI(){const id=sessionDraft?.formAiWorkoutId||(typeof sessionDraft?.routineId==='string'&&sessionDraft.routineId.startsWith(PREFIX)?sessionDraft.routineId.slice(PREFIX.length):null);return id?{id,row:(db.universalWorkouts||[]).find(x=>x.id===id)}:null}
// Observe the existing v3.5.9 permanent-add operation; do not interfere with its save logic.
const oldAdd=window.formConfirmAddedExercise;
if(typeof oldAdd==='function')window.formConfirmAddedExercise=function(){
 const ai=currentAI(),name=String(document.getElementById('newWorkoutExercise')?.value||'').trim();
 const checked=!!document.getElementById('v359SaveFuture')?.checked;
 const before=ai?.row?.workout?.blocks?.length||0;
 const result=oldAdd.apply(this,arguments);
 if(ai&&checked&&(ai.row?.workout?.blocks?.length||0)>before)remember('added',name,ai.row.workout.name);
 return result;
};
// The v3.6.0 removal button already owns confirmation, storage and rollback.
// Observe only successfully committed removals, without adding another click handler.
const root=document.getElementById('modalContent');
if(root)root.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-v360-remove]');if(!btn)return;
 const ai=currentAI(),state=(()=>{try{return JSON.parse(localStorage.getItem('form-ai-mixed-draft-v357')||'null')}catch{return null}})();
 const item=state?.activities?.[Number(btn.dataset.v360Remove)];
 const before=ai?.row?.workout?.blocks?.reduce((n,b)=>n+(b.steps||[]).length,0);
 if(!ai||!item)return;
 setTimeout(()=>{const after=ai.row?.workout?.blocks?.reduce((n,b)=>n+(b.steps||[]).length,0);if(Number.isFinite(before)&&after===before-1)remember('removed-warmup',item.name,ai.row.workout.name)},0);
});
const oldSwap=window.formSwapApply;
if(typeof oldSwap==='function')window.formSwapApply=function(index,replacement,custom){
 const ai=currentAI(),permanent=!!document.getElementById('formSwapPermanent')?.checked;
 const routine=ai&&(db.routines||[]).find(x=>x.id===PREFIX+ai.id);
 const oldName=ai&&sessionDraft?.sets?.filter(x=>x.exercise)?.map(x=>x.exercise).filter((x,i,a)=>a.indexOf(x)===i)[index];
 const before=clone(routine?.exercises||[]);
 const result=oldSwap.apply(this,arguments);
 if(ai&&permanent&&oldName&&JSON.stringify(before)!==JSON.stringify(routine?.exercises||[])){
  // Mirror the existing permanent swap into the AI workout so it survives plan reload.
  const original=clone(ai.row.workout),history=clone(db.coachPlanHistory||[]);
  let count=0;
  for(const b of ai.row.workout.blocks||[])for(const step of b.steps||[])if(step.name===oldName){step.name=replacement;count++}
  if(count&&save()===true)remember('swapped',oldName+' → '+replacement,ai.row.workout.name);
  else if(count){ai.row.workout=original;db.coachPlanHistory=history;save();alert('The AI workout could not save the permanent swap. Export a backup before continuing.');}
 }
 return result;
};
function counts(){const map=new Map();for(const e of record().events){const key=e.key;const row=map.get(key)||{action:e.action,name:e.name,context:e.context,count:0};row.count++;map.set(key,row)}return [...map.values()].filter(x=>x.count>=2).sort((a,b)=>b.count-a.count)}
function setPreference(name,choice,context){const store=record(),key=name.toLowerCase().trim();store.confirmed=store.confirmed.filter(x=>x.key!==key);if(choice!=='none')store.confirmed.push({key,name,choice,context:context||'',updatedAt:new Date().toISOString()});if(!save())return alert('Could not save preference.');formCoachPreferenceOpen()}
window.formCoachPreferenceSet=setPreference;
window.formCoachPreferenceOpen=function(){const store=record();const rootId='formCoachPrefRoot';modal('<h2>Training preferences</h2><p class="tiny muted">Saved locally. Patterns are suggestions, not assumptions. No preferences are sent to Gemini automatically.</p><div id="'+rootId+'"></div>');const host=document.getElementById(rootId);
 const section=(title)=>{const h=document.createElement('h3');h.textContent=title;host.append(h)};
 section('Confirmed preferences');if(!store.confirmed.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='No confirmed preferences yet.';host.append(p)}
 for(const x of store.confirmed){const row=document.createElement('div');row.className='item';const title=document.createElement('b');title.textContent=x.name+' — '+x.choice;row.append(title);const remove=document.createElement('button');remove.className='button secondary small';remove.textContent='Clear preference';remove.onclick=()=>setPreference(x.name,'none',x.context);row.append(remove);host.append(row)}
 section('Patterns to review');const patterns=counts().filter(x=>!store.confirmed.some(p=>p.key===x.name.toLowerCase()));if(!patterns.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='No repeated changes yet. Permanent additions, swaps and warm-up removals will appear here.';host.append(p)}
 for(const x of patterns){const row=document.createElement('div');row.className='item';const label=document.createElement('p');label.textContent=x.name+' — '+x.count+' '+x.action+' changes'+(x.context?' ('+x.context+')':'');row.append(label);for(const [choice,text] of [['prefer','Prefer'],['avoid','Avoid'],['none','No preference']]){const b=document.createElement('button');b.className='button secondary small';b.textContent=text;b.onclick=()=>setPreference(x.name,choice,x.context);row.append(b)}host.append(row)}
 section('Add a preference');const name=document.createElement('input');name.placeholder='Exercise or activity';name.maxLength=90;host.append(name);const choice=document.createElement('select');for(const v of ['prefer','avoid']){const o=document.createElement('option');o.value=v;o.textContent=v==='prefer'?'Prefer':'Avoid';choice.append(o)}host.append(choice);const add=document.createElement('button');add.className='button';add.textContent='Save preference';add.onclick=()=>{if(name.value.trim())setPreference(name.value.trim(),choice.value,'')};host.append(add);
 const clear=document.createElement('button');clear.className='button secondary';clear.textContent='Clear observed change history';clear.onclick=()=>{if(!confirm('Clear observed changes? Confirmed preferences and workout history will remain.'))return;store.events=[];if(save())formCoachPreferenceOpen()};host.append(clear);
};
function summary(){const confirmed=record().confirmed.slice(0,25);return confirmed.map(x=>(x.choice==='avoid'?'Avoid ':'Prefer ')+x.name+(x.context?' when relevant to '+x.context:'')).join('; ')}
// User controls whether preferences enter the goal text. Existing preview and consent flow remains authoritative.
const oldPlanOpen=window.formUnifiedPlanOpen;
if(typeof oldPlanOpen==='function')window.formUnifiedPlanOpen=function(){const out=oldPlanOpen.apply(this,arguments);const goal=document.getElementById('upGoal');if(!goal)return out;const notes=summary();if(!notes)return out;const b=document.createElement('button');b.type='button';b.className='button secondary small';b.textContent='Include my confirmed training preferences';b.onclick=()=>{const extra='\nTraining preferences: '+notes; if(goal.value.length+extra.length>1200)return alert('Goal text is too long to include preferences. Shorten it first.');goal.value+=extra;goal.dispatchEvent(new Event('input',{bubbles:true}));b.disabled=true;b.textContent='Preferences included — review data preview';};goal.after(b);return out};
// Add a single preference-management entry under Coach, not Train.
const oldCoach=coach;
coach=function(){return oldCoach.apply(this,arguments)+`<div class="card"><h2>Training Preferences</h2><p class="tiny muted">Review what FORM has learned from your workout changes and choose what Gemini may consider.</p><button class="button secondary" onclick="formCoachPreferenceOpen()">Manage preferences</button></div>`};
})();
