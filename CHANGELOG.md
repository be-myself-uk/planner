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

## [September 2026 Update]

- **⚠️ NHS England has brought in a single national waiting list for adult gender services, held by the National Adult Gender Referral Support Service. If you are waiting for a first appointment in England, that service holds your referral separately from your GP record, and you need to tell it about a change of name or other details yourself. Your place on the list is set by your original referral date and does not change when you update your details.**

- **⚠️ GOV.UK now requires a further document that already shows your new name when you apply to change your driving licence by deed poll or statutory declaration, dated after the deed poll and after your current licence if you already hold one. A driving licence can no longer be used to get photo ID in your new name for other services, such as a bank, since the licence itself now needs that evidence first.**

- **Information**
  - Added a note to the health record steps, for all four nations, explaining that updating your details with your GP may not update them with other services you use, and that this also applies if you are given a new NHS number, CHI number, or Health and Care Number. This warning previously appeared only for Northern Ireland.
  - Added the National Adult Gender Referral Support Service to the England health record steps, with a link.
  - Reviewed the GOV.UK sources flagged by the automated source check on the medical practitioners list, NHS population screening, passport name evidence, and EU Settlement Scheme guidance. None of the changes affected what the planner says.
  - Manually reviewed every non-GOV.UK source in [SOURCES.md](SOURCES.md) not covered by the automated GOV.UK check (NI Direct, NRS, NHS Inform, PCSE, mygov.scot, EONI, ICO, Experian, and others). None of the changes affected what the planner says; two sources (a Registers of Scotland page and two Electoral Commission pages) could not be reached for this review and are due another look next time.
  - Corrected the driving licence step and the banks/services guidance, which previously told people that updating their driving licence first could help if a bank asked for photo ID. That is no longer possible under GOV.UK's current rules, since the DVLA needs a document already showing your new name before it will update the licence. The driving licence step now lists which documents can be used instead.
  - Added the Welsh Gender Service (WGS) to the Wales health record steps, with a link to their change-of-details process. This is the Wales equivalent of the National Adult Gender Referral Support Service note added for England, and is shown only for Wales.
  - Reviewed the plan's guidance text for references that only make sense if a different, separately-selected step also happens to be shown. The electoral register and mobile contract items pointed to "the credit reference agencies item below", which is not there unless that service is also selected; the driving licence step's comparison of slower documents named the electoral register itself, which is not one of the documents accepted for that step. Also added two GOV.UK links (the approved medical practitioner list and the approved countries list) to the Northern Ireland GRC step, which the rest of the UK already had for the same UK-wide process.
  - Added a note to the HMRC step for 16 and 17 year olds: a National Insurance number is usually sent shortly before your 16th birthday, so the letter may arrive in your old name. The number itself does not need updating, but HMRC can still be told your new name.
  - Added a new "Dentist or optician" service item, since these are separate businesses from your GP practice with their own patient records.
  - Added a mention of Housing Benefit to the Council Tax step, since it is usually handled by the same council team, often alongside Council Tax Support.
  - Retitled the banks service item to "Banks, building societies, and financial accounts" and updated its wording to make clear it applies to building societies too, not just banks.
  - Softened "public record"/"publicly accessible" wording on the Scottish and Northern Ireland birth certificate name-recording steps. Neither NRS's nor NI Direct's own guidance uses that phrasing; the supported fact is that the change is permanent and any future certified copy will show both names, which is what the planner now says.
  - Corrected the Irish passport step. It previously said an Irish Gender Recognition Certificate was needed before a gender-change update, and told people to apply for an ordinary Irish passport first. Neither is right for someone living in Northern Ireland or elsewhere outside Ireland: the actual route is a statutory declaration plus two years of evidence using your new name, for a first passport as well as a renewal, and applying for a passport in your previous name first only resets that two-year clock. The Irish GRC route is now described as applying only to people living in Ireland.
  - Split the driving licence step into separate versions depending on whether you are changing your name, your gender marker, or both. Previously, someone changing only their gender marker was shown the evidence needed for a name change, which does not apply to them. The gender-only version now states that the DVLA accepts a deed poll, a statutory declaration, or a GRC, matching what the DVA in Northern Ireland already told people. The combined version now also notes that a GRC used for a combined change must be sent together with a deed poll or a statutory declaration.
  - Corrected the passport medical letter requirements to match HM Passport Office's own caseworker guidance: added the requirement for a handwritten signature and for the medical professional to confirm they know the applicant well enough to make a diagnosis, clarified that a professional without GMC or HCPC registration can be based in the UK or overseas rather than only overseas, and noted that HM Passport Office asks for a replacement letter from a registered professional if a letter from this wider route is turned down.
  - Corrected the passport consent note for 16 and 17 year olds. It previously said HM Passport Office can make an exception where consent cannot be obtained because of safeguarding concerns. Safeguarding concerns are in fact the situation where none of the named exceptions apply and a court order is needed instead; the actual exceptions are being close to your 18th birthday, both parents having died, or having no contact with one or both parents.
  - Corrected the GRC medical evidence step: there is no approval scheme for the doctors and clinical psychologists who write the two required reports. Reworded to describe the actual requirements, including who can write each report, and corrected the "List of approved medical practitioners" link label, since GOV.UK's own publication does not call itself that.

- **Wording**
  - Spelled out several abbreviations the first time they appear in a step a reader could see on their own, without having also seen a different step that happened to explain the same term first: CHI (Community Health Index) and HSCNI (Health and Social Care Northern Ireland), PCSE (Primary Care Support England), TENI (Transgender Equality Network Ireland), SAAS (Student Awards Agency for Scotland), and the GMC/HCPC medical regulators named in the passport step.
  - Split the driving licence step's list of eight acceptable documents, previously one long sentence, into two short bulleted lists, matching how a similar list is already presented on the passport step.

