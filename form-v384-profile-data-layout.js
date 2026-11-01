// FORM v3.8.4: place training preferences under Personal Profile and preference
// export/restore controls under Data management.
(function () {
  'use strict';

  const style = document.createElement('style');
  style.id = 'form-v384-profile-data-layout-style';
  style.textContent = `
    #pcEntry .form-v384-training-subsection{
      margin-top:16px;
      padding-top:16px;
      border-top:1px solid #40564a;
    }
    #pcEntry .form-v384-training-subsection h2,
    #pcEntry .form-v384-training-subsection h3{margin-bottom:12px}
  `;
  document.head.appendChild(style);

  const text = element => String(element?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

  function arrangeSettings() {
    if (typeof page !== 'undefined' && page !== 'settings') return;
    const root = document.getElementById('app');
    const profile = root?.querySelector('#pcEntry');
    if (!root || !profile) return;

    const dataHeading = [...root.querySelectorAll('.card h2, .card h3')]
      .find(node => text(node) === 'data management');
    const dataCard = dataHeading?.closest('.card');

    // Move only the named export/restore buttons, leaving unrelated controls in place.
    if (dataCard) {
      const wanted = new Set([
        'export workout preferences & exercise notes',
        'restore workout preferences'
      ]);
      const buttons = [...root.querySelectorAll('button')]
        .filter(button => wanted.has(text(button)) && !dataCard.contains(button));

      if (buttons.length) {
        const sourceCards = new Set(buttons.map(button => button.closest('.card')).filter(Boolean));
        const sourceGroups = new Set(buttons.map(button => button.closest('.actions')).filter(Boolean));
        const moved = [];
        for (const group of sourceGroups) {
          const groupButtons = [...group.querySelectorAll('button')];
          if (groupButtons.every(button => buttons.includes(button))) {
            moved.push(group);
            continue;
          }
          const actionGroup = document.createElement('div');
          actionGroup.className = 'actions';
          for (const button of groupButtons) {
            if (buttons.includes(button)) actionGroup.append(button);
          }
          moved.push(actionGroup);
        }

        if (!moved.length) {
          const actionGroup = document.createElement('div');
          actionGroup.className = 'actions';
          for (const button of buttons) actionGroup.append(button);
          moved.push(actionGroup);
        }
        for (const group of moved) dataCard.append(group);

        // Remove a now-empty source card, but keep it if it has other controls.
        for (const sourceCard of sourceCards) {
          if (sourceCard && sourceCard !== dataCard &&
              !sourceCard.querySelector('button, input, select, textarea, form')) {
            sourceCard.remove();
          }
        }
      }
    }

    // Nest the Training preferences section within the Personal Profile card.
    const heading = [...root.querySelectorAll('.card h2, .card h3')]
      .find(node => text(node) === 'training preferences');
    const trainingCard = heading?.closest('.card');
    if (trainingCard && trainingCard !== profile && !profile.contains(trainingCard)) {
      trainingCard.classList.remove('card');
      trainingCard.classList.add('form-v384-training-subsection');
      profile.append(trainingCard);
    }
  }

  const previousRender = window.render;
  if (typeof previousRender === 'function') {
    window.render = function () {
      const result = previousRender.apply(this, arguments);
      arrangeSettings();
      return result;
    };
  }
  arrangeSettings();
})();
