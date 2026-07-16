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

// ── Roster table ──────────────────────────────────────────

export function renderRoster(roster, filter, dateStr) {
  const filtered = roster.filter(
    (p) =>
      p.name.toLowerCase().includes(filter) ||
      p.role.toLowerCase().includes(filter) ||
      (p.time || '').toLowerCase().includes(filter),
  );

  const tbody = document.getElementById('rosterBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('rosterCount');

  const noun = roster.length === 1 ? 'person' : 'people';
  count.textContent = `${roster.length} ${noun} on roster for ${formatDateShort(dateStr)}`;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered
    .map(
      (p) => `
      <tr>
        <td>
          <div class="name-cell">
            <span class="avatar">${initials(p.name)}</span>
            ${escHtml(p.name)}
          </div>
        </td>
        <td>${p.time ? escHtml(p.time) : '<span class="text-faint">—</span>'}</td>
        <td>${escHtml(p.role)}</td>
        <td>${badgeHTML(p.status)}</td>
        <td class="td-actions">
          <button class="btn btn-sm" onclick="app.openEdit(${p.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="app.deletePerson(${p.id})">Remove</button>
        </td>
      </tr>`,
    )
    .join('');
}

// ── Modal ─────────────────────────────────────────────────

export function openModal(person) {
  document.getElementById('editName').value   = person.name;
  document.getElementById('editRole').value   = person.role;
  document.getElementById('editTime').value   = person.time || '';
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
    status: document.getElementById('editStatus').value,
  };
}

// ── Add-person form ───────────────────────────────────────

export function getAddFormValues() {
  return {
    name:   document.getElementById('newName').value.trim(),
    role:   document.getElementById('newRole').value.trim(),
    time:   document.getElementById('newTime').value.trim(),
    status: document.getElementById('newStatus').value,
  };
}

export function resetAddForm() {
  document.getElementById('newName').value   = '';
  document.getElementById('newRole').value   = '';
  document.getElementById('newTime').value   = '';
  document.getElementById('newStatus').value = 'confirmed';
}

export function getFilterValue() {
  return document.getElementById('filterInput').value.toLowerCase();
}
