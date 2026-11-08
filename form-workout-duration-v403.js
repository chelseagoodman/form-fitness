// FORM v4.03: let the user correct workout duration before or after saving.
(function(){
'use strict';
const priorFinish=window.finishSession,priorView=window.viewSession;
function elapsedMinutes(){
 const started=Number(sessionDraft?.startedAt)||Date.now();
 return Math.max(0,Math.min(1000,Math.round((Date.now()-started)/60000)));
}
if(typeof priorFinish==='function')window.finishSession=function(){
 if(!sessionDraft)return;
 const value=elapsedMinutes();
 modal(`<h2>Finish workout</h2><p class="muted">Check the active workout time before saving. This duration is used in your progress review.</p><label for="formV403FinishDuration">Actual workout duration (minutes)</label><input id="formV403FinishDuration" type="number" min="0" max="1000" step="1" value="${value}"><div class="actions"><button class="button" onclick="formV403FinishWithDuration()">Save workout</button><button class="button secondary" onclick="editSession()">Back to workout</button></div>`);
};
window.formV403FinishWithDuration=function(){
 const input=document.getElementById('formV403FinishDuration'),minutes=Number(input?.value);
 if(!Number.isFinite(minutes)||minutes<0||minutes>1000)return alert('Enter a duration from 0 to 1000 minutes.');
 const before=db.sessions.length,originalConfirm=window.confirm;
 let result;
 window.confirm=function(message){if(String(message||'')==='Finish and save this workout? All entered sets will be recorded.')return true;return originalConfirm.call(window,message)};
 try{result=priorFinish.apply(this,[])}finally{window.confirm=originalConfirm}
 if(db.sessions.length>before){const saved=db.sessions[db.sessions.length-1],oldSeconds=saved.durationSeconds,oldMinutes=saved.durationMinutes,oldManual=saved.durationManuallyAdjusted;saved.durationSeconds=Math.round(minutes*60);saved.durationMinutes=Math.round(minutes*10)/10;saved.durationManuallyAdjusted=true;if(!save()){saved.durationSeconds=oldSeconds;saved.durationMinutes=oldMinutes;saved.durationManuallyAdjusted=oldManual}}
 return result;
};
if(typeof priorView==='function')window.viewSession=function(id){
 const result=priorView.apply(this,arguments),session=(db.sessions||[]).find(x=>x.id===id),host=document.getElementById('modalContent');
 if(!session||!host)return result;
 const panel=document.createElement('section');panel.className='card';panel.style.marginTop='14px';
 const title=document.createElement('h3');title.textContent='Correct workout duration';panel.append(title);
 const note=document.createElement('p');note.className='tiny muted';note.textContent='The saved duration is included in Coach reviews. Correct it here if the workout was left open.';panel.append(note);
 const label=document.createElement('label');label.htmlFor='formV403SavedDuration';label.textContent='Actual workout duration (minutes)';
 const input=document.createElement('input');input.id='formV403SavedDuration';input.type='number';input.min='0';input.max='1000';input.step='1';input.value=String(Math.round((Number(session.durationSeconds)||Number(session.durationMinutes)*60||0)/6)/10);label.append(input);panel.append(label);
 const button=document.createElement('button');button.className='button secondary';button.textContent='Save corrected duration';button.onclick=()=>window.formV403SaveDuration(id);panel.append(button);host.append(panel);return result;
};
window.formV403SaveDuration=function(id){
 const session=(db.sessions||[]).find(x=>x.id===id),input=document.getElementById('formV403SavedDuration'),minutes=Number(input?.value);
 if(!session)return alert('Workout not found.');
 if(!Number.isFinite(minutes)||minutes<0||minutes>1000)return alert('Enter a duration from 0 to 1000 minutes.');
 const before={seconds:session.durationSeconds,minutes:session.durationMinutes,manual:session.durationManuallyAdjusted};
 session.durationSeconds=Math.round(minutes*60);session.durationMinutes=Math.round(minutes*10)/10;session.durationManuallyAdjusted=true;
 if(!save()){session.durationSeconds=before.seconds;session.durationMinutes=before.minutes;session.durationManuallyAdjusted=before.manual;return alert('Could not save the corrected duration. Export a backup and check browser storage.')}
 window.viewSession(id);
};
})();
