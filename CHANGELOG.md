# Changelog

A plain-English history of what has changed on [Be myself](https://bemyself.uk). This is written for anyone browsing the repo, not just developers.

This only lists changes that affect most people using the planner: redesigns, new features, accuracy or policy corrections, and widespread bugs. Small fixes, one-off wording tweaks, and routine test/CI maintenance are not listed individually here; the full commit history on GitHub has the complete record if you need it.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): entries are grouped by type, most recent first, with the date shown for each. This project does not use Semantic Versioning or tagged releases (it deploys continuously from `main`, with no version numbers anywhere in the app), so the date itself is used as the version marker in each heading below, instead of a version number.

Each entry sits under one of these categories:

- **Code**: how the website works: features, bug fixes, behaviour
- **Layout**: how the website looks: styling, spacing, colours, toolbar/dialog structure
- **Wording**: text changes that do not change facts: rephrasing, tone, clarity, removing jargon
- **Information**: accuracy corrections, link fixes, and new guidance content that are not tied to an actual change in a government or health service process
- **Infrastructure**: testing, CI/CD, deployment, repo housekeeping (not visible to users, but included for completeness)

**⚠️ Government or policy changes are called out separately, above the categorised list, for each date they occur.** These reflect an actual change to a government or health service process anywhere in the UK, so they affect everyone using the planner for that situation, not just people who happen to hit a particular bug. If a date has no such callout, none applied that day.

---

## [Unreleased]

Nothing queued for the next update yet. Changes land here as they are made, then move under a dated heading once they reach `main`.

## [6 July 2026]

- **Code**
  - Fixed the shared-plan age/disclaimer gate, which previously let someone through with "or I have parental consent", the one place the site's own wording admitted an out-of-scope under-16 user.
  - Added a print-only disclaimer footer to the generated plan, with the date it was generated, since printed or PDF copies previously carried no disclaimer at all.
- **Wording**
  - Rewrote and regrouped the Disclaimer dialog by theme (what this is, using this planner, legal terms), clarifying that the action plan is general information rather than personalised advice, and that it also covers the Irish passport gender recognition route.
  - Added external-links and severability sentences to the disclaimer; removed a governing-law line that named no single UK jurisdiction and so was legally meaningless as drafted.
  - Synced `README.md`'s Disclaimer section with the same wording.

## [5 July 2026]

- **Layout**
  - Fixed the site footer (copyright line, "last reviewed" date) being covered by the browser's own address bar or toolbar on some phones.

## [4 July 2026]

> **⚠️ Government or policy change (affects everyone updating a gender marker who is 16 or 17):** added a note that, following a 2025 government review, NHS England has stopped issuing new NHS numbers and changing the gender marker on medical records for patients under 18. Names and titles can still be updated at any age. This is specific to NHS England; there was no evidence either way for Scotland or Northern Ireland at the time of writing.

- **Code**
  - Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so people can track progress on each piece of evidence individually.
- **Information**
  - Added a missing Northern Ireland/Scotland-specific option for criminal record check services (Disclosure Scotland, DBS, and AccessNI).
  - Corrected the State Pension age guidance, and removed a broken government link.
  - Rewrote the credit reference agencies guidance: contacting one agency (Experian, Equifax, or TransUnion) is enough, correcting an earlier claim that all three needed contacting separately.
  - Added two new "services to update" items: professional body or regulator registrations, and HM Land Registry (property title) name changes.
  - Added a note that UK passports do not currently offer a non-binary or X gender marker option.

## [2 July 2026]

- **Layout**
  - Fixed a light-mode colour bug where one of the plan's four colour-coded phases displayed as gold instead of yellow.

## [1 July 2026]

- **Code**
  - Fixed the wizard's "back" button, which was skipping questions instead of stepping back one at a time.
  - Fixed a misleading warning that appeared when no update goal (name or gender marker) had been selected.
- **Layout**
  - Split the old single "help" dialog into a separate "About" dialog and a practical "Usage guide".
  - Reworked the mobile toolbar so buttons wrap onto a second row cleanly instead of overflowing off-screen.

## [30 June 2026]

- **Layout**
  - Major visual redesign: cleaner phase and question cards, and a restructured footer with proper dialogs (About, Privacy, Usage guide, Support & feedback, Disclaimer).
  - Removed a large embedded custom font in favour of the system font stack, reducing the page's file size significantly.
- **Information**
  - Corrected England and Wales content: NHS gender marker options and the non-GRC route through HMRC.
  - Corrected Scotland deed poll content: a statutory declaration is not a National Records of Scotland process.

## [26 May 2026]

- **Code**
  - Added a disclaimer confirmation check, plus several minor fixes.

## [2 May 2026]

- **Wording**
  - Updated wording for HM Passport Office (HMPO) medical letter requirements.

## [22 April 2026]

- **Infrastructure**
  - Migrated the test suite to Playwright, and added automated testing and a scheduled broken-link checker.

## [5 to 7 April 2026]

- **Code**
  - Major update bundling several months of accumulated fixes and features.
  - Fixed five bugs affecting shared links, wizard answers persisting incorrectly, and Focus mode.

## [31 March 2026]

- **Code**
  - Refactor and UI changes.

## [24 March 2026]

- **Code**
  - Added Focus mode support to shareable links, and a "new device" screen for shared links opened on an unrecognised browser.
  - Fixed shared-link answers being discarded when opened after an update.

## [22 to 23 March 2026]

- **Code**
  - Initial public launch (1.0), followed by a WCAG accessibility pass (1.01).
- **Infrastructure**
  - Repository created, with an initial README, licence (CC BY-NC-SA 4.0), and a broken-link-checking workflow.
