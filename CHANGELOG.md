# Changelog

A plain-English history of what has changed on [Be myself](https://bemyself.uk). This is written for anyone browsing the repo, not just developers.

Each entry is tagged with what kind of change it was:

- **Code** — how the website works: features, bug fixes, behaviour
- **Layout** — how the website looks: styling, spacing, colours, toolbar/dialog structure
- **Wording** — text changes that don't change facts: rephrasing, tone, clarity, removing jargon
- **Information** — changes to the actual guidance: accuracy corrections, UK government process changes, link fixes, new legal/process content
- **Infrastructure** — testing, CI/CD, deployment, repo housekeeping (not visible to users, but included for completeness)

Routine version-bump commits and merge commits are not listed individually; their content is folded into the entry for the change they belong to.

---

## 2026-07-05

- **Code**: Fixed the "Outside the UK" option in the checklist's "Where do you live?" question, which could not actually be selected — the page kept silently resetting it back to "England or Wales" every time anything else on the form changed.
- **Code**: Fixed a leftover "you can now edit your answers" tip banner that could wrongly reappear when starting a brand new plan, if it had been shown once before and never dismissed.
- **Code**: Fixed checklist warning messages (e.g. "please select an option") that could stay on screen after leaving and returning to the checklist, even after the underlying problem no longer applied.
- **Code**: Removed a small piece of leftover code referencing a page element that no longer exists.
- **Layout**: Fixed the site footer (copyright line, "last reviewed" date) being covered by the browser's own address bar/toolbar on some phones, by correcting how the page calculated the height of the screen on mobile.
- **Layout**: Made the "Focus mode" toolbar button icon-only at all screen sizes, instead of sometimes showing a wide text label that couldn't fit and squeezed the other toolbar buttons.
- **Layout**: Changed the "Reset progress" toolbar icon to a broom, so it no longer looks near-identical to the separate "New plan" icon.

## 2026-07-04

- **Information**: Corrected several inaccuracies found in a content accuracy review: added a missing Northern Ireland/Scotland-specific option for criminal record check services (Disclosure Scotland vs DBS vs AccessNI), fixed an outdated State Pension age claim, removed a broken government link, and clarified wording around the Irish passport gender recognition route.
- **Information**: Rewrote the Credit Reference Agencies guidance — clarified that contacting one agency (Experian, Equifax, or TransUnion) is enough, since they share updates between themselves, correcting an earlier claim that all three needed contacting separately.
- **Information**: Added a note that NHS England no longer changes gender markers for patients under 18, following a 2025 policy change, since the planner is used by people aged 16 and over.
- **Wording**: Tightened wording on the Scotland deed poll/statutory declaration guidance to remove repetition between the summary and the "more information" panel.
- **Wording**: Reworded the Gender Recognition Certificate (GRC) "living proof" checklist items from generic "period 1 of 8" labels to clearer relative time ranges (e.g. "Most recent 3 months", "3 to 6 months ago").
- **Wording**: Minor rewording across several plan items and dialogs to remove em dashes and keep language simple.
- **Code**: Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so people can track progress on each piece of evidence individually.
- **Code**: Added a one-time tip that nudges wizard users who go back to edit their answers towards the (often easier) checklist view.
- **Code**: Fixed a bug where toggling one sub-checklist group's progress could incorrectly affect a different group's progress.
- **Layout**: Grouped the "Support & feedback" dialog's list of external organisations under short headings (general support, nation-specific, specialist), instead of one long unlabelled list.
- **Layout**: Added extra mobile footer padding as a first attempt at the footer/browser-chrome overlap problem (later replaced by the proper fix above, on 2026-07-05).
- **Information**: Added two new "services to update" items: professional body/regulator registrations, and HM Land Registry (property title) name changes.
- **Information**: Added a note that UK passports do not currently offer a non-binary/X gender marker option.
- **Information**: Added several more signposting links to trans support organisations.

## 2026-07-02

- **Layout**: Fixed a light-mode colour bug where one of the plan's four colour-coded phases displayed as gold instead of yellow.
- **Layout**: Standardised how cost badges (Free / Small cost / Medium cost / Higher cost) are labelled across the plan.
- **Layout**: Renamed a checklist section for clarity and removed a stray trailing line in the footer.
- **Code**: Fixed two tests that were flaky specifically when run against a local file (rather than a live URL), caused by a timing race with browser storage.
- **Wording**: Removed the GitHub link from the site footer; clarified the disclaimer text; revised the offline-use instructions in the in-app guide.
- **Information**: Small wording correction to a plan item (#40); revised offline usage instructions (#41).

## 2026-07-01

- **Layout**: Split the old single "help" dialog into two: an "About" dialog (what the tool is, FAQs) and a separate practical "Usage guide" (buttons, keyboard shortcuts, progress states).
- **Layout**: Fixed a dialog scrolling bug, tightened spacing under the toolbar, and added a "back to start" button to the toolbar.
- **Layout**: Reworked the mobile toolbar so buttons wrap onto a second row cleanly instead of overflowing off-screen.
- **Code**: Fixed the wizard's "next step" indicator, the placement of a note under the goal-selection question, and kept the age/disclaimer checkboxes in sync between the wizard and checklist views.
- **Code**: Fixed a misleading warning that appeared when no update goal (name/gender marker) had been selected, and moved it to sit directly under the relevant question instead of a separate banner.
- **Code**: Fixed the wizard's "back" button so it steps back one question at a time instead of skipping.
- **Layout**: Centred the footer and the plan heading to match the header's centred layout.
- **Wording**: Fixed inconsistent bold text in the checklist and reduced overly "AI-sounding" phrasing across the site.
- **Information**: Added an FAQ about offline use to the About dialog.
- **Infrastructure**: Bumped the "last reviewed" schema version multiple times as content was corrected (this happens automatically via a GitHub Action on every merge).

## 2026-06-30

- **Layout**: Major visual redesign — cleaner phase/question cards, restructured footer into proper dialogs (About, Privacy, Usage guide, Support & feedback, Disclaimer) instead of inline expandable sections.
- **Layout**: Removed a large embedded custom font in favour of the system font stack, cutting the page's file size significantly.
- **Code**: Merged the old separate "help modal" into the new usage dialog; fixed dialog backdrop-click-to-close behaviour; added a "back to start" link.
- **Wording**: Removed em dashes and overly wordy phrasing from plan content, in line with the project's plain-English style.
- **Information**: Corrected England & Wales content: NHS gender marker options and the non-GRC route through HMRC.
- **Information**: Corrected Scotland deed poll content — a statutory declaration is not a National Records of Scotland process, and clarified it's the traditional (not mandatory) default in Scotland.

## 2026-05-26

- **Code**: Added a disclaimer confirmation check, plus several minor fixes (#38).

## 2026-05-02

- **Wording**: Updated wording for HM Passport Office (HMPO) medical letter requirements.
- **Layout**: General styling and layout changes.
- **Information**: Fixed a broken link in the README.

## 2026-04-22

- **Infrastructure**: Migrated the test suite to Playwright, added the automated test workflow (GitHub Actions), and added the "bump schema version" workflow that auto-updates the site's "last reviewed" date on every merge to `main`/`preview`.
- **Infrastructure**: Added a scheduled broken-link checker (runs on the 1st and 15th of each month) that opens a GitHub issue automatically if it finds a dead link.
- **Code**: Refactored the toolbar button layout and fixed several broken links; added an "employment" field to the shareable-link data.
- **Wording**: Revised the project's contribution principles and updated resource links in the README.
- **Code**: Minor toolbar behaviour fix (#34).

## 2026-04-05 to 2026-04-07

- **Code**: Fixed five bugs: progress being carried over incorrectly on shared links, "ghost" wizard answers persisting after a restart, a missing style class on plan items, a race condition in Focus mode, and the "welcome back" screen lingering when it shouldn't.
- **Code**: Panic button (quick-exit) behaviour changes.
- **Code**: Fixed a plan-item pulse animation and a Focus mode count bug.
- **Code**: Major update bundling several months of accumulated fixes and features (#28).
- **Wording**: Minor rewording of logbook/employment questions.

## 2026-03-31

- **Code**: Refactor and UI changes (#20); assorted bug fixes and behaviour changes.
- **Wording**: Minor rewording of logbook/employment questions.

## 2026-03-24

- **Code**: Added Focus mode support to shareable links, added a "new device" screen when opening a shared link on an unrecognised browser, and added notes for non-binary users.
- **Code**: Fixed shared-link answers being discarded when opened on a version mismatch (#10).
- **Code**: Fixed two minor bugs and added notes to certain plan items (#12).

## 2026-03-22 to 2026-03-23

- **Code**: Initial public launch (1.0), followed by a WCAG accessibility pass (1.01).
- **Infrastructure**: Repository created; initial README, licence (CC BY-NC-SA 4.0), and broken-link-checking workflow added.
