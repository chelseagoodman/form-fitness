// FORM v4.08: local camera barcode scan and authenticated Open Food Facts lookup.
(function(){
'use strict';
let scanControls=null,reader=null;
const byId=id=>document.getElementById(id);
const number=value=>{if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null};
const safe=value=>esc(String(value??''));
function status(message){const el=byId('formBarcodeStatus');if(el)el.textContent=message}
function stopCamera(){try{scanControls?.stop()}catch(_){}scanControls=null;const video=byId('formBarcodeVideo');const stream=video?.srcObject;if(stream?.getTracks)stream.getTracks().forEach(track=>track.stop());if(video)video.srcObject=null}
const dialog=byId('modal');dialog?.addEventListener('close',stopCamera);

const oldNutrition=window.nutrition;
if(typeof oldNutrition==='function')window.nutrition=function(){
 let html=oldNutrition.apply(this,arguments);
 const button=html.match(/<button class="button\s*" onclick="foodForm\(\)">\+ Add food<\/button>/);
 if(!button)return html;
 const at=html.indexOf(button[0]),row=html.lastIndexOf('<div class="row">',at);
 if(row>=0)html=html.slice(0,row)+html.slice(row).replace('<div class="row">','<div class="row" style="flex-wrap:wrap">');
 return html.replace(button[0],`<button class="button" onclick="formBarcodeOpen()">Scan barcode</button>${button[0]}`);
};

window.formBarcodeOpen=function(){
 modal(`<h2>Scan food barcode</h2><p class="tiny muted">The camera reads the barcode on this device. Only the barcode number is sent for product lookup; no photo is uploaded.</p><video id="formBarcodeVideo" playsinline muted style="display:block;width:100%;max-height:250px;object-fit:cover;background:#050807;border-radius:12px"></video><p class="tiny muted" id="formBarcodeStatus">Starting camera…</p><div class="actions"><button class="button secondary small" onclick="formBarcodeStopCamera()">Stop camera</button></div><details style="margin-top:10px"><summary>Enter barcode manually</summary><label for="formBarcodeManual">Barcode number</label><input id="formBarcodeManual" inputmode="numeric" autocomplete="off" placeholder="8–14 digits"><div class="actions"><button class="button" onclick="formBarcodeManualLookup()">Look up product</button></div></details>`);
 setTimeout(startCamera,80);
};
window.formBarcodeStopCamera=stopCamera;
window.formBarcodeManualLookup=function(){window.formBarcodeLookup(byId('formBarcodeManual')?.value||'')};

async function startCamera(){
 const video=byId('formBarcodeVideo');if(!video)return;
 if(!window.ZXingBrowser?.BrowserMultiFormatReader){status('Camera scanner did not load. Enter the barcode manually below.');return}
 try{
  reader=new window.ZXingBrowser.BrowserMultiFormatReader();
  status('Allow camera access and hold the barcode steady in view.');
  scanControls=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}}},video,(result,error)=>{
   if(result){const code=result.getText();stopCamera();window.formBarcodeLookup(code)}
   else if(error&&error.name==='NotFoundException'){}
  });
 }catch(error){status('Could not open the camera. Allow camera access or enter the barcode manually below.')}
}

window.formBarcodeLookup=async function(raw){
 const code=String(raw||'').replace(/\s/g,'');
 if(!/^\d{8,14}$/.test(code)){status('Enter a barcode containing 8 to 14 digits.');return}
 status('Looking up product…');
 try{
  const response=await fetch('/api/food/barcode?code='+encodeURIComponent(code),{credentials:'same-origin',cache:'no-store'});
  let data;try{data=await response.json()}catch{throw Error('Product lookup returned an unreadable response.')}
  if(!response.ok){if(response.status===404)throw Error('Product not found. Check the barcode or add this food manually.');throw Error(data.error||'Product lookup is unavailable right now.')}
  if(!data.product)throw Error('No product details were returned. You can add this food manually.');
  stopCamera();showProduct(data.product,code);
 }catch(error){status(error.message||'Product lookup failed. Try again or add the food manually.')}
};

