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

## [September 2026 Update (Part ten)]

- **Information**
  - Added a "Paperwork for your GRC application" step, covering the documents a Gender Recognition Certificate application needs besides the medical reports and the two years of evidence. The planner did not mention any of them: the statutory declaration, your full birth or adoption certificate, and copies of anything showing a change of name. GOV.UK says that last one "includes enrolled or unenrolled deed polls and statutory declarations of name changes", so anyone who had changed their name was missing a required document with nothing here to tell them. The step also covers marriage and civil partnership certificates, a spouse's own declaration where you are staying married, and translations of anything not in English. The name-change line only appears if your plan involves a name change; because the planner never asks whether you are married, those lines say when they apply instead.

- **Code**
  - With Focus mode on, a step no longer disappears the instant you mark it done. The status button cycles through four values, so anyone aiming for "not needed" passes through "done" on the way, and the step used to vanish before the next click could land. It now waits about two seconds before hiding, and clicking again in that time cancels the hide, so you can keep cycling or put it back.
  - Evidence checklists, which previously existed only for the two GRC evidence steps and were written into the code by hand, are now part of a step's own description. Any step can carry one, and the existing GRC checklists behave exactly as before, keeping any progress already ticked off.

- **Infrastructure**
  - The automated content check now covers evidence checklist labels. It previously read only titles, summaries and descriptions, so the GRC checklist wording could have changed without any test noticing.

## [September 2026 Update (Part nine)]

- **Infrastructure**
  - Fixed two automated tests that could fail for no real reason, which held up unrelated changes waiting to be merged. Both tests save something, reload the page, and check it survived the reload. The tests run against the planner as a local file rather than a website, and in that mode the browser occasionally loses a value that was saved moments before a reload. When that happened the value was gone for good, so the retries built into the test could never find it, no matter how many times they reloaded. The tests now keep a copy of what was saved and put back anything the browser lost before reloading again.

## [September 2026 Update (Part eight)]

- **Wording**
  - The heading at the top of the page now has a line under it saying what the planner is for: "Update your name and gender marker on UK documents". The heading previously stood on its own, which told someone arriving for the first time nothing about what the site does.
  - Rewrote the page title and the description shown in search results and link previews. Both previously led with "UK identity planner", which is not a phrase anyone searches for, and neither mentioned trans or non-binary people, name changes, or gender markers. They now say what the planner actually does, so it can be found by people looking for it.

- **Information**
  - Added a "Sources" link to the support and feedback panel, next to the existing "Create GitHub issue" and "Recent changes" links. The list of official sources behind every piece of guidance here was previously only reachable by going to the GitHub repository directly.

- **Infrastructure**
  - Added a `robots.txt` and a `sitemap.xml`. Anything asking for either of these was previously handed the planner's own page instead, because any address that is not a real file serves the application.
  - Narrowed the rule that keeps shared plan links out of search results. It previously applied to any address with a query string at all, which caught ordinary tracking parameters added by newsletters and social media links. Those addresses were being told not to appear in search results while also naming the homepage as their canonical address, which risked the homepage itself being dropped from search results.

## [September 2026 Update (Part seven)]

- **Code**
  - Steps can no longer be dragged or moved, by their up/down buttons, out of the phase they were generated in and into another one. Moving a step used to be able to cross into a neighbouring phase when pressed at the top or bottom of its list; this made that phase's title and time estimate describe something other than what it actually contained. A step's move buttons are now disabled once it's first or last in its own phase, matching how a phase's own move buttons already behave at the very start or end of the plan. Whole phases can still be freely reordered, by buttons or by dragging, exactly as before.
  - If a step is the only one in its phase, its move and drag controls are now hidden rather than shown disabled, since it has nowhere to go within its own phase. A phase's own move controls are unaffected by how many steps it has.

- **Wording**
  - Renamed two phase titles that hadn't changed since the planner first launched: "The final step" (covering the Irish passport and/or UK Gender Recognition Certificate routes) is now "Legal gender recognition", describing what the phase actually covers rather than claiming a fixed position in the plan. "The basics" (the phase for getting your deed poll or statutory declaration) is now "Your name-change document".

## [September 2026 Update (Part six)]

- **Information**
  - Rewrote the credit reference agencies guidance: contacting one of Experian, Equifax, or TransUnion only starts the process at the other two agencies, not completes it, since each still needs its own form and evidence. Added a note that a Notice of Correction can mean lenders manually review your applications instead of using automated decisions.
  - Reworded the HMRC gender marker guidance so the automatic-notification claim matches GOV.UK's own wording ("usually" rather than always automatic), and clarified that record restriction for privacy is a separate matter from the gender marker change itself, since without a GRC the two were previously easy to read as contradictory.
  - Corrected the wording on what happens to the Irish passport route's two-year name-usage period if you already hold a passport in your previous name.
  - Reworded the UK Gender Recognition Certificate summaries to lead with what a GRC is and does, rather than opening with what it does not cover.
  - Added a note that some exam boards will waive a replacement certificate fee if asked directly, even though this is not publicly documented.
  - Removed a sentence about UK passports lacking a non-binary marker being "a known gap that campaigners are pushing to change", and introduced "HMPO" once instead of repeating "HM Passport Office" throughout the passport step.
  - Reworded the land title register service's regional guidance (previously just "Scotland:", "Northern Ireland:", or "England and Wales:") to say "Land in Scotland:" and so on, so it reads clearly alongside the other region-specific notes shown in the same list of services.
  - Corrected the qualifications step's professional-regulator example, which named the Solicitors Regulation Authority as if it covered the whole UK. It only regulates solicitors in England and Wales; Scotland and Northern Ireland each have their own Law Society.
  - Split the qualifications step's student finance guidance for Scotland, which has a genuinely different process: SAAS updates your name, gender, and title together on one combined confidential form, rather than the separate contact routes used by Student Finance England, Wales, and NI.

