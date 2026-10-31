// FORM v3.8 stage 1: sign out action; no stored workout data is changed.
(function(){'use strict';
 const previousRender=render;
 render=function(){const result=previousRender.apply(this,arguments);
  if(page==='settings'){
   const root=document.getElementById('app');
   if(root&&!document.getElementById('form38Logout')){
    const card=document.createElement('div');card.className='card';card.id='form38Logout';
    const title=document.createElement('h2');title.textContent='Account security';
    const description=document.createElement('p');description.className='tiny muted';description.textContent='Sign out of FORM on this device. Your local workout and food records remain on this device.';
    const form=document.createElement('form');form.action='/form-logout';form.method='POST';
    const button=document.createElement('button');button.className='button secondary';button.textContent='Sign out';button.type='submit';
    form.append(button);card.append(title,description,form);root.append(card);
   }
  }
  return result;
 };
})();
