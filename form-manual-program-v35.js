// FORM v3.5 manual program builder — test branch only.
// Load after form-unified-plan-v35.js. No Gemini calls, no edits to completed sessions.
(function(){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const E=x=>esc(String(x??''));
let draft=null, activeIndex=0;
const routines=()=>Array.isArray(db.routines)?db.routines:[];
const programs=()=>Array.isArray(db.formManualPrograms)?db.formManualPrograms:[];
const universal=()=>Array.isArray(db.universalWorkouts)?db.universalWorkouts:[];
const alpha=n=>{let out='';do{out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26)-1}while(n>=0);return out};
function names(){const result=new Set();
 for(const x of [...(typeof FORM_EXERCISES!=='undefined'&&Array.isArray(FORM_EXERCISES)?FORM_EXERCISES:[]),...(typeof FORM_PERSONAL_EXERCISES!=='undefined'&&Array.isArray(FORM_PERSONAL_EXERCISES)?FORM_PERSONAL_EXERCISES:[]),...(Array.isArray(db.exerciseLibrary)?db.exerciseLibrary:[])]){
  const name=typeof x==='string'?x:Array.isArray(x)?x[0]:x?.name;
  if(typeof name==='string'&&name.trim()&&name.length<=90)result.add(name.trim());
 }
 for(const r of routines())for(const x of r.exercises||[])if(typeof x.name==='string'&&x.name.trim())result.add(x.name.trim());
 return [...result].sort((a,b)=>a.localeCompare(b));
}
const newWorkout=i=>({name:'Workout '+alpha(i),exercises:[]});
function entry(name){return {name,sets:3,reps:10,rir:2,style:'straight',supersetGroup:null,tempo:'',suggestedWeightKg:null}}
function saveDraftForm(){const root=document.getElementById('manual-v35');if(!root||!draft)return;const title=root.querySelector('#mpName');if(title)draft.name=title.value.slice(0,90);const w=draft.workouts[activeIndex];if(w){const n=root.querySelector('#mpWorkoutName');if(n)w.name=n.value.slice(0,90)}}
function field(label,value,onChange,type='text'){const wrap=document.createElement('label');wrap.textContent=label;const el=document.createElement('input');el.type=type;el.value=value??'';if(type==='number')el.step='any';el.addEventListener('change',()=>onChange(el.value));wrap.append(el);return wrap}
function btn(label,fn,secondary=false){const b=document.createElement('button');b.type='button';b.className='button'+(secondary?' secondary':'');b.textContent=label;b.onclick=fn;return b}
function draw(){const root=document.getElementById('manual-v35');if(!root||!draft)return;root.replaceChildren();
 const title=document.createElement('h2');title.textContent='Build Your Own Program';root.append(title);
 const intro=document.createElement('p');intro.className='tiny muted';intro.textContent='Manual only — no information is sent to Gemini. Create Workout A, B, C and as many more as you need. Completed sessions are never overwritten.';root.append(intro);
 root.append(field('Program name',draft.name,v=>draft.name=v.slice(0,90)));
 root.lastChild.querySelector('input').id='mpName';
 const nav=document.createElement('div');nav.className='actions';draft.workouts.forEach((w,i)=>nav.append(btn(w.name||'Workout '+alpha(i),()=>{saveDraftForm();activeIndex=i;draw()},i!==activeIndex)));
 nav.append(btn('+ Add workout',()=>{saveDraftForm();draft.workouts.push(newWorkout(draft.workouts.length));activeIndex=draft.workouts.length-1;draw()}));root.append(nav);
 const w=draft.workouts[activeIndex];const block=document.createElement('div');block.className='item';root.append(block);
 block.append(field('Workout name',w.name,v=>w.name=v.slice(0,90)));block.lastChild.querySelector('input').id='mpWorkoutName';
 if(draft.workouts.length>1)block.append(btn('Remove this workout',()=>{if(!confirm('Remove this workout from the unsaved program?'))return;draft.workouts.splice(activeIndex,1);activeIndex=Math.min(activeIndex,draft.workouts.length-1);draw()},true));
 const search=field('Search exercise library','',()=>{});const input=search.querySelector('input');input.id='mpSearch';input.placeholder='Search exercises';block.append(search);
 const list=document.createElement('div');list.style.cssText='max-height:190px;overflow-y:auto;border:1px solid #46574a;border-radius:10px;padding:8px;margin:8px 0';block.append(list);
 const renderList=()=>{list.replaceChildren();const q=input.value.toLowerCase().trim();const matches=names().filter(x=>x.toLowerCase().includes(q)).slice(0,60);for(const name of matches){const l=document.createElement('label');l.style.cssText='display:flex;gap:8px;align-items:center;margin:5px 0';const c=document.createElement('input');c.type='checkbox';c.style.width='auto';c.dataset.exercise=name;l.append(c,document.createTextNode(name));list.append(l)}if(!matches.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='No matching exercises. Use Add custom exercise below.';list.append(p)}};
 input.addEventListener('input',renderList);renderList();block.append(btn('Add selected exercises',()=>{const picked=[...list.querySelectorAll('input:checked')].map(x=>x.dataset.exercise);if(!picked.length)return alert('Select one or more exercises.');w.exercises.push(...picked.map(entry));draw()}));
 const custom=field('Add custom exercise','',()=>{});custom.querySelector('input').id='mpCustom';custom.querySelector('input').maxLength=90;block.append(custom);
 block.append(btn('+ Add custom',()=>{const name=custom.querySelector('input').value.trim();if(!name||name.length>90)return alert('Enter an exercise name (up to 90 characters).');w.exercises.push(entry(name));draw()},true));
 const h=document.createElement('h3');h.textContent='Exercises ('+w.exercises.length+')';block.append(h);
 w.exercises.forEach((x,i)=>{const item=document.createElement('div');item.className='item';const heading=document.createElement('b');heading.textContent=(i+1)+'. '+x.name;item.append(heading);
 const row=document.createElement('div');row.className='actions';row.append(btn('Up',()=>{if(i>0){[w.exercises[i-1],w.exercises[i]]=[w.exercises[i],w.exercises[i-1]];draw()}},true),btn('Down',()=>{if(i<w.exercises.length-1){[w.exercises[i+1],w.exercises[i]]=[w.exercises[i],w.exercises[i+1]];draw()}},true),btn('Remove',()=>{w.exercises.splice(i,1);draw()},true));item.append(row);
 const grid=document.createElement('div');grid.className='grid';
 for(const [label,key,min,max] of [['Sets','sets',1,12],['Reps','reps',1,100],['Target RIR','rir',0,10]])grid.append(field(label,x[key],v=>{const n=Number(v);if(Number.isInteger(n)&&n>=min&&n<=max)x[key]=n},'number'));
 grid.append(field('Tempo (optional)',x.tempo,v=>x.tempo=v.slice(0,50)));
 const style=document.createElement('label');style.textContent='Set style';const select=document.createElement('select');for(const type of ['straight','superset','amrap']){const opt=document.createElement('option');opt.value=type;opt.textContent=type;select.append(opt)}select.value=x.style;select.onchange=()=>x.style=select.value;style.append(select);grid.append(style);
 grid.append(field('Superset group (optional)',x.supersetGroup||'',v=>{x.supersetGroup=v.trim().slice(0,12)||null;if(x.supersetGroup)x.style='superset'}));item.append(grid);block.append(item)});
 const foot=document.createElement('div');foot.className='card';const note=document.createElement('p');note.className='tiny muted';note.textContent='When finished, review the whole program and choose Replace Current Plan, Keep Both or Save as Draft. Your previous plan is archived rather than deleted.';foot.append(note);
 foot.append(btn('Review & save complete program',()=>{saveDraftForm();review()}));root.append(foot);
}
window.formManualProgramOpen=function(){draft={name:'My Training Program',workouts:[newWorkout(0)]};activeIndex=0;modal('<div id="manual-v35"></div>');draw()};
function validate(){if(!draft||!draft.name.trim()||draft.name.length>90||!draft.workouts.length||draft.workouts.length>30)return false;return draft.workouts.every(w=>w.name.trim()&&w.name.length<=90&&w.exercises.length>0&&w.exercises.length<=40&&w.exercises.every(x=>x.name.trim()&&x.name.length<=90&&Number.isInteger(x.sets)&&x.sets>=1&&x.sets<=12&&Number.isInteger(x.reps)&&x.reps>=1&&x.reps<=100&&Number.isInteger(x.rir)&&x.rir>=0&&x.rir<=10))}
function review(){if(!validate())return alert('Give the program and each workout a name, and add at least one valid exercise to every workout.');const root=document.getElementById('manual-v35');root.replaceChildren();const h=document.createElement('h2');h.textContent='Review your program';root.append(h);const p=document.createElement('p');p.textContent=draft.name+' — '+draft.workouts.length+' workout(s)';root.append(p);for(const w of draft.workouts){const item=document.createElement('div');item.className='item';const name=document.createElement('b');name.textContent=w.name;item.append(name);const details=document.createElement('p');details.className='tiny muted';details.textContent=w.exercises.map(x=>x.name+' ('+x.sets+' × '+x.reps+')').join(' · ');item.append(details);root.append(item)}
 const label=document.createElement('label');label.textContent='How would you like to save?';const sel=document.createElement('select');sel.id='mpMode';for(const [value,text] of [['replace','Replace Current Plan (archive old)'],['keep','Keep Both'],['draft','Save as Draft']]){const opt=document.createElement('option');opt.value=value;opt.textContent=text;sel.append(opt)}label.append(sel);root.append(label);
 const actions=document.createElement('div');actions.className='actions';actions.append(btn('Back to editing',draw,true),btn('Confirm & save program',()=>commit(sel.value)));root.append(actions);
}
function commit(mode){if(!['replace','keep','draft'].includes(mode)||!validate())return alert('Invalid program.');if(!confirm('Save '+draft.workouts.length+' workout(s) as '+mode+'? Completed workout history stays unchanged.'))return;
 const snapshot={routines:cp(routines()),universalWorkouts:cp(universal()),coachUnifiedPlans:cp(db.coachUnifiedPlans||[]),formManualPrograms:cp(programs()),coachPlanHistory:cp(db.coachPlanHistory||[])};
 try{const id=uid(),time=new Date().toISOString();
 if(mode==='replace'){
  for(const r of routines())if(r.formPlanStatus!=='archived')r.formPlanStatus='archived';
  for(const w of universal())if(w.status==='active')w.status='archived';
  for(const p of db.coachUnifiedPlans||[])if(p.status==='active')p.status='archived';
  for(const p of programs())if(p.status==='active')p.status='archived';
 }
 const status=mode==='draft'?'draft':'active';
 const created=draft.workouts.map((w,i)=>({id:uid(),name:w.name,exercises:cp(w.exercises),formPlanStatus:status,formPlanId:id,formManualProgramId:id,formManualDay:i+1}));
 db.routines=[...routines(),...created];
 db.formManualPrograms=[...programs(),{id,name:draft.name,createdAt:time,status,routineIds:created.map(r=>r.id)}];
 db.coachPlanHistory=[...snapshot.coachPlanHistory,{id:'manual-'+id,date:time,kind:'manual-program',description:'Manual program '+mode,previous:{routines:snapshot.routines,universalWorkouts:snapshot.universalWorkouts,coachUnifiedPlans:snapshot.coachUnifiedPlans,formManualPrograms:snapshot.formManualPrograms}}].slice(-20);
 if(save()!==true)throw Error('Unable to save');close();render();alert('Saved '+created.length+' workouts. '+(mode==='draft'?'Draft stays out of Train.':'Find active workouts in Train.'));
 }catch(e){for(const key of ['routines','universalWorkouts','coachUnifiedPlans','formManualPrograms','coachPlanHistory'])db[key]=snapshot[key];alert('Program was not saved. Your previous plan was restored. Export a backup and check storage.')}
}
window.formManualProgramUndo=function(){const h=db.coachPlanHistory||[],last=h[h.length-1];if(!last||last.kind!=='manual-program'||!last.previous)return alert('No recent manual-program save to undo.');if(!confirm('Undo the last manual program save? Completed sessions remain unchanged.'))return;const current={routines:cp(routines()),universalWorkouts:cp(universal()),coachUnifiedPlans:cp(db.coachUnifiedPlans||[]),formManualPrograms:cp(programs()),coachPlanHistory:cp(h)};
 for(const key of ['routines','universalWorkouts','coachUnifiedPlans','formManualPrograms'])db[key]=cp(last.previous[key]);db.coachPlanHistory=h.slice(0,-1);if(save()!==true){for(const key of Object.keys(current))db[key]=current[key];return alert('Undo could not be saved.')}close();render()};
window.formManualProgramManage=function(){const all=programs();modal('<h2>Manual programs</h2><p class="tiny muted">Archive or activate a saved manual program. Completed workout sessions are never deleted.</p><div id="mpManage"></div>');const root=document.getElementById('mpManage');if(!all.length){root.textContent='No manual programs saved yet.';return}
 for(const p of all){const section=document.createElement('div');section.className='item';const name=document.createElement('b');name.textContent=p.name+' — '+p.status;section.append(name);const count=document.createElement('p');count.className='tiny muted';count.textContent=(p.routineIds||[]).length+' workout(s)';section.append(count);section.append(btn(p.status==='active'?'Archive':'Activate',()=>{if(!confirm((p.status==='active'?'Archive':'Activate')+' '+p.name+'?'))return;const before={routines:cp(routines()),formManualPrograms:cp(programs()),universalWorkouts:cp(universal()),coachUnifiedPlans:cp(db.coachUnifiedPlans||[])};if(p.status!=='active'){
 for(const r of routines())if(r.formPlanStatus==='active')r.formPlanStatus='archived';for(const w of universal())if(w.status==='active')w.status='archived';for(const x of db.coachUnifiedPlans||[])if(x.status==='active')x.status='archived';for(const x of programs())if(x.status==='active')x.status='archived';}
 const next=p.status==='active'?'archived':'active';p.status=next;for(const r of routines())if((p.routineIds||[]).includes(r.id))r.formPlanStatus=next;if(save()!==true){for(const k of Object.keys(before))db[k]=before[k];return alert('Could not save status.')}window.formManualProgramManage();render()},true));root.append(section)}
 root.append(btn('Undo last manual program save',window.formManualProgramUndo,true));};
// Keep manual tools on Train, never on Coach. Existing manual single-routine tools remain available.
const priorTrain=train;
train=function(){return priorTrain()+`<div class="card"><h2>Build Your Own Program</h2><p class="tiny muted">Create multiple workouts without AI. Select exercises from your library, edit sets, reps, RIR and supersets, then save as one program.</p><div class="actions"><button class="button" onclick="formManualProgramOpen()">Build my own program</button><button class="button secondary" onclick="formManualProgramManage()">Manage manual programs</button></div></div>`};
})();
