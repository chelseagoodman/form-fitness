// FORM v3.9.1: cardio-aware library and workout logging.
// Keeps cardio metrics separate from strength sets and preserves existing records.
(function(){
'use strict';
const META='form-v21-exercise-meta';
const DRAFT='form-active-workout-v1';
const ACTIVITY='form-ai-mixed-draft-v357';
const norm=s=>String(s||'').trim().toLowerCase();
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}};
const safe=s=>esc(String(s??''));
const cardioWords=/\b(cardio|aerobic|run|running|jog|jogging|sprint|cycle|cycling|bike|biking|row|rowing|swim|swimming|walk|walking|hike|treadmill|elliptical|cross trainer|stair|skipping|jump rope|ski erg|assault bike|spin|zumba|endurance)\b/i;
function meta(){return read(META,{})}
function isCardio(name,explicit){
 if(explicit==='cardio')return true;
 if(explicit==='strength')return false;
 const entry=meta()[norm(name)];
 if(entry?.type==='cardio')return true;
 if(entry?.type==='strength')return false;
 return cardioWords.test(String(name||''));
}
function setIsCardio(set){return set?.activityType==='cardio'||(set?.activityType!=='strength'&&isCardio(set?.exercise))}
function saveType(name,type){
 const data=meta(),key=norm(name);
 if(!key)return;
 data[key]={...(data[key]||{}),type};
 localStorage.setItem(META,JSON.stringify(data));
}
function addTypeControl(container,id,type){
 if(!container||container.querySelector('#'+id))return;
 const label=document.createElement('label');label.textContent='Exercise type';
 const select=document.createElement('select');select.id=id;
 for(const [value,text] of [['strength','Strength'],['cardio','Cardio']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
 select.value=type||'strength';label.append(select);
 const actions=container.querySelector('.actions');
 if(actions)container.insertBefore(label,actions);else container.append(label);
}

// Let exercises in the personal library declare which workout logger they use.
const oldLibraryEdit=window.formV22Edit;
if(typeof oldLibraryEdit==='function')window.formV22Edit=function(encoded){
 const result=oldLibraryEdit.apply(this,arguments);
 const name=decodeURIComponent(String(encoded||''));
 const container=document.getElementById('modalContent');
 addTypeControl(container,'v391ExerciseType',isCardio(name,meta()[norm(name)]?.type)?'cardio':'strength');
 return result;
};
const oldLibrarySave=window.formV22Save;
if(typeof oldLibrarySave==='function')window.formV22Save=function(encoded){
 const name=decodeURIComponent(String(encoded||''));
 const type=document.getElementById('v391ExerciseType')?.value||'strength';
 const result=oldLibrarySave.apply(this,arguments);
 try{saveType(name,type)}catch(e){console.warn('Could not save exercise type',e)}
 return result;
};
const oldCustomNew=window.form14New;
if(typeof oldCustomNew==='function')window.form14New=function(){
 const result=oldCustomNew.apply(this,arguments);
 addTypeControl(document.getElementById('modalContent'),'v391ExerciseType','strength');
 return result;
};
const oldCustomSave=window.form14SaveCustom;
if(typeof oldCustomSave==='function')window.form14SaveCustom=function(){
 const name=document.getElementById('f14name')?.value?.trim()||'';
 const type=document.getElementById('v391ExerciseType')?.value||'strength';
 const result=oldCustomSave.apply(this,arguments);
 if(name)try{saveType(name,type)}catch(e){console.warn('Could not save exercise type',e)}
 return result;
};

function persistDraft(){
 try{const stored=read(DRAFT,{});stored.draft=sessionDraft;localStorage.setItem(DRAFT,JSON.stringify(stored));return true}
 catch{alert('Could not save this workout. Export a backup and check browser storage.');return false}
}
function decorateStrengthCards(){
 if(!sessionDraft||!document.getElementById('modal')?.open)return;
 const root=document.getElementById('modalContent');if(!root)return;
 let tagged=false;
 for(const set of sessionDraft.sets){if(isCardio(set.exercise,set.activityType)&&set.activityType!=='cardio'){set.activityType='cardio';tagged=true}}
 if(tagged)persistDraft();
 const cards=[...root.querySelectorAll(':scope > .workout-card')];
 for(const card of cards){
  const heading=card.querySelector(':scope > .workout-card-heading');
  const title=heading?.querySelector('strong')?.textContent?.replace(/^\d+\.\s*/,'').trim();
  if(!title)continue;
  const indices=sessionDraft.sets.map((s,i)=>s.exercise===title&&setIsCardio(s)?i:-1).filter(i=>i>=0);
  if(!indices.length||card.dataset.v391Cardio==='1')continue;
  // Supersets have a combined heading, so retain their standard controls.
  if(heading.textContent.includes(' + '))continue;
  card.dataset.v391Cardio='1';
  const labels=heading.querySelectorAll('.tiny.muted');
  if(labels[0])labels[0].textContent='CARDIO';
  if(labels[1])labels[1].textContent=indices.length+' interval'+(indices.length===1?'':'s')+' · Log duration and distance';
  card.querySelectorAll('.workout-set-head,.workout-set-grid:not(.workout-set-head),.form-set-rir').forEach(el=>el.style.display='none');
  const oldRest=[...card.children].find(el=>el.tagName==='P');if(oldRest)oldRest.style.display='none';
  const panel=document.createElement('div');panel.className='form-cardio-logger-v391';
  panel.style.cssText='display:grid;gap:10px;margin:12px 0';
  indices.forEach((index,n)=>{
   const set=sessionDraft.sets[index];
   const existingRows=card.querySelectorAll('.workout-set-grid:not(.workout-set-head)');
   const isDone=!!existingRows[n]?.querySelector('input[type="checkbox"]')?.checked;
   const row=document.createElement('section');row.className='item';row.style.cssText='padding:12px;border:1px solid #405447;border-radius:12px';
   row.innerHTML=`<b>Interval ${n+1}</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px"><label>Duration (min)<input type="number" min="0" max="480" step="0.1" value="${set.durationMinutes??''}" oninput="formV391SetValue(${index},'durationMinutes',this.value)"></label><label>Distance (km)<input type="number" min="0" max="1000" step="0.01" value="${set.distanceKm??''}" oninput="formV391SetValue(${index},'distanceKm',this.value)"></label><label>Effort (1–10)<input type="number" min="1" max="10" step="1" value="${set.effortRating??''}" oninput="formV391SetValue(${index},'effortRating',this.value)"></label><label style="display:flex;align-items:center;gap:8px;margin-top:22px"><input type="checkbox" style="width:22px;min-height:22px" ${isDone?'checked':''} onchange="formDraftDone(${index},this.checked)"> Done</label></div>`;
   panel.append(row);
  });
  const anchor=card.querySelector('.actions');
  if(anchor)anchor.after(panel);else heading.after(panel);
 }
}
window.formV391SetValue=function(index,field,value){
 const set=sessionDraft?.sets?.[index];
 if(!set||!['durationMinutes','distanceKm','effortRating'].includes(field))return;
 if(value==='')set[field]=null;
 else{const n=Number(value),max=field==='effortRating'?10:1000;if(!Number.isFinite(n)||n<0||n>max)return;set[field]=n}
 persistDraft();
};

// Tag routine sets using the library type. Existing saved data remains untouched.
const oldStart=window.startSession;
if(typeof oldStart==='function')window.startSession=function(){
 const result=oldStart.apply(this,arguments);
 if(sessionDraft?.sets){
  let changed=false;
  for(const set of sessionDraft.sets){if(isCardio(set.exercise,set.activityType)&&set.activityType!=='cardio'){set.activityType='cardio';changed=true}}
  if(changed){persistDraft();if(typeof window.editSession==='function')window.editSession()}
 }
 return result;
};

// Reapply the cardio layout after the existing workout renderer redraws.
const modalRoot=document.getElementById('modalContent');
if(modalRoot){
 const observer=new MutationObserver(()=>decorateStrengthCards());
 observer.observe(modalRoot,{childList:true,subtree:true});
}
const oldEdit=window.editSession;
if(typeof oldEdit==='function')window.editSession=function(){const result=oldEdit.apply(this,arguments);decorateStrengthCards();return result};
const oldToggle=window.formToggleCard;
if(typeof oldToggle==='function')window.formToggleCard=function(){const result=oldToggle.apply(this,arguments);decorateStrengthCards();return result};

// AI activities already save seconds and metres; expose both for cardio movements.
function isCardioActivity(a){return !!a&&(a.cardio===true||cardioWords.test([a.name,a.block,a.method,a.cues].join(' ')))}
function decorateAiCards(){
 const root=document.getElementById('modalContent');if(!root)return;
 const state=read(ACTIVITY,null);if(!state?.activities)return;
 for(const card of root.querySelectorAll('[data-ai-activity]')){
  if(card.dataset.v391Cardio==='1')continue;
  const index=Number(card.dataset.aiActivity),a=state.activities[index];if(!isCardioActivity(a))continue;
  const actions=card.querySelector('.actions');if(!actions)continue;
  const previous=actions.querySelector('[data-ai-field="value"]')?.closest('label');
  if(previous)previous.remove();
  const fields=document.createElement('div');fields.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%';
  const duration=document.createElement('label');duration.textContent='Duration (min)';
  const durationInput=document.createElement('input');durationInput.type='number';durationInput.min='0';durationInput.max='480';durationInput.step='0.1';durationInput.value=a.seconds==null?'':String(Math.round(Number(a.seconds)/6)/10);durationInput.dataset.v391Activity=String(index);durationInput.dataset.v391Field='duration';duration.append(durationInput);
  const distance=document.createElement('label');distance.textContent='Distance (km)';
  const distanceInput=document.createElement('input');distanceInput.type='number';distanceInput.min='0';distanceInput.max='1000';distanceInput.step='0.01';distanceInput.value=a.distanceMeters==null?'':String(Math.round(Number(a.distanceMeters)/10)/100);distanceInput.dataset.v391Activity=String(index);distanceInput.dataset.v391Field='distance';distance.append(distanceInput);
  fields.append(duration,distance);
  const effort=actions.querySelector('[data-ai-field="effort"]')?.closest('label');
  if(effort)effort.before(fields);else actions.prepend(fields);
  card.dataset.v391Cardio='1';
 }
}
function updateAiCardio(input){
 const index=Number(input.dataset.v391Activity),field=input.dataset.v391Field,state=read(ACTIVITY,null);
 const a=state?.activities?.[index];if(!a)return;
 if(input.value===''){if(field==='duration')a.seconds=null;else a.distanceMeters=null}
 else{
  const n=Number(input.value);if(!Number.isFinite(n)||n<0)return;
  if(field==='duration'&&n<=480)a.seconds=Math.round(n*60);
  if(field==='distance'&&n<=1000)a.distanceMeters=Math.round(n*1000);
 }
 try{localStorage.setItem(ACTIVITY,JSON.stringify(state))}catch{alert('Could not save cardio details. Check browser storage.')}
}
document.addEventListener('input',event=>{if(event.target?.matches?.('[data-v391-activity]'))updateAiCardio(event.target)});
document.addEventListener('change',event=>{if(event.target?.matches?.('[data-v391-activity]'))updateAiCardio(event.target)});
if(modalRoot){
 const aiObserver=new MutationObserver(()=>decorateAiCards());
 aiObserver.observe(modalRoot,{childList:true,subtree:true});
}
decorateAiCards();decorateStrengthCards();

// Show cardio metrics in saved workout history instead of empty kg/reps columns.
const oldViewSession=window.viewSession;
if(typeof oldViewSession==='function')window.viewSession=function(id){
 const session=(db.sessions||[]).find(x=>x.id===id);if(!session)return oldViewSession.apply(this,arguments);
 const sets=session.sets||[],activities=session.activityDetails||[];
 const cardioSets=sets.filter(setIsCardio);
 const cardioActivities=activities.filter(x=>x.cardio===true||x.distanceMeters!=null||x.seconds!=null||cardioWords.test([x.name,x.method,x.block].join(' ')));
 if(!cardioSets.length&&!cardioActivities.length)return oldViewSession.apply(this,arguments);
 const rows=[];
 for(const x of sets){
  if(setIsCardio(x)){
   const values=[];if(x.durationMinutes!=null)values.push(Number(x.durationMinutes)+' min');if(x.distanceKm!=null)values.push(Number(x.distanceKm)+' km');if(x.effortRating!=null)values.push('Effort '+x.effortRating+'/10');
   rows.push(`<div class="item"><b>${safe(x.exercise)}</b> · Interval ${safe(x.set)}${values.length?' · '+safe(values.join(' · ')):' · No cardio values entered'}</div>`);
  }else rows.push(`<div class="item">${safe(x.exercise)} · Set ${safe(x.set)}: ${safe(x.reps)} reps × ${safe(x.weight)} kg</div>`);
 }
 for(const x of activities){
  const values=[];if(x.seconds!=null)values.push((Number(x.seconds)/60).toFixed(1)+' min');if(x.distanceMeters!=null)values.push((Number(x.distanceMeters)/1000).toFixed(2)+' km');if(x.effort!=null)values.push('Effort '+x.effort+'/10');
  rows.push(`<div class="item"><b>${safe(x.name||'Activity')}</b>${x.round?' · Round '+safe(x.round):''}${values.length?' · '+safe(values.join(' · ')):' · Completed'}</div>`);
 }
 modal(`<h2>${safe(session.name)}</h2><p>${safe(session.date)}${session.durationMinutes?' · '+safe(session.durationMinutes)+' min':''}</p>${rows.join('')||'<p class="empty">No logged movements.</p>'}<div class="actions"><button class="button secondary" onclick="deleteSession('${safe(id)}')">Delete workout</button></div>`);
};
})();
