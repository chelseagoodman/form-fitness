// FORM v4.18: keep weekly coaching feedback outside the optional body-scan panel.
(function(){
'use strict';
const previous=window.formCoachWeekly;
if(typeof previous!=='function')return;
window.formCoachWeekly=function(){
 const result=previous.apply(this,arguments);
 const root=document.getElementById('modalContent');
 const feedback=root?.querySelector('#v31coach');
 const saveButton=root?.querySelector('button[onclick^="formCheckinSave"]');
 const saveActions=saveButton?.closest('.actions');
 if(feedback&&saveActions&&feedback.parentElement!==root)root.insertBefore(feedback,saveActions);
 return result;
};
})();
