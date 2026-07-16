# GraceBoard — Church Service Roster

A lightweight, offline-first web app for managing church service rosters.

---

## Project structure

```
graceboard/
├── index.html            # Shell only — no embedded CSS or JS
├── sw.js                 # Service Worker (offline app shell + PDF libs)
│
├── css/
│   ├── tokens.css        # 🎨 Design tokens (colors, spacing, radius, z-index…)
│   ├── base.css          # Reset + global element defaults
│   ├── layout.css        # Page skeleton, header, card containers, breakpoints
│   └── components.css    # Every reusable UI component (buttons, badges, gate, modal…)
│
└── js/
    ├── app.js            # 🚦 Controller — access gate, wiring, boots the app
    ├── utils.js          # Pure helpers (no DOM, no side-effects, easy to test)
    ├── storage.js         # Persistence layer (Firestore realtime + localStorage)
    ├── ui.js              # All DOM reads/writes — zero business logic
    └── pdf.js             # PDF export (jsPDF wrapper)
```

---

## Access gate (Admin / Guest)

On load, GraceBoard shows a gate screen with two options:

- **Admin** — enter the passcode to unlock full editing (add, edit, remove
  people, change the service name/date).
- **Guest** — view the roster and download PDFs, but can't make changes.
  Edit affordances (the add-person form, Edit/Remove buttons, the
  service name/date fields) are hidden and disabled.

The choice is remembered in `localStorage` so people aren't re-prompted on
every visit. The **Switch** link in the header clears it and returns to the
gate.

**MVP note:** the admin passcode is hardcoded in `js/app.js`:

```js
const ADMIN_PASSCODE = 'GraceBoard2026';
```

Change this to whatever you want to hand out to your team. This is a simple
shared-secret check, not real authentication — anyone with the passcode (or
who reads the JS source) can get admin access. It's fine for a small trusted
group getting started; swap in real per-user auth (e.g. Firebase Auth) before
relying on it for anything sensitive.

---

## Roster fields

Each person on the roster has:

- **Name** (required)
- **Program part** (required) — e.g. "Opening Prayer", "Sermon"
- **Time** (optional) — free-text, e.g. "9:00 AM", for services with a
  timed lineup. Shows as "—" in the table/PDF when left blank.
- **Status** — Confirmed / Pending / Declined

---

## Architecture principles

| Principle | How it's applied here |
|---|---|
| **Separation of concerns** | CSS layers (tokens → base → layout → components). JS layers (utils → storage → ui → app). |
| **Single source of truth** | All colours, sizes, and z-indexes live in `css/tokens.css` as CSS custom properties. |
| **Thin interfaces** | `storage.js` exposes a small, focused API. Swap the backend by editing *only that file*. |
| **No globals** | ES modules keep everything scoped. Only `window.app` is intentionally global, as a bridge for inline HTML handlers. |
| **Pure functions** | `utils.js` has zero side-effects — every function takes data in, returns data out. Trivial to unit-test. |
| **Defense in depth** | Guest restrictions are enforced both in the UI (CSS hides edit controls) and in `app.js` (`_requireAdmin()` blocks the underlying functions even if called directly). |

---

## How to add a feature

### New UI component
1. Add its CSS block to `css/components.css` with a clear comment header.
2. Add its HTML to `index.html`.
3. Add rendering logic to `ui.js`.
4. Wire it up in `app.js`.

### New page / route
1. Create `js/pages/my-page.js`.
2. Import and invoke it from `app.js` based on the current URL.
3. Add page-specific CSS to `css/components.css` (or a new `css/pages/my-page.css`).

### Add a test suite
`js/utils.js` is already pure — just import it into any test framework (Vitest, Jest, etc.)
and write assertions. No mocking required.

---

## Local development

No build step needed — open `index.html` directly in a browser, or serve with any
static file server:

```bash
npx serve .
# or
python3 -m http.server
```

> **Note:** ES modules (`type="module"`) require a server (or `file://` with CORS
> relaxed). `npx serve` is the easiest option.

> **Note:** `js/storage.js` expects a Firebase config object (`firebaseConfig`) —
> paste yours in at the top of that file per the comment there.
