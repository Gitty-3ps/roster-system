/**
 * utils.js — Pure, stateless helper functions.
 * No DOM access, no side-effects, easy to unit-test.
 */

/**
 * Left-pads a number with a zero so it is always two digits.
 * @param {number} n
 * @returns {string}
 */
export function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Converts a Date object to an ISO date string "YYYY-MM-DD".
 * @param {Date} d
 * @returns {string}
 */
export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns the Date of the nearest upcoming Saturday (or today if it is Saturday).
 * @param {Date} from
 * @returns {Date}
 */
export function getNextSaturday(from) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const diff = d.getDay() === 6 ? 0 : 6 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Returns the Unix timestamp (ms) for 18:30 on a given date string.
 * @param {string} dateStr — "YYYY-MM-DD"
 * @returns {number}
 */
export function getSunsetTimestamp(dateStr) {
  return new Date(`${dateStr}T18:30:00`).getTime();
}

/**
 * Returns a human-readable time string for sunset on the given date.
 * @param {string} dateStr — "YYYY-MM-DD"
 * @returns {string}  e.g. "6:30 PM"
 */
export function sunsetLabel(dateStr) {
  return new Date(`${dateStr}T18:30:00`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns the two-letter initials from a full name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Escapes characters that have special meaning in HTML.
 * Use whenever user-supplied strings are inserted into innerHTML.
 * @param {string} s
 * @returns {string}
 */
export function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Short date format: "Jun 28, 2026"
 * @param {string} dateStr — "YYYY-MM-DD"
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Long date format: "Sunday, June 28, 2026"
 * @param {string} dateStr — "YYYY-MM-DD"
 * @returns {string}
 */
export function formatDateLong(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Returns an HTML string for a status badge.
 * @param {'confirmed'|'pending'|'declined'} status
 * @returns {string}
 */
export function badgeHTML(status) {
  const map = {
    confirmed: ['badge-confirmed', 'Confirmed'],
    pending:   ['badge-pending',   'Pending'],
    declined:  ['badge-declined',  'Declined'],
  };
  const [cls, label] = map[status] ?? ['badge-pending', status];
  return `<span class="badge ${cls}">${label}</span>`;
}
