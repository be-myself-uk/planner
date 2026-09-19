# Changelog

All notable changes to [Be myself](https://bemyself.uk) are recorded here, newest first.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project has no version numbers, so entries are grouped by the month the work landed.

Small fixes and one-off wording tweaks are left out. Changes are grouped under these headings:

- **⚠️ Government or policy changes** come first, because they may change what you need to do
- **Information**: corrections to guidance, new content, fixed links
- **Wording**: text changes that do not change the facts
- **Code**: how the website works
- **Layout**: how the website looks
- **Infrastructure**: testing, deployment, and repository changes

## [Unreleased]

### Information

- The question about whether you have a deed poll or statutory declaration is now asked if you are only changing your gender marker. The DVLA, the DVA, and the NHS each accept one of these as evidence for a gender marker change.

### Code

- Printing your plan, or saving it as a PDF, now includes the "more information" for each step.
- The question counter in the step-by-step view now only counts up. The total can still fall once you say what you need to update, because that removes questions that no longer apply.
- The Esc key now needs two presses within a second to leave the site. The red Quick exit button still works with one click.
- Fixed the checklist naming a button that was not on the page after switching views.

### Layout

- Added a short, dismissible note at the top of a new plan explaining that the box beside each step marks it as in progress, done, or not needed.

## [September 2026]

- **⚠️ NHS England has brought in a single national waiting list for adult gender services, held by the National Adult Gender Referral Support Service. If you are waiting for a first appointment in England, that service holds your referral separately from your GP record, and you need to tell it about a change of name or other details yourself. Your place on the list is set by your original referral date and does not change when you update your details.**

- **⚠️ DVLA now asks for a further document that already shows your new name when you change your driving licence by deed poll or statutory declaration. It must be dated after the deed poll, and after your current licence if you already hold one. A driving licence can therefore no longer be used to get photo ID in your new name for other services, such as a bank, because the licence itself now needs that evidence first.**

- **⚠️ HM Passport Office (HMPO) now asks for a separate letter formally requesting the change of gender when you change a UK passport's gender marker without a Gender Recognition Certificate. This is in addition to the medical letter and name-usage evidence. With a GRC, no extra letter is needed.**

### Information

- Added a "Paperwork for your GRC application" step. A Gender Recognition Certificate application needs several documents besides the medical reports and two years of evidence.
- Added a note to the health record steps, for all four nations, explaining that updating your details with your GP may not update them with other services you use. The same applies if you are given a new NHS number, CHI number, or Health and Care Number.
- Added the National Adult Gender Referral Support Service to the England health record steps, and the Welsh Gender Service to the Wales steps, both with links to their change-of-details processes.
- Corrected the driving licence step and the banks guidance, which said that updating your driving licence first could help if a bank asked for photo ID. That is no longer possible under GOV.UK's current rules. The step now lists which documents can be used instead.
- Corrected the Irish passport step. It said an Irish Gender Recognition Certificate was needed first, and told people to apply for an ordinary Irish passport before that. Neither is right if you live in Northern Ireland or anywhere outside Ireland. The route is a statutory declaration plus two years of evidence using your new name, for a first passport as well as a renewal, and applying in your previous name first only resets that two-year clock. The Irish GRC route applies only to people living in Ireland.
- Split the driving licence step by what you are changing. Someone changing only their gender marker was shown the evidence needed for a name change, which does not apply to them.
- Corrected the passport medical letter requirements to match HM Passport Office's own caseworker guidance, including the need for a handwritten signature and for the medical professional to confirm they know you well enough to make a diagnosis.
- Corrected the passport consent note for 16 and 17 year olds. The exceptions to needing consent are being close to your 18th birthday, both parents having died, or having no contact with one or both parents. Where none of those apply, a court order is needed instead.
- Corrected the GRC medical evidence step: there is no approval scheme for the doctors and clinical psychologists who write the two reports. The step now describes who can actually write each one.
- Rewrote the credit reference agencies guidance. Contacting one of Experian, Equifax, or TransUnion only starts the process at the other two, it does not complete it, and each still needs its own form and evidence. Added a note that a Notice of Correction can mean lenders review your applications by hand rather than automatically.
- Reworded the HMRC gender marker guidance to match GOV.UK's own wording ("usually" rather than always automatic), and made clear that restricting your record for privacy is separate from the gender marker change itself.
- Corrected the qualifications step's professional regulator example, which named the Solicitors Regulation Authority as though it covered the whole UK. It only regulates solicitors in England and Wales.
- Split the qualifications step's student finance guidance for Scotland, where SAAS updates your name, gender, and title together on one confidential form.
- Added a note to the HMRC step for 16 and 17 year olds: a National Insurance number is usually sent shortly before your 16th birthday, so the letter may arrive in your old name. The number itself does not need updating, but you can still tell HMRC your new name.
- Added a "Dentist or optician" service item, since these keep their own patient records separately from your GP.
- Added Housing Benefit to the Council Tax step, since the same council team usually handles both.
- Retitled the banks item to "Banks, building societies, and financial accounts", and made clear it applies to building societies too.
- Softened "public record" wording on the Scottish and Northern Ireland birth certificate steps. Neither NRS nor NI Direct uses that phrasing. What is supported, and what the planner now says, is that the change is permanent and any future certified copy shows both names.
- Corrected the wording on what happens to the Irish passport route's two-year name-usage period if you already hold a passport in your previous name.
- Added a note that some exam boards will waive a replacement certificate fee if asked, even though this is not documented publicly.
- Removed references pointing at other steps that may not be in your plan. The electoral register and mobile contract items pointed at the credit reference agencies item, which is only there if you chose it.
- Added a "Sources" link to the support and feedback panel. The list of official sources behind the guidance was previously only reachable through GitHub.
- Reviewed every source behind the planner's guidance, both GOV.UK and others. None of the changes found affected what the planner says. Two sources could not be reached and are due another look next time.

### Wording

- Renamed two step titles that had not changed since launch. "The final step" is now "Legal gender recognition", and "The basics" is now "Your name-change document".
- Added a line under the site title saying what the planner is for: "Plan updating your name and gender marker on UK documents".
- Rewrote the page title and the description shown in search results and link previews, so the planner can be found by people searching for it.
- Spelled out several abbreviations the first time they appear in a step, rather than assuming you had read a different step first: CHI, HSCNI, PCSE, TENI, SAAS, and the GMC and HCPC medical regulators.
- Split the driving licence step's list of eight acceptable documents into two short lists instead of one long sentence.

### Code

- You can now reorder your action plan. Each step and each group has up and down arrows, and can also be dragged by a small handle. Your order is remembered on this device and carries over in a shared link, and a "Reset order" button puts everything back. If you change your answers and the plan no longer holds the same steps, your order is reset rather than applied to the wrong things, and you are told.
- Steps can no longer be moved out of the group they belong to, which used to leave a group's title and time estimate describing something other than what it contained. Whole groups can still be reordered freely.
- With Focus mode on, a step no longer disappears the moment you mark it done. The status button has four settings, so anyone aiming for "not needed" passes through "done" on the way. It now waits about two seconds before hiding, and clicking again cancels that.
- Added an "I already have a Gender Recognition Certificate" answer. Choosing it skips the guidance written for people still applying, and changes the birth certificate step to describe following up with the registrar.
- Added a third employment answer, "I've already updated my records". Choosing it still asks about DBS, AccessNI, or Disclosure Scotland, since that depends on your role rather than on your employer's records.
- Added Wales as its own option for both "Where do you live?" and "Where was your birth registered?", instead of grouping it with England.
- Added an "All of these" option to the services question, so you do not have to tick each one.
- Split the last step into separate sections if you were born in Northern Ireland and are pursuing both a UK Gender Recognition Certificate and an Irish passport, instead of one long block.
- Made the "Estimated time" and "Approximate costs" summary collapsible, with a "Don't show this again" option, matching the "Did you know about titles?" note.
- Added a countdown to the restart and reset-progress buttons, so you can see the warning that a screen reader already announced.
- Added a short, dismissible note explaining that later checklist sections change based on your region and goal, so a section disappearing is not a fault.
- Added an explanation, shown when a shared link is broken or out of date, that the all-in-one checklist has been opened instead of the step-by-step questions.
- Added a "Recent changes" link to the welcome-back screen, pointing here.
- Focus mode now announces when a whole group is finished, not only when the entire plan is.
- Fixed the "?" keyboard shortcut for the help dialog not working while a checkbox or radio button had focus.
- Fixed the toolbar's arrow-key order on narrow screens, where a button on the second row could be reached before one still on the first.
- Fixed the checklist not showing a group's tick straight away when restored from a saved plan or a shared link.

### Layout

- Increased the spacing between steps within a group, so a group with several steps reads less cramped.
- Fixed a step's title, on narrow screens, wrapping onto several lines with its difficulty and cost badges sitting across them. The title now gets its own room, with badges moving underneath when there is no space beside it.
- Fixed the Irish passport and UK GRC routes, shown as two boxes side by side, having no spacing around their contents.
- Improved the colour contrast of greyed-out checklist text.

### Infrastructure

- Added `robots.txt` and `sitemap.xml`. Anything asking for either was previously handed the planner's own page, because any address that is not a real file serves the application.
- Narrowed the rule that keeps shared plan links out of search results. It applied to any address with a query string, which caught ordinary tracking parameters added by newsletters and social media. Those addresses were told not to appear in search results while also naming the homepage as their canonical address, which risked the homepage being dropped from search results.
- Added a content-integrity test comparing every plan and service item's text against a committed snapshot, so an unintended change to any item's wording fails the test suite and names the exact item. This now covers evidence checklist labels too.
- Extended the scheduled source check to sources it previously left to manual review: everything in [SOURCES.md](SOURCES.md) that is not GOV.UK or a static record such as legislation. Each is rendered, its article text extracted, and compared against a committed snapshot.
- Rebuilt `bump-version.yml`. It ran on every pull request merged into `main` or `preview`, tried to push directly, and fell back to opening a pull request when that was rejected. That fallback could not complete, because this repository does not allow GitHub Actions to open pull requests, so every run since July left an abandoned branch nobody could merge. It now runs only on a push to `main` that changes `index.html`, pushes with a token that works, and fails loudly if that push is rejected.
- Removed the path filter from `playwright.yml`. Once the suite became a required check on `main`, the filter meant a pull request touching only documentation could never satisfy it, leaving the pull request stuck.
- Fixed two tests that could fail for no real reason and hold up unrelated work. Both save something, reload, and check it survived. Run against a local file, the browser occasionally loses a value saved moments before a reload, and the value was gone for good. The tests now keep a copy and restore anything lost before reloading again.
- Added tests covering keyboard navigation, the new employment and GRC answers, and several accessibility attributes.
- Added sources to [SOURCES.md](SOURCES.md): the National Adult Gender Referral Support Service, the Welsh Gender Service, GOV.UK's identity documents, National Insurance and Housing Benefit pages, HM Passport Office's gender recognition caseworker guidance, a UK Parliament written answer on DVLA evidence, and section 9 of the Gender Recognition Act 2015 (Ireland).
- Added notes to the GitHub issue templates pointing at the project's constraints and sourcing expectations.

## [July 2026]

No government or policy changes affected the planner this month. If that looks wrong, please [open an issue](https://github.com/be-myself-uk/planner/issues).

### Information

- People living outside the UK are no longer asked about their NHS or GP record, DBS, AccessNI or Disclosure Scotland check, or DWP benefits, and Council Tax and the electoral register no longer appear in the services list. None of these apply outside the UK, and choosing "Outside the UK" previously reused England and Wales guidance for all of them.
- People whose birth was registered outside the UK now see a note explaining that the planner does not cover updating a birth certificate issued by another country, instead of General Register Office guidance that does not apply to them.
- Corrected the Northern Ireland deed poll guidance. The DVA accepts a deed poll, a statutory declaration, or a GRC as evidence for a gender marker change, so a basic deed poll is no longer described as possibly not being enough. The community preference for statutory declarations is kept, and marked as community advice.
- Corrected the DWP name change guidance. No official source says HMRC passes a name change to DWP, so the planner now tells you to contact each office that pays you a benefit.
- Corrected the Scotland gender marker guidance to match NHS National Services Scotland: no evidence is needed, and you can tell either your GP practice or Practitioner Services.
- Corrected Northern Ireland service guidance. Domestic rates go through Land & Property Services rather than Council Tax, electoral registration through the Electoral Office for Northern Ireland rather than the council, and vehicle logbook updates through the DVLA rather than the DVA.
- Corrected the NHS and HMRC checklist items. Neither requires a deed poll or statutory declaration, so neither is locked behind one any more.
- Corrected the HMRC guidance shown to people changing only their gender marker, which included name-change wording.
- Corrected the V5C vehicle logbook step: a name change is postal only, there is no online option.
- Corrected the State Pension age guidance, and removed a broken government link.
- Corrected England and Wales content on NHS gender marker options and the non-GRC route through HMRC.
- Corrected Scotland deed poll content: a statutory declaration is not a National Records of Scotland process.
- Added a note that a passport gender marker change for a 16 or 17 year old needs the signed consent of everyone with parental responsibility, unlike a name-only change, which they can consent to themselves.
- Added a note that requesting a new NHS number can mean losing your place on NHS waiting lists.
- Added a note that a non-consenting spouse does not block a GRC application, because an interim certificate can be used instead.
- Added the GRC's most basic rule, that it only recognises male or female, to the GRC steps rather than leaving it implied.
- Added a note that a previous name can still appear on older HM Land Registry documents even after using the CNG form, and what it costs to hide those documents from public inspection.
- Added a note that Student Finance England can update a title or gender marker by phone, live chat, or letter, with no evidence needed.
- Added a note that the Disclosure Scotland form only offers Male or Female, even for non-binary applicants.
- Added a note that DVLA, DVA, and vehicle keepers can face a large fine for not reporting a name change.
- Added payroll guidance to the work step: name and gender changes should go to HMRC as separate submissions, and a gender change can affect National Insurance category letters.
- Added a note to check with your home country's embassy or consulate in the UK as a first step for a home country passport update.
- Added that the "indeterminate" gender marker on NHS England records is only available from age 18, and that NHS England does not give under-18s new NHS numbers or change their gender marker.
- Added credit reference agencies guidance, and two new services to update: professional body or regulator registrations, and HM Land Registry property titles.
- Added a missing Northern Ireland and Scotland option for criminal record checks, covering AccessNI and Disclosure Scotland alongside DBS.
- Added the evidence the DVA accepts for a gender marker change: a deed poll, a statutory declaration, or a GRC, with no medical letter needed.
- Added a note that UK passports do not currently offer a non-binary or X gender marker.
- Added official links about water billing in Northern Ireland and Scotland.
- Clarified the HMRC team names: Special Section D handles changes, and Public Department 1 looks after restricted records.
- Split the land title register item by region, so it shows only the guidance for where you live.
- Fixed the National Records of Scotland name change link and the AccessNI link, both of which pointed at the wrong pages.

### Wording

- Reorganised the disclaimer into clearer sections and tidied the wording throughout.
- Removed specific fees and fine amounts in favour of the cost wording used elsewhere (Free, Small cost, Medium cost, Higher cost), since exact figures go out of date.
- Corrected the description of "Quick exit" to say what it actually does: it replaces the page in your tab's history.
- Corrected a line about deleting your data. Clearing your browsing history alone does not remove saved answers, because they are stored separately.
- Added short notes to the NHS, HMRC, and UK visa checklist items making clear that ticking them means the record is already updated, not just that you have one.
- Simplified the deed poll "What if an organisation refuses?" note into a plain paragraph.
- Renamed the "Start now" button to "Start here".

### Code

- The step-by-step questions now always ask about your NHS record, registering with a new GP, and HMRC, so people changing only their gender marker see the same questions as the checklist. The HMRC question now comes before the driving licence and passport questions, matching the order they appear in your plan.
- The driving licence and passport questions now grey out "It is already updated" where it is not possible, instead of silently changing your answer afterwards.
- The driving licence and passport checklist questions now start at "It has my old details", so a plan cannot accidentally miss a step.
- Fixed the eVisa question giving the opposite answer to the one selected, and changed it to unlock based on your passport status rather than your deed poll.
- Fixed the "back" button skipping the first few questions instead of stepping back one at a time.
- Fixed the age check on shared plan links so it matches the rest of the site.
- Fixed a misleading warning shown when no update goal had been chosen.
- Shared links now remember the "I do not need to update any of these" services answer, and older links correctly mark an un-updated driving licence or passport as needing an update rather than as missing.
- Opening a broken or incomplete shared link no longer clears your saved progress.
- Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so you can track each piece of evidence separately.
- Confirming your age or the disclaimer in the checklist now moves screen reader focus to the checkbox that needs attention, rather than only scrolling to it.
- Added a short note to the printed or saved version of a plan, including the date it was made.

### Layout

- Redesigned the site: cleaner step and question cards, and a restructured footer with separate About, Privacy, Usage guide, Support, and Disclaimer panels.
- Added a community advice marker, a small circled "i", to guidance that comes from the shared experience of trans and non-binary communities rather than an official source, and to time estimates. Hovering over it, or focusing it with the keyboard, explains what it means.
- Each selected service now has its own bordered block in a step's expanded details, so it is clearer where one service ends and the next begins.
- Fixed a step's "more information" text being cut off partway through when many services were selected.
- Added "What is this?" and "How do I use it?" buttons to the toolbar on the start screen.
- The site title and footer are now boxed cards matching the toolbar, instead of full-width bars, and scroll normally rather than staying fixed.
- Tightened the spacing around those boxes to give the main content more of the screen, and removed the tagline under the site title.
- Reworked the mobile toolbar so buttons wrap onto a second row instead of running off-screen.
- Fixed the footer being hidden behind the browser's own toolbar on some phones.
- Fixed a light-mode colour fault where one of the plan's four colour-coded groups showed as gold instead of yellow.
- Removed a large embedded font in favour of the system font, making the page much smaller to load.

### Infrastructure

- Published [SOURCES.md](SOURCES.md), a list of the official sources behind the planner's content, including where it deliberately differs from them.
- Created this changelog and a [contributing guide](CONTRIBUTING.md), and brought the README into line with the site.
- Restructured the repository, and fixed the build command so `robots.txt` is deployed.
- Added a test covering the community advice marker and its Usage guide entry.

## [26 May 2026]

### Code

- Added a disclaimer confirmation step, plus several small fixes.

## [2 May 2026]

### Wording

- Updated the wording for HM Passport Office medical letter requirements.

## [22 April 2026]

### Infrastructure

- Moved the test suite to Playwright, and added automated testing and a scheduled broken-link check.

## [5 to 7 April 2026]

### Code

- Bundled several months of accumulated fixes and features, including five affecting shared links, answers that persisted when they should not have, and Focus mode.

## [31 March 2026]

### Code

- Rebuilt parts of the site and changed the interface.

## [24 March 2026]

### Code

- Added Focus mode to shareable links, and a "new device" screen for shared links opened in an unrecognised browser.
- Fixed shared-link answers being discarded when opened after an update.

## [22 to 23 March 2026]

### Code

- First public release, followed by an accessibility pass against WCAG.

### Infrastructure

- Created the repository, with an initial README, the CC BY-NC-SA 4.0 licence, and a broken-link-checking workflow.
