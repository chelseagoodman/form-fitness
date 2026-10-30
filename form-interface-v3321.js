// FORM v3.3.2 interface refinement: load after form-stability-v332.js.
// Presentation only: no Worker changes and no workout/check-in deletion.
(function(){
'use strict';
const retentionOptions=[7,14,30,90,0];
function retention(){const n=Number(db.coachRetentionDays);return retentionOptions.includes(n)?n:30;}
function saveRetention(value){
 const n=Number(value);if(!retentionOptions.includes(n))return;
 const old=db.coachRetentionDays;db.coachRetentionDays=n;
 if(!save()){db.coachRetentionDays=old;alert('Could not save the setting.');return;}
 // Existing v3.3.2 cleanup runs whenever Talk to Coach opens.
 alert('Conversation retention saved. It will apply when you next open Talk to Coach.');
}
window.formSetCoachRetention=saveRetention;
window.formClearCoachConversations=function(){
 if(!confirm('Delete all locally saved Coach conversations? Approved plans, workout history and plan adjustment snapshots will remain.'))return;
 const old=db.coachConversation;
 db.coachConversation=[];
 if(!save()){db.coachConversation=old;alert('Unable to clear conversations.');return;}
 alert('Local conversation history cleared. Existing exported backups are unchanged.');
};
function addSettings(){
 const app=document.getElementById('app');if(!app||document.getElementById('v3321-settings'))return;
 const card=document.createElement('div');card.className='card';card.id='v3321-settings';
 const heading=document.createElement('h2');heading.textContent='AI Coach · Conversation history';card.append(heading);
 const p=document.createElement('p');p.className='tiny muted';p.textContent='Automatically remove old chat messages when you open Coach. This does not delete your approved plans, check-ins, workout records or adjustment history.';card.append(p);
 const label=document.createElement('label');label.htmlFor='v3321-days';label.textContent='Delete chat messages after';card.append(label);
 const sel=document.createElement('select');sel.id='v3321-days';
 for(const [value,title] of [[7,'7 days'],[14,'14 days'],[30,'30 days (default)'],[90,'90 days'],[0,'Never automatically']]){
  const opt=document.createElement('option');opt.value=String(value);opt.textContent=title;sel.append(opt);
 }
 sel.value=String(retention());sel.addEventListener('change',()=>saveRetention(sel.value));card.append(sel);
 const clear=document.createElement('button');clear.className='button danger';clear.textContent='Delete all conversations now';clear.style.marginTop='12px';clear.onclick=window.formClearCoachConversations;card.append(clear);
 const note=document.createElement('p');note.className='tiny muted';note.textContent='Local deletion cannot remove messages from backups you previously exported or data already sent to Gemini.';card.append(note);
 const about=[...app.querySelectorAll('h2')].find(x=>x.textContent.trim()==='About FORM');
 if(about?.closest('.card'))about.closest('.card').before(card);else app.append(card);
}
function adjustTalk(){
 const modalRoot=document.getElementById('modalContent');
 const composer=document.getElementById('v332-composer');
 const history=document.getElementById('v332-chat');
 if(!modalRoot||!composer||!history)return;
 // Preserve the scrollable container and original renderHistory() implementation.
 // Move the whole history panel below the message composer.
 const title=[...modalRoot.querySelectorAll('h3')].find(h=>h.textContent.includes('Conversation history'));
 if(title){composer.after(title);title.after(history);}else composer.after(history);
 const retentionControl=document.getElementById('v332-retention')?.closest('.item');
 if(retentionControl)retentionControl.remove();
 // Composer remains visible while scrolling the independent history panel.
 composer.style.position='sticky';composer.style.bottom='0';composer.style.zIndex='8';
 history.style.maxHeight='min(40vh,360px)';history.style.overflowY='auto';
 history.setAttribute('aria-label','Coaching conversation history, newest first');
}
function cleanProgress(){
 const app=document.getElementById('app');if(!app)return;
 for(const heading of app.querySelectorAll('h2,h3')){
  const label=heading.textContent.trim();
  if(/^AI check-in trends\s*[·-]\s*8 weeks/i.test(label)){
   heading.closest('.card')?.remove();
  }
  // Remove only the specifically named 12-rep progress panel; retain
  // strength progression history and other progress charts.
  if(/12[ -]?rep\s+progress/i.test(label))heading.closest('.card')?.remove();
 }
}
function addCoachReview(){
 const app=document.getElementById('app');if(!app||document.getElementById('v3321-coach-trends'))return;
 const card=document.createElement('div');card.className='card';card.id='v3321-coach-trends';
 const h=document.createElement('h2');h.textContent='AI Check-in Trends · 8 Weeks';card.append(h);
 const p=document.createElement('p');p.className='tiny muted';p.textContent='Review your recent measurements, recovery and training trends. You choose whether to share the numerical preview with Gemini. Progress photos and free-text notes remain excluded.';card.append(p);
 const b=document.createElement('button');b.className='button';b.textContent='Review AI check-in trends';b.onclick=()=>{
  if(typeof window.formV23Open==='function')window.formV23Open();else alert('The AI Check-in Review is unavailable.');
 };card.append(b);
 const heading=[...app.querySelectorAll('h2')].find(x=>x.textContent.includes('Personal AI Coach'));
 if(heading?.closest('.card'))heading.closest('.card').after(card);else app.append(card);
}
// Hook the final render, preserving existing navigation and theme updates.
const originalRender=render;
render=function(){const out=originalRender.apply(this,arguments);
 if(page==='settings')addSettings();
 if(page==='progress')cleanProgress();
 if(page==='coach')addCoachReview();
 return out;
};
const originalTalk=window.formCoachTalkHub;
window.formCoachTalkHub=function(){const out=originalTalk.apply(this,arguments);adjustTalk();return out;};
const originalWeekly=window.formCoachWeekly;
window.formCoachWeekly=function(){const out=originalWeekly.apply(this,arguments);
 const root=document.getElementById('modalContent');if(root&&!root.querySelector('#v3321-weekly-trends')){
  const b=document.createElement('button');b.id='v3321-weekly-trends';b.className='button';b.textContent='Review 8-week AI trends';b.style.marginTop='12px';b.onclick=()=>window.formV23Open();root.append(b);
 }return out;};
})();
