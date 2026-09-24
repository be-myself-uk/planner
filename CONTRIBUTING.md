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

This is a **single self-contained HTML file** (`index.html`). There is no build step, no framework, no bundler, and no external JavaScript or CSS libraries. Everything (markup, styling, and logic) lives in one file that a browser can open directly, including from local disk (`file://`) with no internet connection. This is a deliberate constraint of the project, and contributions are expected to keep it.

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
├── LICENCE.md                     : CC BY-NC-SA 4.0
├── robots.txt                     : allows all crawlers and points to sitemap.xml; copied to the deploy directory by the build command
├── sitemap.xml                    : single-entry XML sitemap for the one canonical URL; copied to the deploy directory by the build command
├── .gitignore                     : excludes node_modules/, test-results/, playwright-report/, blob-report/, __pycache__/, source-watch-report.md, source-content-report.md
├── tests/                         : self-contained test workspace; CI sets working-directory: tests so plain npm/npx commands resolve everything below without extra flags
│   ├── planner.spec.js            : the entire end-to-end test suite (Playwright)
│   ├── playwright.config.js       : Playwright test runner configuration
│   ├── content-snapshot-lib.js    : shared walker that extracts every PLAN_ITEMS/SERVICES content string, used by both the generator script and the content-integrity test
│   ├── generate-content-snapshots.js : regenerates content-snapshots.json; run via `npm run generate-content-snapshots` after an intentional content change
│   ├── content-snapshots.json     : committed fixture of every PLAN_ITEMS/SERVICES content string, compared against on every test run
│   ├── source-snapshot-lib.js     : SOURCES.md parser plus Readability-based content extraction, shared by source-content-check.js
│   ├── source-content-check.js    : regenerates or checks source-content-snapshots.json for every non-GOV.UK, non-static source; see check-content.yml below
│   ├── source-content-snapshots.json : committed fixture of each non-GOV.UK source's extracted article text, compared against on the scheduled check-content.yml run
│   └── package.json / package-lock.json : devDependencies are @playwright/test (testing) and @mozilla/readability (source-content-check.js); node_modules/, test-results/, and playwright-report/ all generate here too
├── .github/
│   ├── scripts/
│   │   ├── check_source_updates.py : checks GOV.UK sources in SOURCES.md against their own Last verified date
│   │   └── lychee.toml            : configuration for the automated broken-link checker, loaded via --config in check-content.yml
│   ├── workflows/
│   │   ├── playwright.yml         : runs the test suite on every push/PR to main or preview
│   │   ├── bump-version.yml       : auto-updates the "last reviewed" date whenever index.html changes on main
│   │   └── check-content.yml      : scheduled broken-link scan, GOV.UK source-change scan, and non-GOV.UK source content-drift scan (three independent jobs), opens an issue per finding
│   └── ISSUE_TEMPLATE/            : bug report / feature request / question templates
```

---

## Deployment and infrastructure

- **Caching, TLS, and security headers** (for example, `Content-Security-Policy` beyond what is set in `index.html`'s own `<meta>` tag) are configured at the hosting provider's edge, not in this repository. If you fork this project onto different hosting, you will need to configure equivalents yourself.
- **No backend, no database, no server-side code.** Every "feature" (saved progress, shareable links, theme preference) is implemented client-side using `localStorage` and URL query parameters. Nothing is ever sent to a server (see `README.md`'s Privacy section).
- **The build command copies the deployed files.** Only files it names reach the deploy directory, and only paths in the host's build watch list trigger a rebuild. Both currently cover `index.html`, `robots.txt`, and `sitemap.xml`; adding another deployed file means updating both, or the new file silently never ships.
- **Unmatched paths serve `index.html` with HTTP 200**, because there is no top-level `404.html`. `robots.txt` and `sitemap.xml` are real files specifically so that crawlers requesting them get valid content rather than the application HTML.
- **Shared-plan URLs are excluded from search results** by an edge rule setting `X-Robots-Tag: noindex, nofollow` on requests whose query string carries the `p` or `goal` share parameter. It is deliberately scoped to those two parameters: applying it to every query string also caught ordinary tracking parameters such as `?utm_source=`, which combined a `noindex` with the page's `rel="canonical"` and risked the canonical URL being dropped from search results.

### GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `playwright.yml` | Push or PR to `main`/`preview` | Sets `working-directory: tests` for the job, so `npm ci` and `npx playwright test` resolve `tests/package.json` and `tests/playwright.config.js` by default. Installs dependencies, runs the full Playwright suite (`tests/planner.spec.js`) against the raw `index.html` file via a `file://` URL, uploads the HTML test report as an artifact. This is CI only; it does not deploy anything. |
| `bump-version.yml` | Push to `main` that changes `index.html` (so a merged PR, not a push to an open PR branch), or manually via `workflow_dispatch` | Rewrites the `SCHEMA_VERSION` constant near the top of `index.html`'s script to the current Unix timestamp, then commits and pushes that change directly to `main`, with `[no ci]` (so it does not re-trigger itself). This timestamp drives the "Last reviewed" date shown in the site's footer. It is a proxy for "content was touched recently," not a precise changelog, and it does not decide whether a saved plan is out of date (see `PLAN_VERSION` below). `main`'s ruleset requires a pull request for the default `GITHUB_TOKEN`, which cannot be added to a ruleset bypass list, so this pushes using `BUMP_VERSION_TOKEN`, a fine-grained PAT (repo secret) belonging to a repository admin who is on the bypass list. If that token ever expires or is revoked, the job fails loudly instead of the version silently falling out of date. |
| `check-content.yml` | Scheduled (1st and 15th of each month) or manual | Three independent jobs on a shared schedule. **`link-checker`** runs the [Lychee](https://github.com/lycheeverse/lychee-action) link checker (configured via `.github/scripts/lychee.toml`, loaded with `--config`) against `index.html`, `README.md`, `CHANGELOG.md`, and `SOURCES.md`; if it finds a broken link and there is not already an open `broken-links`-labelled issue, it opens one. **`source-watch`** runs `.github/scripts/check_source_updates.py`, which checks every GOV.UK source in `SOURCES.md` via the [GOV.UK Content API](https://www.gov.uk/api/content) and compares its `public_updated_at` against that entry's own `Last verified` date; sources still marked `pending` are skipped (manual review only); if a source appears to have changed and there is not already an open `source-changed`-labelled issue, it opens one. **`source-content-watch`** covers everything `source-watch` can't: every non-GOV.UK source that isn't a static, point-in-time record (legislation, an FOI response, a Parliament written question; these don't change after publication) or a site confirmed to block automated fetches outright (currently Registers of Scotland and the Electoral Commission). It renders each source with Playwright (dismissing any live cookie-consent banner first, which can otherwise out-score real content under Readability's heuristics on thin "hub" pages) and extracts its article text with [Mozilla's Readability](https://github.com/mozilla/readability) (the engine behind Firefox's Reader View), which strips static nav/footer chrome without per-site configuration. The extracted text (not a hash, so a mismatch shows a readable diff) is compared against `tests/source-content-snapshots.json` and reported the same way as `source-watch`, sharing the `source-changed` label. Trigger it manually with the `write_source_snapshots` input checked to regenerate that fixture instead of checking it (needed after adding a source, or after confirming a flagged change needs no fix), then download the resulting `source-content-snapshots` build artifact yourself, since this workflow has no repo push access. No job's output is a verdict that `index.html` needs to change. All three are triggers for review. Run `python3 .github/scripts/check_source_updates.py --selftest` after changing SOURCES.md's structure, to check the Python parser against both known entry formats before a scheduled run does. |

### Tests

`tests/planner.spec.js` is a single Playwright spec file containing the entire test suite (numbered tests, currently 165 of them numbered up to 178; numbers were assigned as tests were added, and some were removed or merged along the way, so they are not sequential). Tests are grouped into `test.describe()` blocks by scope (core flows, locks/gating/validation, progress tracking, sharing/links, plan content accuracy, plan reordering, accessibility/layout, content integrity), whose names are the only labels they carry; add new tests to whichever group they fit, keeping the existing numbering convention rather than renumbering.

The spec carries no comments. Where an assertion is not self-explanatory, the reason it exists goes in the message argument (`expect(value, 'why this must hold').toBe(...)`), which Playwright prints when the assertion fails, so the reasoning reaches whoever is looking at the failure. Keep new assertions to that pattern.

#### Content-integrity snapshot

The "Content integrity" group's test reads every `PLAN_ITEMS`/`SERVICES` content string out of a running page (via `content-snapshot-lib.js`'s `extractContentMap()`, exposed on `window` for this purpose) and compares it against the committed `tests/content-snapshots.json` fixture, key by key. It exists so that content drift is caught and named: if any entry's wording changes, intentionally or not, the test fails and gives the exact key (for example `dvla.variants.gender` or `SERVICES.council`) instead of a whole-file diff.

