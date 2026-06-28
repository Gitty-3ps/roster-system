/**
 * ui.js — All DOM reads and writes.
 * Business logic lives in app.js; this module only handles rendering.
 */

import { escHtml, initials, badgeHTML, formatDateShort } from './utils.js';

// ── Toast ─────────────────────────────────────────────────

let _toastTimer = null;

/**
 * Shows a temporary toast notification.
 * @param {string} msg
 */
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ── Clock ─────────────────────────────────────────────────

/**
 * Refreshes the live clock and date string in the header.
 * @param {string} [pad] — optional pad function import; we re-import for purity
 */
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

/**
 * Syncs the service-name input and service-date picker to the current state.
 * @param {{ name: string, date: string }} state
 */
export function syncServiceBar(state) {
  document.getElementById('serviceName').value = state.name;
  document.getElementById('serviceDate').value  = state.date;
}

/**
 * Updates the "this week / next week / +2w" label in the week navigator.
 * @param {string} dateStr — "YYYY-MM-DD"
 */
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

/**
 * Updates the sunset notice with the calculated time for the chosen date.
 * @param {string} sunsetText — pre-formatted string, e.g. "sunset (~6:30 PM)"
 */
export function updateSunsetNotice(sunsetText) {
  document.getElementById('sunsetTime').textContent = sunsetText;
}

// ── Roster table ──────────────────────────────────────────

/**
 * Renders the roster table rows (or the empty state).
 *
 * @param {Array}  roster  — full RosterEntry[] for the current date
 * @param {string} filter  — lowercase search string
 * @param {string} dateStr — "YYYY-MM-DD" for the count label
 */
export function renderRoster(roster, filter, dateStr) {
  const filtered = roster.filter(
    (p) =>
      p.name.toLowerCase().includes(filter) ||
      p.role.toLowerCase().includes(filter),
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

/**
 * Opens the edit modal and populates it with the given person's data.
 * @param {{ name: string, role: string, status: string }} person
 */
export function openModal(person) {
  document.getElementById('editName').value   = person.name;
  document.getElementById('editRole').value   = person.role;
  document.getElementById('editStatus').value = person.status;
  document.getElementById('editModal').style.display = 'flex';
}

/** Closes the edit modal. */
export function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

/**
 * Reads and returns the current values from the edit modal fields.
 * @returns {{ name: string, role: string, status: string }}
 */
export function getModalValues() {
  return {
    name:   document.getElementById('editName').value.trim(),
    role:   document.getElementById('editRole').value.trim(),
    status: document.getElementById('editStatus').value,
  };
}

// ── Add-person form ───────────────────────────────────────

/**
 * Reads values from the "Add person" form.
 * @returns {{ name: string, role: string, status: string }}
 */
export function getAddFormValues() {
  return {
    name:   document.getElementById('newName').value.trim(),
    role:   document.getElementById('newRole').value.trim(),
    status: document.getElementById('newStatus').value,
  };
}

/** Resets the "Add person" form back to its default state. */
export function resetAddForm() {
  document.getElementById('newName').value  = '';
  document.getElementById('newRole').value  = '';
  document.getElementById('newStatus').value = 'confirmed';
}

/** Returns the current value of the filter / search input. */
export function getFilterValue() {
  return document.getElementById('filterInput').value.toLowerCase();
}
