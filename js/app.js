/**
 * app.js — Application controller.
 *
 * Features wired here:
 *  • Access gate — Admin (passcode) vs Guest (view only)
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
  showGate,
  hideGate,
  showChoiceScreen,
  showPasscodeScreen,
  showGateError,
  getPasscodeInput,
  applyRole,
} from './ui.js';

import { downloadPDF } from './pdf.js';

// ── Access gate (MVP auth) ────────────────────────────────
//
// TODO: this is a hardcoded MVP passcode. Replace with real
// per-user auth (Firebase Auth, etc.) before this goes further
// than a small trusted group.
const ADMIN_PASSCODE = 'GraceBoard2026';
const ROLE_KEY        = 'graceboard_role';

let role = localStorage.getItem(ROLE_KEY); // 'admin' | 'guest' | null

function _requireAdmin() {
  if (role !== 'admin') {
    showToast('View-only mode — enter the admin passcode to edit.');
    return false;
  }
  return true;
}

function chooseAdmin() {
  showPasscodeScreen();
}

function chooseGuest() {
  role = 'guest';
  localStorage.setItem(ROLE_KEY, role);
  _enterApp();
}

function backToChoice() {
  showChoiceScreen();
}

function submitPasscode() {
  const entered = getPasscodeInput();
  if (entered === ADMIN_PASSCODE) {
    role = 'admin';
    localStorage.setItem(ROLE_KEY, role);
    _enterApp();
  } else {
    showGateError();
  }
}

function logout() {
  role = null;
  localStorage.removeItem(ROLE_KEY);
  if (_unsubscribe) _unsubscribe();
  showChoiceScreen();
  showGate();
}

function _enterApp() {
  hideGate();
  applyRole(role);
  boot();
}

// ── State ─────────────────────────────────────────────────

let state = loadServiceState() ?? {
  name: 'Saturday Service',
  date: toDateStr(getNextSaturday(new Date())),
};

let editingId      = null;
let _currentRoster = [];      // in-memory cache of the live roster
let _unsubscribe   = null;    // current Firestore listener teardown fn
let _booted        = false;   // guards against double-booting

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

// ── Week navigation (available to both roles — browsing, not editing) ──

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
  if (!_requireAdmin()) { syncServiceBar(state); return; }
  const val = document.getElementById('serviceDate').value;
  if (!val) return;
  state.date = val;
  _saveState();
  updateWeekLabel(state.date);
  updateSunsetNotice(`sunset (~${sunsetLabel(state.date)})`);
  _subscribe();
}

// ── Roster CRUD (admin only) ──────────────────────────────

async function addPerson() {
  if (!_requireAdmin()) return;

  const { name, role: part, time, status } = getAddFormValues();
  if (!name || !part) { showToast('Enter a name and program part first.'); return; }

  const roster = [..._currentRoster];
  const id     = roster.length ? Math.max(...roster.map((r) => r.id)) + 1 : 1;
  roster.push({ id, name, role: part, time, status });

  await saveRoster(state.date, roster);
  resetAddForm();
  showToast(`${name} added to roster.`);
  // UI updates automatically via the onSnapshot listener
}

async function deletePerson(id) {
  if (!_requireAdmin()) return;

  const person = _currentRoster.find((r) => r.id === id);
  if (!person) return;
  if (!confirm(`Remove ${person.name} from the roster?`)) return;

  await saveRoster(state.date, _currentRoster.filter((r) => r.id !== id));
  showToast(`${person.name} removed.`);
}

function openEdit(id) {
  if (!_requireAdmin()) return;

  const person = _currentRoster.find((r) => r.id === id);
  if (!person) return;
  editingId = id;
  openModal(person);
}

async function saveEdit() {
  if (!_requireAdmin()) return;

  const { name, role: part, time, status } = getModalValues();
  if (!name || !part) { showToast('Name and program part are required.'); return; }

  const roster = _currentRoster.map((r) =>
    r.id === editingId ? { ...r, name, role: part, time, status } : r,
  );
  await saveRoster(state.date, roster);
  closeModal();
  editingId = null;
  showToast('Changes saved.');
}

// ── PDF export (available to both roles) ──────────────────

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
  if (!_requireAdmin()) { this.value = state.name; return; }
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
  chooseAdmin,
  chooseGuest,
  backToChoice,
  submitPasscode,
  logout,
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
// The clock always runs. Everything roster-related waits until
// a role has been chosen at the access gate.

function boot() {
  if (_booted) return;
  _booted = true;
  checkSunsetReset();
  _syncAll();
  setInterval(checkSunsetReset, 60_000);
}

updateClock();
setInterval(updateClock, 1_000);

if (role === 'admin' || role === 'guest') {
  hideGate();
  applyRole(role);
  boot();
} else {
  showChoiceScreen();
  showGate();
}
