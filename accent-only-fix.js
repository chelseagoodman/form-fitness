// FORM v2.0A.7 — brightness applies to accents only.
// Load after form-settings.js and settings-refinements.js.
(function () {
  'use strict';
  const KEY = 'form-theme-brightness-v1';
  const PREF = 'form-ui-preferences-v1';
  const palettes = {
    gold: ['#FFE69A','#E8B84F','#B8860B'],
    emerald: ['#91F5D0','#10B981','#047857'],
    purple: ['#E2B8FF','#A855F7','#6821A8'],
    blue: ['#9EE6FF','#38BDF8','#0284C7'],
    rose: ['#FFB4D4','#F472B6','#BE185D'],
    champagne: ['#FFF0C6','#E3C990','#A68B58'],
    mono: ['#F5F5F5','#BDBDBD','#737373']
  };
  const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  const blend = (a,b,p) => {
    const aa=rgb(a),bb=rgb(b);
    return '#'+aa.map((v,i)=>Math.round(v*(1-p)+bb[i]*p).toString(16).padStart(2,'0')).join('');
  };
  const adjust = (h,n) => n<50 ? blend(h,'#000000',(50-n)/50*0.62) : blend(h,'#FFFFFF',(n-50)/50*0.4);
  function currentTheme(){
    try{return JSON.parse(localStorage.getItem(PREF)||'{}').theme||'emerald';}
    catch{return 'emerald';}
  }
  function brightness(name){
    try{const v=JSON.parse(localStorage.getItem(KEY)||'{}')[name];return Math.max(0,Math.min(100,Number(v??50)));}
    catch{return 50;}
  }
  function refresh(){
    const name=currentTheme(),n=brightness(name);
    const [light,main,dark]=(palettes[name]||palettes.emerald).map(x=>adjust(x,n));
    // Remove previous brightness CSS which incorrectly changes backgrounds and cards.
    const previous=document.getElementById('form-theme-brightness-style');
    if(previous)previous.textContent='';
    let el=document.getElementById('form-accent-only-style');
    if(!el){el=document.createElement('style');el.id='form-accent-only-style';document.head.appendChild(el);}
    el.textContent=`
    :root, body {
  background: #101716 !important;
}

.card, dialog, .workout-card {
  background: #1b2622 !important;
  border-color: #304037 !important;
}

.nav {
  background: #17211d !important;
  border-color: #33443b !important;
}

input, select, textarea {
  background: #121b17 !important;
  border-color: #425349 !important;
}
      .button:not(.secondary):not(.danger),.tabs button.selected {
        background:linear-gradient(135deg,${light},${main} 55%,${dark})!important;
        color:#101010!important;
      }
      .progress>div{background:linear-gradient(90deg,${dark},${light})!important}
      .metric,.nav button.active,.pill,.brand span{color:${main}!important}
      .form-theme-choice.chosen{outline-color:${main}!important}
    `;
    const slider=document.getElementById('formThemeBrightness');if(slider)slider.value=String(n);
    const label=document.getElementById('formThemeBrightnessValue');if(label)label.textContent=n+'%';
  }
  const oldSet=window.formSetThemeBrightness;
  window.formSetThemeBrightness=function(v){
    if(typeof oldSet==='function')oldSet(v);
    refresh();
  };
  const oldChoose=window.formChooseTheme;
  window.formChooseTheme=function(id){
    if(typeof oldChoose==='function')oldChoose(id);
    refresh();
  };
  const oldRender=render;
  render=function(){oldRender();refresh();};
  refresh();
})();
