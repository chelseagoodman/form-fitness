// FORM v2.0A: additive check-in tracker. Records live in db.checkins and export with FORM backups.
(function(){
'use strict';
if(!Array.isArray(db.checkins))db.checkins=[];
const E=esc;
const N=(v)=>v===''?null:Number(v);
const safeNum=(v,min,max)=>v===null||(Number.isFinite(v)&&v>=min&&v<=max);
const F=(label,id,type='number',value='',extra='')=>`<label for="${id}">${E(label)}</label><input id="${id}" type="${type}" value="${E(value??'')}" ${extra}>`;
const current=()=>[...db.checkins].sort((a,b)=>b.date.localeCompare(a.date))[0];
const metric=(name,v,unit='')=>v===null||v===undefined||v===''?'—':`${E(v)}${unit}`;
const fields=[['weight','Weight (kg)',20,350],['waist','Waist (cm)',30,250],['hips','Hips (cm)',30,250],['chest','Chest (cm)',30,250],['arm','Arm (cm)',10,100],['thigh','Thigh (cm)',15,150],['sleep','Sleep (hours/night)',0,24],['energy','Energy (1–10)',1,10],['stress','Stress (1–10)',1,10],['adherence','Nutrition adherence (1–10)',1,10],['steps','Average daily steps',0,100000],['water','Water (L/day)',0,15],['bodyFat','Body fat from scan (%)',1,70]];
const oldProgress=progress;
progress=function(){return oldProgress()+checkinPanel()};
function checkinPanel(){
 const rows=[...db.checkins].sort((a,b)=>b.date.localeCompare(a.date));const last=rows[0],prior=rows[1];
 const delta=(k,unit)=>last&&prior&&Number.isFinite(last[k])&&Number.isFinite(prior[k])?`${round(last[k]-prior[k])>0?'+':''}${round(last[k]-prior[k])}${unit} since previous`:'';
 return `<div class="card spaced"><div class="row"><h2>Check-ins & recovery</h2><button class="button small" onclick="formCheckinEdit()">+ Check-in</button></div><p class="muted tiny">Record measurements and recovery. Photos and scan reports remain on this device and are included in your FORM backup. No AI analysis yet.</p><div class="grid"><div><div class="label">Latest weight</div><b>${metric(last?.weight,' kg')}</b><div class="tiny muted">${E(delta('weight',' kg'))}</div></div><div><div class="label">Latest waist</div><b>${metric(last?.waist,' cm')}</b><div class="tiny muted">${E(delta('waist',' cm'))}</div></div></div>${rows.length?rows.map(x=>`<div class="item"><div class="row"><div><b>${E(x.date)}</b><div class="tiny muted">Weight ${metric(x.weight,' kg')} · Waist ${metric(x.waist,' cm')} · Sleep ${metric(x.sleep,' h')} · Energy ${metric(x.energy,'/10')}</div></div><button class="button secondary small" onclick="formCheckinEdit('${E(x.id)}')">Edit</button></div><div class="actions"><button class="button secondary small" onclick="formCheckinView('${E(x.id)}')">Details / photos</button><button class="button danger small" onclick="formCheckinDelete('${E(x.id)}')">Delete</button></div></div>`).join(''):'<p class="empty">No check-ins yet.</p>'}</div>`;
}
window.formCheckinEdit=function(id=''){
 const x=db.checkins.find(y=>y.id===id)||{};
 modal(`<h2>${id?'Edit':'New'} check-in</h2>${F('Date','ci_date','date',x.date||TODAY())}${fields.map(([k,l])=>F(l,'ci_'+k,'number',x[k]??'','step="any"')).join('')}${F('Cycle day (optional)','ci_cycle','number',x.cycle??'','min="1" max="90"')}<label for="ci_notes">Notes / recovery</label><textarea id="ci_notes" rows="3">${E(x.notes||'')}</textarea><p class="muted tiny">Add photos or scan reports after saving. For privacy, keep files small. Large images can exceed browser storage limits.</p><div class="actions"><button class="button" onclick="formCheckinSave('${E(id)}')">Save check-in</button></div>`);
};
window.formCheckinSave=function(id){
 const date=$('ci_date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return alert('Enter a valid date.');
 const x=db.checkins.find(y=>y.id===id)||{id:uid(),assets:[]};x.date=date;
 for(const [k,,min,max] of fields){const v=N($('ci_'+k).value);if(!safeNum(v,min,max))return alert('Check '+k+' value.');x[k]=v}
 const cycle=N($('ci_cycle').value);if(!safeNum(cycle,1,90))return alert('Check cycle day.');x.cycle=cycle;x.notes=$('ci_notes').value.slice(0,2000);
 if(!id)db.checkins.push(x);if(save()){close();render()}
};
window.formCheckinDelete=function(id){if(!confirm('Delete this check-in and its attached photos/scans?'))return;db.checkins=db.checkins.filter(x=>x.id!==id);if(save())render()};
window.formCheckinView=function(id){const x=db.checkins.find(y=>y.id===id);if(!x)return;
 modal(`<h2>Check-in · ${E(x.date)}</h2>${fields.map(([k,l])=>`<div class="item row"><span>${E(l)}</span><b>${metric(x[k])}</b></div>`).join('')}<p>${E(x.notes||'')}</p><h3>Photos & scan images</h3><p class="tiny muted">Stored locally; included in backups. Upload images only (JPEG, PNG or WebP). For PDF scans, enter the reported values above and keep the PDF separately.</p>${(x.assets||[]).map((a,i)=>`<div class="item"><b>${E(a.label)}</b><img src="${a.data}" alt="${E(a.label)}" class="photo"><button class="button danger small" onclick="formCheckinRemoveAsset('${E(id)}',${i})">Remove</button></div>`).join('')}<label>Image type</label><select id="ci_asset_type"><option value="Front">Front photo</option><option value="Side">Side photo</option><option value="Back">Back photo</option><option value="Body scan">Body scan image</option></select><input id="ci_asset_file" type="file" accept="image/jpeg,image/png,image/webp"><div class="actions"><button class="button" onclick="formCheckinAddAsset('${E(id)}')">Add image</button><button class="button secondary" onclick="formCheckinEdit('${E(id)}')">Edit values</button></div>`);
};
window.formCheckinRemoveAsset=function(id,i){const x=db.checkins.find(y=>y.id===id);if(!x||!confirm('Remove this image?'))return;x.assets.splice(i,1);if(save())formCheckinView(id)};
window.formCheckinAddAsset=function(id){const x=db.checkins.find(y=>y.id===id),file=$('ci_asset_file').files[0];if(!x||!file)return alert('Choose an image.');if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024)return alert('Choose a JPEG, PNG or WebP image under 5 MB.');const img=new Image();const reader=new FileReader();reader.onload=()=>{img.onload=()=>{const scale=Math.min(1,800/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/jpeg',0.65);x.assets=x.assets||[];if(x.assets.length>=6)return alert('Maximum 6 images per check-in.');x.assets.push({label:$('ci_asset_type').value,data});if(save())formCheckinView(id);else x.assets.pop()};img.onerror=()=>alert('Could not read image');img.src=reader.result};reader.onerror=()=>alert('Could not read file');reader.readAsDataURL(file)};
})();
