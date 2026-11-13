// FORM v4.15: consent-gated body-scan extraction into a check-in draft.
(function(){
'use strict';
const byId=id=>document.getElementById(id);
// Fold existing separate recovery check-ins into weekly records once, by date.
// Keep the original wellness array intact as a recoverable historical copy.
function migrateRecovery(){
 const history=Array.isArray(db.formWellnessCheckins)?db.formWellnessCheckins:[];if(!history.length)return;
 let changed=false;
 for(const w of history){if(!w||!/^\d{4}-\d{2}-\d{2}$/.test(String(w.date||'')))continue;
  let c=(db.checkins||[]).find(x=>x.date===w.date);
  if(!c){c={id:uid(),date:w.date,assets:[]};db.checkins.push(c);changed=true}
  for(const [from,to] of [['sleepQuality','sleepQuality'],['soreness','soreness'],['appetite','appetite'],['stress','stressRating']]){
   const v=Number(w[from]);if(c[to]==null&&Number.isInteger(v)&&v>=1&&v<=5){c[to]=v;changed=true}
  }
 }
 if(changed)save();
}
migrateRecovery();
const mapped={
 weight:{id:'ci_weight',min:20,max:350},
 waist:{id:'ci_waist',min:30,max:250},
 hips:{id:'ci_hips',min:30,max:250},
 chest:{id:'ci_chest',min:30,max:250},
 arm:{id:'ci_arm',min:10,max:100},
 thigh:{id:'ci_thigh',min:15,max:150},
 bodyFat:{id:'ci_bodyFat',min:1,max:70}
};
let activeScan=null,appliedScan=null,activeEditId='';
const escText=value=>String(value??'');
const n=value=>{if(value===null||value===undefined||String(value).trim()==='')return null;const x=Number(value);return Number.isFinite(x)&&x>=0?x:null};
function metricRow(container,item={}){
 const row=document.createElement('div');row.className='form-body-scan-extra-row';
 const name=document.createElement('input');name.className='form-body-scan-label';name.type='text';name.maxLength=80;name.placeholder='Measurement name';name.value=escText(item.label);name.setAttribute('aria-label','Additional measurement name');
 const value=document.createElement('input');value.className='form-body-scan-value';value.type='number';value.min='0';value.step='any';value.inputMode='decimal';value.placeholder='Value';value.value=item.value??'';value.setAttribute('aria-label','Additional measurement value');
 const unit=document.createElement('input');unit.className='form-body-scan-unit';unit.type='text';unit.maxLength=20;unit.placeholder='Unit';unit.value=escText(item.unit);unit.setAttribute('aria-label','Measurement unit');
 const remove=document.createElement('button');remove.type='button';remove.className='button secondary small';remove.textContent='Remove';remove.onclick=()=>row.remove();
 row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) minmax(70px,110px) minmax(50px,72px) auto;gap:6px;align-items:center;margin:8px 0';
 [name,value,unit,remove].forEach(el=>row.append(el));container.append(row);return row;
}
function readMetricRows(container){
 return [...container.querySelectorAll('.form-body-scan-extra-row')].map(row=>({
  label:row.querySelector('.form-body-scan-label')?.value.trim().slice(0,80)||'',
  value:n(row.querySelector('.form-body-scan-value')?.value),
  unit:row.querySelector('.form-body-scan-unit')?.value.trim().slice(0,20)||''
 })).filter(m=>m.label&&m.value!==null).slice(0,40);
}
function renderStoredMetrics(root,items){
 const list=root.querySelector('#formBodyScanSavedMetrics');if(!list)return;
 list.replaceChildren();(Array.isArray(items)?items:[]).slice(0,40).forEach(item=>metricRow(list,item));
}
const originalEdit=window.formCheckinEdit;
if(typeof originalEdit==='function')window.formCheckinEdit=function(id=''){
 activeEditId=String(id||'');activeScan=null;appliedScan=null;
 originalEdit.apply(this,arguments);
 const root=byId('modalContent');if(!root)return;
 const record=(db.checkins||[]).find(x=>x.id===id)||{};
 const card=document.createElement('section');card.className='card';card.id='formBodyScanCard';
 card.innerHTML='<h3>Import body scan</h3><p class="tiny muted">Choose a scan photo or screenshot. Crop out your name or member number first. The image is sent to Gemini only after you agree and tap Read scan. FORM does not save the image; check every extracted value before applying it.</p><label for="formBodyScanFile">Body scan image</label><input id="formBodyScanFile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"><label style="display:flex;align-items:center;gap:8px"><input id="formBodyScanConsent" type="checkbox" style="width:18px;min-height:18px;margin:0;padding:0">I agree to send this scan image to Gemini to read its measurements.</label><div class="actions"><button type="button" class="button secondary" onclick="formBodyScanRead()">Read scan</button></div><p id="formBodyScanStatus" class="tiny muted" role="status"></p><div id="formBodyScanReview"></div><h3 style="margin-top:18px">Additional scan readings</h3><p class="tiny muted">These readings are saved with this check-in and included in AI review previews only if you approve the AI review.</p><div id="formBodyScanSavedMetrics"></div><div class="actions"><button type="button" class="button secondary small" onclick="formBodyScanAddMetric()">+ Add reading</button></div><input id="formBodyScanApplied" type="hidden" value="">';
 const saveActions=root.querySelector('button[onclick^="formCheckinSave"]')?.closest('.actions');
 if(saveActions)root.insertBefore(card,saveActions);else root.append(card);
 renderStoredMetrics(root,record.scanMetrics);
};
window.formBodyScanAddMetric=function(){const list=byId('formBodyScanSavedMetrics');if(list)metricRow(list,{})};
async function compressImage(file){
 if(!file||!(/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)||/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||'')))throw Error('Choose a JPEG, PNG, WebP or HEIC scan image.');
 if(file.size>15*1024*1024)throw Error('Choose a scan image under 15 MB.');
 let image,url='';try{image=await createImageBitmap(file)}catch{image=await new Promise((resolve,reject)=>{url=URL.createObjectURL(file);const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not read that image. Try a screenshot or JPEG/PNG photo.'));img.src=url})}
 const scale=Math.min(1,1600/Math.max(image.width,image.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
 const context=canvas.getContext('2d');if(!context){image.close?.();if(url)URL.revokeObjectURL(url);throw Error('Image processing is not available in this browser.')}
 context.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();if(url)URL.revokeObjectURL(url);
 let quality=.86,data=canvas.toDataURL('image/jpeg',quality);
 while(data.length>2400000&&quality>.38){quality-=.1;data=canvas.toDataURL('image/jpeg',quality)}
 if(data.length>2400000)throw Error('Image is too large to send safely. Crop it closer to the scan results and try again.');
 return data;
}
window.formBodyScanRead=async function(){
 const file=byId('formBodyScanFile')?.files?.[0],consent=byId('formBodyScanConsent')?.checked,status=byId('formBodyScanStatus'),button=byId('formBodyScanCard')?.querySelector('button[onclick="formBodyScanRead()"]');
 if(!file)return alert('Choose a body scan photo or screenshot first.');
 if(!consent)return alert('Select the consent box before sending the scan for reading.');
 if(button)button.disabled=true;if(status)status.textContent='Preparing the image on this device…';
 try{
  const image=await compressImage(file);
  if(status)status.textContent='Sending the selected scan to Gemini for reading…';
  const response=await fetch('/api/ai/body-scan',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});
  let data;try{data=await response.json()}catch{throw Error('The scan reader returned an unreadable response.')}
  if(!response.ok){if(response.status===401)throw Error('Your app sign-in has expired. Sign in again, then reopen the check-in.');throw Error(data.error||'Could not read this scan.')}
  if(!data.scan||!Array.isArray(data.scan.measurements))throw Error('No scan values were returned. Try a clearer crop.');
  activeScan=data.scan;showReview();
  const input=byId('formBodyScanFile');if(input)input.value='';
  if(status)status.textContent=activeScan.measurements.length?'Review the readings below, then apply only the values you want.':'No measurements were clear enough to import.';
 }catch(error){if(status)status.textContent=error.message||'Could not read the scan.'}
 finally{if(button)button.disabled=false}
};
function addReviewMetric(container,measurement,index){
 const row=document.createElement('div');row.className='form-body-scan-review-row';row.dataset.index=String(index);
 row.style.cssText='display:grid;grid-template-columns:22px minmax(0,1fr) minmax(70px,110px) minmax(50px,72px);gap:6px;align-items:center;margin:8px 0';
 const check=document.createElement('input');check.type='checkbox';check.checked=true;check.style.cssText='width:18px;min-height:18px;margin:0;padding:0';
 check.setAttribute('aria-label','Use '+measurement.label);
 const label=document.createElement('span');label.textContent=measurement.label+(measurement.confidence?' · '+measurement.confidence+' confidence':'');label.style.cssText='font-size:12px;overflow-wrap:anywhere';
 const value=document.createElement('input');value.type='number';value.min='0';value.step='any';value.inputMode='decimal';value.value=String(measurement.value);value.setAttribute('aria-label',measurement.label+' value');
 const unit=document.createElement('input');unit.type='text';unit.maxLength=20;unit.value=String(measurement.unit||'');unit.setAttribute('aria-label',measurement.label+' unit');
 row.append(check,label,value,unit);container.append(row);
}
function showReview(){
 const root=byId('formBodyScanReview');if(!root||!activeScan)return;root.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Review extracted readings';root.append(heading);
 const dateWrap=document.createElement('label');dateWrap.style.cssText='display:flex;align-items:center;gap:8px';
 const dateCheck=document.createElement('input');dateCheck.type='checkbox';dateCheck.id='formBodyScanUseDate';dateCheck.checked=!!activeScan.scanDate;dateCheck.style.cssText='width:18px;min-height:18px;margin:0;padding:0';
 const dateText=document.createElement('span');dateText.textContent='Use scan date';dateWrap.append(dateCheck,dateText);root.append(dateWrap);
 const date=document.createElement('input');date.type='date';date.id='formBodyScanDate';date.value=activeScan.scanDate||'';root.append(date);
 const list=document.createElement('div');list.id='formBodyScanExtracted';root.append(list);
 activeScan.measurements.forEach((m,i)=>addReviewMetric(list,m,i));
 if(activeScan.uncertainties?.length){const p=document.createElement('p');p.className='tiny muted';p.textContent='Please double-check: '+activeScan.uncertainties.join(' · ');root.append(p)}
 const apply=document.createElement('button');apply.type='button';apply.className='button';apply.textContent='Apply selected readings to check-in';apply.onclick=applyReadings;root.append(apply);
}
const fieldRanges={weight:[20,350],waist:[30,250],hips:[30,250],chest:[30,250],arm:[10,100],thigh:[15,150],bodyFat:[1,70]};
function applyReadings(){
 if(!activeScan)return;
 const review=byId('formBodyScanExtracted'),rows=[...review.querySelectorAll('.form-body-scan-review-row')],savedList=byId('formBodyScanSavedMetrics');
 const existing=readMetricRows(savedList),merged=new Map(existing.map(m=>[m.label.toLowerCase(),m]));
 let applied=0,kept=0;
 for(const row of rows){
  const check=row.querySelector('input[type=checkbox]');if(!check?.checked)continue;
  const index=Number(row.dataset.index),original=activeScan.measurements[index];if(!original)continue;
  const label=row.querySelector('span')?.textContent.replace(/ · (high|medium|low) confidence$/,'')||original.label;
  const value=n(row.querySelectorAll('input')[1]?.value),unit=row.querySelectorAll('input')[2]?.value.trim().slice(0,20)||'';
  if(value===null)continue;
  const target=mapped[original.field],range=fieldRanges[original.field];
  if(target&&range&&value>=range[0]&&value<=range[1]){
   const input=byId(target.id);if(input){input.value=String(value);applied++;continue}
  }
  merged.set(label.toLowerCase(),{label,value,unit});kept++;
 }
 renderStoredMetrics(byId('modalContent'),[...merged.values()]);
 const useDate=byId('formBodyScanUseDate')?.checked,scanDate=byId('formBodyScanDate')?.value||'';
 if(useDate&&/^\d{4}-\d{2}-\d{2}$/.test(scanDate)&&byId('ci_date'))byId('ci_date').value=scanDate;
 appliedScan={scanDate:useDate&&/^\d{4}-\d{2}-\d{2}$/.test(scanDate)?scanDate:null,uncertainties:Array.isArray(activeScan.uncertainties)?activeScan.uncertainties.slice(0,12):[]};
 if(byId('formBodyScanApplied'))byId('formBodyScanApplied').value='1';
 const status=byId('formBodyScanStatus');if(status)status.textContent='Applied '+applied+' standard field(s) and added '+kept+' additional reading(s). Review the whole check-in and press Save check-in to keep them.';
}
const baseSave=window.formCheckinSave;
if(typeof baseSave==='function')window.formCheckinSave=function(id){
 const root=byId('modalContent'),extras=readMetricRows(root?.querySelector('#formBodyScanSavedMetrics'));
 const beforeOpen=byId('modal')?.open,wasApplied=byId('formBodyScanApplied')?.value==='1',scanMeta=appliedScan;
 const result=baseSave.apply(this,arguments);
 if(!beforeOpen||byId('modal')?.open)return result;
 const record=id?(db.checkins||[]).find(x=>x.id===id):(db.checkins||[])[db.checkins.length-1];
 if(record){
  record.scanMetrics=extras;
  if(wasApplied&&scanMeta){record.scanSource='body scan';record.scanDate=scanMeta.scanDate;record.scanUncertainties=scanMeta.uncertainties}
  save();render();
 }
 appliedScan=null;activeScan=null;return result;
};
})();

