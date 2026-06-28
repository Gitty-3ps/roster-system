// /**
//  * storage.js — All persistence logic lives here.
//  *
//  * Currently backed by localStorage for simplicity, but the
//  * interface is intentionally thin so you can swap to Firebase,
//  * IndexedDB, or a REST API by editing ONLY this file.
//  *
//  * Public API
//  * ----------
//  *   loadRoster(dateStr)         → RosterEntry[]
//  *   saveRoster(dateStr, roster) → void
//  *   loadServiceState()          → ServiceState | null
//  *   saveServiceState(state)     → void
//  */

// /** @typedef {{ id: number, name: string, role: string, status: string }} RosterEntry */
// /** @typedef {{ name: string, date: string }} ServiceState */

// const ROSTER_PREFIX = 'graceboard_roster_';
// const SERVICE_KEY   = 'graceboard_service';

// // ── Roster ────────────────────────────────────────────────

// /**
//  * Returns the roster for a given date from localStorage.
//  * @param {string} dateStr — "YYYY-MM-DD"
//  * @returns {RosterEntry[]}
//  */
// export function loadRoster(dateStr) {
//   try {
//     return JSON.parse(localStorage.getItem(`${ROSTER_PREFIX}${dateStr}`)) ?? [];
//   } catch {
//     return [];
//   }
// }

// /**
//  * Persists the roster for a given date to localStorage.
//  * @param {string} dateStr — "YYYY-MM-DD"
//  * @param {RosterEntry[]} roster
//  */
// export function saveRoster(dateStr, roster) {
//   localStorage.setItem(`${ROSTER_PREFIX}${dateStr}`, JSON.stringify(roster));
// }

// // ── Service state ──────────────────────────────────────────

// /**
//  * Reads persisted service state (name + date).
//  * @returns {ServiceState | null}
//  */
// export function loadServiceState() {
//   try {
//     return JSON.parse(localStorage.getItem(SERVICE_KEY));
//   } catch {
//     return null;
//   }
// }

// /**
//  * Writes service state to localStorage.
//  * @param {ServiceState} state
//  */
// export function saveServiceState(state) {
//   localStorage.setItem(SERVICE_KEY, JSON.stringify(state));
// }

// // ── Future Firebase adapter (drop-in replacement) ──────────
// //
// // To migrate to Firestore, replace each function above with
// // async versions that call `getDoc` / `setDoc`:
// //
// // export async function loadRoster(dateStr) {
// //   const snap = await getDoc(doc(db, 'rosters', dateStr));
// //   return snap.exists() ? snap.data().entries : [];
// // }
// //
// // export async function saveRoster(dateStr, roster) {
// //   await setDoc(doc(db, 'rosters', dateStr), { entries: roster });
// // }


// js/storage.js — Firestore version
import { initializeApp }                    from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCh6FAqEkP5xv8XIo-JzYYncwrV7bOnHrA",
    authDomain: "graceboard-a3e90.firebaseapp.com",
    projectId: "graceboard-a3e90",
    storageBucket: "graceboard-a3e90.firebasestorage.app",
    messagingSenderId: "400298351043",
    appId: "1:400298351043:web:bdf241a0bd114652544576",
    measurementId: "G-HH7WGSKL82"
};

const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);

const ROSTER_PREFIX = 'graceboard_roster_';
const SERVICE_KEY   = 'graceboard_service';

// ── Roster (Firestore) ────────────────────────────────────
export async function loadRoster(dateStr) {
  const snap = await getDoc(doc(db, 'rosters', dateStr));
  return snap.exists() ? snap.data().entries : [];
}

export async function saveRoster(dateStr, roster) {
  await setDoc(doc(db, 'rosters', dateStr), { entries: roster });
}

// ── Service state (still localStorage — it's just UI preference) ──
export function loadServiceState() {
  try { return JSON.parse(localStorage.getItem(SERVICE_KEY)); } catch { return null; }
}

export function saveServiceState(state) {
  localStorage.setItem(SERVICE_KEY, JSON.stringify(state));
}