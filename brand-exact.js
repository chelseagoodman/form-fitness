// FORM v2.1.2 — Exact logo from user-supplied artwork; fix Settings initial render.
(function(){
'use strict';
function applyExactBrand(){
 const brand=document.querySelector('header .brand');
 if(!brand)return;
 brand.innerHTML='<img src="./form-logo.png" alt="FORM" style="display:block;width:min(280px,65vw);height:auto;object-fit:contain">';
 brand.style.lineHeight='1';
}
const previousRender=render;
render=function(){previousRender();applyExactBrand();};
// Previous form-settings.js initializes after app.js initial render; redraw once
// after all add-ons have loaded so Home includes the Settings button immediately.
render();
})();
