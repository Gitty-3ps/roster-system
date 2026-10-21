/**
 * ui.js — All DOM reads and writes.
 * Business logic lives in app.js; this module only handles rendering.
 */

import { escHtml, initials, badgeHTML, formatDateShort } from './utils.js';

// ── Toast ─────────────────────────────────────────────────

let _toastTimer = null;

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ── Access gate ───────────────────────────────────────────

export function showGate() {
  document.getElementById('gateOverlay').style.display = 'flex';
}

export function hideGate() {
  document.getElementById('gateOverlay').style.display = 'none';
}

export function showChoiceScreen() {
  document.getElementById('gateChoice').style.display = 'flex';
  document.getElementById('gatePasscode').style.display = 'none';
}

export function showPasscodeScreen() {
  document.getElementById('gateChoice').style.display = 'none';
  document.getElementById('gatePasscode').style.display = 'flex';
  document.getElementById('gateError').style.display = 'none';
  const input = document.getElementById('passcodeInput');
  input.value = '';
  input.focus();
}

export function showGateError() {
  document.getElementById('gateError').style.display = 'block';
  const input = document.getElementById('passcodeInput');
  input.value = '';
  input.focus();
}

export function getPasscodeInput() {
  return document.getElementById('passcodeInput').value;
}

/**
 * Applies the current role to the UI: toggles the guest-mode class
 * (which hides edit affordances via CSS), disables the service-bar
 * text fields for guests, and updates the role badge in the header.
 * @param {'admin'|'guest'} role
 */
export function applyRole(role) {
  const isGuest = role === 'guest';
  document.body.classList.toggle('guest-mode', isGuest);

  ['serviceName', 'serviceDate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = isGuest;
  });

  const badge = document.getElementById('roleBadge');
  if (badge) {
    badge.textContent = isGuest ? '👁 Guest — view only' : '🔒 Admin';
    badge.className = 'role-pill ' + (isGuest ? 'role-guest' : 'role-admin');
  }
}

// ── Connection status + last updated ─────────────────────

/**
 * Updates the connection pill in the header.
 * @param {'online'|'offline'} status
 */
export function setConnectionStatus(status) {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  if (status === 'online') {
    el.className        = 'connection-pill connection-online';
    el.innerHTML        = '&#x25CF; Live';
    el.title            = 'Connected — changes sync in real time';
  } else {
    el.className        = 'connection-pill connection-offline';
    el.innerHTML        = '&#x25CF; Offline';
    el.title            = 'Offline — changes will sync when back online';
  }
}

/**
 * Shows the "Last updated X ago" label.
 * @param {Date} date
 */
export function setLastUpdated(date) {
  const el = document.getElementById('lastUpdated');
  if (!el) return;

  function fmt() {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5)   return 'just now';
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  el.textContent = `Updated ${fmt()}`;

  // Refresh the "X ago" label every 30 seconds without a full re-render
  clearInterval(el._interval);
  el._interval = setInterval(() => { el.textContent = `Updated ${fmt()}`; }, 30_000);
}

// ── Clock ─────────────────────────────────────────────────

export function updateClock() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const ss  = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;
  document.getElementById('dateStr').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Service bar ───────────────────────────────────────────

export function syncServiceBar(state) {
  document.getElementById('serviceName').value = state.name;
  document.getElementById('serviceDate').value  = state.date;
}

