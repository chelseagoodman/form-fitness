// FORM v2.3 — opt-in, numerical-only intelligent check-in preview.
(function(){'use strict';
const endpoint='/api/ai/checkin';
const allowed=['weight','waist','hips','chest','arm','thigh','bodyFat','sleep','energy','stress','adherence','steps','water'];
const n=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const originalProgress=progress;
progress=function(){return originalProgress()+`<div class="card"><h2>AI check-in review (test)</h2><p class="muted tiny">Review trends from recent check-ins. No progress photos, body scans or notes are sent. Cycle day is optional. Gemini suggestions do not change your FORM data.</p><button class="button" onclick="formV23Open()">Prepare private AI review</button></div>`};
function build(includeCycle){
 const checkins=[...(db.checkins||[])].filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).reverse().map(x=>{
  const row={date:x.date};for(const k of allowed){const v=n(x[k]);if(v!==null&&v>=0&&v<=100000)row[k]=v}
  if(includeCycle){const v=n(x.cycle);if(v!==null&&v>=1&&v<=90)row.cycle=v}
  return row;
 });
 const training=[...(db.sessions||[])].filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test((x.date||'').slice(0,10))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).reverse().map(s=>{
  const sets=Array.isArray(s.sets)?s.sets:[];const rir=sets.map(x=>n(x.rir)).filter(x=>x!==null&&x>=0&&x<=10);
  return {date:s.date.slice(0,10),sets:Math.min(500,sets.length),durationMinutes:Math.max(0,Math.min(1000,Math.round((n(s.durationSeconds)||0)/60))),...(rir.length?{averageRir:Math.round(rir.reduce((a,b)=>a+b,0)/rir.length*10)/10}:{})};
 });
 const goal=String(db.profile?.goal||'not specified').slice(0,40);
 return {checkins,training,goal};
}
window.formV23Open=function(){
 if(!(db.checkins||[]).length)return alert('Add a check-in in Progress first.');
 modal(`<h2>AI check-in review · Test</h2><p class="tiny muted">Only numerical values and dates shown in the preview are shared with Gemini after you approve. Progress photos, scans, notes, your name and exercise names are excluded.</p>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v23cycle" style="width:auto" onchange="formV23Preview()">Include menstrual cycle day (sensitive, optional)</label>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="v23consent" style="width:auto">I agree to send the previewed numerical information to Gemini for this analysis</label>
 <details><summary>Preview information to be shared</summary><pre id="v23payload" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto"></pre></details>
 <div class="actions"><button class="button" onclick="formV23Analyse()">Analyse approved check-ins</button></div><p id="v23status" class="tiny muted"></p><div id="v23review"></div>`);
 window.formV23Preview();
};
window.formV23Preview=function(){const el=document.getElementById('v23payload');if(el)el.textContent=JSON.stringify(build(!!document.getElementById('v23cycle')?.checked),null,2)};
window.formV23Analyse=async function(){
 const status=document.getElementById('v23status'),host=document.getElementById('v23review');
 if(!document.getElementById('v23consent')?.checked)return alert('Review the data preview and select the consent checkbox first.');
 const payload=build(!!document.getElementById('v23cycle')?.checked);
 if(!payload.checkins.length)return alert('No check-in values available.');
 const button=document.querySelector('#modalContent button[onclick="formV23Analyse()"]');if(button)button.disabled=true;
 status.textContent='Analysing check-in trends...';host.replaceChildren();
 try{const r=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Analysis failed');
 const review=data.review;if(!review||typeof review.summary!=='string')throw Error('Unexpected AI response');
 const h=document.createElement('h3');h.textContent='Review — suggestions only';host.append(h);
 const p=document.createElement('p');p.textContent=review.summary;host.append(p);
 for(const [key,label] of [['trends','Trends'],['recovery','Recovery'],['nutrition','Nutrition'],['training','Training'],['uncertainties','Limitations']]){
  const title=document.createElement('h3');title.textContent=label;host.append(title);const ul=document.createElement('ul');for(const line of (review[key]||[]).slice(0,5)){const li=document.createElement('li');li.textContent=String(line);ul.append(li)}host.append(ul);
 }
 status.textContent='AI suggestions are not saved or applied. You control any changes to FORM.';
 }catch(e){status.textContent=e.message||'Could not analyse check-in.'}finally{if(button)button.disabled=false}
};
})();
