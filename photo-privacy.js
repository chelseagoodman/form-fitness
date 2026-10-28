// FORM v2.0A.3 — photo-separated backups and local comparison tools.
// No network calls. Existing FORM storage and check-in records are unchanged.
(function(){
'use strict';
const photoFields = ['assets'];
const photoTypes = new Set(['Front','Side','Back','Body scan']);
const safe = v => esc(String(v ?? ''));
function downloadJson(name,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function cleanData(){
 // Clone before stripping photo data; never mutate the live database.
 const clone=JSON.parse(JSON.stringify(db));
 clone.photo=null;
 for(const c of clone.checkins||[])c.assets=[];
 return clone;
}
exportData=function(){
 if(!confirm('Export standard FORM backup WITHOUT progress photos or scan images? Use Export photos separately to back up those images.'))return;
 downloadJson(`FORM-data-${TODAY()}.json`,{
  app:'FORM',version:1,exportedAt:new Date().toISOString(),
  photoBackupExcluded:true,data:cleanData()
 });
};
window.formExportPrivatePhotos=function(){
 const entries=(db.checkins||[]).filter(x=>(x.assets||[]).length)
   .map(x=>({id:x.id,date:x.date,assets:x.assets.map(a=>({label:a.label,data:a.data}))}));
 if(!entries.length&&!db.photo)return alert('No locally saved progress photos to export.');
 if(!confirm('This file contains PRIVATE progress photos in readable form. Save it only in a secure location. Continue?'))return;
 downloadJson(`FORM-PRIVATE-PHOTOS-${TODAY()}.json`,{
  app:'FORM',type:'private-photo-export',version:1,
  exportedAt:new Date().toISOString(),checkins:entries,
  legacyPhoto:db.photo||null
 });
};
window.formImportPrivatePhotos=function(){
 modal(`<h2>Restore private photo export</h2>
 <p class="muted">Choose a FORM-PRIVATE-PHOTOS JSON file. Existing check-in images are preserved. Photos are restored only to matching check-in IDs and dates. Keep this file private.</p>
 <input id="formPrivatePhotoFile" type="file" accept=".json,application/json">
 <div class="actions"><button class="button" onclick="formRestorePrivatePhotos()">Restore photos</button></div>`);
};
window.formRestorePrivatePhotos=async function(){
 const file=document.getElementById('formPrivatePhotoFile')?.files?.[0];
 if(!file)return alert('Select a private photo export.');
 if(file.size>30*1024*1024)return alert('File is too large for this importer (30 MB maximum).');
 let incoming;
 try{incoming=JSON.parse(await file.text())}catch{return alert('Invalid JSON file.')}
 if(incoming?.app!=='FORM'||incoming?.type!=='private-photo-export'||!Array.isArray(incoming.checkins))
  return alert('This is not a FORM private photo export.');
 const additions=[];
 for(const item of incoming.checkins){
  const target=(db.checkins||[]).find(c=>c.id===item.id&&c.date===item.date);
  if(!target||!Array.isArray(item.assets))continue;
  for(const asset of item.assets){
   if(!photoTypes.has(asset.label)||typeof asset.data!=='string'||
      !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.data)||
      asset.data.length>3000000)return alert('Photo export contains an invalid or oversized image.');
   if(!(target.assets||[]).some(a=>a.label===asset.label&&a.data===asset.data))
    additions.push({target,asset});
  }
 }
 if(!confirm(`Restore ${additions.length} image(s) to matching check-ins? This will not overwrite your workouts.`))return;
 const snapshot=(db.checkins||[]).map(c=>({id:c.id,assets:[...(c.assets||[])]}));
 const oldPhoto=db.photo;
 for(const {target,asset} of additions)(target.assets ||= []).push({...asset});
 if(!db.photo&&typeof incoming.legacyPhoto==='string'&&/^data:image\//.test(incoming.legacyPhoto))
   db.photo=incoming.legacyPhoto;
 if(!save()){
  for(const x of snapshot){const c=db.checkins.find(y=>y.id===x.id);if(c)c.assets=x.assets}
  db.photo=oldPhoto;
  return alert('Storage capacity exceeded. No photos were restored. Keep your private export safe.');
 }
 close();render();alert('Private photos restored.');
};
window.formPhotoComparison=function(){
 const photos=(db.checkins||[]).flatMap(c=>(c.assets||[]).filter(a=>photoTypes.has(a.label))
  .map(a=>({date:c.date,label:a.label,data:a.data})))
  .sort((a,b)=>a.date.localeCompare(b.date));
 if(!photos.length)return alert('No check-in photos saved yet.');
 const options=photos.map((p,i)=>`<option value="${i}">${safe(p.date)} · ${safe(p.label)}</option>`).join('');
 modal(`<h2>Private photo comparison</h2><p class="tiny muted">Images are displayed from this device only. They are not sent to Gemini or any server.</p>
 <label>Earlier photo</label><select id="photoBefore" onchange="formShowPhotoComparison()">${options}</select>
 <label>Later photo</label><select id="photoAfter" onchange="formShowPhotoComparison()">${options}</select>
 <div id="formPhotoCompareResult"></div>`);
 window.__formPhotoCompareItems=photos;
 const a=document.getElementById('photoAfter');a.value=String(photos.length-1);
 window.formShowPhotoComparison();
};
window.formShowPhotoComparison=function(){
 const list=window.__formPhotoCompareItems||[];
 const a=list[Number(document.getElementById('photoBefore')?.value)];
 const b=list[Number(document.getElementById('photoAfter')?.value)];
 const holder=document.getElementById('formPhotoCompareResult');
 if(!a||!b||!holder)return;
 holder.innerHTML=`<div class="grid">
 <div><p class="tiny muted">${safe(a.date)} · ${safe(a.label)}</p><img class="photo" alt="Earlier progress photo" src="${a.data}"></div>
 <div><p class="tiny muted">${safe(b.date)} · ${safe(b.label)}</p><img class="photo" alt="Later progress photo" src="${b.data}"></div></div>`;
};
const previousProgress=progress;
progress=function(){
 const html=previousProgress();
 const panel=`<div class="card spaced"><h2>Private photos & backups</h2>
 <p class="muted tiny">Photos remain in this browser. Standard backups now exclude photos. Photo exports are separate, unencrypted files that you must store securely.</p>
 <div class="actions">
 <button class="button secondary small" onclick="formPhotoComparison()">Compare photos</button>
 <button class="button secondary small" onclick="formExportPrivatePhotos()">Export photos</button>
 <button class="button secondary small" onclick="formImportPrivatePhotos()">Restore photos</button>
 </div></div>`;
 return html+panel;
};
})();
