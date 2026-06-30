# GraceBoard — Church Service Roster

A lightweight, offline-first web app for managing church service rosters.

---

## Project structure

```
graceboard/
├── index.html            # Shell only — no embedded CSS or JS
│
├── css/
│   ├── tokens.css        # 🎨 Design tokens (colors, spacing, radius, z-index…)
│   ├── base.css          # Reset + global element defaults
│   ├── layout.css        # Page skeleton, header, card containers, breakpoints
│   └── components.css    # Every reusable UI component (buttons, badges, modal…)
│
└── js/
    ├── app.js            # 🚦 Controller — wires everything together, boots the app
    ├── utils.js          # Pure helpers (no DOM, no side-effects, easy to test)
    ├── storage.js        # Persistence layer (localStorage today, Firebase tomorrow)
    ├── ui.js             # All DOM reads/writes — zero business logic
    └── pdf.js            # PDF export (jsPDF wrapper)
```

---

## Architecture principles

| Principle | How it's applied here |
|---|---|
| **Separation of concerns** | CSS layers (tokens → base → layout → components). JS layers (utils → storage → ui → app). |
| **Single source of truth** | All colours, sizes, and z-indexes live in `css/tokens.css` as CSS custom properties. |
| **Thin interfaces** | `storage.js` exposes 4 functions. Swap localStorage for Firebase by editing *only that file*. |
| **No globals** | ES modules keep everything scoped. Only `window.app` is intentionally global, as a bridge for inline HTML handlers. |
| **Pure functions** | `utils.js` has zero side-effects — every function takes data in, returns data out. Trivial to unit-test. |

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

### Migrate to Firebase
1. Open `js/storage.js`.
2. Replace `loadRoster`, `saveRoster`, `loadServiceState`, `saveServiceState` with
   async Firestore equivalents (stubs are already commented in the file).
3. Uncomment and fill in the Firebase block at the bottom of `index.html`.
4. All other files are unaffected.

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