- **Code**
  - Added Wales as its own region for both "Where do you live?" and "Where was your birth registered?", previously grouped with England as a single "England or Wales" option in both. Wherever a step's guidance does not genuinely differ for Wales (which is most of the planner: DBS, DWP, deed poll, driving licence, GRC, and more), Wales automatically uses the same content as England, so this did not duplicate content across the two nations. Birth registration currently treats Wales identically to England either way, since both share the General Register Office, but the two are now tracked separately so that can change independently if it ever needs to.
  - Added an "All of these" checkbox to the services question, in both the step-by-step wizard and the single checklist view, so people who need to update most or all of the listed services do not have to tick each one individually. Ticking individual services back off afterwards works normally and does not disable anything.
  - Added a "See what's changed" link to the welcome-back screen, for both a normal returning visit and one where the planner has been updated since your plan was created, linking to this changelog. Previously the only way to find it was through the About dialog.

- **Infrastructure**
  - Added the National Adult Gender Referral Support Service to [SOURCES.md](SOURCES.md).
  - Added GOV.UK's identity documents page for driving licence applications to [SOURCES.md](SOURCES.md).
  - Added the Welsh Gender Service to [SOURCES.md](SOURCES.md).
  - Added GOV.UK's National Insurance number page and Housing Benefit page to [SOURCES.md](SOURCES.md).
  - Added HM Passport Office's "Gender recognition" caseworker guidance as a linked source, since the passport medical letter requirements come from it rather than from the shorter public-facing GOV.UK page. Added a UK Parliament written answer on DVLA evidence requirements, and section 9 of the Gender Recognition Act 2015 (Ireland), both to [SOURCES.md](SOURCES.md).
  - Rebuilt `bump-version.yml`. It previously ran on every pull request merged into `main` or `preview`, tried to push the version bump directly, and fell back to opening a pull request when that push was rejected — a fallback that could not actually complete, since this repository does not allow GitHub Actions to open pull requests, so every run since at least July left behind an abandoned branch nobody could merge. It now runs only on a push to `main` that changes `index.html`, pushes using a repository admin's token so it can go through, and fails the run with a clear error if that push is still rejected, instead of creating a branch.
  - Removed the `index.html`/`tests/**` path filter from `playwright.yml`. Once the Playwright suite became a required status check on `main`, that filter meant a pull request touching only other files (documentation, other workflows) could never satisfy it, since the check would never be reported at all, leaving the pull request stuck waiting indefinitely. The suite now runs on every push or pull request to `main`/`preview`, which costs under a minute of extra CI time on the pull requests it previously skipped.
  - Added a content-integrity test that compares every plan and service item's text against a committed snapshot (`tests/content-snapshots.json`), so an unintended change to any item's wording fails the test suite and names the exact item, rather than only being caught by manual review. Regenerate the snapshot with `npm run generate-content-snapshots` after an intentional content change.

## [July 2026 Update (Part four)]

- **There have been no government or policy changes that affect the planner since the previous update. If this is mistaken, please [create a Github issue](https://github.com/be-myself-uk/planner/issues).**

- **Information**
  - Corrected the Northern Ireland deed poll guidance: the DVA lists a deed poll, a statutory declaration, or a GRC as acceptable evidence for a gender marker change, so a basic deed poll is no longer described as possibly not being enough. The community preference for statutory declarations is kept and marked as community advice.
  - Corrected the DWP name change guidance: no official source documents HMRC passing a name change to DWP, so the planner now advises telling each office that pays you a benefit.
  - Corrected the Scotland gender marker guidance to match the process published by NHS National Services Scotland: no evidence is needed, and you can tell either your GP practice or Practitioner Services.
  - Added the evidence the DVA accepts for a gender marker change: a deed poll, a statutory declaration, or a GRC, with no medical letter needed.
  - Added that the "indeterminate" gender marker on NHS England records is only available from age 18.
  - Added official links about water billing in Northern Ireland and Scotland to the utility bills service item.
  - Clarified the HMRC team names: Special Section D handles changes, and restricted records are looked after by Public Department 1 (PD1).
  - Fixed the National Records of Scotland name change link, which pointed to an old address.
- **Layout**
  - Added a community advice marker, a small circled "i", to guidance that comes from the shared experiences of the transgender and non-binary communities rather than an official source, and to time estimates. Hovering over the marker, or focusing it with the keyboard, shows an explanation, and the Usage guide describes it.
- **Infrastructure**
  - Added a test covering the community advice marker and its Usage guide entry.

## [July 2026 Update (Part three)]

- **There have been no government or policy changes that affect the planner since the previous update. If this is mistaken, please [create a Github issue](https://github.com/be-myself-uk/planner/issues).**

- **Information**
  - People living outside the UK are no longer asked about their NHS/GP record, DBS/AccessNI/Disclosure Scotland check, or DWP benefits, and Council Tax and the electoral register no longer appear in the services list, since none of these apply outside the UK. Previously, selecting "Outside the UK" silently reused England and Wales guidance for all of these.
  - People whose birth was registered outside the UK now see a note on the birth certificate step explaining that this planner does not cover updating a birth certificate issued by another country, instead of being shown England and Wales-specific General Register Office guidance that doesn't apply to them.
  - Added a note that a passport gender marker change for a 16 or 17 year old needs the signed consent of everyone with parental responsibility, unlike a name-only change which they can consent to themselves.
- **Code**
  - Confirming you are aged 16 or over or that you understand the disclaimer in the checklist view now moves screen reader focus directly to the checkbox that needs attention, instead of just scrolling it into view.

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
