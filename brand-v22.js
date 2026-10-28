// FORM v2.1.1 integrated-F brand. Header follows the active theme; app icon is static gold.
(function(){
'use strict';
const mark=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 100" width="31" height="34" aria-hidden="true" style="display:block;flex:none"><path d="M12 8H83L72 26H32V43H65L55 61H32V91H12Z" fill="currentColor"/><path d="M33 46C43 34 52 35 58 40C64 29 77 29 83 39C89 48 83 59 76 64C68 69 60 69 55 65C48 70 39 70 33 64Z" fill="currentColor" opacity=".94"/><path d="M55 49C64 43 70 47 73 52" fill="none" stroke="#101716" stroke-width="4" stroke-linecap="round"/></svg>`;
function paint(){const b=document.querySelector('header .brand');if(!b)return;const metric=document.querySelector('.metric');const accent=metric?getComputedStyle(metric).color:'#E8B84F';b.innerHTML=`<span style="display:inline-flex;align-items:center;gap:2px;letter-spacing:.11em"><span style="color:${accent}">${mark}</span><span>ORM</span></span>`;b.setAttribute('aria-label','FORM Personal Fitness')}
const previousRender=render;render=function(){previousRender();paint()};
const oldChoose=window.formChooseTheme;if(typeof oldChoose==='function')window.formChooseTheme=function(id){oldChoose(id);paint()};
const oldBrightness=window.formSetThemeBrightness;if(typeof oldBrightness==='function')window.formSetThemeBrightness=function(v){oldBrightness(v);paint()};
paint();
})();
