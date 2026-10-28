// FORM v2.0A.2: Body Composition + Lifestyle & Recovery check-in layout.
// Additive: keeps existing check-in data, workouts and backup format.
(function () {
  'use strict';
  const originalSave = window.formCheckinSave;
  const originalView = window.formCheckinView;
  const e = (v) => esc(String(v ?? ''));
  const field = (label, id, value, options = '') =>
    `<label for="${id}">${e(label)}</label><input id="${id}" type="number" step="any" value="${e(value)}" ${options}>`;

  window.formCheckinEdit = function (id = '') {
    const item = (db.checkins || []).find(x => x.id === id) || {};
    const height = item.height ?? db.profile?.height ?? '';
    const body = [
      ['weight', 'Weight (kg)'], ['waist', 'Waist (cm)'],
      ['hips', 'Hips (cm)'], ['chest', 'Chest (cm)'],
      ['arm', 'Arm (cm)'], ['thigh', 'Thigh (cm)'],
      ['bodyFat', 'Body fat from scan (%)']
    ];
    const lifestyle = [
      ['sleep', 'Sleep (hours/night)'], ['energy', 'Energy (1–10)'],
      ['stress', 'Stress (1–10)'], ['adherence', 'Nutrition adherence (1–10)'],
      ['steps', 'Average daily steps'], ['water', 'Water (L/day)']
    ];
    modal(`<h2>${id ? 'Edit' : 'New'} check-in</h2>
      <label for="ci_date">Check-in date</label><input id="ci_date" type="date" value="${e(item.date || TODAY())}">
      <details open class="form-checkin-section" style="margin:14px 0;padding:12px;border:1px solid #40564a;border-radius:12px">
        <summary style="font-weight:700;cursor:pointer;padding:5px 0">Body Composition</summary>
        <p class="tiny muted">Height defaults to your profile and is only changed if you edit it here.</p>
        ${field('Height (cm)', 'ci_height', height, 'min="100" max="250"')}
        ${body.map(([k,label]) => field(label, 'ci_' + k, item[k] ?? '')).join('')}
        <p class="tiny muted">Body-fat percentages from scanners are estimates; photos are not used to calculate a precise body-fat percentage.</p>
      </details>
      <details open class="form-checkin-section" style="margin:14px 0;padding:12px;border:1px solid #40564a;border-radius:12px">
        <summary style="font-weight:700;cursor:pointer;padding:5px 0">Lifestyle & Recovery</summary>
        ${lifestyle.map(([k,label]) => field(label, 'ci_' + k, item[k] ?? '')).join('')}
        ${field('Training recovery (1–10)', 'ci_recovery', item.recovery ?? '', 'min="1" max="10"')}
        ${field('Cycle day (optional)', 'ci_cycle', item.cycle ?? '', 'min="1" max="90"')}
        <label for="ci_notes">Notes / recovery</label><textarea id="ci_notes" rows="3">${e(item.notes || '')}</textarea>
      </details>
      <p class="tiny muted">Progress photos remain local to this browser and are included in current JSON backups. Do not add sensitive photos until photo storage protections are upgraded.</p>
      <div class="actions"><button class="button" onclick="formCheckinSave('${e(id)}')">Save check-in</button></div>`);
  };

  window.formCheckinSave = function (id) {
    const h = document.getElementById('ci_height')?.value.trim() ?? '';
    const r = document.getElementById('ci_recovery')?.value.trim() ?? '';
    const height = h === '' ? null : Number(h);
    const recovery = r === '' ? null : Number(r);
    if (height !== null && (!Number.isFinite(height) || height < 100 || height > 250)) {
      alert('Height must be between 100 and 250 cm.'); return;
    }
    if (recovery !== null && (!Number.isFinite(recovery) || recovery < 1 || recovery > 10)) {
      alert('Training recovery must be between 1 and 10.'); return;
    }
    const date = document.getElementById('ci_date')?.value;
    const beforeIds = new Set((db.checkins || []).map(x => x.id));
    originalSave(id);
    // Only apply extra values after a successful check-in save.
    const record = id ? db.checkins.find(x => x.id === id) :
      [...(db.checkins || [])].reverse().find(x => !beforeIds.has(x.id) && x.date === date);
    if (!record) return;
    record.height = height;
    record.recovery = recovery;
    if (height !== null) db.profile.height = String(height);
    save();
    render();
  };

  window.formCheckinView = function (id) {
    originalView(id);
    const record = (db.checkins || []).find(x => x.id === id);
    const container = document.getElementById('modalContent');
    if (!record || !container) return;
    const extra = document.createElement('div');
    extra.className = 'item';
    const height = record.height ?? db.profile?.height;
    extra.textContent = `Height: ${height || '—'} cm | Training recovery: ${record.recovery ?? '—'}/10`;
    container.insertBefore(extra, container.firstChild?.nextSibling || null);
  };
})();
