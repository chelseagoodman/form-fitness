// FORM v3.3.2 TEST — local UI, chat retention and program lifecycle only.
// Requires form-ai-program-v25.js, form-coach-v32.js, and app.js to be loaded first.
(function(){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const safe=s=>esc(String(s??''));
const options=[7,14,30,90,0];
function days(){const n=Number(db.coachRetentionDays);return options.includes(n)?n:30}
function prune(){
 if(!Array.isArray(db.coachConversation))return;
 const old=db.coachConversation;
 const cutoff=Date.now()-days()*86400000;
 const fresh=days()===0?old:old.filter(x=>{
  const t=Date.parse(x.date||'');return !Number.isFinite(t)||t>=cutoff;
 });
 if(fresh.length!==old.length){db.coachConversation=fresh;if(!save())db.coachConversation=old;}
}
function stylePrimaryButtons(root){
 if(!root)return;
 root.querySelectorAll('button.form-v332-primary').forEach(b=>{
  b.classList.remove('secondary');
  b.style.removeProperty('background');b.style.removeProperty('color');b.style.removeProperty('border');
 });
}
const oldCoach=coach;
coach=function(){
 const markup=oldCoach();
 // Only the four primary Coach navigation actions receive filled treatment.
 return markup.replace(/class="button secondary"(?= onclick="formCoach(?:PlanHub|TalkHub)\(\)")/g,'class="button form-v332-primary"');
};
const oldTalk=window.formCoachTalkHub;
window.formCoachTalkHub=function(){
 prune();oldTalk();
 const history=document.getElementById('v32history');
 const message=document.getElementById('v32message');
 if(!history||!message)return;
 const title=history.previousElementSibling;
 // Place the conversation above the composer. Only conversation history scrolls.
 const container=document.createElement('section');container.id='v332-chat';container.className='item';
 container.style.cssText='max-height:min(44vh,380px);min-height:150px;overflow-y:auto;overscroll-behavior:contain;padding:10px;border:1px solid #52624d;border-radius:12px;margin:12px 0';
 history.parentNode.insertBefore(container,message.previousElementSibling||message);
 container.appendChild(history);
 if(title&&title.tagName==='H3')title.remove();
 const heading=document.createElement('h3');heading.textContent='Conversation history — newest first';container.parentNode.insertBefore(heading,container);
 const composer=document.createElement('div');composer.id='v332-composer';
 composer.style.cssText='position:sticky;bottom:0;z-index:5;padding:10px;background:#1b2622;border:1px solid #40564a;border-radius:12px;margin-top:12px';
 // Keep the text input and Send control together, while leaving privacy controls accessible.
 const send=document.getElementById('v32send');
 const label=message.previousElementSibling;
 if(label?.tagName==='LABEL')composer.appendChild(label);
 composer.appendChild(message);
 if(send){composer.appendChild(send);send.classList.remove('secondary')}
 const status=document.getElementById('v32status');
 if(status)status.parentNode.insertBefore(composer,status);
 else container.parentNode.appendChild(composer);
 const control=document.createElement('div');control.className='item';
 control.innerHTML='<label for="v332-retention">Delete chat messages after</label><select id="v332-retention"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days (default)</option><option value="90">90 days</option><option value="0">Never automatically</option></select><p class="tiny muted">Cleanup runs when you open or use Coach. It does not delete approved plans, adjustments, or older exported backups.</p>';
 const sel=control.querySelector('select');sel.value=String(days());
 sel.addEventListener('change',()=>{const before=db.coachRetentionDays;db.coachRetentionDays=Number(sel.value);if(!save()){db.coachRetentionDays=before;sel.value=String(days());alert('Could not save retention setting.');return}prune();alert('Retention setting saved. Reopen Coach to refresh the conversation list.')});
 container.parentNode.insertBefore(control,container);
 stylePrimaryButtons(document.getElementById('modalContent'));
};
const oldSend=window.formV32Send;
window.formV32Send=async function(){
 prune();const countBefore=Array.isArray(db.coachConversation)?db.coachConversation.length:0;await oldSend();
 if(!Array.isArray(db.coachConversation)||db.coachConversation.length<=countBefore)return;
 // Existing messages use date-only stamps. New messages get full timestamps.
 const list=db.coachConversation;
 if(Array.isArray(list)&&list.length>=2){
  const now=new Date().toISOString();let changed=false;
  for(let i=list.length-2;i<list.length;i++){
   if(list[i]&&/^\d{4}-\d{2}-\d{2}$/.test(list[i].date||'')){
    list[i].date=now;changed=true;
   }
  }
  if(changed)save();
 }
};
// Provide program lifecycle without altering completed sessions.
const oldTrain=train;
train=function(){
 const original=db.routines;
 db.routines=original.filter(r=>r.formPlanStatus!=='archived'&&r.formPlanStatus!=='draft');
 try{return oldTrain()}finally{db.routines=original}
};
function lifecyclePrompt(){
 const choice=prompt('Save generated plan as:\n1 — Replace current AI plan (archive old AI routines)\n2 — Keep both plans\n3 — Save new plan as draft\n\nEnter 1, 2 or 3:','1');
 if(choice===null)return null;
 if(!['1','2','3'].includes(choice)){alert('Choose 1, 2 or 3.');return null}
 return choice;
}
const oldSaveAll=window.formV25SaveAll;
window.formV25SaveAll=function(){
 const mode=lifecyclePrompt();if(!mode)return;
 const before=clone(db.routines),beforeHistory=clone(db.coachPlanHistory||[]);
 const oldIds=new Set(db.routines.map(r=>r.id));
 oldSaveAll();
 const created=db.routines.filter(r=>!oldIds.has(r.id));
 if(!created.length)return;
 const planId=created[0]?.aiPlan?.id||new Date().toISOString();
 if(mode==='1')for(const r of db.routines){if(oldIds.has(r.id)&&r.aiPlan&&r.formPlanStatus!=='archived')r.formPlanStatus='archived'}
 for(const r of created){r.formPlanStatus=mode==='3'?'draft':'active';r.formPlanId=planId}
 db.coachPlanHistory=[...beforeHistory,{id:'plan-'+new Date().toISOString(),date:new Date().toISOString(),kind:'program-lifecycle',routines:before,macro:clone(db.macro),description:mode==='1'?'Archived previous AI plan':mode==='3'?'Saved draft':'Added new plan'}].slice(-20);
 if(!save()){
  db.routines=before;db.coachPlanHistory=beforeHistory;alert('Could not save plan status. Restored previous routines.');
 }else render();
};
window.formV332Plans=function(){
 const groups=new Map();
 for(const r of db.routines||[]){if(!r.aiPlan)continue;const key=r.formPlanId||r.aiPlan.id||r.id;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 const host=document.getElementById('modalContent');if(!host)return;
 host.innerHTML='<h2>Manage AI Plans</h2><p class="tiny muted">Archived and draft plans stay in your FORM backup. Completed workout history is never deleted.</p>';
 for(const [id,routines] of groups){const status=routines[0].formPlanStatus||'active';
  const section=document.createElement('div');section.className='item';
  const name=document.createElement('p');name.textContent=(routines[0].aiPlan?.focus||'AI Plan')+' — '+routines.length+' routines — '+status;section.append(name);
  const b=document.createElement('button');b.className='button secondary';b.textContent=status==='active'?'Archive plan':'Make active';
  b.onclick=()=>{
   if(!confirm((status==='active'?'Archive':'Activate')+' this plan? Completed workouts remain unchanged.'))return;
   const before=clone(db.routines);
   if(status!=='active')for(const r of db.routines){if(r.aiPlan&&r.formPlanStatus==='active')r.formPlanStatus='archived'}
   for(const r of routines)r.formPlanStatus=status==='active'?'archived':'active';
   if(!save()){db.routines=before;alert('Could not save plan status.');return}window.formV332Plans();render();
  };section.append(b);host.append(section)
 }
 if(!groups.size){const p=document.createElement('p');p.textContent='No AI-generated plans saved yet.';host.append(p)}
};
const oldPlanHub=window.formCoachPlanHub;
window.formCoachPlanHub=function(){oldPlanHub();const host=document.getElementById('modalContent');if(!host)return;
 const b=document.createElement('button');b.className='button form-v332-primary';b.textContent='Manage active, archived and draft plans';b.onclick=window.formV332Plans;host.append(b);
 host.querySelectorAll('button.secondary').forEach(x=>{if(!/cancel|back|remove|delete/i.test(x.textContent))x.classList.remove('secondary')});
};
prune();
})();
