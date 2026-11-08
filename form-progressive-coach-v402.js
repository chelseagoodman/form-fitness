// FORM v4.02: optional, editable progression suggestions before a strength workout.
// Uses the user's local workout history; it makes no network or AI service calls.
(function(){
'use strict';
const DRAFT_KEY='form-active-workout-v1';
const norm=s=>String(s||'').trim().toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cardioWords=/\b(cardio|aerobic|run|running|jog|jogging|sprint|cycle|cycling|bike|biking|row|rowing|swim|swimming|walk|walking|hike|treadmill|elliptical|cross trainer|stair|skipping|jump rope|ski erg|assault bike|spin|zumba|endurance)\b/i;
const priorStart=window.startSession;

function lastSession(name){
 const key=norm(name);
 return [...(db.sessions||[])].filter(s=>(s.sets||[]).some(x=>norm(x.exercise)===key&&x.activityType!=='cardio'))
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]||null;
}
function roundLoad(n){return Math.max(0,Math.round(n*2)/2)}
function proposal(name,target,plannedSets){
 const session=lastSession(name);
 if(!session)return null;
 const previous=(session.sets||[]).filter(x=>norm(x.exercise)===norm(name)&&x.activityType!=='cardio').sort((a,b)=>Number(a.set)-Number(b.set));
 if(!previous.length)return null;
 const reps=previous.map(x=>Math.max(0,Number(x.reps)||0));
 const rir=previous.map(x=>x.rir).filter(x=>x!==null&&x!==undefined&&Number.isFinite(Number(x))).map(Number);
 const targetReps=Math.max(1,Number(target)||10),allMet=reps.every(x=>x>=targetReps),manyMissed=reps.filter(x=>x<targetReps).length>=Math.ceil(reps.length/2);
 const lowReserve=rir.length>0&&rir.filter(x=>x<=1).length>=Math.ceil(rir.length/2);
 const highReserve=rir.length>0&&rir.every(x=>x>=2);
 let reason='',nextReps=[],nextWeights=[];
 for(let i=0;i<plannedSets.length;i++){
  const old=previous.find(x=>Number(x.set)===Number(plannedSets[i].set))||previous[Math.min(i,previous.length-1)];
  const oldReps=Math.max(0,Number(old?.reps)||targetReps),oldWeight=Math.max(0,Number(old?.weight)||0);
  let r=oldReps,w=oldWeight;
  if((manyMissed||lowReserve)&&oldWeight>0){w=roundLoad(oldWeight*.95);r=targetReps}
  else if(allMet&&highReserve&&reps.every(x=>x>=targetReps+2)&&oldWeight>0){w=roundLoad(oldWeight*1.025);r=targetReps}
  else if(allMet&&(!rir.length||highReserve)){r=Math.min(targetReps+2,Math.max(targetReps,oldReps)+1)}
  else if(oldReps<targetReps){r=targetReps}
  nextReps.push(r);nextWeights.push(w);
 }
 if(manyMissed||lowReserve)reason=previous.some(x=>Number(x.weight)>0)?'Last time was below target or very close to failure. Try about 5% less load and aim for the target reps.':'Last time was below target or very close to failure. Repeat the target reps and adjust as needed.';
 else if(allMet&&highReserve&&reps.every(x=>x>=targetReps+2)&&previous.some(x=>Number(x.weight)>0))reason='You exceeded the target by at least two reps with reserve left. Try a small load increase and return to target reps.';
 else if(allMet&&(!rir.length||highReserve))reason='You reached the target. Try one extra rep per set at the same load, up to two reps above target.';
 else if(reps.some(x=>x<targetReps))reason='Some sets were below target. Repeat the load and aim to reach the target reps.';
 else reason='Repeat your last performance and adjust if needed.';
 return {name,target:targetReps,previous,reason,nextReps,nextWeights};
}
function saveDraft(){
 try{const stored=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');stored.draft=sessionDraft;localStorage.setItem(DRAFT_KEY,JSON.stringify(stored));}catch(e){console.warn('Could not save progression choices',e)}
}
function reviewHtml(items){
 return `<h2>Progression suggestions</h2><p class="muted">Based on your latest saved strength workout. These are optional starting points, not automatic changes. You can edit every set in the workout.</p>${items.map((x,i)=>{
  const last=x.previous.map(s=>`${Number(s.weight)||0} kg × ${Number(s.reps)||0}`).join(' · ');
  return `<section class="card" style="margin:12px 0"><h3>${esc(x.name)}</h3><p class="tiny muted">Last session: ${esc(last||'No set details')}<br>${esc(x.reason)}</p><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="formV402Use${i}" checked> Use suggestion for this exercise</label><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px"><strong class="tiny">Set</strong><strong class="tiny">Weight (kg)</strong><strong class="tiny">Reps</strong>${x.sets.map((s,j)=>`<span>${j+1}</span><input id="formV402W${i}_${j}" type="number" min="0" step="0.5" value="${x.nextWeights[j]}"><input id="formV402R${i}_${j}" type="number" min="0" step="1" value="${x.nextReps[j]}">`).join('')}</div></section>`;
 }).join('')}<p class="tiny muted">Your routine stays unchanged. This choice applies to this workout only.</p><div class="actions"><button class="button" onclick="formV402StartWorkout(false)">Start workout</button><button class="button secondary" onclick="formV402StartWorkout(true)">Skip all suggestions</button></div>`;
}
function restoreBaseline(items){
 for(const item of items)for(let j=0;j<item.sets.length;j++){
  const s=item.sets[j],prev=item.previous.find(x=>Number(x.set)===Number(s.set))||item.previous[Math.min(j,item.previous.length-1)];
  s.weight=Math.max(0,Number(prev?.weight)||0);s.reps=Math.max(1,Number(prev?.reps)||item.target);
 }
}
window.formV402StartWorkout=function(skipAll){
 const items=window.formV402Pending||[];
 for(let i=0;i<items.length;i++){
  const item=items[i],use=!skipAll&&document.getElementById('formV402Use'+i)?.checked;
  for(let j=0;j<item.sets.length;j++){
   const s=item.sets[j];
   if(use){s.weight=Math.max(0,Number(document.getElementById(`formV402W${i}_${j}`)?.value)||0);s.reps=Math.max(0,Number(document.getElementById(`formV402R${i}_${j}`)?.value)||0)}
   else{const prev=item.previous.find(x=>Number(x.set)===Number(s.set))||item.previous[Math.min(j,item.previous.length-1)];s.weight=Math.max(0,Number(prev?.weight)||0);s.reps=Math.max(1,Number(prev?.reps)||item.target)}
  }
 }
 window.formV402Pending=[];if(sessionDraft)sessionDraft.startedAt=Date.now();saveDraft();if(typeof window.editSession==='function')window.editSession();
};

if(typeof priorStart==='function')window.startSession=function(id){
 const hadDraft=!!localStorage.getItem(DRAFT_KEY);
 const result=priorStart.apply(this,arguments);
 if(hadDraft||!sessionDraft?.sets?.length)return result;
 const routine=(db.routines||[]).find(r=>r.id===sessionDraft.routineId);
 const groups=[];for(const s of sessionDraft.sets){let g=groups.find(x=>norm(x.name)===norm(s.exercise));if(!g){g={name:s.exercise,sets:[]};groups.push(g)}g.sets.push(s)}
 const candidates=[];
 for(const g of groups){
  const exercise=routine?.exercises?.find(e=>norm(e.name)===norm(g.name));
  const explicitType=exercise?.activityType||g.sets.find(s=>s.activityType)?.activityType;
  if(explicitType==='cardio'||(!explicitType&&cardioWords.test(g.name)))continue;
  const p=proposal(g.name,exercise?.reps,g.sets);if(p)candidates.push({...p,sets:g.sets});
 }
 if(!candidates.length){if(typeof window.editSession==='function')window.editSession();return result}
 restoreBaseline(candidates);window.formV402Pending=candidates;saveDraft();
 if(typeof window.modal==='function')window.modal(reviewHtml(candidates));
 return result;
};
})();
