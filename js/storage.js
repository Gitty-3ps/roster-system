/**
 * storage.js — Firestore with real-time listeners + offline persistence.
 *
 * Public API
 * ----------
 *   subscribeRoster(dateStr, callback) → unsubscribe function
 *   saveRoster(dateStr, roster)        → Promise<void>
 *   loadServiceState()                 → ServiceState | null
 *   saveServiceState(state)            → void
 *
 * Firestore's enableIndexedDbPersistence() makes ALL reads/writes
 * available offline automatically — no extra code needed per-call.
 */

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  //enableIndexedDbPersistence,
}                                  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── YOUR FIREBASE CONFIG ──────────────────────────────────
// Paste the config object from Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyCh6FAqEkP5xv8XIo-JzYYncwrV7bOnHrA",

  authDomain: "graceboard-a3e90.firebaseapp.com",

  projectId: "graceboard-a3e90",

  storageBucket: "graceboard-a3e90.firebasestorage.app",

  messagingSenderId: "400298351043",

  appId: "1:400298351043:web:bdf241a0bd114652544576",

  //measurementId: "G-HH7WGSKL82"
};
// ─────────────────────────────────────────────────────────

const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  cache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ── Roster ────────────────────────────────────────────────

/**
 * Subscribes to live roster changes for a given date.
 * The callback fires immediately with the current data, then again
 * whenever any user makes a change — in real time.
 *
 * @param {string}   dateStr  — "YYYY-MM-DD"
 * @param {Function} callback — called with (RosterEntry[], { fromCache: boolean, updatedAt: Date|null })
 * @returns {Function} unsubscribe — call this to stop listening (e.g. when changing dates)
 */
export function subscribeRoster(dateStr, callback) {
  const ref = doc(db, 'rosters', dateStr);

  return onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
    const entries    = snap.exists() ? (snap.data().entries ?? []) : [];
    const fromCache  = snap.metadata.fromCache;
    const updatedAt  = snap.data()?.updatedAt?.toDate?.() ?? null;
    callback(entries, { fromCache, updatedAt });
  });
}

/**
 * Saves the roster for a date to Firestore.
 * Works offline — writes are queued and synced when back online.
 *
 * @param {string}         dateStr
 * @param {RosterEntry[]}  roster
 */
export async function saveRoster(dateStr, roster) {
  await setDoc(doc(db, 'rosters', dateStr), {
    entries:   roster,
    updatedAt: new Date(),   // server-side timestamp alternative (works offline too)
  });
}

// ── Service state (localStorage — just UI preference) ────

const SERVICE_KEY = 'graceboard_service';

export function loadServiceState() {
  try { return JSON.parse(localStorage.getItem(SERVICE_KEY)); } catch { return null; }
}

export function saveServiceState(state) {
  localStorage.setItem(SERVICE_KEY, JSON.stringify(state));
}