export function updateWeekLabel(dateStr) {
  const sat   = new Date(`${dateStr}T12:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((sat - today) / 86_400_000);
  const lbl   = document.getElementById('weekLabel');
  if      (diff === 0)  lbl.innerHTML = 'this<br>Saturday';
  else if (diff === 7)  lbl.innerHTML = 'next<br>Saturday';
  else if (diff === -7) lbl.innerHTML = 'last<br>Saturday';
  else if (diff > 0)    lbl.innerHTML = `+${Math.round(diff / 7)}w`;
  else                  lbl.innerHTML = `${Math.round(diff / 7)}w`;
}

export function updateSunsetNotice(sunsetText) {
  document.getElementById('sunsetTime').textContent = sunsetText;
}

// ── Roster board ──────────────────────────────────────────

export function renderRoster(roster, filter, dateStr) {
  const filtered = roster.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(filter) ||
      p.role.toLowerCase().includes(filter) ||
      (p.time || '').toLowerCase().includes(filter) ||
      (p.note || '').toLowerCase().includes(filter),
  );

  const list = document.getElementById('rosterList');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('rosterCount');

  const unassigned = roster.filter((person) => !person.name).length;
  if (unassigned) {
    const assigned = roster.length - unassigned;
    count.textContent = `${assigned} assigned · ${unassigned} unassigned ${unassigned === 1 ? 'part' : 'parts'} for ${formatDateShort(dateStr)}`;
  } else {
    const noun = roster.length === 1 ? 'person' : 'people';
    count.textContent = `${roster.length} ${noun} on roster for ${formatDateShort(dateStr)}`;
  }

  if (roster.length === 0) {
    empty.innerHTML = '<span class="empty-icon" aria-hidden="true">✦</span><span>No one on the roster yet — add the first person above.</span>';
    empty.style.display = 'flex';
  } else if (filtered.length === 0) {
    empty.textContent = 'No entries match your search.';
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
  }

  const canReorder = !document.body.classList.contains('guest-mode');
  list.innerHTML = filtered.map((person) => `
    <div class="roster-entry-wrap" data-status="${escHtml(person.status)}">
      ${canReorder ? `<div class="swipe-delete-bg" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg>
        <span>Release to remove</span>
      </div>` : ''}
      <article class="roster-entry" data-entry-id="${person.id}" data-status="${escHtml(person.status)}" draggable="${canReorder}"${canReorder ? ' title="Drag from the grip to reorder"' : ''}>
        <div class="entry-row">
          <span class="entry-role">${escHtml(person.role)}</span>
          <span class="entry-person">
            <span class="avatar">${person.name ? initials(person.name) : '—'}</span>
            <span class="entry-name${person.name ? '' : ' entry-name-unassigned'}">${escHtml(person.name || 'Unassigned')}</span>
          </span>
          ${badgeHTML(person.status)}
          ${canReorder ? `
            <div class="entry-actions">
              <span class="entry-grip" role="button" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>
              <button class="btn btn-sm entry-icon-button" aria-label="Edit ${escHtml(person.role)} for ${escHtml(person.name)}" onclick="app.openEdit(${person.id})">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 4 4 4M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg><span class="entry-action-label">Edit</span>
              </button>
              <button class="btn btn-sm btn-danger entry-icon-button" aria-label="Remove ${escHtml(person.role)} for ${escHtml(person.name)}" onclick="app.deletePerson(${person.id})">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg><span class="entry-action-label">Remove</span>
              </button>
            </div>` : ''}
        </div>
        ${(person.time || person.note) ? `
          <div class="entry-details">
            ${person.time ? `<span class="entry-time">${escHtml(person.time)}</span>` : ''}
            ${person.note ? `<span class="entry-note">${escHtml(person.note)}</span>` : ''}
          </div>` : ''}
      </article>
    </div>`)
    .join('');
}

// ── Roster templates ─────────────────────────────────────

function templateRoleRow(role = {}) {
  return `<div class="template-role-row">
    <label class="field">
      <span>Program part</span>
      <input type="text" data-role-field="role" maxlength="80" value="${escHtml(role.role || '')}" placeholder="e.g. Opening Prayer" required />
    </label>
    <label class="field">
      <span>Time <span class="optional-badge">optional</span></span>
      <input type="text" data-role-field="time" maxlength="40" value="${escHtml(role.time || '')}" placeholder="e.g. 9:00 AM" />
    </label>
    <label class="field template-note-field">
      <span>Note <span class="optional-badge">optional</span></span>
      <input type="text" data-role-field="note" maxlength="160" value="${escHtml(role.note || '')}" placeholder="Optional instructions" />
    </label>
    <button class="btn btn-sm btn-danger template-remove-role" type="button" aria-label="Remove program part">Remove</button>
  </div>`;
}

export function renderTemplates(templates) {
  const list = document.getElementById('templateList');
  if (!templates.length) {
    const isGuest = document.body.classList.contains('guest-mode');
    list.innerHTML = isGuest
      ? '<p class="template-empty">No templates have been saved on this device yet.</p>'
      : '<p class="template-empty">No templates yet. Create one to reuse your Sabbath program parts and times.</p>';
    return;
  }

  list.innerHTML = templates.map((template) => {
    const color = /^#[0-9a-f]{6}$/i.test(template.color) ? template.color : '#3c6e47';
    const roles = Array.isArray(template.roles) ? template.roles : [];
    const preview = roles.slice(0, 3).map((role) => escHtml(role.role)).join(' · ');
    const remaining = roles.length > 3 ? ` +${roles.length - 3} more` : '';
    const roleSummary = roles.length
      ? `${preview}${remaining}`
      : 'No program parts';

    return `<article class="template-card" style="--template-color:${color}">
      <span class="template-swatch" aria-label="Template color"></span>
      <div class="template-card-copy">
        <h3>${escHtml(template.name)}</h3>
        <p class="template-card-summary">${roleSummary}</p>
        <span class="template-card-count">${roles.length} ${roles.length === 1 ? 'program part' : 'program parts'}</span>
      </div>
      <div class="template-card-actions">
        <button class="btn btn-sm btn-primary template-admin" type="button" data-template-action="apply" data-template-id="${escHtml(template.id)}">Use template</button>
        <div class="template-admin template-secondary-actions">
          <button class="btn btn-sm" type="button" data-template-action="edit" data-template-id="${escHtml(template.id)}">Edit</button>
          <button class="btn btn-sm" type="button" data-template-action="duplicate" data-template-id="${escHtml(template.id)}">Duplicate</button>
          <button class="btn btn-sm btn-danger" type="button" data-template-action="delete" data-template-id="${escHtml(template.id)}">Delete</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

export function openTemplateModal(template = null) {
  document.getElementById('templateModalTitle').textContent = template?.id ? 'Edit roster template' : 'New roster template';
  document.getElementById('templateName').value = template?.name || '';
  document.getElementById('templateColor').value = template?.color || '#3c6e47';
  const roles = template?.roles?.length ? template.roles : [{}];
  document.getElementById('templateRoleList').innerHTML = roles.map(templateRoleRow).join('');
  document.getElementById('templateModal').style.display = 'flex';
  document.getElementById('templateName').focus();
}

export function closeTemplateModal() {
  document.getElementById('templateModal').style.display = 'none';
}

export function addTemplateRoleRow(role = {}) {
  document.getElementById('templateRoleList').insertAdjacentHTML('beforeend', templateRoleRow(role));
}

export function getTemplateValues() {
  return {
    name: document.getElementById('templateName').value.trim(),
    color: document.getElementById('templateColor').value,
    roles: [...document.querySelectorAll('#templateRoleList .template-role-row')].map((row) => ({
      role: row.querySelector('[data-role-field="role"]').value.trim(),
      time: row.querySelector('[data-role-field="time"]').value.trim(),
      note: row.querySelector('[data-role-field="note"]').value.trim(),
    })),
  };
}

// ── Modal ─────────────────────────────────────────────────

export function openModal(person) {
  document.getElementById('editName').value   = person.name;
  document.getElementById('editRole').value   = person.role;
  document.getElementById('editTime').value   = person.time || '';
  document.getElementById('editNote').value   = person.note || '';
  document.getElementById('editStatus').value = person.status;
  document.getElementById('editModal').style.display = 'flex';
}

export function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

export function getModalValues() {
  return {
    name:   document.getElementById('editName').value.trim(),
    role:   document.getElementById('editRole').value.trim(),
    time:   document.getElementById('editTime').value.trim(),
    note:   document.getElementById('editNote').value.trim(),
    status: document.getElementById('editStatus').value,
  };
}

// ── Add-person form ───────────────────────────────────────

export function getAddFormValues() {
  return {
    name:   document.getElementById('newName').value.trim(),
    role:   document.getElementById('newRole').value.trim(),
    time:   document.getElementById('newTime').value.trim(),
    note:   document.getElementById('newNote').value.trim(),
    status: document.getElementById('newStatus').value,
  };
}

export function resetAddForm() {
  document.getElementById('newNote').value   = '';
  document.getElementById('newName').value   = '';
  document.getElementById('newRole').value   = '';
  document.getElementById('newTime').value   = '';
  document.getElementById('newStatus').value = 'confirmed';
}

export function getFilterValue() {
  return document.getElementById('filterInput').value.toLowerCase();
}
