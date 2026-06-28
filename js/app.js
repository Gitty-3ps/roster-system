/**
 * app.js — Application controller.
 *
 * This is the ONLY file that wires everything together.
 * It imports from:
 *   utils.js   — pure helpers
 *   storage.js — persistence layer
 *   ui.js      — DOM rendering
 *   pdf.js     — PDF export
 *
 * How to scale this further
 * ─────────────────────────
 * • Add a new feature module (e.g. js/notifications.js) and import it here.
 * • Swap the storage layer (e.g. Firebase) by editing only storage.js.
 * • Introduce a router (e.g. /pages/settings.js) and lazy-import per route.
 */

import {
  toDateStr,
  getNextSaturday,
  getSunsetTimestamp,
  sunsetLabel,
  formatDateShort,
} from './utils.js';

import {
  loadRoster,
  saveRoster,
  loadServiceState,
  saveServiceState,
} from './storage.js';

import {
  showToast,
  updateClock,
  syncServiceBar,
  updateWeekLabel,
  updateSunsetNotice,
  renderRoster,
  openModal,
  closeModal,
  getModalValues,
  getAddFormValues,
  resetAddForm,
  getFilterValue,
} from './ui.js';

import { downloadPDF } from './pdf.js';

// ── State ─────────────────────────────────────────────────

/** @type {{ name: string, date: string }} */
let state = loadServiceState() ?? {
  name: 'Saturday Service',
  date: toDateStr(getNextSaturday(new Date())),
};

/** ID of the roster entry currently open in the edit modal. */
let editingId = null;

// ── Internal helpers ──────────────────────────────────────

function _saveState() {
  saveServiceState(state);
}

async function _getRoster() {
  return await loadRoster(state.date);
}

async function _refreshRoster() {
  const roster = await _getRoster();
  renderRoster(roster, getFilterValue(), state.date);
}

async function _syncAll() {
  syncServiceBar(state);
  updateWeekLabel(state.date);
  updateSunsetNotice(`sunset (~${sunsetLabel(state.date)})`);
  await _refreshRoster();
}
// ── Sunset auto-roll ──────────────────────────────────────

function checkSunsetReset() {
  const now = Date.now();
  if (toDateStr(new Date()) === state.date && now >= getSunsetTimestamp(state.date)) {
    const next = new Date(`${state.date}T20:00:00`);
    next.setDate(next.getDate() + 7);
    state.date = toDateStr(getNextSaturday(next));
    _saveState();
    showToast('Rolled over to next Saturday.');
  }
}

// ── Week navigation ───────────────────────────────────────

async function shiftWeek(dir) {
  const d = new Date(`${state.date}T12:00:00`);
  d.setDate(d.getDate() + dir * 7);
  state.date = toDateStr(getNextSaturday(d));
  _saveState();
  await _syncAll();
  showToast(`Jumped to ${formatDateShort(state.date)}`);
}

async function resetToNextSaturday() {
  state.date = toDateStr(getNextSaturday(new Date()));
  _saveState();
  await _syncAll();
  showToast('Reset to next Saturday.');
}

async function onDateChange() {
  const val = document.getElementById('serviceDate').value;
  if (!val) return;
  state.date = val;
  _saveState();
  updateWeekLabel(state.date);
  updateSunsetNotice(`sunset (~${sunsetLabel(state.date)})`);
  await _refreshRoster();
}
// ── Roster CRUD ───────────────────────────────────────────

async function addPerson() {
  const { name, role, status } = getAddFormValues();
  if (!name || !role) {
    showToast('Enter a name and program part first.');
    return;
  }
  
  const roster = await _getRoster();
  const id     = roster.length ? Math.max(...roster.map((r) => r.id)) + 1 : 1;
  roster.push({ id, name, role, status });
  saveRoster(state.date, roster);
  resetAddForm();
  _refreshRoster();
  showToast(`${name} added to roster.`);
}


async function deletePerson(id) {
  const roster = await _getRoster();
  const person = roster.find((r) => r.id === id);
  if (!person) return;
  if (!confirm(`Remove ${person.name} from the roster?`)) return;
  await saveRoster(state.date, roster.filter((r) => r.id !== id));
  await _refreshRoster();
  showToast(`${person.name} removed.`);
}

async function openEdit(id) {
  const person = (await _getRoster()).find((r) => r.id === id);
  if (!person) return;
  editingId = id;
  openModal(person);
}

async function saveEdit() {
  const { name, role, status } = getModalValues();
  if (!name || !role) { showToast('Name and program part are required.'); return; }
  const roster = await _getRoster();
  const person = roster.find((r) => r.id === editingId);
  if (person) Object.assign(person, { name, role, status });
  await saveRoster(state.date, roster);
  await _refreshRoster();
  closeModal();
  editingId = null;
  showToast('Changes saved.');
}


// ── PDF export ────────────────────────────────────────────

async function handleDownloadPDF() {
  downloadPDF({
    serviceName: state.name,
    serviceDate: state.date,
    roster:      await _getRoster(),
    onError:     showToast,
    onSuccess:   () => showToast('PDF downloaded.'),
  });
}

// ── Event listeners ───────────────────────────────────────

document.getElementById('serviceName').addEventListener('change', function () {
  state.name = this.value.trim() || 'Saturday Service';
  _saveState();
});

document.getElementById('editModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('editModal').style.display === 'flex') {
    saveEdit();
  }
});

// ── Expose methods for inline HTML handlers ───────────────
// (needed because ES modules don't pollute the global scope)
// These are the ONLY globals this app creates.

window.app = {
  shiftWeek,
  resetToNextSaturday,
  onDateChange,
  addPerson,
  deletePerson,
  openEdit,
  saveEdit,
  closeModal,
  downloadPDF:    handleDownloadPDF,
  // exposed so the filter input's oninput handler can call it
  refreshRoster:  _refreshRoster,
};

// ── Boot ──────────────────────────────────────────────────

checkSunsetReset();
updateClock();
_syncAll();

setInterval(updateClock, 1_000);
setInterval(checkSunsetReset, 60_000);
