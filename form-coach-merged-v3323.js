// FORM v3.3.2.3 — Merge weekly check-in and AI trends into one Coach card.
// Presentation only: preserves check-ins, workouts, photos and AI endpoints.
(function(){
'use strict';
function mergeCoachCheckin(){
 if(page!=='coach')return;
 const app=document.getElementById('app');
 const checkin=document.getElementById('v3322-checkins');
 const trends=document.getElementById('v3321-coach-trends');
 if(!app||!checkin)return;
 const heading=checkin.querySelector('h2');
 if(heading)heading.textContent='Weekly Check-in & AI Review';
 // The main Coach navigation duplicates the check-in action in the card below.
 const mainHeading=[...app.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Personal AI Coach');
 const mainCard=mainHeading?.closest('.card');
 if(mainCard){
  for(const button of [...mainCard.querySelectorAll('button')]){
   const handler=button.getAttribute('onclick')||'';
   if(/formCoachWeekly\s*\(/.test(handler))button.remove();
  }
 }
 // Reuse the existing AI review handler and consent screen. No duplicate request path.
 if(trends){
  const reviewButton=[...trends.querySelectorAll('button')].find(b=>/formV23Open|check-in trends/i.test((b.getAttribute('onclick')||'')+' '+b.textContent));
  const section=document.createElement('div');section.id='v3323-review';
  section.style.cssText='border-top:1px solid #40564a;margin-top:14px;padding-top:12px';
  const sub=document.createElement('h3');sub.textContent='AI Progress Review · Last 8 Weeks';section.append(sub);
  const note=document.createElement('p');note.className='tiny muted';
  note.textContent='Analyse check-in and training trends with your approval. Photos and free-text notes are excluded from the existing AI review.';section.append(note);
  const button=document.createElement('button');button.className='button';button.textContent='Analyse My Progress';
  button.onclick=()=>{if(typeof window.formV23Open==='function')window.formV23Open();else alert('AI Check-in Review is unavailable.')};
  section.append(button);
  checkin.append(section);
  trends.remove();
 }else if(!document.getElementById('v3323-review')){
  const section=document.createElement('div');section.id='v3323-review';
  section.style.cssText='border-top:1px solid #40564a;margin-top:14px;padding-top:12px';
  const sub=document.createElement('h3');sub.textContent='AI Progress Review · Last 8 Weeks';section.append(sub);
  const note=document.createElement('p');note.className='tiny muted';note.textContent='Review your trends with an explicit consent preview. Photos and notes remain excluded.';section.append(note);
  const button=document.createElement('button');button.className='button';button.textContent='Analyse My Progress';
  button.onclick=()=>{if(typeof window.formV23Open==='function')window.formV23Open();else alert('AI Check-in Review is unavailable.')};section.append(button);
  checkin.append(section);
 }
}
const previousRender=render;
render=function(){const result=previousRender.apply(this,arguments);mergeCoachCheckin();return result};
})();
