// FORM v3.5.2 — Train navigation cleanup. Load last, after v3.5.1.
// Presentation only; does not modify saved workouts, plans, or history.
(function(){
  'use strict';
  const previousTrain = train;
  train = function(){
    const original = previousTrain.apply(this, arguments);
    const holder = document.createElement('div');
    holder.innerHTML = original;
    // Remove only the old creation shortcut, retaining Edit for existing routines.
    holder.querySelectorAll('button').forEach(button => {
      const action = button.getAttribute('onclick') || '';
      if (/^\s*routineForm\(\s*\)\s*;?\s*$/.test(action) || /^\s*generatePlan\(\s*\)\s*;?\s*$/.test(action)) button.remove();
    });
    // Remove duplicate legacy generator cards, not the manual builder.
    holder.querySelectorAll('.card').forEach(card => {
      const h = card.querySelector('h2');
      if (h && /^Build a personalised program$/i.test(h.textContent.trim())) card.remove();
    });
    const builder = Array.from(holder.querySelectorAll('.card')).find(card =>
      card.querySelector('h2')?.textContent.trim() === 'Build Your Own Program'
    );
    if(builder){
      const heading = holder.querySelector('h1');
      const subtitle = holder.querySelector('.sub');
      const anchor = subtitle || heading;
      if(anchor) anchor.after(builder);
      else holder.prepend(builder);
    }
    // Hide empty toolbar after removing the two legacy shortcuts.
    holder.querySelectorAll('.actions').forEach(actions => {
      if (!actions.querySelector('button, a, input')) actions.remove();
    });
    return holder.innerHTML;
  };
})();