If you intentionally change any plan or service content, regenerate the fixture before pushing:
```
cd tests
npm run generate-content-snapshots
```
This overwrites `content-snapshots.json` with the current content; review the diff to confirm only the change you intended shows up, then commit it alongside your `index.html` edit.

This only catches literal text changes inside `summary`/`detail`/`title` strings, or the literal source text of the `summaryFn`/`detailFn`/`titleFn` functions that generate them. It does not catch a shared constant referenced by name from inside one of those functions changing elsewhere, since the snapshot captures the function's source text, not its resolved output for any particular input.

Run locally from `tests/` with:
```
npm install
npx playwright install chromium
BEMYSELF_URL=file://$(cd .. && pwd)/index.html npm test
```

`BEMYSELF_URL` is effectively required. Without it the suite falls back to `path.resolve('index.html')`, which resolves against the process's working directory, so every test fails with `ERR_FILE_NOT_FOUND` unless you happen to be running from the repository root. CI sets it the same way, using `$GITHUB_WORKSPACE`.

`playwright.config.js` runs `fullyParallel`, with no worker cap locally (Playwright picks one from the machine's core count) and `workers: 2` plus `retries: 1` under `CI`. Reproduce a CI-only failure by setting `CI=true` yourself.

Running against a `file://` URL has one cost. Chromium's `localStorage` backend for `file://` origins occasionally fails to commit a write before a navigation tears down the document, especially under back-to-back automated load. It does not happen in normal browser use. Any test that saves something, reloads, and expects it to still be there must navigate through the `reloadUntil` / `gotoUntil` helpers at the top of the spec rather than calling `page.reload()` or `page.goto()` directly. Those helpers snapshot `localStorage` before navigating and, if the condition they are waiting on is still false afterwards, put back whatever went missing and navigate once more. Simply navigating again cannot help, because a dropped write is gone for good. A restore is recorded as a `storage-restored` annotation on the test, so it shows up in the HTML report instead of passing silently.

---

## How index.html is structured

The file is organised top-to-bottom as: **`<head>`, then CSS (`<style>`), then HTML body (views and dialogs), then JavaScript (`<script>`)**. Roughly 3,365 lines total. Everything below is a rough map; exact line numbers shift as the file changes, so use them as a starting point for search, not a promise.

### 1. `<head>` (lines 1 to 29)

Standard meta tags, Open Graph/Twitter card tags, a JSON-LD `WebApplication` schema block for SEO, a `Content-Security-Policy` meta tag (no external scripts, styles, or fonts allowed, `'self'` only, plus `data:` for the inline SVG favicon; `base-uri`, `form-action` and `object-src` are `'none'`, since the page submits no forms and embeds nothing. `connect-src` must stay `'self'` even though the page itself makes no requests: Cloudflare adds a bot-detection script to the live page that runs in an iframe, inherits this policy, and posts back to `/cdn-cgi/` on the same site. Test 174 checks this), and a tiny inline script that sets the dark/light theme before first paint (to avoid a flash of the wrong theme).

### 2. CSS (line 27, minified onto a single line inside one `<style>` block)

The entire block is one long minified line, so search for a selector or property rather than a line number.

All styling lives here: no separate stylesheet, no CSS framework. Organised loosely by component: toolbar/icon buttons, dialogs, phase cards, checklist/wizard question cards, badges (difficulty/cost), footer, print styles (`@media print`), and responsive breakpoints (`@media (max-width:600px)` and `400px`) for mobile. Dark mode is done via CSS custom properties (`--bg-card`, `--text`, etc.) swapped by a `data-theme` attribute on `<html>`, not a separate stylesheet.

### 3. HTML body (lines ~30 to ~500)

The page has a small number of top-level "views" that are shown and hidden by JavaScript (never actually navigated to as separate pages):

- **`#startView`**: the landing screen (hero text, "Start here" / checklist link)
- **`#welcomeBackView`**: shown instead of the start screen if a saved plan already exists
- **`#wizardView`**: the step-by-step question flow
- **`#checklistView`**: the "everything on one page" alternative to the wizard
- **`#planView`**: the generated action plan

Alongside the views are five `<dialog>` elements (native HTML `<dialog>`, opened via `.showModal()`): `dlgAbout`, `dlgUsage`, `dlgPrivacy`, `dlgSupport`, `dlgDisclaimer`, all linked from the footer, plus a toolbar `?` button that opens `dlgUsage` directly.

### 4. JavaScript (from line ~500 to the end of the file, inside one `<script>` block, no modules or imports)

This is the entire application logic. Key pieces, roughly in the order they appear:

`index.html` carries no comments of any kind. Where something in it is genuinely not obvious from the code, it is explained in this section instead, so the explanation is in one place rather than scattered through a 300 KB file.

**Constants and content data**
- `SCHEMA_VERSION`: a Unix timestamp, auto-bumped by the `bump-version.yml` workflow whenever a push to `main` changes `index.html`. It only drives the footer's "Last updated" date and copyright year.
- `PLAN_VERSION`: a small whole number, raised by hand. Saved plans (`appState.planVersion`) and shared links (`pv`) record it, and a lower number than the page's own shows the "Your action plan may be out of date" message and opens the checklist for review instead of the plan. **Raise it by one when a change could alter someone's answers or plan**: a question added, removed or reworded in meaning, a step added or removed, or a change to which steps apply. Do not raise it for typo fixes, wording that keeps the meaning, layout, or code changes, since every raise asks every returning user to recheck their answers. Plans and links saved before this number existed carry none, and read as out of date once. **A release that raises it starts its `CHANGELOG.md` section with one line saying so**: that saved plans made before it will show "may be out of date", and which changes caused that. The message links to the changelog, so that line is what someone arriving from it is looking for. `SCHEMA_VERSION` changes with every release and needs no mention.
- `S`: an enum-like object for answer states (`YES`, `NO`, `UPDATED`, `NEEDS_UPDATE`, `NONE`, `BOTH`, `NAME`, `GENDER`).
- `REGION`: `{ E, W, S, NI }` (values `'e'`, `'w'`, `'s'`, `'ni'`). `E` means England specifically. `REGION_LEGACY` maps the older values an existing shared link might still carry (`ew`, `wales`, `scot`, from before the codes were shortened) onto their current equivalents. `resolveRegion(v)` applies that mapping, and is called wherever a region value arrives from outside the app (`loadUrlParams`, and the `isValid` check in `handleUrlLoad`), so old links keep working.

  The same four values cover both where someone lives (`wizardState.region`) and where their birth was registered (`wizardState.birthRegion`). These are asked as two separate questions because they genuinely differ: you can live in one nation and have been born in another. England and Wales are split in both, even though `birthRegion` currently treats them identically (both share the General Register Office), because that could change independently and a distinct `W` value costs nothing now.

  `planItemRegion()` falls back to a `PLAN_ITEMS` entry's `default` variant for any region key it does not recognise, so Wales needs its own `regions.wales` entry only where it actually differs from England. Today that is just the gender-service waiting-list note in `buildHealthItems()`. Nothing keys off `birthRegion === REGION.W`, so a Wales-born person gets the same birth certificate and GRC content as an England-born one. NI-born and Scotland-born get their own content by comparing against `REGION.NI` and `REGION.S`; everything else falls through unchanged.

  Note that the `PLAN_ITEMS.regions` keys (`ni`, `scot`, `wales`, `default`) are a separate, human-readable naming convention for content lookup. They are not tied to `REGION`'s own short values.

  Northern Ireland has two separate derived flags, and conflating them breaks content. `p.bornInNI` is true for anyone whose birth was registered there, and gates the GRONI birth-certificate-name variant and its cost line. `p.showIrishRoute` additionally requires a gender goal and a yes to the `irishRoute` question, and gates the Irish passport route alone. Someone who declines that route must keep the GRONI content; test 152 exists to catch exactly that regression.

  "Outside the UK" is not a fifth region. It is tracked as a separate flag (`regionOutsideUK`, `birthOutsideUK`) alongside a region that falls back to `E`, because most of the regional logic only needs to tell England, Wales, Scotland and NI apart. The flags are checked directly wherever UK-specific content has to be skipped: `planParamsFromWizard()` and `updateLocks()` gate off the NHS/GP, DBS, DWP, Council Tax and electoral register content, the `nhs`, `newGP`, `dbs` and `dwp` questions use them in their `cond`, and a flag can select an `out` variant on a `PLAN_ITEMS` entry (see `birthcert`) the same way `ni` and `scot` do.
- **`SERVICES`**: the single source of truth for the "services to update" checklist item (banks, insurance, DBS/Disclosure Scotland/AccessNI, credit reference agencies, and so on). Each entry is `{ key, id, label, detail }`, or `{ key, id, label, detailFn(p) }` when the guidance differs by region (see the Council Tax, electoral register, and V5C entries for examples). An optional `labelNI` replaces the label for people living in Northern Ireland, in the wizard and the plan; the checklist does the same with `label-council-dft`/`label-council-ni` spans switched by `data-region` in CSS (Council Tax is "Rates (Land & Property Services)" there). The wizard's services question, the checklist's checkboxes, and the generated plan's service list all derive from this one array. Adding a new service means adding a checkbox in `#wrapChkServices` plus one entry here.
- **`PLAN_ITEMS`**: the content for every possible plan step (health records, driving licence, passport, GRC, and so on). Many entries have a `regions: { ni, scot, default }` object (resolved by the `planItemRegion()` helper, which falls back to `default` if a specific region is not present), sometimes with an additional `out` key for guidance shown when `regionOutsideUK`/`birthOutsideUK` is set (see `birthcert`), and/or a `variants` object keyed by goal (`name`/`gender`/`both`, resolved by `planItemVariant()`, falling back to the `gender` variant). This is where almost all of the site's actual guidance text lives.

- **`evidence` / `evidenceFn(p)`**: an optional field on any `PLAN_ITEMS` leaf, rendering a tick-off checklist of the supporting documents that step needs. Shaped `{ idPrefix, intro?, items: [{ k, label }] }`, resolved by `planItemEvidence(leaf, p)`, which prefers `evidenceFn(p)` when the list depends on the user's answers (see `grc_docs`) and otherwise uses the fixed `evidence` object (see `grc_med`, `grc_life`). Because it sits on a leaf it varies by region and variant exactly as `summary` and `detail` do. Each entry renders through the shared `subItem()` helper as an ordinary tracked sub-item, so parent/child status syncing, "Reset progress", and shared links all work with no extra handling.

  Each entry's `k` becomes part of its stored id (`st_trk_<idPrefix>_<k>`) and of the shared-link payload, so **never renumber or reuse a key**: deriving ids from array position would silently reassign someone's saved ticks the moment a list is reordered or an entry inserted. Keep evidence single-level: the parent/child sync logic is one deep, and grandchildren would break it. Every label is user-facing guidance, so a new one is a factual claim that needs a `SOURCES.md` entry like any other, and `content-snapshot-lib.js` captures both `evidence` and `evidenceFn` so wording changes show up in the content-integrity test.

**Application state**
- `wizardState`: one plain object holding every answer, used by both the wizard and the checklist. They are two different UIs over the same underlying state, kept in sync in both directions (wizard-answer-driven and checklist-DOM-driven).
- `isWizardMode`, `step`, `wizardHistory`: wizard-specific navigation state.
- `focusMode`: whether "Focus mode" (hide completed items) is active. A hidden step, phase or service gets `collapsed-step`, `collapsed-phase` or `collapsed-svc`, which fade it out and then set `visibility: hidden` once the animation ends, so it leaves the Tab order and the screen reader's view, not just the screen. If the focused button is hidden, `refreshPlan()` moves focus on to the next visible step. Printing follows Focus mode on purpose: a printed plan shows only the steps still on screen.
- Progress on individual plan steps is stored separately, per step, as `st_<trackId>` keys directly in `localStorage` (via `getStepState`/`setStepState`), not inside `wizardState`, since progress needs to survive independently of the answers that generated the plan.

**The wizard**
- `questions`: an ordered array of question definitions (`id`, `q` for the question text, `cond` for a function deciding whether to show it based on `wizardState`, `o` for the answer options, plus `wrap`, `chk` and `chkName` naming the question's checklist container, checkbox and radio-group name where it has them). `irishRoute` is the only question gated on where a birth was registered rather than on the goal or where someone lives, and it is what keeps the Irish passport route out of plans that did not ask for it. `renderWizard()` draws the current step; `nextWizard()`/`prevWizard()` walk forward and back through only the questions whose `cond` currently passes. `updateLocks()` hides the matching `wrap` in the checklist using the same `cond`, so the two views cannot disagree about which questions apply. `questionIdForInput()` maps a checklist input back to the question that owns it, which is how `chkTouched` records what has been answered so that switching to the step-by-step view resumes rather than starting over.
- `NOTES`: the explanatory sentences that sit under a question. Both views read them from here, the wizard by interpolating into the question text and the checklist through `<em class="note" data-note="key">` slots filled at startup, so the copy has one home.

**The checklist**
- One large `<form>`-like block of checkboxes and radios (in the HTML body) representing every question at once. `renderChecklist()` pushes `wizardState` values into the DOM (used when entering or re-entering the checklist); a single delegated `change` event listener on `#checklistView` reads the DOM back into `wizardState` on every interaction. A plain yes/no checkbox gets both directions for free through `CHK_MAP`, which is derived from the `chk` fields on `questions`; **anything else added to the checklist needs both directions wired up by hand**, or you get sync bugs (see `CHANGELOG.md`'s July 2026 Code entries for two real examples of exactly that).
- Every question with more than one choice is a `<fieldset class="chk-section">` whose `<legend class="chk-q">` is the question, so a screen reader reads the question with its options. The legend floats inside the card rather than sitting on its border; `fieldset.chk-section` and `legend.chk-q` in the CSS handle that. A single yes/no checkbox is a plain `label.checkbox-item` and needs no group. Test 165 fails if a choice is added outside a named group.
- `updateChecklistPosition()`: the "Section 2 of 4" indicator and its bar. It picks the last section whose top has passed a reading line just below the toolbar. A fixed line would never reach the short sections at the end, because the page runs out of scroll before their headings get that high, so over the final screenful the line slides down to the bottom of the viewport and they get their turn. Changing the line back to a fixed offset will silently strand the last section, which is how it behaved before.

**Building and rendering the plan**
- `generateWizardPlan()` / `generateChecklistPlan()`: validate answers, then call `buildSharedPlan()`.
- `buildSharedPlan(p)`: the big function that walks through `PLAN_ITEMS`, decides which steps apply given the answers (`p`), resolves each one's region/goal variant, and renders the actual plan HTML (phases, badges, "more information" panels, sub-checklists for GRC evidence and services).
- `planItemHtml()`, `planCostBadge()`, `planSplitCostBadge()`, `planDiffBadge()`: HTML-building helpers for individual plan rows and their difficulty/cost badges. A `PLAN_ITEMS` cost is only a label (`{ type:'fixed', value }` or `{ type:'split', value, value2 }`); `COST_TONE` turns the label into its colour, so the colour cannot drift from the label: Free is green, Small cost and Medium cost are yellow, Higher cost is red. A new cost label needs an entry there. `planItemHtml()` wraps a summary in `<p>` unless the summary already starts with `<p>`, which is how a summary with a community-advice marker in a second paragraph is written.

**Progress tracking**
- `getStepState()` / `setStepState()` / `applyStepState()`: the generic four-state (not started, in progress, done, not needed) tracker used by every plan item and sub-item, keyed only by a track ID string. `syncSvcParent()` / `syncSvcChildren()` handle the parent-checkbox-reflects-children pattern (used by both the services list and the GRC evidence sub-checklists). These are generalised to work for any parent/child group via a `data-svc-parent` attribute, not hardcoded to one specific group.
- `cycleStepState()`: the click handler that advances a step through its four states. The button's `aria-label` names the current status; there is no `aria-pressed`, since a four-state cycle is not a toggle.
- Screen reader announcements go through one live region, and each new message replaces the last. `refreshPlan(leadMsg)` therefore makes a single announcement: its lead message (a status change, a move, a reset), then any phase hidden by Focus mode, the all-done message, and "Your next step is" only when the next step has changed since the last announcement. Anything that calls `refreshPlan()` and then `announce()` separately will have one message overwrite the other.

**Reordering the plan**
- `moveOrderable()`: the up/down buttons on every step and phase. Steps cannot leave the phase they belong to, so a phase's title and time estimate always describe what it actually contains; whole phases move freely.
- Pointer drag handling on `.item-drag-handle`, with a movement threshold so a short wiggle does not reorder anything.
- `computePlanFingerprint()` / `applyStoredOrderIfValid()`: a custom order is kept in the `planOrder` localStorage key and travels in the shared link. It is stored against a fingerprint of the plan's shape, so if answers change and the plan no longer holds the same steps, the order is discarded rather than applied to the wrong things, and the user is told. `refreshOrderControls()` hides the move controls where there is nothing to move.

**Sharing and persistence**
- `encodeState()` / `decodeState()` / `copyShareableLink()`: encode the current answers and progress into the `?p=...` shareable link.
- `loadUrlParams()` / `handleUrlLoad()` / `handleLegacyUrl()`: the reverse, reconstructing state from a shared link. Read these functions directly in `index.html` if you need the exact data format; it is not reproduced here.
- `openSharedLink()`: every shared link goes through this. If the device already has a saved plan, it first asks whether to open the shared plan, which replaces the saved plan and its progress, or keep the saved one (`openSharedPlan()` / `keepOwnPlan()`). Opening a link also replaces the custom order and Focus mode setting with the link's own, clearing them when the link carries none. `restoreSavedApp()` is the welcome back path, shared by page load and "Keep my plan".

**Everything else**
- Dialog handling (`closeDialogOnBackdrop`, `openHelp`). A dialog closes on a backdrop click by checking that the click landed on the `<dialog>` itself, not by its coordinates: a keyboard-activated link inside a dialog reports a click at `0,0`, which a coordinate check reads as outside. theme toggling, the "panic button" quick-exit, confetti animation on plan completion, and toolbar keyboard navigation (`initToolbarNav`, arrow-key roving tabindex per the WAI-ARIA toolbar pattern). The `window.onload` bootstrap at the bottom restores saved state, wires up the `checklistView` change listener, and sets the footer's copyright year and last-reviewed date.

**Accessibility details that are easy to undo**
- The toolbar and the checklist's "Update my action plan" bar are sticky. `initStickyInsets()` keeps `--sticky-top` and `--sticky-bottom` equal to their heights, and `html` uses them as `scroll-padding`, so the browser never scrolls a focused item underneath either bar. Test 175 checks this at phone width.
- A locked answer (an "already updated" option that needs a deed poll first, or an eVisa that needs the passport first) shows its reason as a visible note, and the input points at that note with `aria-describedby`. The reasons live in `LOCK_REASONS`; the checklist fills its `data-lock` notes from there, and the wizard builds its own.
- Every link that opens a new tab says so to screen readers: plan links through the `.links::after` text, everything else through a visually hidden "(opens in a new tab)". The 🔗 in front of a plan link is wrapped in `<span aria-hidden="true">` so it is not read out. Test 177 checks both.
- "Download this page" fetches the page and saves it through a temporary `blob:` link, after removing any `<script>` or `<a>` that points into `/cdn-cgi/`, which is what Cloudflare adds to the live page. The result is byte for byte the published file (test 178). If the fetch fails, it falls back to a plain download link.

**`ACTIONS` and `runAction()`** (near the very end of the file): the markup has no inline `onclick`/`onchange` attributes. Instead, a clickable or changeable element carries `data-action="handlerName"`, optionally with `data-arg="..."`, and two delegated listeners on `document` (click, and change in the capture phase) look the name up in the `ACTIONS` map and call it as `fn(element, arg, event)`. A checkbox or radio fires both events, so its `click` is ignored and its action runs once, on `change`. To wire up a new control, add the function to `ACTIONS` and put its key in the element's `data-action`. An unknown key logs a warning to the console rather than failing silently, and test 146 fails if any `data-action` in the page has no matching entry, or if an inline handler attribute reappears.

The handful of remaining `window.X = X` lines below the map exist only so the Playwright suite can reach internals such as `questions`, `PLAN_ITEMS` and `CHK_MAP`. They are not needed by the page itself.

---

## If you want to fork or maintain this

- The project principles above are constraints (no server calls, no personal data storage, single file, no build step) that shape every decision in `index.html`, not just style preferences.
- `SERVICES` and `PLAN_ITEMS` are where almost all day-to-day maintenance happens (correcting guidance, adding a new step). You rarely need to touch the rendering logic itself.
- A plain yes/no checklist checkbox only needs a `chk` field naming its element id on the matching `questions` entry; `CHK_MAP` is derived from those and drives both directions. Anything else (a radio group, a multi-select) still needs both a `renderChecklist()` line (state to DOM) and a line in the `checklistEl` change handler (DOM to state). Any one-time UI element (a dismissible tip, a warning banner) needs to be explicitly reset by every "fresh start" entry point (`startWizard()`, `startChecklist()`, `openChecklist()`, `restartApp()`), not just the one place that shows it.
- Run the Playwright suite before and after any change. It is the only safety net given there is no type system or build step to catch mistakes.
