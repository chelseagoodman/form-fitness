// FORM v4.04: make logging an AI meal and saving it to Quick Add one decision.
(function(){
'use strict';
const previousLog=window.formNutritionLog;
if(typeof previousLog==='function')window.formNutritionLog=function(index,recipe=false){
 const root=document.getElementById('modalContent');
 if(!root)return previousLog.apply(this,arguments);
 root.innerHTML=`<h2>Log this meal?</h2><p class="muted">Choose whether to add it to today’s food diary and whether to keep it in Saved Foods / Quick Add.</p><div class="actions"><button class="button" onclick="formV404LogAiMeal(false)">Log today</button><button class="button" onclick="formV404LogAiMeal(true)">Log today &amp; save to Quick Add</button><button class="button secondary" onclick="formV404CancelAiMeal()">Cancel</button></div>`;
 window.formV404PendingAiMeal={index,recipe,previousLog};
};
window.formV404LogAiMeal=function(saveQuick){
 const pending=window.formV404PendingAiMeal;if(!pending)return;
 const originalConfirm=window.confirm;
 window.confirm=function(message){
  const text=String(message||'');
  if(text.startsWith('Log ')&&text.includes("to today's diary?"))return true;
  if(text.startsWith('Also add'))return !!saveQuick;
  return originalConfirm.call(window,message);
 };
 try{pending.previousLog.call(window,pending.index,pending.recipe)}
 finally{window.confirm=originalConfirm;window.formV404PendingAiMeal=null}
};
window.formV404CancelAiMeal=function(){window.formV404PendingAiMeal=null;close();render()};
})();