function showProduct(product,code){
 const root=byId('modalContent');if(!root)return;
 const n=product.nutriments||{},title=[product.brands,product.product_name].filter(Boolean).join(' · ')||product.product_name||'Packaged food';
 const hasMl=['energy-kcal_100ml','proteins_100ml','carbohydrates_100ml','fat_100ml'].some(key=>n[key]!==undefined&&n[key]!==null);
 const basis=String(product.nutrition_data_per||'').toLowerCase().includes('ml')?'ml':(hasMl&&!['energy-kcal_100g','proteins_100g','carbohydrates_100g','fat_100g'].some(key=>n[key]!==undefined&&n[key]!==null)?'ml':'g');
 const suffix=basis==='ml'?'100ml':'100g';
 const kcal=number(n['energy-kcal_'+suffix]);
 const protein=number(n['proteins_'+suffix]),carbs=number(n['carbohydrates_'+suffix]),fat=number(n['fat_'+suffix]);
 const energyFallback=number(n['energy_'+suffix]);
 const servingText=String(product.serving_size||'');
 const servingMatch=servingText.match(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i);
 const servingFromText=servingMatch&&servingMatch[2].toLowerCase()===basis?Number(servingMatch[1].replace(',','.')):null;
 const serving=servingFromText||number(product.serving_quantity)||100;
 const missing=[kcal===null&&energyFallback===null,protein===null,carbs===null,fat===null].some(Boolean);
 root.innerHTML=`<h2>Review product</h2><p class="tiny muted">Barcode ${safe(code)} · Product data from Open Food Facts. Check it against the package label.</p><p class="tiny muted">${safe(product.quantity||'')}${product.serving_size?' · Serving listed in product data (check package): '+safe(product.serving_size):''}</p><label for="formBarcodeName">Food name</label><input id="formBarcodeName" value="${safe(title)}"><label for="formBarcodeGrams">Amount eaten (${basis})</label><input id="formBarcodeGrams" type="number" min="0.1" step="0.1" value="${serving||100}" oninput="formBarcodeUpdateTotals()"><p class="tiny muted">Nutrition values are per 100 ${basis}; the totals below update as you change the amount eaten.</p><div class="grid"><div><label for="formBarcodeKcal">Calories (kcal)</label><input id="formBarcodeKcal" type="number" min="0" step="0.1" value="${kcal??(energyFallback!==null?Math.round(energyFallback/4.184*10)/10:'')}" oninput="formBarcodeUpdateTotals()"></div><div><label for="formBarcodeProtein">Protein (g)</label><input id="formBarcodeProtein" type="number" min="0" step="0.1" value="${protein??''}" oninput="formBarcodeUpdateTotals()"></div><div><label for="formBarcodeCarbs">Carbs (g)</label><input id="formBarcodeCarbs" type="number" min="0" step="0.1" value="${carbs??''}" oninput="formBarcodeUpdateTotals()"></div><div><label for="formBarcodeFat">Fat (g)</label><input id="formBarcodeFat" type="number" min="0" step="0.1" value="${fat??''}" oninput="formBarcodeUpdateTotals()"></div></div>${missing?'<p class="tiny muted">Some nutrition values are missing from the database. Fill them from the package label before saving.</p>':''}<p class="notice" id="formBarcodeTotal">Estimated amount totals will appear here.</p><label style="display:flex;align-items:center;gap:8px"><input id="formBarcodeQuick" type="checkbox" style="width:18px;min-height:18px;margin:0;padding:0">Also save to Quick Add</label><div class="actions"><button class="button" onclick="formBarcodeSave()">Log food</button><button class="button secondary" onclick="formBarcodeManual()">Add manually instead</button></div>`;
 window.formBarcodeUpdateTotals();
}

window.formBarcodeUpdateTotals=function(){
 const grams=number(byId('formBarcodeGrams')?.value),values=['formBarcodeKcal','formBarcodeProtein','formBarcodeCarbs','formBarcodeFat'].map(id=>number(byId(id)?.value));
 const el=byId('formBarcodeTotal');if(!el)return;
 if(grams===null||values.some(x=>x===null)){el.textContent='Enter the amount and all four nutrition values to calculate this entry.';return}
 const totals=values.map(x=>Math.round(x*grams/100*10)/10);
 el.textContent=`For ${grams} g: ${totals[0]} kcal · P ${totals[1]} g · C ${totals[2]} g · F ${totals[3]} g`;
};

window.formBarcodeSave=function(){
 const name=byId('formBarcodeName')?.value.trim(),grams=number(byId('formBarcodeGrams')?.value),values=['formBarcodeKcal','formBarcodeProtein','formBarcodeCarbs','formBarcodeFat'].map(id=>number(byId(id)?.value));
 if(!name)return alert('Enter a food name.');
 if(grams===null||values.some(x=>x===null))return alert('Enter the amount and all nutrition values from the package label.');
 const totals=values.map(x=>Math.round(x*grams/100*10)/10),record={id:uid(),date:window.formFoodDiaryDate||TODAY(),name,calories:totals[0],protein:totals[1],carbs:totals[2],fat:totals[3]};
 db.foods.push(record);if(!save()){db.foods.pop();alert('Unable to save; device storage may be full.');return}
 if(byId('formBarcodeQuick')?.checked)window.formSavedFoodAdd?.(record);
 stopCamera();close();render();
};
window.formBarcodeManual=function(){stopCamera();close();foodForm()};
})();
