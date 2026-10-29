// FORM v2.4: read-only training review, explicit consent, no routine mutation.
(function(){'use strict';
const n=(v,max)=>{const x=Number(v);return Number.isFinite(x)&&x>=0&&x<=max?x:null};
const date=s=>typeof s==='string'?s.slice(0,10):'';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s);
const escapeText=s=>esc(String(s??''));
const oldCoach=coach;
coach=function(){return oldCoach()+`<div class="card"><h2>AI Training Review · Test</h2><p class="tiny muted">Read-only review of recent workouts, RIR and optional recovery information. No photos, scans, names or notes are sent. Nothing is saved to routines.</p><button class="button" onclick="formV24Open()">Prepare AI training review</button></div>`};
function payload(includeRecovery,includeCycle,weeks){
 const sessions=[...(db.sessions||[])].filter(s=>validDate(date(s.date))).sort((a,b)=>date(b.date).localeCompare(date(a.date))).slice(0,12).reverse().map(s=>({
  date:date(s.date),durationMinutes:Math.min(1000,Math.max(0,Math.round((n(s.durationSeconds,60000)||0)/60))),
  sets:(s.sets||[]).slice(0,50).map(x=>({exercise:String(x.exercise||'').slice(0,90),set:n(x.set,30)||1,weight:n(x.weight,1500)||0,reps:n(x.reps,200)||0,rir:x.rir===undefined||x.rir===null?null:n(x.rir,10)})).filter(x=>x.exercise)
 })).filter(s=>s.sets.length);
 const checkins=includeRecovery?[...(db.checkins||[])].filter(c=>validDate(c.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).reverse().map(c=>{
  const r={date:c.date};for(const key of ['sleep','energy','stress']){const v=n(c[key],24);if(v!==null)r[key]=v}
  if(includeCycle){const v=n(c.cycle,90);if(v!==null&&v>=1)r.cycle=v}
  return r;
 }):[];
 return {goal:String(db.profile?.goal||'not specified').slice(0,40),blockWeeks:Number(weeks),sessions,checkins};
}
window.formV24Open=function(){
 if(!(db.sessions||[]).length)return alert('Log a test workout before running a training review.');
 modal(`<h2>AI Training Review · Test</h2><p class="tiny muted">Your exercise names, weights, reps and RIR will be sent to Gemini only if you approve. No photos, body scans, free-text notes, identifiers or full exercise library are sent.</p>
 <label>Suggested block length</label><select id="v24weeks" onchange="formV24Preview()"><option value="4">4 weeks</option><option value="6">6 weeks</option><option value="8">8 weeks</option></select>
 <label style="display:flex;align-items:center;gap:8px"><input id="v24recovery" type="checkbox" style="width:auto" onchange="formV24Preview()">Include numerical recovery check-ins (optional)</label>
 <label style="display:flex;align-items:center;gap:8px"><input id="v24cycle" type="checkbox" style="width:auto" onchange="formV24Preview()">Include cycle day when recovery data is included (sensitive, optional)</label>
 <details open><summary>Review exact information to be shared</summary><pre id="v24payload" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto"></pre></details>
 <label style="display:flex;align-items:center;gap:8px"><input id="v24consent" type="checkbox" style="width:auto">I approve sending the previewed training data to Gemini for this analysis</label>
 <div class="actions"><button class="button" id="v24analyse" onclick="formV24Analyse()">Analyse approved training</button></div><p class="tiny muted" id="v24status"></p><div id="v24result"></div>`);
 window.formV24Preview();
};
window.formV24Preview=function(){const el=document.getElementById('v24payload');if(!el)return;const r=!!document.getElementById('v24recovery')?.checked;el.textContent=JSON.stringify(payload(r,r&&!!document.getElementById('v24cycle')?.checked,document.getElementById('v24weeks')?.value||4),null,2);document.getElementById('v24consent').checked=false};
window.formV24Analyse=async function(){
 const consent=document.getElementById('v24consent'),status=document.getElementById('v24status'),host=document.getElementById('v24result'),button=document.getElementById('v24analyse');
 if(!consent?.checked)return alert('Review the preview and approve sharing first.');
 const recovery=!!document.getElementById('v24recovery')?.checked;
 const body=payload(recovery,recovery&&!!document.getElementById('v24cycle')?.checked,document.getElementById('v24weeks')?.value||4);
 if(!body.sessions.length)return alert('No valid completed sessions to analyse.');
 button.disabled=true;status.textContent='Analysing training...';host.replaceChildren();
 try{
  const response=await fetch('/api/ai/training',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Training review failed');const r=data.review;if(!r||typeof r.summary!=='string')throw Error('Invalid AI response');
  const h=document.createElement('h3');h.textContent='Suggestions only — not applied';host.append(h);
  const p=document.createElement('p');p.textContent=r.summary;host.append(p);
  const section=(name,values)=>{const title=document.createElement('h3');title.textContent=name;host.append(title);const ul=document.createElement('ul');for(const value of values||[]){const li=document.createElement('li');li.textContent=typeof value==='string'?value:`${value.exercise||''}: ${value.targetReps||''} — ${value.rationale||''}`;ul.append(li)}host.append(ul)};
  section('Progressive overload',r.progression);section('Recovery',r.recovery);
  const block=r.proposedBlock||{};section('Proposed training block',[`${block.weeks||'?'} weeks — ${block.focus||''}: ${block.rationale||''}`,...(block.weeklyGuidance||[])]);
  section('Exercise suggestions',r.exerciseSuggestions);section('Limitations',r.uncertainties);
  status.textContent='Review complete. Nothing has been saved or applied to FORM.';
 }catch(e){status.textContent=e.message||'Could not analyse training.'}finally{button.disabled=false}
};
})();
