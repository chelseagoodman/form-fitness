// FORM v1.6: spaced workout cards, autosaved drafts and completed-set tracking.
// Existing completed sessions, routines and backup schema are unchanged.
(function(){
const DRAFT_KEY='form-active-workout-v1';
let openCards=new Set([0]);
let done=[];
function persist(){
 if(!sessionDraft)return;
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify({draft:sessionDraft,done}));}catch(e){console.warn('Could not save workout draft',e)}
}
function clearDraft(){localStorage.removeItem(DRAFT_KEY);done=[];sessionDraft=null}
function safeText(s){return esc(s)}
function exerciseGroups(){
 const groups=[];
 for(const s of sessionDraft.sets){
  let g=groups.find(g=>g.name===s.exercise);
  if(!g){g={name:s.exercise,sets:[]};groups.push(g)}
  g.sets.push(s);
 }
 const routine=db.routines.find(r=>r.id===sessionDraft.routineId);
 groups.forEach(g=>{const e=routine?.exercises?.find(e=>e.name===g.name);g.style=e?.style||'straight';g.superset=e?.supersetGroup||null;g.reps=e?.reps||10;});
 return groups;
}
function indexFor(s){return sessionDraft.sets.indexOf(s)}
function lastSet(name,n){
 const sessions=[...db.sessions].sort((a,b)=>b.date.localeCompare(a.date));
 for(const sess of sessions){const found=sess.sets.find(x=>x.exercise===name&&x.set===n);if(found)return `${found.weight}kg × ${found.reps}`}
 return '—';
}
function renderWorkout(){
 if(!sessionDraft)return;
 const groups=exerciseGroups();
 const total=sessionDraft.sets.length,completed=done.filter(Boolean).length;
 const html=`<h2>${safeText(sessionDraft.name)}</h2><p class="muted tiny">${completed} / ${total} sets completed · Changes saved on this device as you type.</p>
 <div class="progress" style="margin-bottom:16px"><div style="width:${total?100*completed/total:0}%"></div></div>
 ${groups.map((g,i)=>`<section class="workout-card"><button type="button" class="workout-card-heading" onclick="formToggleCard(${i})" aria-expanded="${openCards.has(i)}"><span><span class="tiny muted">${g.style==='superset'?'SUPERSET '+safeText(g.superset||''): 'STRAIGHT SETS'}</span><strong>${i+1}. ${safeText(g.name)}</strong><span class="tiny muted">${g.sets.length} sets · Target ${g.reps} reps</span></span><span>${openCards.has(i)?'−':'+'}</span></button>
 <div class="actions" style="margin:10px 0"><button class="button secondary small" onclick="formSwapExercise(${i})">Swap</button><button class="button secondary small" onclick="formMoveExercise(${i},-1)" ${i===0?'disabled':''}>↑</button><button class="button secondary small" onclick="formMoveExercise(${i},1)" ${i===groups.length-1?'disabled':''}>↓</button><button class="button secondary small" onclick="formRemoveExercise(${i})">Remove</button></div>
 ${openCards.has(i)?`<div class="workout-set-grid workout-set-head"><span>Set</span><span>Previous</span><span>kg</span><span>Reps</span><span>Done</span></div>${g.sets.map(s=>{let k=indexFor(s);return `<div class="workout-set-grid"><span>${s.set}</span><span class="tiny muted">${lastSet(g.name,s.set)}</span><input aria-label="Weight set ${s.set}" type="number" min="0" step="0.5" value="${Number(s.weight)||0}" oninput="formDraftValue(${k},'weight',this.value)"><input aria-label="Reps set ${s.set}" type="number" min="0" step="1" value="${Number(s.reps)||0}" oninput="formDraftValue(${k},'reps',this.value)"><input aria-label="Complete set ${s.set}" type="checkbox" ${done[k]?'checked':''} onchange="formDraftDone(${k},this.checked)"></div>`}).join('')}<p class="tiny muted">${g.style==='superset'?'Alternate with its paired accessory exercise; rest after the pair.':'Rest approximately 2–3 minutes after demanding compound sets.'}</p>`:''}</section>`).join('')}
 <div class="actions"><button class="button secondary" onclick="formAddDuringWorkout()">+ Add exercise</button><button class="button" onclick="finishSession()">Finish & save</button><button class="button secondary" onclick="formKeepDraft()">Save & close</button><button class="button danger" onclick="formDiscardDraft()">Discard draft</button></div>`;
 $('modalContent').innerHTML=html;
}
window.formToggleCard=function(i){if(openCards.has(i))openCards.delete(i);else openCards.add(i);renderWorkout()};
window.formDraftValue=function(i,k,v){if(!sessionDraft?.sets[i])return;sessionDraft.sets[i][k]=Math.max(0,Number(v)||0);persist()};
window.formDraftDone=function(i,v){done[i]=!!v;persist();const label=$('modalContent').querySelector('p.muted');if(label)label.textContent=`${done.filter(Boolean).length} / ${sessionDraft.sets.length} sets completed · Changes saved on this device as you type.`};
window.formKeepDraft=function(){persist();close();render()};
window.formDiscardDraft=function(){if(confirm('Discard the unsaved workout draft? Completed workout history is not affected.')){clearDraft();close();render()}};
window.formAddDuringWorkout=function(){
 const names=(typeof formCombinedExercises==='function'?formCombinedExercises():typeof FORM_EXERCISES!=='undefined'?FORM_EXERCISES:[]);
 const opts=Array.isArray(names)?names.map(x=>Array.isArray(x)?x[0]:x.name).filter(Boolean):[];
 const list=[...new Set(opts)].sort();
 $('modalContent').innerHTML=`<h2>Add exercise to workout</h2><label>Choose from your library or type a custom exercise</label><input id="newWorkoutExercise" list="workoutExerciseOptions" placeholder="Exercise name"><datalist id="workoutExerciseOptions">${list.map(n=>`<option value="${safeText(n)}"></option>`).join('')}</datalist><label>Sets</label><input type="number" id="newWorkoutSets" min="1" max="12" value="3"><label>Target reps</label><input type="number" id="newWorkoutReps" min="1" max="100" value="10"><div class="actions"><button class="button" onclick="formConfirmAddedExercise()">Add to session</button><button class="button secondary" onclick="editSession()">Back to workout</button></div>`;
};
window.formConfirmAddedExercise=function(){const name=$('newWorkoutExercise').value.trim(),sets=Math.max(1,Math.min(12,Number($('newWorkoutSets').value)||3)),reps=Math.max(1,Math.min(100,Number($('newWorkoutReps').value)||10));if(!name)return alert('Enter an exercise name.');if(sessionDraft.sets.some(x=>x.exercise.toLowerCase()===name.toLowerCase()))return alert('That exercise is already in this workout.');for(let i=1;i<=sets;i++){sessionDraft.sets.push({exercise:name,set:i,reps,weight:0});done.push(false)}openCards.add(exerciseGroups().length-1);persist();renderWorkout()};
// All editing is performed on the local draft, never on completed history.
function replaceDraft(entries){
 sessionDraft.sets=entries.map(e=>e.set);
 done=entries.map(e=>e.done);
 persist();renderWorkout();
}
function draftEntries(){return sessionDraft.sets.map((set,i)=>({set,done:!!done[i]}))}
function groupIndices(index){
 const group=exerciseGroups()[index];
 return group?sessionDraft.sets.map((s,i)=>s.exercise===group.name?i:-1).filter(i=>i>=0):[];
}
function libraryNames(){
 const raw=typeof formCombinedExercises==='function'?formCombinedExercises():typeof FORM_EXERCISES!=='undefined'?FORM_EXERCISES:[];
 return [...new Set(raw.map(x=>Array.isArray(x)?x[0]:x.name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
window.formSwapExercise=function(index){
 const group=exerciseGroups()[index];if(!group)return;
 const names=libraryNames().filter(x=>x.toLowerCase()!==group.name.toLowerCase());
 $('modalContent').innerHTML=`<h2>Swap ${safeText(group.name)}</h2><p class="muted">Completed sets stay under the original exercise. Uncompleted sets become the replacement.</p><label>Replacement exercise</label><input id="swapExerciseName" list="swapOptions" placeholder="Search or type exercise"><datalist id="swapOptions">${names.map(n=>`<option value="${safeText(n)}"></option>`).join('')}</datalist><div class="actions"><button class="button" onclick="formConfirmSwap(${index})">Confirm swap</button><button class="button secondary" onclick="editSession()">Cancel</button></div>`;
};
window.formConfirmSwap=function(index){
 const replacement=$('swapExerciseName')?.value.trim();
 const group=exerciseGroups()[index];if(!group||!replacement)return alert('Select a replacement exercise.');
 if(replacement.toLowerCase()===group.name.toLowerCase())return alert('Choose a different exercise.');
 if(sessionDraft.sets.some(x=>x.exercise.toLowerCase()===replacement.toLowerCase()))return alert('That exercise is already in this workout.');
 const indices=groupIndices(index),entries=draftEntries();
 const pending=indices.filter(i=>!done[i]);
 if(!pending.length)return alert('All sets are complete. Add a new exercise instead.');
 if(!confirm(`Replace ${pending.length} unfinished sets with ${replacement}? Completed sets will stay recorded.`))return;
 let next=1;
 for(const i of pending){entries[i]={set:{...entries[i].set,exercise:replacement,set:next++,weight:0,reps:group.reps},done:false}}
 // Keep completed original sets and new replacement sets distinct in the session.
 openCards=new Set([index,index+1]);replaceDraft(entries);
};
window.formRemoveExercise=function(index){
 const group=exerciseGroups()[index];if(!group)return;
 const indices=groupIndices(index);if(indices.some(i=>done[i]))return alert('This exercise has completed sets. Keep them in your history, or swap only unfinished sets.');
 if(!confirm(`Remove ${group.name} from this workout?`))return;
 const remove=new Set(indices);replaceDraft(draftEntries().filter((_,i)=>!remove.has(i)));
};
window.formMoveExercise=function(index,direction){
 const groups=exerciseGroups(),target=index+direction;if(target<0||target>=groups.length)return;
 const entries=draftEntries();const order=groups.map(g=>g.name);
 [order[index],order[target]]=[order[target],order[index]];
 const reordered=order.flatMap(name=>entries.filter(x=>x.set.exercise===name));
 openCards=new Set([target]);replaceDraft(reordered);
};

const oldStart=startSession;
startSession=function(id){
 const stored=localStorage.getItem(DRAFT_KEY);
 if(stored){if(!confirm('You have an unfinished workout. Press OK to resume it, or Cancel to keep it without starting another.'))return;try{const data=JSON.parse(stored);sessionDraft=data.draft;done=data.done||[];openCards=new Set([0]);editSession();return}catch{localStorage.removeItem(DRAFT_KEY)}}
 oldStart(id);done=sessionDraft?.sets.map(()=>false)||[];openCards=new Set([0]);persist();
};
editSession=function(){renderWorkout();persist()};
finishSession=function(){
 if(!sessionDraft)return;
 if(!confirm('Finish and save this workout? All entered sets will be recorded.'))return;
 db.sessions.push({id:uid(),date:TODAY(),name:sessionDraft.name,sets:sessionDraft.sets.map(s=>({...s,reps:Math.max(0,Number(s.reps)||0),weight:Math.max(0,Number(s.weight)||0)}))});
 if(save()){clearDraft();close();render()}
};
const oldTrain=train;
train=function(){let html=oldTrain();if(localStorage.getItem(DRAFT_KEY))html=`<div class="card"><h2>Unfinished workout</h2><p class="muted">Your last workout was saved automatically.</p><button class="button" onclick="formResumeDraft()">Resume workout</button></div>`+html;return html};
window.formResumeDraft=function(){try{const x=JSON.parse(localStorage.getItem(DRAFT_KEY));sessionDraft=x.draft;done=x.done||[];openCards=new Set([0]);modal('<h2>Loading workout…</h2>');editSession()}catch{alert('Could not restore workout draft. Your completed sessions are unaffected.')}};
})();
