// FORM v4.03: include optional food totals and approval-gated plan suggestions
// in the Progress review, using the existing /coach contract.
(function(){
'use strict';
const CHECKIN='/api/ai/checkin',COACH='/api/ai/coach';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
const n=(v,max=100000)=>{if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)&&x>=0&&x<=max?x:null};
const since=(days)=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);
const cardioWords=/\b(cardio|aerobic|run|running|jog|jogging|sprint|cycle|cycling|bike|biking|row|rowing|swim|swimming|walk|walking|hike|treadmill|elliptical|cross trainer|stair|skipping|jump rope|ski erg|assault bike|spin|zumba|endurance)\b/i;
function progressData(includeCycle){
 const allowed=['weight','waist','hips','chest','arm','thigh','bodyFat','sleep','energy','stress','adherence','steps','water'];
 const checkins=[...(db.checkins||[])].filter(x=>x&&validDate(x.date)&&x.date>=since(56)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8).map(x=>{
  const row={date:x.date};for(const k of allowed){const v=n(x[k]);if(v!==null)row[k]=v}if(includeCycle){const c=n(x.cycle,90);if(c!==null&&c>=1)row.cycle=c}return row;
 });
 const training=[...(db.sessions||[])].filter(x=>x&&validDate(String(x.date||'').slice(0,10))&&String(x.date).slice(0,10)>=since(56)).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-8).map(s=>{
  const sets=Array.isArray(s.sets)?s.sets:[],rir=sets.map(x=>n(x.rir,10)).filter(x=>x!==null);
  const seconds=n(s.durationSeconds,60000)||0;
  return {date:String(s.date).slice(0,10),sets:Math.min(500,sets.length),durationMinutes:Math.max(0,Math.min(1000,Math.round(seconds/60))),...(rir.length?{averageRir:Math.round(rir.reduce((a,b)=>a+b,0)/rir.length*10)/10}:{})};
 });
 return {checkins,training,goal:String(db.coachGoal?.goal||db.profile?.goal||'not specified').slice(0,500)};
}
function coachPayload(includeCycle,includeNutrition,includeRoutines,includeTraining){
 const g=db.coachGoal||{};
 const checkins=[...(db.checkins||[])].filter(x=>x&&validDate(x.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).reverse().map(x=>{
  const o={date:x.date};for(const k of ['weight','waist','hips','sleep','energy','stress','recovery']){const v=n(x[k]);if(v!==null)o[k]=v}if(includeCycle){const v=n(x.cycle,90);if(v!==null&&v>=1)o.cycle=v}return o;
 });
 const sessions=includeTraining?[...(db.sessions||[])].filter(x=>x&&validDate(String(x.date||'').slice(0,10))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).reverse().map(x=>({date:String(x.date).slice(0,10),durationMinutes:Math.max(0,Math.min(1000,Number(x.durationMinutes)||Math.round((Number(x.durationSeconds)||0)/60))),sets:(Array.isArray(x.sets)?x.sets:[]).slice(0,40).map(s=>({exercise:String(s.exercise||'').slice(0,90),weight:n(s.weight,1500),reps:n(s.reps,1500),rir:s.rir==null?null:n(s.rir,10)})).filter(s=>s.exercise)})) : [];
 const daily=new Map();
 if(includeNutrition)for(const f of db.foods||[]){if(!f||!validDate(f.date)||f.date<since(14))continue;const day=daily.get(f.date)||{date:f.date,calories:0,protein:0,carbs:0,fat:0,entries:0};for(const k of ['calories','protein','carbs','fat'])day[k]+=n(f[k])||0;day.entries++;daily.set(f.date,day)}
 const nutrition=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-14).map(x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?Math.round(v*10)/10:v])));
 const routines=includeRoutines?(db.routines||[]).slice(0,20).map(r=>({id:String(r.id||'').slice(0,80),name:String(r.name||'').slice(0,100),exercises:(r.exercises||[]).slice(0,30).map((e,index)=>({e,index})).filter(({e})=>e.activityType!=='cardio'&&!(!e.activityType&&cardioWords.test(e.name||''))).map(({e,index})=>({index,name:String(e.name||'').slice(0,100),sets:Math.max(1,Math.min(12,Math.round(Number(e.sets)||3))),reps:Math.max(1,Math.min(100,Math.round(Number(e.reps)||10))),targetRir:Number.isInteger(e.targetRir)?Math.max(0,Math.min(10,e.targetRir)):null}))})) : [];
 const plan={macro:Object.fromEntries(['calories','protein','carbs','fat'].map(k=>[k,Math.max(0,Math.min(10000,Number(db.macro?.[k])||0))])),routines};
 return {mode:'review',message:'Review my goal, check-ins, food diary totals, recent training and current plan. Suggest specific macro or strength routine changes only when supported by the data. Explain uncertainty and say when keeping the current plan is best. Never apply changes automatically.',context:{goal:String(g.goal||db.profile?.goal||'').slice(0,1200),deadline:String(g.deadline||'').slice(0,1200),priority:String(g.priority||'').slice(0,1200),roster:String(g.roster||'').slice(0,1200),equipmentCamp:String(g.equipmentCamp||'').slice(0,1200),equipmentHome:String(g.equipmentHome||'').slice(0,1200),trainingDays:Math.max(1,Math.min(7,Math.round(Number(g.trainingDays)||5))),checkins,sessions,nutrition,plan},history:[]};
}
function previewData(){
 const cycle=!!document.getElementById('v403cycle')?.checked,nutrition=!!document.getElementById('v403nutrition')?.checked,routines=!!document.getElementById('v403routines')?.checked,training=!!document.getElementById('v403training')?.checked;
 return {goalProgressReview:progressData(cycle),coachPlanReview:coachPayload(cycle,nutrition,routines,training)};
}
function updatePreview(){const el=document.getElementById('v403preview');if(el)el.textContent=JSON.stringify(previewData(),null,2);const consent=document.getElementById('v403consent');if(consent)consent.checked=false}
window.formV23Open=function(){
 if(!(db.checkins||[]).length)return alert('Add a check-in in Progress first.');
 modal(`<h2>AI progress review · Test</h2><p class="tiny muted">Review the exact preview before consenting. The goal review receives check-in values and workout summaries. The Coach review can receive daily food totals (no food names or photos), current macro targets and strength routines. Exercise names and set results are included when training context is selected. Photos, scans, notes and your name are excluded. Suggested edits require your approval.</p>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v403nutrition" style="width:auto" checked onchange="formV403Preview()">Include food diary daily totals from the last 14 days</label>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v403routines" style="width:auto" checked onchange="formV403Preview()">Include current macro targets and strength routines for suggested changes</label>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v403training" style="width:auto" checked onchange="formV403Preview()">Include recent workout performance</label>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v403cycle" style="width:auto" onchange="formV403Preview()">Include menstrual cycle day (sensitive, optional)</label>
 <details open style="margin:12px 0"><summary style="cursor:pointer;padding:10px 0">Exact information to be sent</summary><pre id="v403preview" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;min-height:120px;overflow:auto;background:#14201a;border:1px solid #42594b;border-radius:10px;padding:12px;font-size:12px"></pre></details>
 <label style="display:flex;align-items:flex-start;gap:8px"><input type="checkbox" id="v403consent" style="width:auto">I approve sending the previewed information to Gemini for this review</label>
 <div class="actions"><button class="button" id="v403analyse" onclick="formV403Analyse()">Analyse my progress</button></div><p id="v403status" class="tiny muted"></p><div id="v403review"></div>`);
 window.formV403Preview();
};
window.formV403Preview=updatePreview;
async function postJson(path,payload){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const x=await r.json();if(!r.ok)throw Error(x.error||'Review failed');return x}
window.formV403Analyse=async function(){
 const consent=document.getElementById('v403consent'),status=document.getElementById('v403status'),host=document.getElementById('v403review'),button=document.getElementById('v403analyse');
 if(!consent?.checked)return alert('Review the exact data preview and select the consent checkbox first.');
 const data=previewData(),progress=data.goalProgressReview,coach=data.coachPlanReview;
 if(!progress.checkins.length)return alert('No check-ins recorded within the last eight weeks.');
 button.disabled=true;status.textContent='Reviewing your progress and plan…';host.replaceChildren();
 const [progressResult,coachResult]=await Promise.allSettled([postJson(CHECKIN,progress),postJson(COACH,coach)]);
 let completed=false;
 if(progressResult.status==='fulfilled'){
  try{
   const review=progressResult.value.review;
   if(!review||typeof review.summary!=='string'||!(review.goalProgressPercent===null||(Number.isInteger(review.goalProgressPercent)&&review.goalProgressPercent>=0&&review.goalProgressPercent<=100))||!['low','medium','high'].includes(review.goalProgressConfidence)||typeof review.goalProgressNote!=='string'||review.goalProgressNote.length>600)throw Error('Invalid goal progress response');
   const previous=db.goalProgress?.goal===progress.goal&&Number.isInteger(db.goalProgress?.percent)?db.goalProgress.percent:null,percent=review.goalProgressPercent;
   db.goalProgress={goal:progress.goal,percent,previousPercent:previous,change:percent!==null&&previous!==null?percent-previous:null,confidence:review.goalProgressConfidence,note:review.goalProgressNote,updatedAt:new Date().toISOString()};save();
   const heading=document.createElement('h3');heading.textContent='Progress toward your Coach goal';host.append(heading);
   const score=document.createElement('p');score.textContent=percent===null?'Not enough information for a reliable percentage yet. '+review.goalProgressNote:percent+'% · '+review.goalProgressConfidence+' confidence'+(db.goalProgress.change===null?'':' · '+(db.goalProgress.change>0?'+':'')+db.goalProgress.change+' points since the previous review');host.append(score);
   const trends=document.createElement('p');trends.className='tiny muted';trends.textContent='Approximate AI estimate based on your available check-ins, not a precise measurement.';host.append(trends);
   for(const [key,label] of [['trends','Body composition & trends'],['recovery','Recovery & lifestyle'],['cycleInsights','Cycle insights'],['uncertainties','Limitations']]){const values=review[key]||[];if(!values.length)continue;const h=document.createElement('h3');h.textContent=label;host.append(h);const ul=document.createElement('ul');for(const line of values.slice(0,5)){const li=document.createElement('li');li.textContent=String(line);ul.append(li)}host.append(ul)}
   completed=true;
  }catch(e){const p=document.createElement('p');p.className='tiny muted';p.textContent='Goal progress review: '+e.message;host.append(p)}
 }else{const p=document.createElement('p');p.className='tiny muted';p.textContent='Goal progress review unavailable: '+(progressResult.reason?.message||'Try again later.');host.append(p)}
 if(coachResult.status==='fulfilled'){
  const review=coachResult.value.review||{},h=document.createElement('h3');h.textContent='Nutrition and plan review';host.append(h);
  const reply=document.createElement('p');reply.textContent=review.reply||'No review summary returned.';host.append(reply);
  if(Array.isArray(review.suggestions)&&review.suggestions.length){const sh=document.createElement('h4');sh.textContent='Suggestions';host.append(sh);const ul=document.createElement('ul');for(const line of review.suggestions){const li=document.createElement('li');li.textContent=String(line);ul.append(li)}host.append(ul)}
  const changes=document.createElement('div');changes.id='v33proposals';host.append(changes);
  if(typeof window.formV33ShowChanges==='function')window.formV33ShowChanges(Array.isArray(review.changes)?review.changes:[],coach.context.plan);
  else{const p=document.createElement('p');p.className='tiny muted';p.textContent=review.changes?.length?'Structured changes are ready for review, but the approval panel is unavailable. Nothing was applied.':'No structured changes were proposed.';changes.append(p)}
  completed=true;
 }else{const p=document.createElement('p');p.className='tiny muted';p.textContent='Food and plan review unavailable: '+(coachResult.reason?.message||'Try again later.');host.append(p)}
 status.textContent=completed?'Review complete. Suggested macro or routine edits are not saved until you select and approve them.':'The review could not be completed.';
 button.disabled=false;
};
})();
