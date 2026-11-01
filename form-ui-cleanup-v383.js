// FORM v3.8.3 UI refinements.
// Keeps account actions and workout records intact; presentation only.
(function () {
  'use strict';

  const style = document.createElement('style');
  style.id = 'form-v383-ui-style';
  style.textContent = `
    .form-v383-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 14px}
    .form-v383-calendar-head button{min-width:42px}
    .form-v383-month{font-weight:750;text-align:center}
    .form-v383-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;text-align:center}
    .form-v383-weekday{color:#9aada4;font-size:11px;padding:4px 0}
    .form-v383-day,.form-v383-empty-day{min-height:47px;border-radius:11px}
    .form-v383-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:1px solid transparent;background:transparent;color:inherit;padding:4px 2px}
    .form-v383-day:hover{border-color:#8bbda0}
    .form-v383-day.is-trained{background:linear-gradient(135deg,#FFE69A,#E8B84F 55%,#B8860B)!important;color:#14100B!important;font-weight:800}
    .form-v383-day.is-selected{outline:2px solid #f4f1e8;outline-offset:1px}
    .form-v383-day-count{font-size:9px;line-height:1;opacity:.82}
    .form-v383-selected{margin-top:18px;padding-top:14px;border-top:1px solid #40564a}
    .form-v383-selected h3{margin-bottom:8px}
    .form-v383-security-section{margin-top:15px;padding-top:14px;border-top:1px solid #40564a}
    @media(max-width:360px){.form-v383-calendar{gap:2px}.form-v383-day,.form-v383-empty-day{min-height:42px;font-size:13px}}
  `;
  document.head.appendChild(style);

  const sessionDate = session => String(session?.date || '').slice(0, 10);
  const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseDate = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
  };
  const sessionsFor = day => (db.sessions || []).filter(session => sessionDate(session) === day);
  const fmtDate = value => {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : value;
  };

  let monthYear = null;
  let monthIndex = null;
  let selectedDay = null;

  function initializeCalendar() {
    if (monthYear !== null) return;
    const dates = (db.sessions || []).map(sessionDate).filter(value => parseDate(value)).sort();
    selectedDay = dates.at(-1) || localDateKey(new Date());
    const date = parseDate(selectedDay) || new Date();
    monthYear = date.getFullYear();
    monthIndex = date.getMonth();
  }

  function workoutCard(session) {
    const sets = Array.isArray(session.sets) ? session.sets : [];
    const volume = Math.round(sets.reduce((total, set) => total + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0));
    return `<div class="item row"><div><b>${esc(session.name || 'Workout')}</b><div class="tiny muted">${sets.length} sets · ${volume} kg volume</div></div><button class="button secondary small" onclick="viewSession('${esc(session.id)}')">View</button></div>`;
  }

  function calendarMarkup() {
    initializeCalendar();
    const first = new Date(monthYear, monthIndex, 1, 12);
    const daysInMonth = new Date(monthYear, monthIndex + 1, 0, 12).getDate();
    const trained = new Map();
    for (const session of db.sessions || []) {
      const date = sessionDate(session);
      if (!parseDate(date)) continue;
      trained.set(date, (trained.get(date) || 0) + 1);
    }
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first);
    const cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span class="form-v383-weekday">${day}</span>`);
    for (let i = 0; i < first.getDay(); i++) cells.push('<span class="form-v383-empty-day" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
      const date = localDateKey(new Date(monthYear, monthIndex, day, 12));
      const count = trained.get(date) || 0;
      const classes = ['form-v383-day', count ? 'is-trained' : '', selectedDay === date ? 'is-selected' : ''].filter(Boolean).join(' ');
      const label = count ? `${fmtDate(date)}, ${count} workout${count === 1 ? '' : 's'}` : fmtDate(date);
      cells.push(`<button type="button" class="${classes}" aria-label="${esc(label)}" aria-pressed="${selectedDay === date}" onclick="formV383SelectDay('${date}')"><span>${day}</span>${count ? `<span class="form-v383-day-count">${count} workout${count === 1 ? '' : 's'}</span>` : ''}</button>`);
    }
    const selectedSessions = sessionsFor(selectedDay).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const selectedMarkup = selectedSessions.length
      ? selectedSessions.map(workoutCard).join('')
      : `<p class="tiny muted">${selectedDay ? 'No workout logged on this day.' : 'Select a day to see its workouts.'}</p>`;
    const selectedTitle = selectedDay ? fmtDate(selectedDay) : 'Select a day';
    const total = (db.sessions || []).length;
    return `<div class="card"><div class="row"><div><h2>Workout History</h2><p class="tiny muted">Only days with a logged workout are highlighted.</p></div><span class="pill">${total} total</span></div><div class="form-v383-calendar-head"><button class="button secondary small" type="button" aria-label="Previous month" onclick="formV383MoveMonth(-1)">‹</button><div class="form-v383-month">${esc(monthName)}</div><button class="button secondary small" type="button" aria-label="Next month" onclick="formV383MoveMonth(1)">›</button></div><div class="form-v383-calendar" role="grid" aria-label="Workout history calendar">${cells.join('')}</div><div class="form-v383-selected"><h3>${esc(selectedTitle)}</h3>${selectedMarkup}</div></div>`;
  }

  window.formV383MoveMonth = function (direction) {
    initializeCalendar();
    const date = new Date(monthYear, monthIndex + Number(direction || 0), 1, 12);
    monthYear = date.getFullYear();
    monthIndex = date.getMonth();
    selectedDay = null;
    render();
  };

  window.formV383SelectDay = function (day) {
    if (!parseDate(day)) return;
    selectedDay = day;
    const date = parseDate(day);
    monthYear = date.getFullYear();
    monthIndex = date.getMonth();
    render();
  };

  const previousTrain = train;
  train = function () {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = previousTrain.apply(this, arguments);
    const heading = [...wrapper.querySelectorAll('h2')].find(node => node.textContent.trim().toLowerCase() === 'workout history');
    const oldCard = heading?.closest('.card');
    if (oldCard) oldCard.outerHTML = calendarMarkup();
    return wrapper.innerHTML;
  };

  function arrangeAccountSecurity() {
    if (typeof page === 'undefined' || page !== 'settings') return;
    const root = document.getElementById('app');
    if (!root) return;

    const aboutHeading = [...root.querySelectorAll('.card h2')].find(node => node.textContent.trim().toLowerCase() === 'about form');
    aboutHeading?.closest('.card')?.remove();

    const passkeys = root.querySelector('#form382PasskeyCard');
    const logout = root.querySelector('#form38Logout');
    root.querySelector('#form383AccountSecurity')?.remove();
    if (!passkeys && !logout) return;

    const card = document.createElement('section');
    card.className = 'card';
    card.id = 'form383AccountSecurity';
    const title = document.createElement('h2');
    title.textContent = 'Account Security';
    const intro = document.createElement('p');
    intro.className = 'tiny muted';
    intro.textContent = 'Manage sign-in options for this device. Your password remains available as a fallback.';
    card.append(title, intro);

    if (passkeys) {
      const section = document.createElement('div');
      section.className = 'form-v383-security-section';
      const heading = document.createElement('h3');
      heading.textContent = 'Face ID & Passkeys';
      section.append(heading);
      const description = passkeys.querySelector('p');
      const registerButton = passkeys.querySelector('button');
      const list = passkeys.querySelector('#form382Passkeys');
      if (description) section.append(description);
      if (registerButton) section.append(registerButton);
      if (list) section.append(list);
      card.append(section);
      passkeys.remove();
    }

    if (logout) {
      const section = document.createElement('div');
      section.className = 'form-v383-security-section';
      const heading = document.createElement('h3');
      heading.textContent = 'Sign Out';
      const description = logout.querySelector('p');
      const form = logout.querySelector('form');
      if (description) section.append(description);
      if (form) section.append(form);
      card.append(section);
      logout.remove();
    }

    const settingsHeader = [...root.querySelectorAll('.row')].find(row => {
      const heading = row.querySelector('h1');
      const hasHomeButton = [...row.querySelectorAll('button')].some(button => /home/i.test(button.textContent));
      return heading?.textContent.trim().toLowerCase() === 'settings' && hasHomeButton;
    });
    if (settingsHeader) settingsHeader.insertAdjacentElement('afterend', card);
    else root.prepend(card);
  }

  const previousCoach = coach;
  coach = function () {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = previousCoach.apply(this, arguments);
    for (const card of [...wrapper.querySelectorAll('.card')]) {
      const heading = [...card.querySelectorAll('h2,h3')].map(node => node.textContent.trim().toLowerCase());
      if (heading.some(text => text === 'ai nutrition coach' || text === 'what should i eat?')) card.remove();
      else {
        for (const button of [...card.querySelectorAll('button')]) {
          if (/what should i eat/i.test(button.textContent.trim())) button.remove();
        }
      }
    }
    return wrapper.innerHTML;
  };

  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    arrangeAccountSecurity();
    return result;
  };

  arrangeAccountSecurity();
})();
