// FORM v2.0A.1 — one check-in entry point; preserves all existing data.
(function(){
'use strict';
function records(){
 const byDate=new Map();
 // Legacy measurements are read-only in this view. A check-in on the same
 // date takes precedence, with missing fields filled from the legacy entry.
 for(const x of db.measurements||[]){
   if(x?.date)byDate.set(x.date,{...x,source:'legacy'});
 }
 for(const x of db.checkins||[]){
   if(x?.date)byDate.set(x.date,{...(byDate.get(x.date)||{}),...x,source:'checkin'});
 }
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
const fmt=(v,u='')=>v===null||v===undefined||v===''?'—':esc(String(v))+u;
function latestValue(key){
 const r=records().filter(x=>x[key]!==null&&x[key]!==undefined&&x[key]!=='');
 return r.length?r[r.length-1]:null;
}
function delta(key,unit){
 const r=records().filter(x=>Number.isFinite(Number(x[key]))&&x[key]!==''&&x[key]!==null&&x[key]!==undefined);
 if(r.length<2)return 'Not enough entries for a trend';
 const d=Math.round((Number(r[r.length-1][key])-Number(r[r.length-2][key]))*10)/10;
 return `${d>0?'+':''}${d}${unit} since previous entry`;
}
const previousProgress=progress;
progress=function(){
 const rows=records(),checkins=[...(db.checkins||[])].sort((a,b)=>b.date.localeCompare(a.date));
 const w=latestValue('weight'),wa=latestValue('waist');
 const goal=db.profile.goalWeight;
 const names=[...new Set((db.routines||[]).flatMap(r=>(r.exercises||[]).map(e=>e.name)))];
 const progression=names.map(name=>{
   const e=db.routines.flatMap(r=>r.exercises||[]).find(x=>x.name===name);
   return `<div class="item"><b>${esc(name)}</b><div class="tiny muted">${esc(formLastPerformance(name))}</div><div class="tiny">${esc(formProgression(name,e?.reps||10))}</div></div>`;
 }).join('');
 return title('Body & progress','Check in once. Your measurements and trends update together.')+
 `<div class="card"><div class="row"><h2>Check-in & recovery</h2><button class="button small" onclick="formCheckinEdit()">+ Check-in</button></div>
 <p class="muted tiny">Weight, body measurements, sleep, energy, stress, steps and nutrition adherence — all in one form.</p>
 ${checkins.length?`<div class="item row"><div><b>Latest check-in · ${esc(checkins[0].date)}</b><div class="tiny muted">Weight ${fmt(checkins[0].weight,' kg')} · Waist ${fmt(checkins[0].waist,' cm')} · Energy ${fmt(checkins[0].energy,'/10')}</div></div><button class="button secondary small" onclick="formCheckinEdit('${esc(checkins[0].id)}')">Edit</button></div>`:'<p class="empty">No check-ins yet. Add your first one above.</p>'}
 <div class="actions"><button class="button secondary small" onclick="formToggleCheckinHistory()">View check-in history (${checkins.length})</button></div>
 <div id="formCheckinHistory" hidden>${checkins.map(x=>`<div class="item"><div class="row"><div><b>${esc(x.date)}</b><div class="tiny muted">Weight ${fmt(x.weight,' kg')} · Waist ${fmt(x.waist,' cm')}</div></div><button class="button secondary small" onclick="formCheckinEdit('${esc(x.id)}')">Edit</button></div><div class="actions"><button class="button secondary small" onclick="formCheckinView('${esc(x.id)}')">Details / photos</button><button class="button danger small" onclick="formCheckinDelete('${esc(x.id)}')">Delete</button></div></div>`).join('')}</div>
 </div>
 <div class="grid"><div class="card"><div class="label">Latest weight</div><div class="metric">${fmt(w?.weight,' kg')}</div><div class="tiny muted">${esc(delta('weight',' kg'))}</div></div><div class="card"><div class="label">Latest waist</div><div class="metric">${fmt(wa?.waist,' cm')}</div><div class="tiny muted">${esc(delta('waist',' cm'))}</div></div></div>
 <div class="card spaced"><div class="row"><h2>Body trends</h2><span class="pill">${rows.length} dates</span></div><label for="formTrendMetric">Measurement</label><select id="formTrendMetric" onchange="drawChart()"><option value="weight">Weight (kg)</option><option value="waist">Waist (cm)</option><option value="hips">Hips (cm)</option><option value="chest">Chest (cm)</option><option value="arm">Arm (cm)</option><option value="thigh">Thigh (cm)</option></select><canvas class="chart" id="weightChart" width="680" height="240"></canvas><p class="tiny muted">Uses saved check-ins and any older measurements. Check-ins take priority on matching dates.</p></div>
 <div class="card"><h2>Strength & progressive overload</h2><p class="tiny muted">Previous sets and suggested progression. Recommendations are rules-based.</p><div style="max-height:280px;overflow-y:auto">${progression||'<p class="empty">Create a routine first.</p>'}</div></div>
 ${db.photo?`<div class="card"><h2>Older progress photo</h2><p class="tiny muted">An older locally stored photo is still available. New check-in photos are managed in each check-in's Details / photos.</p><img class="photo" src="${db.photo}" alt="Older progress photo"><div class="actions"><button class="button secondary small" onclick="removePhoto()">Remove older photo</button></div></div>`:''}`;
};
window.formToggleCheckinHistory=function(){
 const el=document.getElementById('formCheckinHistory');
 if(el)el.hidden=!el.hidden;
};
drawChart=function(){
 const c=document.getElementById('weightChart');if(!c)return;
 const ctx=c.getContext('2d'),key=document.getElementById('formTrendMetric')?.value||'weight';
 const data=records().filter(x=>x[key]!==null&&x[key]!==undefined&&x[key]!==''&&Number.isFinite(Number(x[key]))&&Number(x[key])>0).slice(-25);
 ctx.clearRect(0,0,c.width,c.height);ctx.font='15px system-ui';ctx.fillStyle='#a6b7ab';
 if(!data.length){ctx.fillText('No '+key+' data yet',20,115);return}
 const vals=data.map(x=>Number(x[key])),low=Math.min(...vals)-1,high=Math.max(...vals)+1,pad=52;
 ctx.strokeStyle='#3c5145';ctx.lineWidth=1;
 for(let i=0;i<4;i++){const y=20+i*60;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(c.width-15,y);ctx.stroke();ctx.fillText((high-(high-low)*i/3).toFixed(1),3,y+5)}
 ctx.strokeStyle='#afe7c1';ctx.lineWidth=3;ctx.beginPath();
 vals.forEach((v,i)=>{const x=pad+(c.width-pad-20)*(vals.length===1?.5:i/(vals.length-1)),y=20+(high-v)/(high-low)*180;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
 ctx.stroke();ctx.fillStyle='#afe7c1';
 vals.forEach((v,i)=>{const x=pad+(c.width-pad-20)*(vals.length===1?.5:i/(vals.length-1)),y=20+(high-v)/(high-low)*180;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()});
};
})();
