// FORM v3.5.8: keep mixed-activity cards visible through original logger redraws.
// UI only. Does not alter sessions, drafts, macros or saved plans.
(function(){
 'use strict';
 const KEY='form-ai-mixed-draft-v357';
 const PREFIX='form-ai-bridge-';
 const root=document.getElementById('modalContent');
 if(!root)return;
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const safe=x=>esc(String(x??''));
 const warm=a=>/warm.?up|activation|preparation|prep|mobility warm/i.test(String(a.block||''));
 const previousToggle=window.formToggleCard;
 const previousEdit=editSession;
 let busy=false;
 function rebuild(){
  if(busy||!sessionDraft)return;
  const state=read();
  const id=sessionDraft.formAiWorkoutId||(typeof sessionDraft.routineId==='string'&&sessionDraft.routineId.startsWith(PREFIX)?sessionDraft.routineId.slice(PREFIX.length):null);
  if(!id||state?.workoutId!==id||!Array.isArray(state.activities)||!state.activities.length)return;
  if(root.querySelector('#form-ai-extra[data-v358="1"], #form-ai-warmup-v358[data-v358="1"]'))return;
  root.querySelector('#form-ai-extra')?.remove();
  const cards=[...root.querySelectorAll(':scope > .workout-card')];
  if(!cards.length)return;
  busy=true;
  try{
   const makeSection=(items,label)=>{
    if(!items.length)return null;
    const section=document.createElement('section');
    section.id='form-ai-extra';section.dataset.v358='1';section.className='form-ai-activity-section';
    const heading=document.createElement('h3');heading.textContent=label;section.append(heading);
    for(const [a,i] of items){
     const kind=a.distanceMeters!=null?'distance':a.seconds!=null?'time':a.targetReps!=null?'reps':'completion';
     const field=kind==='distance'?'Distance (m)':kind==='time'?'Seconds':kind==='reps'?'Reps':'';
     const value=kind==='distance'?a.distanceMeters:kind==='time'?a.seconds:a.targetReps;
     const card=document.createElement('section');card.className='workout-card';card.dataset.aiActivity=String(i);
     card.innerHTML='<div class="workout-card-heading"><span><span class="tiny muted">'+safe(a.block)+' · ROUND '+Number(a.round)+'</span><strong>'+safe(a.name)+'</strong><span class="tiny muted">'+safe(a.method)+'</span></span></div><p class="tiny muted">'+safe(a.cues)+'</p><div class="actions" style="align-items:end;gap:10px">'+(field?'<label style="flex:1;min-width:100px">'+field+'<input type="number" min="0" step="any" data-ai-field="value" data-ai-index="'+i+'" value="'+(value==null?'':safe(value))+'"></label>':'')+'<label style="flex:1;min-width:95px">Effort (1–10)<input type="number" min="1" max="10" data-ai-field="effort" data-ai-index="'+i+'" value="'+(a.effort??'')+'"></label><label style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><input type="checkbox" style="width:24px;min-height:24px" data-ai-field="done" data-ai-index="'+i+'" '+(a.done?'checked':'')+'> Done</label></div>';
     section.append(card);
    }
    return section;
   };
   const all=state.activities.map((a,i)=>[a,i]);
   const warmups=all.filter(([a])=>warm(a));
   const others=all.filter(([a])=>!warm(a));
   const w=makeSection(warmups,'Warm-up & mobility');
   const o=makeSection(others,'Conditioning, mobility & other activities');
   if(w){w.id='form-ai-warmup-v358';cards[0].before(w)}
   if(o){o.id='form-ai-extra';const last=cards[cards.length-1];last.after(o)}
  }finally{busy=false}
 }
 // Original logger redraws its entire modal when expanding, pairing or swapping.
 // Reapply the activity cards after each redraw without replacing its set UI.
 const observer=new MutationObserver(()=>{if(!busy&&sessionDraft)rebuild()});
 observer.observe(root,{childList:true,subtree:false});
 window.formToggleCard=function(){const out=previousToggle.apply(this,arguments);rebuild();return out};
 editSession=function(){const out=previousEdit.apply(this,arguments);rebuild();return out};
 rebuild();
})();
