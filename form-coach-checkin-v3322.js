// FORM v3.3.2.2: Move check-in entry/history from Progress to Coach.
// Presentation-only; uses existing db.checkins and check-in edit/view/delete handlers.
(function(){
'use strict';
const e=v=>esc(String(v??''));
function removeProgressPanels(){
 const app=document.getElementById('app');if(!app)return;
 for(const h of [...app.querySelectorAll('h2,h3')]){
  const name=h.textContent.trim();
  if(/^Check-in\s*&\s*recovery$/i.test(name)||/^15-rep progression review$/i.test(name)){
   h.closest('.card')?.remove();
  }
 }
}
function addCoachCheckins(){
 const app=document.getElementById('app');if(!app||document.getElementById('v3322-checkins'))return;
 const records=[...(Array.isArray(db.checkins)?db.checkins:[])].filter(x=>x&&typeof x.date==='string').sort((a,b)=>b.date.localeCompare(a.date));
 const card=document.createElement('section');card.className='card';card.id='v3322-checkins';
 const heading=document.createElement('h2');heading.textContent='Weekly Check-in & Recovery';card.append(heading);
 const description=document.createElement('p');description.className='tiny muted';description.textContent='Record body measurements, sleep, recovery, FIFO context and coaching feedback once. Progress charts update from these same records.';card.append(description);
 const actions=document.createElement('div');actions.className='actions';
 const weekly=document.createElement('button');weekly.className='button';weekly.textContent='Weekly Check-in';weekly.onclick=()=>window.formCoachWeekly();actions.append(weekly);
 const latest=records[0];
 if(latest){
  const summary=document.createElement('p');summary.className='tiny muted';summary.textContent='Latest: '+latest.date+' | Weight: '+(latest.weight??'—')+' kg | Recovery: '+(latest.recovery??'—')+'/10';card.append(summary);
  const edit=document.createElement('button');edit.className='button';edit.textContent='Edit latest check-in';edit.onclick=()=>window.formCheckinEdit(latest.id);actions.append(edit);
 }
 card.append(actions);
 const history=document.createElement('details');history.style.marginTop='12px';
 const title=document.createElement('summary');title.textContent='Check-in history ('+records.length+')';title.style.cursor='pointer';history.append(title);
 const list=document.createElement('div');list.style.cssText='max-height:280px;overflow-y:auto;margin-top:10px';
 for(const item of records){
  const row=document.createElement('div');row.className='item';
  const name=document.createElement('p');name.textContent=item.date+' | Weight: '+(item.weight??'—')+' kg | Waist: '+(item.waist??'—')+' cm';row.append(name);
  const buttons=document.createElement('div');buttons.className='actions';
  const edit=document.createElement('button');edit.className='button small';edit.textContent='Edit';edit.onclick=()=>window.formCheckinEdit(item.id);buttons.append(edit);
  const view=document.createElement('button');view.className='button secondary small';view.textContent='Details / photos';view.onclick=()=>window.formCheckinView(item.id);buttons.append(view);
  const del=document.createElement('button');del.className='button danger small';del.textContent='Delete';del.onclick=()=>window.formCheckinDelete(item.id);buttons.append(del);
  row.append(buttons);list.append(row);
 }
 if(!records.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='No check-ins recorded yet.';list.append(p)}
 history.append(list);card.append(history);
 // Keep AI trends immediately after the main check-in section.
 const trends=document.getElementById('v3321-coach-trends');
 if(trends)trends.before(card);
 else {const main=[...app.querySelectorAll('h2')].find(h=>h.textContent.includes('Personal AI Coach'));if(main?.closest('.card'))main.closest('.card').after(card);else app.append(card)}
}
const previousRender=render;
render=function(){const result=previousRender.apply(this,arguments);if(page==='progress')removeProgressPanels();if(page==='coach')addCoachCheckins();return result;};
})();
