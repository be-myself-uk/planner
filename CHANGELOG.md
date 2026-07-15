# Changelog

A plain-English history of what has changed on [Be myself](https://bemyself.uk). It only lists changes that affect most people using the planner. Small fixes, one-off wording tweaks, and routine test/CI maintenance are not listed here

Each entry sits under one of these categories:

- **⚠️ Government or policy changes** are called out separately
- **Information**: accuracy corrections, link fixes, adding content
- **Wording**: text changes that do not change facts
- **Code**: how the website works
- **Layout**: how the website looks
- **Infrastructure**: testing, CI/CD, deployment, repo changes

---

## [July 2026 Update (Part two)]

- **There have been no government or policy changes that affect the planner since the previous update. If this is mistaken, please [create a Github issue](https://github.com/be-myself-uk/planner/issues).**

- **Information**
  - Corrected the NHS and HMRC document checklist items: neither actually requires a deed poll or statutory declaration, so both are no longer locked behind one.
  - Corrected Northern Ireland service guidance: domestic rates are handled through Land & Property Services rather than Council Tax, electoral registration is through the Electoral Office for Northern Ireland rather than the local council, and vehicle logbook (V5C) updates go through the DVLA rather than the DVA.
  - Corrected the HMRC guidance shown to people only changing their gender marker, so it no longer includes name-change-only wording.
  - Corrected the V5C (vehicle log book) step: there is no online option for a name change, it is postal only.
  - Fixed the AccessNI link, which pointed to a generic contacts page instead of the page describing the transgender applications route.
  - Added a note that requesting a new NHS number can mean losing your place on NHS waiting lists.
  - Added a note that a previous name can still appear on older HM Land Registry documents even after using the CNG form, plus the cost of hiding those documents from public inspection.
  - Added a note that Student Finance England can update a title or gender marker by phone, live chat, or letter with no supporting evidence.
  - Added a note that the Disclosure Scotland application form only offers Male or Female, even for non-binary applicants.
  - Added payroll guidance to the work/HR step: name and gender changes should be reported to HMRC as separate submissions, and gender changes can affect National Insurance category letters.
  - Added the GRC's most basic rule, that it only recognises male or female, to the GRC steps directly instead of leaving it implied.
  - Added a note that a non-consenting spouse does not block a GRC application outright, since an interim certificate can be used instead.
  - Added a note that DVLA/DVA and vehicle keepers can face a large fine for not reporting a name change.
  - Added a note to check with your home country's embassy or consulate in the UK as a first step for a home country passport update.
  - Split the land title register service item by region, so it only shows the guidance relevant to where you live instead of all three nations at once.
- **Wording**
  - Simplified the deed poll "What if an organisation refuses?" note into a plain paragraph instead of a collapsible sub-section, matching how other services show their extra information.
  - Removed specific fee and fine amounts in favour of the same cost-tier wording used elsewhere (Free / Small cost / Medium cost / Higher cost, or "a large fine"), since exact figures can go out of date.
  - Softened the "Quick exit" description to accurately describe what it does (replaces the page in your tab's history) rather than overstating it as removing all browser history.
  - Corrected a line about deleting your data: clearing your browser history alone does not remove saved answers, since those are stored separately.
  - Added short notes to the NHS, HMRC, and UK visa/eVisa checklist items clarifying that ticking them means the record is already updated, not just that you have one.
  - Renamed the "Start now" button to "Start here".
- **Code**
  - The step-by-step wizard now always asks about the NHS record, registering with a new GP, and HMRC, so people only changing their gender marker see the same questions as the checklist. The HMRC question now appears earlier, before the driving licence and passport questions, matching the order steps appear in the plan.
  - The driving licence and passport wizard questions now grey out "It is already updated" when it is not possible, instead of silently changing the answer afterwards.
  - Fixed the eVisa question in the step-by-step wizard giving the opposite answer to the one selected.
  - The eVisa question now unlocks based on passport status rather than the deed poll, matching its own explanation.
  - The driving licence and passport checklist questions now default to "It has my old details" instead of "It is already updated", so a generated plan cannot accidentally miss a step.
  - Shared links now remember the "I do not need to update any of these" services answer.
  - Opening a broken or incomplete shared link no longer clears saved progress.
  - Older shared links now correctly mark an un-updated driving licence or passport as needing an update, instead of as not having one at all.
- **Layout**
  - Each selected service now has its own bordered block in the plan's expanded details when more than one is selected, making it clearer where one service's information ends and the next begins.
  - Fixed a plan step's "more information" text being cut off partway through when many services were selected, caused by an animation height limit that was too low for that much content.
  - Added "What is this?" and "How do I use it?" buttons to the toolbar itself, visible only on the start screen, giving quick access to the About and Usage guide dialogs before starting. They match the toolbar's size and colour, and wrap onto their own row on small screens, the same way the plan view's toolbar buttons do.
  - Removed the hero tagline underneath the site title.
  - The site title and footer are now boxed cards matching the toolbar's style and width, instead of full-width bars, for a more consistent look. Unlike the toolbar, they scroll normally rather than staying fixed in place.
  - Tightened the padding inside those boxes and the gaps around them, giving the main content more of the screen.
  - Removed the "Your personal action plan" heading from the plan view to give the plan itself more room (it remains in the page for screen readers, since it's still used to move focus to the plan once it's generated).

## [July 2026 Update]

- **There have been no government or policy changes that affect the planner since the previous update. If this is mistaken, please [create a Github issue](https://github.com/be-myself-uk/planner/issues).**

- **Information**
  - Added a missing Northern Ireland/Scotland-specific option for criminal record check services (Disclosure Scotland, DBS, and AccessNI).
  - Corrected the State Pension age guidance, and removed a broken government link.
  - Added credit reference agencies guidance.
  - Added two new "services to update" items: professional body or regulator registrations, and HM Land Registry (property title) name changes.
  - Added a note that UK passports do not currently offer a non-binary or X gender marker option.
  - Added a note regarding NHS England not providing under 18s with new NHS numbers or changing the gender marker.
  - Corrected England and Wales content: NHS gender marker options and the non-GRC route through HMRC.
  - Corrected Scotland deed poll content: a statutory declaration is not a National Records of Scotland process.
- **Wording**
  - Reorganised the Disclaimer page into clearer sections, and tidied up the wording throughout.
- **Code**
  - Fixed the age check on shared plan links so it matches the age check everywhere else on the site.
  - Added a short note to the printed or saved PDF version of a plan, including the date it was made, since printed copies did not show this before.
  - Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so people can track progress on each piece of evidence individually.
  - Fixed the wizard's "back" button, which was skipping initial questions instead of stepping back one at a time.
  - Fixed a misleading warning that appeared when no update goal (name or gender marker) had been selected.
- **Layout**
  - Major visual redesign: cleaner phase and question cards, and a restructured footer with proper dialogs (About, Privacy, Usage guide, Support & feedback, Disclaimer). In the footer, split the old single "help" dialog into a separate "About" dialog and a practical "Usage guide".
  - Fixed the site footer being obscured by the browser's own address bar or toolbar on some phones and UI layouts.
  - Fixed a light-mode colour bug where one of the plan's four colour-coded phases displayed as gold instead of yellow.
  - Reworked the mobile toolbar so buttons wrap onto a second row cleanly instead of overflowing off-screen when viewing an action plan.
  - Removed a large embedded custom font in favour of the system font stack, reducing the page's file size significantly.
- **Infrastructure**
  - Updated README.md to be in sync with the website.
  - Created this [changelog](CHANGELOG.md) and a [contributing](CONTRIBUTING.md) page (for development, not donations).
  - Created [SOURCES.md](SOURCES.md), which is a non-exhaustive list of official sources for the planner's content, with documented deviations for realistic practice and community-advice differences.
  - The repo has been restructured.
  - Updated the build command so robots.txt is accurately deployed.

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
