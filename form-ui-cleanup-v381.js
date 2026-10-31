// FORM v3.8.1: Quick Add visibility, theme-consistent buttons and Home check-in weight.
// Load after form-nutrition-ui-v372.js. No authentication or AI endpoint changes.
(function(){
'use strict';
const HIDDEN='formQuickFoodHidden';
const PREF='form-ui-preferences-v1';
const PALETTES={gold:['#FFE69A','#E8B84F','#B8860B'],emerald:['#91F5D0','#10B981','#047857'],purple:['#E2B8FF','#A855F7','#6821A8'],blue:['#9EE6FF','#38BDF8','#0284C7'],rose:['#FFB4D4','#F472B6','#BE185D'],champagne:['#FFF0C6','#E3C990','#A68B58'],mono:['#F5F5F5','#BDBDBD','#737373']};
const key=name=>String(name||'').trim().toLocaleLowerCase();
const hidden=()=>Array.isArray(db[HIDDEN])?db[HIDDEN]:[];
const safe=x=>esc(String(x??''));
function applyTheme(){
 let theme='emerald';try{theme=JSON.parse(localStorage.getItem(PREF)||'{}').theme||'emerald'}catch{}
 const [light,main,dark]=PALETTES[theme]||PALETTES.emerald;
 let style=document.getElementById('form-v381-buttons');if(!style){style=document.createElement('style');style.id='form-v381-buttons';document.head.appendChild(style)}
 style.textContent=`
 .button:not(.secondary):not(.danger),button.button:not(.secondary):not(.danger){background:linear-gradient(125deg,${light},${main} 55%,${dark})!important;color:#111!important;border-color:transparent!important}
 .button.secondary:not(.danger),button.button.secondary:not(.danger){background:transparent!important;color:${light}!important;border:1px solid ${dark}!important}
 .button.danger,button.button.danger{border-color:#d57a76!important}
 #quickFoodResults .form-v381-controls{display:flex;flex-wrap:wrap;gap:7px;align-items:center;justify-content:flex-end}
 #quickFoodResults .form-v381-controls button{white-space:nowrap}
 `;
}
const originalQuick=window.formQuickFoodRender;
window.formQuickFoodRender=function(){
 const box=document.getElementById('quickFoodResults');if(!box)return typeof originalQuick==='function'?originalQuick():undefined;
 const q=key(document.getElementById('quickFoodQuery')?.value);
 const excluded=new Set(hidden());const unique=new Map();
 for(const f of [...(db.foods||[])].reverse()){const k=key(f.name);if(k&&!excluded.has(k)&&!unique.has(k))unique.set(k,f)}
 const items=[...unique.values()].filter(f=>key(f.name).includes(q));
 box.innerHTML=items.map(f=>`<div class="item row"><div><b>${safe(f.name)}</b><div class="tiny muted">${safe(f.calories)} kcal · P ${safe(f.protein)} · C ${safe(f.carbs)} · F ${safe(f.fat)}</div></div><div class="form-v381-controls"><button class="button secondary small" data-v381-action="use" data-name="${encodeURIComponent(f.name)}">Use</button><button class="button secondary small" data-v381-action="hide" data-name="${encodeURIComponent(f.name)}">Remove</button></div></div>`).join('')||'<p class="tiny muted">No saved foods match.</p>';
};
window.formQuickFoodHide=function(encoded){
 let name;try{name=decodeURIComponent(encoded)}catch{return}
 if(!confirm('Remove "'+name+'" from Quick Add? Your logged food history will remain unchanged.'))return;
 const old=hidden().slice();db[HIDDEN]=[...new Set([...old,key(name)])];
 if(save()!==true){db[HIDDEN]=old;alert('Could not save this change.');return}
 window.formQuickFoodRender();
};
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-v381-action]');if(!button)return;
 if(button.dataset.v381Action==='hide')window.formQuickFoodHide(button.dataset.name);
 else if(button.dataset.v381Action==='use')window.formQuickFoodUse(button.dataset.name);
});
const previousHome=home;
home=function(){
 const markup=previousHome.apply(this,arguments);
 const c=[...(db.checkins||[])].filter(x=>x&&x.date&&x.weight!==null&&x.weight!==undefined&&x.weight!==''&&Number.isFinite(Number(x.weight))&&Number(x.weight)>0).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
 if(!c)return markup;
 const holder=document.createElement('div');holder.innerHTML=markup;
 const label=[...holder.querySelectorAll('.label')].find(x=>x.textContent.trim()==='Latest body weight');
 const card=label?.closest('.card');if(card){const metric=card.querySelector('.metric');const note=card.querySelector('.tiny.muted');if(metric)metric.textContent=Number(c.weight)+' kg';if(note)note.textContent=String(c.date)}
 return holder.innerHTML;
};
const oldRender=render;
render=function(){const result=oldRender.apply(this,arguments);applyTheme();return result};
const oldChoose=window.formChooseTheme;
if(typeof oldChoose==='function')window.formChooseTheme=function(){const out=oldChoose.apply(this,arguments);applyTheme();return out};
window.addEventListener('storage',e=>{if(e.key===PREF)applyTheme()});
applyTheme();
})();
