// FORM v3.7.2 - Nutrition UI refinement (test branch)
// Load after form-personal-context-v371.js. No data migration or AI endpoint changes.
(function () {
  'use strict';
  const root = document.getElementById('modalContent');
  if (!root) return;
  const style = document.createElement('style');
  style.id = 'form-nutrition-v372-style';
  style.textContent = `
    #modalContent.form-nutrition-v372 #ncServingPanel {
      display:block!important;visibility:visible!important;opacity:1!important;
      padding:14px;margin:12px 0 18px;border-radius:12px;
      border:1px solid var(--border,#776044);
      background:var(--card,#29251e);position:relative;z-index:1;
    }
    #modalContent.form-nutrition-v372 #ncServingPanel label {
      display:block!important;visibility:visible!important;opacity:1!important;
      font-weight:700;margin:0 0 7px;
    }
    #modalContent.form-nutrition-v372 #ncServingPanel select {
      display:block!important;visibility:visible!important;opacity:1!important;
      width:100%!important;min-height:48px!important;
      font-size:16px!important;margin-top:8px;
    }
    #modalContent.form-nutrition-v372 .actions button.button:not(.secondary):not(.danger) {
      color:inherit;
    }
    #modalContent.form-nutrition-v372 button.form-nc-delete {
      border:1px solid currentColor;min-height:40px;
    }
  `;
  document.head.appendChild(style);
  let busy = false;
  function refresh() {
    if (busy) return;
    busy = true;
    try {
      const nutrition = !!root.querySelector('#ncResults,#ncSaved,#ncMeal,#ncServings');
      root.classList.toggle('form-nutrition-v372', nutrition);
      if (!nutrition) return;
      const select = root.querySelector('#ncServings');
      if (select) {
        let panel = root.querySelector('#ncServingPanel');
        if (!panel) {
          panel = document.createElement('div');
          panel.id = 'ncServingPanel';
          const title = document.createElement('strong');
          title.textContent = 'Adjust your serving size';
          panel.appendChild(title);
          const help = document.createElement('p');
          help.className = 'tiny muted';
          help.textContent = 'Ingredient amounts and estimated macros update for the portion you choose.';
          panel.appendChild(help);
          const label = select.closest('label');
          if (label) {
            panel.appendChild(label);
          } else {
            const wrapper = document.createElement('label');
            wrapper.textContent = 'Portions to eat';
            wrapper.appendChild(select);
            panel.appendChild(wrapper);
          }
          const result = root.querySelector('#ncResults');
          const heading = result?.querySelector('h3');
          if (heading) heading.after(panel);
          else result?.prepend(panel);
        }
      }
      const saved = root.querySelector('#ncSaved');
      if (saved) {
        saved.querySelectorAll('button').forEach(button => {
          if (button.textContent.trim() === 'Remove favourite') {
            button.textContent = 'Delete saved item';
            button.classList.add('form-nc-delete');
            button.setAttribute('aria-label','Delete this saved meal or recipe');
            // Retain existing confirm, rollback and deletion logic.
          }
        });
      }
    } finally { busy = false; }
  }
  const observer = new MutationObserver(refresh);
  observer.observe(root, {childList:true,subtree:true});
  refresh();
})();
