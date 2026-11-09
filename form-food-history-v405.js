// FORM v4.05: select the diary date for manual and AI food entries.
(function(){
'use strict';
const todayFn=window.TODAY;
const today=()=>typeof todayFn==='function'?todayFn():new Date().toISOString().slice(0,10);
const cleanDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&value<=today()?String(value):today();
let diaryDate=cleanDate(window.formFoodDiaryDate||today());
window.formFoodDiaryDate=diaryDate;
const prettyDate=value=>value===today()?'today':new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
window.formFoodHistorySetDate=function(value){diaryDate=cleanDate(value);window.formFoodDiaryDate=diaryDate;window.formFoodHistoryUpdateLogLabels(diaryDate)};
window.formFoodHistoryChooseDiaryDate=function(value){window.formFoodHistorySetDate(value);if(typeof window.render==='function')window.render()};
window.formFoodHistoryUpdateLogLabels=function(value){
 const d=cleanDate(value||diaryDate),when=d===today()?'today':prettyDate(d);
 const ai=document.querySelectorAll('#formAiReview .actions button');
 if(ai.length>=3){ai[0].textContent=d===today()?'Log today':`Log ${when}`;ai[1].textContent=d===today()?'Log today & save to Quick Add':`Log ${when} & save to Quick Add`}
 const root=document.getElementById('modalContent');
 if(window.formV404PendingAiMeal&&root?.querySelector('h2')?.textContent==='Log this meal?'){
  const buttons=root.querySelectorAll('.actions button');
  if(buttons.length>=3){buttons[0].textContent=d===today()?'Log today':`Log ${when}`;buttons[1].textContent=d===today()?'Log today & save to Quick Add':`Log ${when} & save to Quick Add`}
 }
};
function dateField(id,label='Diary date',value=diaryDate,change='formFoodHistorySetDate(this.value);formFoodHistoryUpdateLogLabels(this.value)'){
 return `<label for="${id}">${label}</label><input id="${id}" type="date" value="${cleanDate(value)}" max="${today()}" onchange="${change}">`;
}

// Let the existing Nutrition view and its daily totals render for the chosen day.
const oldNutrition=window.nutrition,oldCurrentFood=window.currentFood,oldTotals=window.totals;
function foodCardWithScroll(html,selected){
 const heading=selected===today()?"Today's food":`Food on ${prettyDate(selected)}`;
 const headingAt=html.indexOf(`<h2>${heading}</h2>`);
 if(headingAt<0)return html;
 const cardStart=html.lastIndexOf('<div class="card"',headingAt);
 const rowEnd=html.indexOf('</div>',headingAt)+6;
 if(cardStart<0||rowEnd<6)return html;
 const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=cardStart;let depth=0,cardEnd=-1,match;
 while((match=tags.exec(html))){if(match[0].startsWith('</'))depth--;else depth++;if(depth===0){cardEnd=tags.lastIndex;break}}
 if(cardEnd<0||rowEnd>=cardEnd)return html;
 return html.slice(0,rowEnd)+'<div class="form-food-history-list">'+html.slice(rowEnd,cardEnd-6)+'</div></div>'+html.slice(cardEnd);
}
if(typeof oldNutrition==='function')window.nutrition=function(){
 const selected=diaryDate;
 window.currentFood=()=> (db.foods||[]).filter(food=>food.date===selected);
 window.totals=()=>window.currentFood().reduce((a,f)=>({calories:a.calories+(Number(f.calories)||0),protein:a.protein+(Number(f.protein)||0),carbs:a.carbs+(Number(f.carbs)||0),fat:a.fat+(Number(f.fat)||0)}),{calories:0,protein:0,carbs:0,fat:0});
 try{
  let html=oldNutrition.apply(this,arguments);
  html=html.replace(/Today's food/g,selected===today()?"Today's food":`Food on ${prettyDate(selected)}`);
  html=foodCardWithScroll(html,selected);
  const dateControl=`<div class="form-food-date-control" style="display:flex;align-items:center;gap:10px;margin:0 0 14px;min-width:0"><label for="formFoodDiaryDate" style="margin:0;white-space:nowrap">Diary date</label><input id="formFoodDiaryDate" type="date" value="${selected}" max="${today()}" onchange="formFoodHistoryChooseDiaryDate(this.value)" style="width:auto;max-width:190px;min-width:0;min-height:40px;padding:7px 9px"></div>`;
  const style='<style>.form-food-history-list{max-height:230px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding-right:4px}@media(min-width:700px){.form-food-history-list{max-height:320px}}</style>';
  const titleEnd=html.indexOf('</p>',html.indexOf('<h1>Nutrition</h1>'));
  if(titleEnd>=0)return html.slice(0,titleEnd+4)+dateControl+style+html.slice(titleEnd+4);
  return dateControl+style+html;
 }finally{window.currentFood=oldCurrentFood;window.totals=oldTotals}
};

// Add a date to manual entries; retain the existing save path and Quick Add opt-in.
const oldFoodForm=window.foodForm,oldSaveFood=window.saveFood;
if(typeof oldFoodForm==='function'&&typeof oldSaveFood==='function'){
 window.foodForm=function(){modal(`<h2>Add food</h2>${dateField('formFoodEntryDate','Date eaten',diaryDate)}${field('Food / meal name','fn')}${field('Calories (kcal)','fc','number',0,'min="0"')}${field('Protein (g)','fp','number',0,'min="0"')}${field('Carbohydrates (g)','fcar','number',0,'min="0"')}${field('Fat (g)','ff','number',0,'min="0"')}<div class="actions">${btn('Save food','saveFood()')}</div>`)};
 window.saveFood=function(){
  const selected=cleanDate(document.getElementById('formFoodEntryDate')?.value||diaryDate),before=(db.foods||[]).length;
  const result=oldSaveFood.apply(this,arguments),added=(db.foods||[]).slice(before);
  if(added.length){for(const food of added)food.date=selected;save();if(typeof window.render==='function')window.render()}
  return result;
 };
}

// Keep the date visible at the final decision point for AI analysis and Coach meals.
const modalContent=document.getElementById('modalContent');
function addAiDate(){
 const host=document.getElementById('formAiReview'),actions=host?.querySelector('.actions');
 if(host&&host.children.length&&actions&&!host.querySelector('#formAiLogDate')){
  const wrap=document.createElement('div');wrap.innerHTML=dateField('formAiLogDate','Date to log',diaryDate);
  actions.parentNode.insertBefore(wrap,actions);window.formFoodHistoryUpdateLogLabels(diaryDate);
 }
}
if(modalContent&&typeof MutationObserver==='function')new MutationObserver(addAiDate).observe(modalContent,{childList:true,subtree:true});
const oldAiSave=window.formAiSaveMeal;
if(typeof oldAiSave==='function')window.formAiSaveMeal=function(saveQuick){
 const selected=cleanDate(document.getElementById('formAiLogDate')?.value||diaryDate),before=(db.foods||[]).length;
 const result=oldAiSave.apply(this,arguments),added=(db.foods||[]).slice(before);
 if(added.length){for(const food of added)food.date=selected;save();if(typeof window.render==='function')window.render()}
 return result;
};

const oldNutritionLog=window.formNutritionLog;
if(typeof oldNutritionLog==='function')window.formNutritionLog=function(){
 const result=oldNutritionLog.apply(this,arguments),root=document.getElementById('modalContent'),actions=root?.querySelector('.actions');
 if(window.formV404PendingAiMeal&&actions&&!root.querySelector('#formV404LogDate')){
  const wrap=document.createElement('div');wrap.innerHTML=dateField('formV404LogDate','Date to log',diaryDate);
  actions.parentNode.insertBefore(wrap,actions);window.formFoodHistoryUpdateLogLabels(diaryDate);
 }
 return result;
};
const oldLogChoice=window.formV404LogAiMeal;
if(typeof oldLogChoice==='function')window.formV404LogAiMeal=function(saveQuick){
 const selected=cleanDate(document.getElementById('formV404LogDate')?.value||diaryDate),before=(db.foods||[]).length;
 const result=oldLogChoice.apply(this,arguments),added=(db.foods||[]).slice(before);
 if(added.length){for(const food of added)food.date=selected;save();if(typeof window.render==='function')window.render()}
 return result;
};
})();
