// FORM v3.5.3 test: surface active AI-generated workouts at the top of Train.
// Presentation-only: does not modify routines, sessions, macros or saved plans.
(function(){
  'use strict';
  const previousTrain=train;
  const safe=x=>esc(String(x??''));
  train=function(){
    let html=previousTrain.apply(this,arguments);
    const all=Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
    const active=all.filter(x=>x&&x.status==='active'&&x.workout&&Array.isArray(x.workout.blocks));
    const plans=Array.isArray(db.coachUnifiedPlans)?db.coachUnifiedPlans:[];
    const latest=plans.filter(x=>x.status==='active').slice(-1)[0];
    let panel='<div class="card" id="v353-active-ai-plan"><h2>Active AI training plan</h2>';
    if(latest)panel+='<p class="tiny muted">'+safe(latest.goal||'AI-generated weekly plan')+'</p>';
    if(active.length){
      panel+='<p class="tiny muted">'+active.length+' workout(s) available. Select View / log to open a session.</p>';
      for(const x of active){
        const w=x.workout;
        panel+='<div class="item"><b>'+safe(w.name)+'</b><div class="tiny muted">'+safe(w.category||'Mixed')+' · '+(Number(w.durationMinutes)||0)+' minutes</div><div class="actions"><button class="button small" data-v353-workout="'+safe(x.id)+'">View / log</button></div></div>';
      }
    }else if(latest){
      panel+='<p class="tiny muted">An active AI plan exists but no active workout entries were found. Do not replace the plan again. Restore your prior plan from My Plan or your verified backup if necessary.</p>';
    }else{
      panel+='<p class="tiny muted">No active AI plan. Use Coach → My Plan to generate one.</p>';
    }
    panel+='</div>';
    // Remove legacy duplicate AI-workout card; this replacement is the single prominent entry point.
    const host=document.createElement('div');host.innerHTML=html;
    for(const card of host.querySelectorAll('.card')){
      const title=card.querySelector('h2')?.textContent?.trim();
      if(title==='AI-created workouts')card.remove();
    }
    const builder=[...host.querySelectorAll('.card')].find(c=>c.querySelector('h2')?.textContent?.trim()==='Build Your Own Program');
    const holder=document.createElement('div');holder.innerHTML=panel;
    if(builder)builder.after(holder.firstElementChild);
    else {const sub=host.querySelector('.sub');if(sub)sub.after(holder.firstElementChild);else host.prepend(holder.firstElementChild)}
    return host.innerHTML;
  };
  document.addEventListener('click',function(event){
    const button=event.target.closest?.('[data-v353-workout]');
    if(!button)return;
    event.preventDefault();
    const id=button.getAttribute('data-v353-workout');
    if(typeof window.formUniversalView==='function')window.formUniversalView(id);
    else alert('The universal workout viewer is unavailable. Refresh FORM and try again.');
  });
})();
