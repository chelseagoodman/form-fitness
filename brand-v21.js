// FORM v2.1 brand mark. The header mark follows the active theme accent.
(function(){
'use strict';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" width="27" height="27"><path d="M11 44c-2-8 2-16 8-20l9 8 8-7-3-7 5-9 8 3 4 11-6 9 5 9c3 6 1 13-5 17-10 6-26 1-33-14Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M23 42c8-9 17-8 24-3" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
function apply(){const b=document.querySelector('header .brand');if(!b)return;const dot=b.querySelector('span');if(!dot)return;dot.innerHTML=svg;dot.style.cssText='display:inline-flex;vertical-align:middle;margin-left:4px;color:var(--form-brand-accent,#E8B84F)';}
const oldRender=render;render=function(){oldRender();apply()};
const oldTheme=window.formChooseTheme;if(typeof oldTheme==='function')window.formChooseTheme=function(id){oldTheme(id);apply()};
apply();
})();
