# Contributing

This is an independent, community-supported project. Contributions that improve accuracy, accessibility, or coverage are welcome.

Please [open an issue](https://github.com/be-myself-uk/planner/issues) before starting significant work, so the approach can be discussed first.

---

## Project principles

All contributions must respect these constraints:

- **100% private**: no data is ever sent to a server; no analytics, tracking, or external calls of any kind
- **Accessible**: all features must work with keyboard navigation and screen readers; follow WAI-ARIA patterns
- **No vulnerabilities**: user input is never rendered as HTML; no external scripts, styles, or fonts
- **No personal data storage**: users do not enter personal information; notes, reminders, and account features are out of scope
- **Simple English**: write for users who may not have English as a first language, or who may be under stress; avoid jargon, long sentences, and overwhelming detail
- **General guidance only**: content must not constitute legal, financial, medical, or tax advice; do not reproduce forms or templates, or give step-by-step instructions for filling them in; linking to official forms and established community tools is fine
- **Single file**: the application is one self-contained HTML file with no build step, no framework, and no dependencies

**Useful contributions include:**
- Corrections to UK government or health service processes, or broken links
- Accessibility improvements
- Welsh language support

---

## The core idea

This is a **single self-contained HTML file** (`index.html`). There is no build step, no framework, no bundler, and no external JavaScript or CSS libraries. Everything (markup, styling, and logic) lives in one file that a browser can open directly, including from local disk (`file://`) with no internet connection at all. This is a deliberate project constraint, not an accident of scale.

Everything else in the repo (GitHub Actions, the test suite, the README) exists to support that one file: testing it, deploying it, checking its links, and documenting it. There is no server-side code anywhere in this project.

---

## Repository file map

```
.
├── index.html                     : the entire application (see below)
├── README.md                      : project overview, features, privacy, licence
├── CONTRIBUTING.md                : this file, how to contribute and how the repo is put together
├── CHANGELOG.md                   : plain-English history of changes to the site
├── SOURCES.md                     : canonical list of official sources behind planner content, with review-trigger automation
├── LICENCE                        : CC BY-NC-SA 4.0
├── .gitignore                     : excludes node_modules/, test-results/, playwright-report/, blob-report/, __pycache__/, source-watch-report.md
├── tests/                         : self-contained test workspace; CI sets working-directory: tests so plain npm/npx commands resolve everything below without extra flags
│   ├── planner.spec.js            : the entire end-to-end test suite (Playwright)
│   ├── playwright.config.js       : Playwright test runner configuration
│   └── package.json / package-lock.json : the only dependency is @playwright/test (dev-only, for testing); node_modules/, test-results/, and playwright-report/ all generate here too
├── .github/
│   ├── scripts/
│   │   ├── check_source_updates.py : checks GOV.UK sources in SOURCES.md against their own Last verified date
│   │   └── lychee.toml            : configuration for the automated broken-link checker, loaded via --config in check-content.yml
│   ├── workflows/
│   │   ├── playwright.yml         : runs the test suite on every push/PR to main or preview
│   │   ├── bump-version.yml       : auto-updates the "last reviewed" date on every merge
│   │   └── check-content.yml      : scheduled broken-link scan and GOV.UK source-change scan (two independent jobs), opens an issue per finding
│   └── ISSUE_TEMPLATE/            : bug report / feature request / question templates
```

---

## Deployment and infrastructure

- **Caching, TLS, and security headers** (for example, `Content-Security-Policy` beyond what is set in `index.html`'s own `<meta>` tag) are configured at the hosting providers edge, not in this repository. If you fork this project onto different hosting, you will need to configure equivalents yourself.
- **No backend, no database, no server-side code.** Every "feature" (saved progress, shareable links, theme preference) is implemented client-side using `localStorage` and URL query parameters. Nothing is ever sent to a server (see `README.md`'s Privacy section).

### GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `playwright.yml` | Push or PR to `main`/`preview` | Sets `working-directory: tests` for the job, so `npm ci` and `npx playwright test` resolve `tests/package.json` and `tests/playwright.config.js` by default. Installs dependencies, runs the full Playwright suite (`tests/planner.spec.js`) against the raw `index.html` file via a `file://` URL, uploads the HTML test report as an artifact. This is CI only; it does not deploy anything. |
| `bump-version.yml` | PR merged into `main`/`preview` (not on every push to an open PR) | Rewrites the `SCHEMA_VERSION` constant near the top of `index.html`'s script to the current Unix timestamp, then commits and pushes that change directly to the branch the PR was merged into, with `[no ci]` (so it does not re-trigger itself). This timestamp drives the "Last reviewed" date shown in the site's footer. It is a proxy for "content was touched recently," not a precise changelog. |
| `check-content.yml` | Scheduled (1st and 15th of each month) or manual | Two independent jobs on a shared schedule. **`link-checker`** runs the [Lychee](https://github.com/lycheeverse/lychee-action) link checker (configured via `.github/scripts/lychee.toml`, loaded with `--config`) against `index.html`, `README.md`, `CHANGELOG.md`, and `SOURCES.md`; if it finds a broken link and there is not already an open `broken-links`-labelled issue, it opens one. **`source-watch`** runs `.github/scripts/check_source_updates.py`, which checks every GOV.UK source in `SOURCES.md` via the [GOV.UK Content API](https://www.gov.uk/api/content) and compares its `public_updated_at` against that entry's own `Last verified` date; sources still marked `pending`, and all non-GOV.UK sources, are skipped (manual review only); if a source appears to have changed and there is not already an open `source-changed`-labelled issue, it opens one. Neither job's output is a verdict that `index.html` needs to change — both are triggers for review. Run `python3 .github/scripts/check_source_updates.py --selftest` after changing SOURCES.md's structure, to check the parser against both known entry formats before a scheduled run does. |

### Tests

`tests/planner.spec.js` is a single Playwright spec file containing the entire test suite (numbered tests, currently up to the low 80s; numbers were assigned as tests were added and some were removed or merged along the way, so they are not perfectly sequential). Tests are grouped into `test.describe()` blocks by scope (core flows, locks/gating/validation, progress tracking, sharing/links, plan content accuracy, accessibility/layout), each with a short comment; add new tests to whichever group they fit, keeping the existing numbering convention rather than renumbering.

Run locally with:
```
npm install
npx playwright install chromium
npm test
```

Tests default to `--workers=1` in practice, because running against a `file://` URL means multiple parallel workers can race on `localStorage` commits. CI uses `BEMYSELF_URL` to point at the checked-out file directly.

---

## How index.html is structured

The file is organised top-to-bottom as: **`<head>`, then CSS (`<style>`), then HTML body (views and dialogs), then JavaScript (`<script>`)**. Roughly 3,000 lines total. Everything below is a rough map; exact line numbers shift as the file changes, so use them as a starting point for search, not a promise.

### 1. `<head>` (lines ~1 to 25)

Standard meta tags, Open Graph/Twitter card tags, a JSON-LD `WebApplication` schema block for SEO, a `Content-Security-Policy` meta tag (no external scripts, styles, or fonts allowed, `'self'` only, plus `data:` for the inline SVG favicon), and a tiny inline script that sets the dark/light theme before first paint (to avoid a flash of the wrong theme).

### 2. CSS (lines ~26 to 380, inside one `<style>` block)

All styling lives here: no separate stylesheet, no CSS framework. Organised loosely by component: toolbar/icon buttons, dialogs, phase cards, checklist/wizard question cards, badges (difficulty/cost), footer, print styles (`@media print`), and responsive breakpoints (`@media (max-width:600px)` and `400px`) for mobile. Dark mode is done via CSS custom properties (`--bg-card`, `--text`, etc.) swapped by a `data-theme` attribute on `<html>`, not a separate stylesheet.

### 3. HTML body (lines ~382 to 806)

The page has a small number of top-level "views" that are shown and hidden by JavaScript (never actually navigated to as separate pages):

- **`#startView`**: the landing screen (hero text, "Start now" / checklist link)
- **`#welcomeBackView`**: shown instead of the start screen if a saved plan already exists
- **`#wizardView`**: the step-by-step question flow
- **`#checklistView`**: the "everything on one page" alternative to the wizard
- **`#planView`**: the generated action plan

Alongside the views are five `<dialog>` elements (native HTML `<dialog>`, opened via `.showModal()`): `dlgAbout`, `dlgUsage`, `dlgPrivacy`, `dlgSupport`, `dlgDisclaimer`, all linked from the footer, plus a toolbar `?` button that opens `dlgUsage` directly.

### 4. JavaScript (lines ~806 to 3025, inside one `<script>` block, no modules or imports)

This is the entire application logic. Key pieces, roughly in the order they appear:

**Constants and content data**
- `SCHEMA_VERSION`: a Unix timestamp, auto-bumped by the `bump-version.yml` workflow on every merge affecting `index.html`.
- `S`: an enum-like object for answer states (`YES`, `NO`, `UPDATED`, `NEEDS_UPDATE`, `NONE`, `BOTH`, `NAME`, `GENDER`).
- `REGION`: `{ EW, SCOT, NI }`. Note that "outside the UK" is not a fourth region value. It is tracked as a separate boolean flag (for example, `regionOutsideUK`, `birthOutsideUK`) alongside a region that falls back to `EW`, because most of the app's regional logic only needs to distinguish EW/Scotland/NI. `regionOutsideUK`/`birthOutsideUK` are checked directly wherever UK-residency-specific content needs to be skipped or disclaimed instead: `planParamsFromWizard()` and `updateLocks()` gate the NHS/GP, DBS, DWP, and Council Tax/electoral register content off when `regionOutsideUK` is set, the `nhs`/`newGP`/`dbs`/`dwp` wizard questions use it in their `cond`, and it can select an `out` variant on a `PLAN_ITEMS` entry (see `birthcert`) the same way `ni`/`scot` do.
- **`SERVICES`**: the single source of truth for the "services to update" checklist item (banks, insurance, DBS/Disclosure Scotland/AccessNI, credit reference agencies, and so on). Each entry is `{ key, id, label, detail }`, or `{ key, id, label, detailFn(p) }` when the guidance differs by region (see the Council Tax, electoral register, and V5C entries for examples). The wizard's services question, the checklist's checkboxes, and the generated plan's service list all derive from this one array. Adding a new service means adding a checkbox in `#wrapChkServices` plus one entry here.
- **`PLAN_ITEMS`**: the content for every possible plan step (health records, driving licence, passport, GRC, and so on). Many entries have a `regions: { ni, scot, default }` object (resolved by the `planItemRegion()` helper, which falls back to `default` if a specific region is not present), sometimes with an additional `out` key for guidance shown when `regionOutsideUK`/`birthOutsideUK` is set (see `birthcert`), and/or a `variants` object keyed by goal (`name`/`gender`/`both`, resolved by `planItemVariant()`, falling back to the `gender` variant). This is where almost all of the site's actual guidance text lives.

**Application state**
- `wizardState`: one plain object holding every answer, used by both the wizard and the checklist. They are two different UIs over the same underlying state, kept in sync in both directions (wizard-answer-driven and checklist-DOM-driven).
- `isWizardMode`, `step`, `wizardHistory`: wizard-specific navigation state.
- `focusMode`: whether "Focus mode" (hide completed items) is active.
- Progress on individual plan steps is stored separately, per step, as `st_<trackId>` keys directly in `localStorage` (via `getStepState`/`setStepState`), not inside `wizardState`, since progress needs to survive independently of the answers that generated the plan.

**The wizard**
- `questions`: an ordered array of question definitions (`id`, `q` for the question text, `cond` for a function deciding whether to show it based on `wizardState`, `o` for the answer options). `renderWizard()` draws the current step; `nextWizard()`/`prevWizard()` walk forward and back through only the questions whose `cond` currently passes.

**The checklist**
- One large `<form>`-like block of checkboxes and radios (in the HTML body) representing every question at once. `renderChecklist()` pushes `wizardState` values into the DOM (used when entering or re-entering the checklist); a single delegated `change` event listener on `#checklistView` reads the DOM back into `wizardState` on every interaction. **Anything added to the checklist needs both directions wired up**, or you get sync bugs (see `CHANGELOG.md`'s 2026-07-05 entries for two real examples of exactly that).

**Building and rendering the plan**
- `generateWizardPlan()` / `generateChecklistPlan()`: validate answers, then call `buildSharedPlan()`.
- `buildSharedPlan(p)`: the big function that walks through `PLAN_ITEMS`, decides which steps apply given the answers (`p`), resolves each one's region/goal variant, and renders the actual plan HTML (phases, badges, "more information" panels, sub-checklists for GRC evidence and services).
- `planItemHtml()`, `planCostBadge()`, `planSplitCostBadge()`, `planDiffBadge()`: HTML-building helpers for individual plan rows and their difficulty/cost badges.

**Progress tracking**
- `getStepState()` / `setStepState()` / `applyStepState()`: the generic four-state (not started, in progress, done, not needed) tracker used by every plan item and sub-item, keyed only by a track ID string. `syncSvcParent()` / `syncSvcChildren()` handle the parent-checkbox-reflects-children pattern (used by both the services list and the GRC evidence sub-checklists). These are generalised to work for any parent/child group via a `data-svc-parent` attribute, not hardcoded to one specific group.
- `cycleStepState()`: the click handler that advances a step through its four states.

**Sharing and persistence**
- `encodeState()` / `decodeState()` / `copyShareableLink()`: encode the current answers and progress into the `?p=...` shareable link.
- `loadUrlParams()` / `handleUrlLoad()` / `handleLegacyUrl()`: the reverse, reconstructing state from a shared link. Read these functions directly in `index.html` if you need the exact data format; it is not reproduced here.

**Everything else**
- Dialog handling (`closeDialogOnBackdrop`, `toggleHelp`), theme toggling, the "panic button" quick-exit, confetti animation on plan completion, and toolbar keyboard navigation (`initToolbarNav`, arrow-key roving tabindex per the WAI-ARIA toolbar pattern). The `window.onload` bootstrap at the bottom restores saved state, wires up the `checklistView` change listener, and sets the footer's copyright year and last-reviewed date.

**`window.X = X` exports** (near the very end of the file): because everything is defined inside one `<script>` block without modules, but the HTML uses inline `onclick="..."` attributes throughout, every function that needs to be called from markup is explicitly re-exported onto `window` at the bottom of the script. If you add a new function and wire it to an `onclick`, it needs a line here too, or the browser will report it as undefined.

---

## If you want to fork or maintain this

- The project principles above are constraints (no server calls, no personal data storage, single file, no build step) that shape every decision in `index.html`, not just style preferences.
- `SERVICES` and `PLAN_ITEMS` are where almost all day-to-day maintenance happens (correcting guidance, adding a new step). You rarely need to touch the rendering logic itself.
- Any change to a checklist input needs both a `renderChecklist()` line (state to DOM) and a line in the `checklistEl` change handler (DOM to state). Any one-time UI element (a dismissible tip, a warning banner) needs to be explicitly reset by every "fresh start" entry point (`startWizard()`, `startChecklist()`, `openChecklist()`, `restartApp()`), not just the one place that shows it.
- Run the Playwright suite before and after any change. It is the only safety net given there is no type system or build step to catch mistakes.