- **Layout**
  - Fixed the Irish passport and UK GRC routes, shown together as two separate boxes for people born in Northern Ireland pursuing both, having no left/right spacing around their contents.
  - Increased the spacing between steps within a phase, so a phase with several steps reads less cramped.
  - Fixed a step's title, on narrow screens, sometimes wrapping onto several lines that its difficulty and cost badges then sat across, making both hard to read. The title now always gets enough of its own room, with badges wrapping cleanly onto their own line underneath when there isn't space beside it.

## [September 2026 Update (Part five)]

- **⚠️ HM Passport Office now requires a separate letter formally requesting the change of gender when applying to change a UK passport's gender marker without a Gender Recognition Certificate, in addition to the existing medical letter and name-usage evidence. With a GRC, no extra letter is needed.**

- **Information**
  - Updated the UK passport step to mention the new letter requesting the change of gender, and added a link to HM Passport Office's "Names: change of name passport applications" caseworker guidance, which is the source for this requirement.

## [September 2026 Update (Part four)]

- **Code**
  - Added the ability to reorder your action plan. Each step and each group of steps now has up and down arrows: moving a step past the top or bottom of its group moves it into the neighbouring group instead of stopping, so you can rearrange the whole plan with just up/down presses. Steps and groups can also be dragged into place using a small handle, as an alternative to the arrows. Your chosen order is remembered on this device, carries over in a shared link, and a "Reset order" button (shown only once you've changed anything) puts everything back the way it was generated. If a later change to your answers means the plan no longer contains the same steps and groups, your custom order is reset to the new default rather than applied to the wrong things, and you're told this has happened.

## [September 2026 Update (Part three)]

- **Code**
  - Fixed the checklist's adaptive-sections note not appearing when switching from the step-by-step wizard straight to the checklist view; it previously only appeared when opening the checklist directly.
  - Made the "Estimated time" and "Approximate costs" summary at the top of your action plan collapsible, and added a "Don't show this again" option, matching the "Did you know about titles?" note below it.
  - Fixed the "Recent changes" link (previously "See what's changed"/"See what has changed") showing in the browser's default visited-link colour once clicked, instead of matching the look of the button beside it.
  - Shortened and made consistent the wording of that link across the welcome-back and About screens, and removed a contraction, to keep it plain English.

## [September 2026 Update (Part two)]

- **Code**
  - Added a visible "Confirm? · Xs" countdown to the restart and reset-progress confirmation buttons, so sighted users get the same warning a screen reader already announces before the action cancels itself.
  - Fixed the toolbar's keyboard arrow-key order on narrow screens, where a button that had wrapped onto a second row could be visited before a button still on the first row.
  - Fixed the "?" keyboard shortcut for opening the help dialog not working while a checkbox or radio button (such as a checklist answer) had focus.
  - Fixed the checklist not showing a group's own tick straight away when its items were restored from a saved plan or a shared link; it now shows correctly without needing to touch an item first.
  - Added a third employment answer, "I've already updated my records", alongside "needs updating" and "no". Choosing it still asks about DBS, AccessNI, or Disclosure Scotland where relevant, since that depends on your role rather than on whether your employer's records have caught up.
  - Added an "I already have a Gender Recognition Certificate" answer, alongside "no" and "I plan to apply for one". Choosing it skips the medical-evidence and living-in-role guidance built for people still applying, and changes the birth certificate step to describe following up with the registrar instead of applying for a GRC.
  - Split the final step into separate sections when someone born in Northern Ireland is pursuing both a UK Gender Recognition Certificate and an Irish passport, instead of listing both routes' items in one long block.
  - Added a short, dismissible note explaining that later checklist sections change based on your region and goal answers above, so a section disappearing isn't a bug.
  - Added an explanation, shown when a shared link is broken, incomplete, or from an older version of the planner, that the all-in-one checklist has been opened instead of the usual step-by-step wizard.
  - Focus mode now briefly announces when a whole phase is completed, not only when the entire plan is finished.
  - Added a "Don't show this again" option to the "Did you know about titles?" note, so it no longer reappears every time the plan is regenerated.

- **Layout**
  - Slightly improved the colour contrast of disabled/greyed-out checklist text, and removed a couple of unused style rules.

- **Infrastructure**
  - Added automated tests covering keyboard navigation, the new tri-state employment and GRC answers, and several accessibility attributes; added short notes to the GitHub issue templates pointing at the project's constraints and sourcing expectations.

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
  - Extended the scheduled source-checking workflow to the sources it previously left to manual review only: everything in [SOURCES.md](SOURCES.md) that isn't GOV.UK (already checked automatically) or a static, point-in-time record like legislation or an FOI response. A new `source-content-watch` job renders each one (dismissing any live cookie-consent banner first) and extracts its article text with Mozilla's Readability (the engine behind Firefox's Reader View), which filters out static navigation and footer chrome without needing per-site configuration, then compares that text against a committed snapshot and opens the same kind of review issue as the existing GOV.UK check.

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
