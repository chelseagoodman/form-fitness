// FORM v3.5.1 — replace legacy preset generator entry points in Train.
// Load after form-manual-program-v35.js. No data migration or AI calls.
(function(){
  'use strict';
  const oldTrain = train;
  train = function(){
    let html = oldTrain.apply(this, arguments);
    // Remove the legacy preset-generator card, not the manual program builder.
    html = html.replace(/<div class="card"><div class="row"><div><h2>Build a personalised program<\/h2>[\s\S]*?<button class="button" onclick="formGenerator\(\)">Create program<\/button><\/div>/, '');
    // The original app also exposes a generic starter-plan shortcut.
    html = html.replace(/<button class="button secondary" onclick="generatePlan\(\)">Generate starter plan<\/button>/g, '');
    return html;
  };
  // Any old link to the preset generator now opens the manual blank builder.
  formGenerator = function(){
    if(typeof window.formManualProgramOpen === 'function')return window.formManualProgramOpen();
    alert('The manual program builder is unavailable. Refresh FORM and try again.');
  };
})();
