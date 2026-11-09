// FORM v3.9.4 — Save Foods to Quick Add only when explicitly chosen.
// Load after all existing FORM scripts.
(function () {
  'use strict';

  const SAVED = 'formSavedFoods';
  const HIDDEN = 'formQuickFoodHidden';
  const key = name => String(name || '').trim().toLocaleLowerCase();
  const safe = value => esc(String(value ?? ''));

  // Keep foods already available in Quick Add. New diary entries are not
  // added to the saved list unless the user confirms the prompt below.
  function savedFoods() {
    if (!Array.isArray(db[SAVED])) {
      const unique = new Map();
      for (const food of [...(db.foods || [])].reverse()) {
        const k = key(food.name);
        if (k && !unique.has(k)) unique.set(k, { ...food });
      }
      db[SAVED] = [...unique.values()];
      save();
    }
    return db[SAVED];
  }

  function addSavedFood(food, askFirst = true) {
    const name = String(food?.name || '').trim();
    const k = key(name);
    if (!k || savedFoods().some(item => key(item.name) === k)) return true;
    if (askFirst && !confirm('Also add “' + name + '” to Saved Foods / Quick Add? It will stay in your diary either way.')) return false;

    const previous = db[SAVED].slice();
    const oldHidden = Array.isArray(db[HIDDEN]) ? db[HIDDEN].slice() : [];
    db[SAVED].push({ ...food, name });
    db[HIDDEN] = oldHidden.filter(item => key(item) !== k);
    if (save() !== true) {
      db[SAVED] = previous;
      db[HIDDEN] = oldHidden;
      alert('The food was logged, but could not be added to Saved Foods.');
      return false;
    }
    window.formQuickFoodRender?.();
    return true;
  }

  // Used when another screen already asks the user to choose whether to save.
  window.formSavedFoodAdd=function(food){return addSavedFood(food,false)};

  // Existing logged foods stay available. Newly logged foods trigger a
  // separate opt-in after the diary save succeeds.
  function wrapLog(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.formSavedFoodOptIn) return;
    const wrapped = function (...args) {
      const before = Array.isArray(db.foods) ? db.foods.length : 0;
      const result = original.apply(this, args);
      const added = (db.foods || []).slice(before);
      added.forEach(food => addSavedFood(food));
      return result;
    };
    wrapped.formSavedFoodOptIn = true;
    window[name] = wrapped;
  }

  wrapLog('saveFood');
  wrapLog('formNutritionLog');

  // AI-reviewed meals use a closure-local click handler, so observe its
  // Save button and offer the same choice after its diary save completes.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('#formAiReview button');
    if (!button || button.textContent.trim() !== 'Save reviewed meal to FORM') return;
    const before = Array.isArray(db.foods) ? db.foods.length : 0;
    setTimeout(() => {
      const added = (db.foods || []).slice(before);
      if (added.length) addSavedFood(added[added.length - 1]);
    }, 0);
  }, true);

  // Render only explicitly saved foods. Keep the existing Use and Remove
  // actions, which preserve diary history and use the stored macros.
  const oldQuickRender = window.formQuickFoodRender;
  window.formQuickFoodRender = function () {
    const box = document.getElementById('quickFoodResults');
    if (!box) return typeof oldQuickRender === 'function' ? oldQuickRender() : undefined;
    const query = key(document.getElementById('quickFoodQuery')?.value);
    const excluded = new Set((db[HIDDEN] || []).map(key));
    const unique = new Map();
    for (const food of [...savedFoods()].reverse()) {
      const k = key(food.name);
      if (k && !excluded.has(k) && !unique.has(k)) unique.set(k, food);
    }
    const items = [...unique.values()].filter(food => key(food.name).includes(query));
    box.innerHTML = items.map(food => `<div class="item row"><div><b>${safe(food.name)}</b><div class="tiny muted">${safe(food.calories)} kcal · P ${safe(food.protein)} · C ${safe(food.carbs)} · F ${safe(food.fat)}</div></div><div class="form-v381-controls"><button class="button secondary small" data-v381-action="use" data-name="${encodeURIComponent(food.name)}">Use</button><button class="button secondary small" data-v381-action="hide" data-name="${encodeURIComponent(food.name)}">Remove</button></div></div>`).join('') || '<p class="tiny muted">No saved foods match.</p>';
  };

  // Clarify that only saved items appear in the reusable list.
  const oldNutrition = nutrition;
  nutrition = function () {
    return oldNutrition.apply(this, arguments).replace(
      'Search foods you have logged before. Reuse their macros and edit before saving.',
      'Search foods you chose to save. Reuse their macros and edit before saving.'
    );
  };

  savedFoods();
  if (typeof render === 'function' && page === 'nutrition') window.formQuickFoodRender();
})();
