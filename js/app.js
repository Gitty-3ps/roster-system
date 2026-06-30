/**
 * app.js — Application controller.
 *
 * Features wired here:
 *  • Real-time roster sync (Firestore onSnapshot)
 *  • Offline-first (Firestore IndexedDB persistence)
 *  • "Last updated" + online/offline status indicator
 *  • Offline-capable PDF export (jsPDF bundled via Service Worker cache)
 */

import {
  toDateStr,
  getNextSaturday,
  getSunsetTimestamp,
  sunsetLabel,
  formatDateShort,
} from './utils.js';

import {
  subscribeRoster,
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
  setConnectionStatus,
  setLastUpdated,
  openModal,
  closeModal,
  getModalValues,
  getAddFormValues,
  resetAddForm,
  getFilterValue,
} from './ui.js';

import { downloadPDF } from './pdf.js';

// ── State ─────────────────────────────────────────────────

let state = loadServiceState() ?? {
  name: 'Saturday Service',
  date: toDateStr(getNextSaturday(new Date())),
};

let editingId      = null;
let _currentRoster = [];      // in-memory cache of the live roster
let _unsubscribe   = null;    // current Firestore listener teardown fn

// ── Internal helpers ──────────────────────────────────────

function _saveState() {
  saveServiceState(state);
}

// Starts (or restarts) the real-time Firestore listener for state.date.
// Any change from any user triggers a re-render automatically.
function _subscribe() {
  if (_unsubscribe) _unsubscribe();   // tear down previous listener

  _unsubscribe = subscribeRoster(state.date, (roster, { fromCache, updatedAt }) => {
    _currentRoster = roster;
    renderRoster(roster, getFilterValue(), state.date);
    setConnectionStatus(fromCache ? 'offline' : 'online');
    if (updatedAt) setLastUpdated(updatedAt);
  });
}

async function _refreshRoster() {
  renderRoster(_currentRoster, getFilterValue(), state.date);
}

function _syncAll() {
  syncServiceBar(state);
  updateWeekLabel(state.date);
  updateSunsetNotice(`sunset (~${sunsetLabel(state.date)})`);
  _subscribe();   // subscribe (or resubscribe) for new date
}

// ── Online / offline detection ────────────────────────────

window.addEventListener('online',  () => setConnectionStatus('online'));
window.addEventListener('offline', () => setConnectionStatus('offline'));

// ── Sunset auto-roll ──────────────────────────────────────

function checkSunsetReset() {
  const now = Date.now();
  if (toDateStr(new Date()) === state.date && now >= getSunsetTimestamp(state.date)) {
    const next = new Date(`${state.date}T20:00:00`);
    next.setDate(next.getDate() + 7);
    state.date = toDateStr(getNextSaturday(next));
    _saveState();
    showToast('Rolled over to next Saturday.');
    _syncAll();
  }
}

// ── Week navigation ───────────────────────────────────────

function shiftWeek(dir) {
  const d = new Date(`${state.date}T12:00:00`);
  d.setDate(d.getDate() + dir * 7);
  state.date = toDateStr(getNextSaturday(d));
  _saveState();
  _syncAll();
  showToast(`Jumped to ${formatDateShort(state.date)}`);
}

function resetToNextSaturday() {
  state.date = toDateStr(getNextSaturday(new Date()));
  _saveState();
  _syncAll();
  showToast('Reset to next Saturday.');
}

function onDateChange() {
  const val = document.getElementById('serviceDate').value;
  if (!val) return;
  state.date = val;
  _saveState();
  updateWeekLabel(state.date);
  updateSunsetNotice(`sunset (~${sunsetLabel(state.date)})`);
  _subscribe();
}

// ── Roster CRUD ───────────────────────────────────────────

async function addPerson() {
  const { name, role, status } = getAddFormValues();
  if (!name || !role) { showToast('Enter a name and program part first.'); return; }

  const roster = [..._currentRoster];
  const id     = roster.length ? Math.max(...roster.map((r) => r.id)) + 1 : 1;
  roster.push({ id, name, role, status });

  await saveRoster(state.date, roster);
  resetAddForm();
  showToast(`${name} added to roster.`);
  // UI updates automatically via the onSnapshot listener
}

async function deletePerson(id) {
  const person = _currentRoster.find((r) => r.id === id);
  if (!person) return;
  if (!confirm(`Remove ${person.name} from the roster?`)) return;

  await saveRoster(state.date, _currentRoster.filter((r) => r.id !== id));
  showToast(`${person.name} removed.`);
}

function openEdit(id) {
  const person = _currentRoster.find((r) => r.id === id);
  if (!person) return;
  editingId = id;
  openModal(person);
}

async function saveEdit() {
  const { name, role, status } = getModalValues();
  if (!name || !role) { showToast('Name and program part are required.'); return; }

  const roster = _currentRoster.map((r) =>
    r.id === editingId ? { ...r, name, role, status } : r,
  );
  await saveRoster(state.date, roster);
  closeModal();
  editingId = null;
  showToast('Changes saved.');
}

// ── PDF export ────────────────────────────────────────────

async function handleDownloadPDF() {
  downloadPDF({
    serviceName: state.name,
    serviceDate: state.date,
    roster:      _currentRoster,
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

window.app = {
  shiftWeek,
  resetToNextSaturday,
  onDateChange,
  addPerson,
  deletePerson,
  openEdit,
  saveEdit,
  closeModal,
  downloadPDF:   handleDownloadPDF,
  refreshRoster: _refreshRoster,
};

// ── Service Worker registration (offline shell caching) ───

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('Service Worker registration failed:', err);
  });
}

// ── Boot ──────────────────────────────────────────────────

checkSunsetReset();
updateClock();
_syncAll();

setInterval(updateClock, 1_000);
setInterval(checkSunsetReset, 60_000);
