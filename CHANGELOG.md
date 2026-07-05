# Changelog

A plain-English history of what has changed on [Be myself](https://bemyself.uk). This is written for anyone browsing the repo, not just developers.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): entries are grouped by type, most recent first, with the date shown for each. This project does not use Semantic Versioning or tagged releases (it deploys continuously from `main`, with no version numbers anywhere in the app), so the date itself is used as the version marker in each heading below, instead of a version number.

Each entry sits under one of these categories:

- **Code**: how the website works: features, bug fixes, behaviour
- **Layout**: how the website looks: styling, spacing, colours, toolbar/dialog structure
- **Wording**: text changes that do not change facts: rephrasing, tone, clarity, removing jargon
- **Information**: accuracy corrections, link fixes, and new guidance content that are not tied to an actual change in a government process
- **Infrastructure**: testing, CI/CD, deployment, repo housekeeping (not visible to users, but included for completeness)

**⚠️ Government or policy changes are called out separately, above the categorised list, for each date they occur.** These reflect an actual change in a UK government or NHS process, so they affect everyone using the planner for that situation, not just people who happen to hit a particular bug. If a date has no such callout, none applied that day.

Routine version-bump commits and merge commits are not listed individually; their content is folded into the entry for the change they belong to.

---

## [Unreleased]

Nothing queued for the next update yet. Changes land here as they are made, then move under a dated heading once they reach `main`.

## [2026-07-05]

- **Code**
  - Fixed the "Outside the UK" option in the checklist's "Where do you live?" question, which could not actually be selected. The page kept silently resetting it back to "England or Wales" every time anything else on the form changed.
  - Fixed a leftover "you can now edit your answers" tip banner that could wrongly reappear when starting a brand new plan, if it had been shown once before and never dismissed.
  - Fixed checklist warning messages (for example, "please select an option") that could stay on screen after leaving and returning to the checklist, even after the underlying problem no longer applied.
  - Removed a small piece of leftover code referencing a page element that no longer exists.
- **Layout**
  - Fixed the site footer (copyright line, "last reviewed" date) being covered by the browser's own address bar/toolbar on some phones, by correcting how the page calculated the height of the screen on mobile.
  - Made the "Focus mode" toolbar button icon-only at all screen sizes, instead of sometimes showing a wide text label that could not fit and squeezed the other toolbar buttons.
  - Changed the "Reset progress" toolbar icon to a broom, so it no longer looks near-identical to the separate "New plan" icon.

## [2026-07-04]

> **⚠️ Government or policy change (affects everyone updating a gender marker who is 16 or 17):** added a note that, following a 2025 government review, NHS England has stopped issuing new NHS numbers and changing the gender marker on medical records for patients under 18. Names and titles can still be updated at any age. This is specific to NHS England; there was no evidence either way for Scotland or Northern Ireland at the time of writing.

- **Code**
  - Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so people can track progress on each piece of evidence individually.
  - Added a one-time tip that nudges wizard users who go back to edit their answers towards the (often easier) checklist view.
  - Fixed a bug where toggling one sub-checklist group's progress could incorrectly affect a different group's progress.
- **Layout**
  - Grouped the "Support & feedback" dialog's list of external organisations under short headings (general support, nation-specific, specialist), instead of one long unlabelled list.
  - Added extra mobile footer padding as a first attempt at the footer/browser-chrome overlap problem (later replaced by the proper fix above, on 2026-07-05).
- **Wording**
  - Tightened wording on the Scotland deed poll/statutory declaration guidance to remove repetition between the summary and the "more information" panel.
  - Reworded the Gender Recognition Certificate (GRC) "living proof" checklist items from generic "period 1 of 8" labels to clearer relative time ranges (for example, "Most recent 3 months", "3 to 6 months ago").
  - Minor rewording across several plan items and dialogs to remove em dashes and keep language simple.
- **Information**
  - Added a missing Northern Ireland/Scotland-specific option for criminal record check services (Disclosure Scotland vs DBS vs AccessNI).
  - Fixed an outdated State Pension age claim, and removed a broken government link.
  - Clarified wording around the Irish passport gender recognition route.
  - Rewrote the Credit Reference Agencies guidance: clarified that contacting one agency (Experian, Equifax, or TransUnion) is enough, since they share updates between themselves, correcting an earlier claim that all three needed contacting separately.
  - Added two new "services to update" items: professional body/regulator registrations, and HM Land Registry (property title) name changes.
  - Added a note that UK passports do not currently offer a non-binary/X gender marker option.
  - Added several more signposting links to trans support organisations.

## [2026-07-02]

- **Code**
  - Fixed two tests that were flaky specifically when run against a local file (rather than a live URL), caused by a timing race with browser storage.
- **Layout**
  - Fixed a light-mode colour bug where one of the plan's four colour-coded phases displayed as gold instead of yellow.
  - Standardised how cost badges (Free / Small cost / Medium cost / Higher cost) are labelled across the plan.
  - Renamed a checklist section for clarity and removed a stray trailing line in the footer.
- **Wording**
  - Removed the GitHub link from the site footer; clarified the disclaimer text; revised the offline-use instructions in the in-app guide.
- **Information**
  - Small wording correction to a plan item (#40); revised offline usage instructions (#41).

## [2026-07-01]

- **Code**
  - Fixed the wizard's "next step" indicator, the placement of a note under the goal-selection question, and kept the age/disclaimer checkboxes in sync between the wizard and checklist views.
  - Fixed a misleading warning that appeared when no update goal (name/gender marker) had been selected, and moved it to sit directly under the relevant question instead of a separate banner.
  - Fixed the wizard's "back" button so it steps back one question at a time instead of skipping.
- **Layout**
  - Split the old single "help" dialog into two: an "About" dialog (what the tool is, FAQs) and a separate practical "Usage guide" (buttons, keyboard shortcuts, progress states).
  - Fixed a dialog scrolling bug, tightened spacing under the toolbar, and added a "back to start" button to the toolbar.
  - Reworked the mobile toolbar so buttons wrap onto a second row cleanly instead of overflowing off-screen.
  - Centred the footer and the plan heading to match the header's centred layout.
- **Wording**
  - Fixed inconsistent bold text in the checklist and reduced overly "AI-sounding" phrasing across the site.
- **Information**
  - Added an FAQ about offline use to the About dialog.
- **Infrastructure**
  - Bumped the "last reviewed" schema version multiple times as content was corrected (this happens automatically via a GitHub Action on every merge).

## [2026-06-30]

- **Code**
  - Merged the old separate "help modal" into the new usage dialog; fixed dialog backdrop-click-to-close behaviour; added a "back to start" link.
- **Layout**
  - Major visual redesign: cleaner phase/question cards, restructured footer into proper dialogs (About, Privacy, Usage guide, Support & feedback, Disclaimer) instead of inline expandable sections.
  - Removed a large embedded custom font in favour of the system font stack, cutting the page's file size significantly.
- **Wording**
  - Removed em dashes and overly wordy phrasing from plan content, in line with the project's plain-English style.
- **Information**
  - Corrected England & Wales content: NHS gender marker options and the non-GRC route through HMRC.
  - Corrected Scotland deed poll content: a statutory declaration is not a National Records of Scotland process, and clarified it is the traditional (not mandatory) default in Scotland.

## [2026-05-26]

- **Code**
  - Added a disclaimer confirmation check, plus several minor fixes (#38).

## [2026-05-02]

- **Wording**
  - Updated wording for HM Passport Office (HMPO) medical letter requirements.
- **Layout**
  - General styling and layout changes.
- **Information**
  - Fixed a broken link in the README.

## [2026-04-22]

- **Code**
  - Refactored the toolbar button layout and fixed several broken links; added an "employment" field to the shareable-link data.
  - Minor toolbar behaviour fix (#34).
- **Wording**
  - Revised the project's contribution principles and updated resource links in the README.
- **Infrastructure**
  - Migrated the test suite to Playwright, added the automated test workflow (GitHub Actions), and added the "bump schema version" workflow that auto-updates the site's "last reviewed" date on every merge to `main`/`preview`.
  - Added a scheduled broken-link checker (runs on the 1st and 15th of each month) that opens a GitHub issue automatically if it finds a dead link.

## [2026-04-05 to 2026-04-07]

- **Code**
  - Fixed five bugs: progress being carried over incorrectly on shared links, "ghost" wizard answers persisting after a restart, a missing style class on plan items, a race condition in Focus mode, and the "welcome back" screen lingering when it should not.
  - Panic button (quick-exit) behaviour changes.
  - Fixed a plan-item pulse animation and a Focus mode count bug.
  - Major update bundling several months of accumulated fixes and features (#28).
- **Wording**
  - Minor rewording of logbook/employment questions.

## [2026-03-31]

- **Code**
  - Refactor and UI changes (#20); assorted bug fixes and behaviour changes.
- **Wording**
  - Minor rewording of logbook/employment questions.

## [2026-03-24]

- **Code**
  - Added Focus mode support to shareable links, added a "new device" screen when opening a shared link on an unrecognised browser, and added notes for non-binary users.
  - Fixed shared-link answers being discarded when opened on a version mismatch (#10).
  - Fixed two minor bugs and added notes to certain plan items (#12).

## [2026-03-22 to 2026-03-23]

- **Code**
  - Initial public launch (1.0), followed by a WCAG accessibility pass (1.01).
- **Infrastructure**
  - Repository created; initial README, licence (CC BY-NC-SA 4.0), and broken-link-checking workflow added.
