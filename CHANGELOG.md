# Changelog

All notable changes to [Be myself](https://bemyself.uk) are recorded here, newest first.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project has no version numbers, so entries are grouped by the month they went live on the site. Work that is finished but not yet released sits under `[Unreleased]` until it goes live.

Small fixes and one-off wording tweaks are left out. Changes are grouped under these headings:

- **⚠️ Government or policy changes** come first, because they may change what you need to do
- **Information**: corrections to guidance, new content, fixed links
- **Wording**: text changes that do not change the facts
- **Code**: how the website works
- **Layout**: how the website looks
- **Infrastructure**: testing, deployment, and repository changes

## [October 2026]

### Wording

- New site tagline, "Make your UK documents match who you are", now also the page title for search results and link previews, with a matching description and preview image. The site is now called a planner everywhere.

## [October 2026]

**Every saved plan and shared link made before this update will show "Your action plan may be out of date" once.** That is because criminal record checks are now asked about for everyone in the UK, not only people with work records to update; people living outside the UK are now asked about UK benefits and can add the electoral register; and people changing only their gender marker now get a different first step. Check your answers once, and the message will not come back until a later change could affect your plan.

### Information

- The birth certificate step now follows where your birth was registered, not where you live. Someone born in Scotland and living in England was told the General Register Office would contact them, and the other way round. The step also no longer says a new birth certificate is free: GOV.UK says there is an additional charge, and in Northern Ireland a short certificate is issued free of charge.
- Corrected the passport consent note for 16 and 17 year olds. It said a court order was needed where there are safeguarding concerns. Instead, HM Passport Office asks for evidence and gets advice from its safeguarding team. The note now lists every exception it considers.
- The passport step now says that a gender marker change without a GRC also needs evidence that you use your name and gender for all purposes, that someone who knows you may be asked to confirm your identity, and that HM Passport Office phones you if you note a non-binary identity.
- The Irish passport step's rule on when your two years of proof start again now matches the Passport Service, which also does not accept a deed poll to change the name on an Irish passport. The Irish passport is now shown as a medium cost.
- The GRC steps said you may not need a GRC if your gender is legally recognised in another country. You still do, but you can use a shorter overseas route. Added what the medical reports must include, that the name on a GRC cannot be changed after it is issued, and that a GRC can change your entitlement to some benefits and pensions, including your partner's. Northern Ireland residents now see the note on marriage, civil partnership and interim GRCs, and the Northern Ireland introduction no longer refers to anti-discrimination law.
- People changing only their gender marker now get a statutory declaration as their first step, instead of a name-change document, and work guidance that says employers can update payroll records once you tell them you have changed gender.
- The driving licence step now lists every document GOV.UK accepts as the extra document showing your name, including a UK passport number, and says the document must still be valid. It also now says that a gender-only change made with a deed poll or statutory declaration needs this extra document too.
- The DBS step now covers basic checks and the DBS Update Service, and marks allowing a few days' notice as community advice. The Disclosure Scotland step now uses the current disclosure levels, says the process is only needed when your employer countersigns your application, explains the male or female choice on the form, and covers the duty for PVG scheme members to report a change within 3 months. The AccessNI step now says a certificate cannot move from one role to another, and marks the advice to make contact before applying as community advice.
- England's NHS step now says a new NHS number cannot be undone. Wales has its own NHS step, since the guidance written for NHS England does not apply there. The Northern Ireland new GP step no longer promises your correct gender marker from the start.
- People living outside the UK now get guidance on registering to vote as an overseas voter and on UK benefits and State Pension, and their first step explains that a permanent resident overseas cannot use a deed poll.
- The HMRC summaries for name-only and name-and-gender plans, and the name-only detail, now mark the advice about restricting access to your records as community advice. Also corrected who can register anonymously on the electoral register, the eVisa guidance, and the credit reference agencies guidance, and added the HM Land Registry note that your previous name stays in earlier editions of the register (it was described in July but missing from the planner). Smaller corrections: Employment and Support Allowance, Council Tax Reduction, hereditary titles, Pearson for BTECs, and how the DVA compares with the DVLA.

### Wording

- The Privacy panel, the "What is this?" panel, and the README now say that a shared plan link holds your answers in its web address, so they reach the website's host when the link is opened.
- The planner now says more clearly who it is for: anyone aged 16 or over updating UK documents they hold, including people living abroad and people planning to move to the UK.
- New page title and description for search results and link previews, and the line under the site title is now part of the main heading. The "What is this?" panel has a new "What does it cover?" section.
- The usage guide now explains that the help shortcut is the question mark, typed with Shift on most keyboards. The shortcut no longer reacts when Ctrl, Alt or Cmd is held.
- The usage guide now says you can hover over the community advice symbol on a computer. It used to tell everyone to hover, which you cannot do on a phone.

### Code

- Quick exit: the "Skip to main content" link no longer adds a step to your browser history, so pressing Back after a quick exit does not bring the planner back. Pressing Esc twice within a second now leaves even while a panel is open, but not if you press another key or click in between. Every panel now has its own Quick exit button, since the one on the toolbar cannot be reached while a panel is open.
- A step that holds a list, such as the services to update or the GRC evidence, now shows "in progress" as soon as anything in it is started. Clicking the step changes the whole list, but no longer undoes items you have already finished.
- Criminal record checks are now asked about for everyone living in the UK, not only people with work records to update.
- Nothing in the checklist is chosen for you any more. It used to start with some answers already selected, such as England, and "No" for work records and a GRC, which were easy to miss. If a question is left unanswered, "Show my action plan" takes you to it and asks you to choose an answer.
- Screen readers now hear the question or section you are on from the progress bar, no longer hear the usage guide's badge labels twice, and every panel can be scrolled with the keyboard.
- Switching from the checklist to the step-by-step view now starts at the first question you have not answered, and a plan is never built while a question is unanswered. Before, it could skip questions and leave steps such as your driving licence and passport out of your plan.
- When you press "Show my action plan" with a question unanswered, the message now appears under the question itself, and on small screens the question and its first option stay in view.
- Screen readers no longer hear an old checklist position from the progress bar when a plan has nothing left to track.

### Layout

- On a phone, the plan toolbar's buttons now wrap onto another row instead of being squashed or hidden.
- Links in panels now use the site's link colour. In dark mode they were hard to read.
- Shared links now show a wide preview image with the site's title and tagline, and the labels UK specific, Free and private, No tracking and No sign-up, over the transgender and non-binary pride flags.
- The step-by-step view's Back button is now a plain button beside Continue, so it is easier to see and to tap. It was a small link above the question.
- Every tip you can hide now has the same plain ✕ button. "Did you know about titles?" and "Estimated time and costs" can be hidden without opening them first. The ✕ on the warning that progress cannot be saved is bigger, and no longer turns dark blue under the mouse.
- Ticked answers are now shaded, so you can see your choices at a glance. On touchscreens, the last answer you tapped no longer stays highlighted after you untick it.
- Double-clicking a button or an answer no longer highlights its text. On phones, tapping one no longer makes it flash, and tapping a button twice quickly no longer zooms the page.
- On touchscreens, the arrows for moving steps are bigger.
- Buttons now use the same font as the rest of the page.
- The line under the site title no longer leaves its last word alone on the second line.

### Infrastructure

- The scheduled source check now compares the text of GOV.UK pages too, since GOV.UK only changes a page's update date for major edits.
- The version bump workflow now keeps the date in `sitemap.xml` current.
- Every GitHub Action the workflows use is now pinned to an exact commit, with its version noted beside it, so a changed or compromised release tag cannot alter what runs.
- The scheduled source check now removes cookie banners before reading a page, ignores changes in spacing, compares PDFs by their file fingerprint, skips site home pages, and shows the part of a long line that changed. Running it by hand on main with "write_source_snapshots" ticked now commits the new snapshot.
- The scheduled link check works again. Since the "Download this page" link was added in September, it stopped with an error on that link and never reported broken links. The SAAS pages are now checked by hand, since SAAS refuses the scheduled source check.
- Added tests for all of the above, including a check that plan text gives costs as labels rather than amounts.

## [September 2026]

**Every saved plan and shared link made before this update will show "Your action plan may be out of date" once.** This update adds the plan version that decides when that message appears, and plans made before it do not have one yet. Check your answers once, and the message will not come back until a later change could affect your plan.

- **⚠️ NHS England has brought in a single national waiting list for adult gender services, held by the National Adult Gender Referral Support Service. If you are waiting for a first appointment in England, that service holds your referral separately from your GP record, and you need to tell it about a change of name or other details yourself. Your place on the list is set by your original referral date and does not change when you update your details.**

- **⚠️ DVLA now asks for a further document that already shows your new name when you change your driving licence by deed poll or statutory declaration. It must be dated after the deed poll, and after your current licence if you already hold one. A driving licence can therefore no longer be used to get photo ID in your new name for other services, such as a bank, because the licence itself now needs that evidence first.**

- **⚠️ HM Passport Office (HMPO) now asks for a separate letter formally requesting the change of gender when you change a UK passport's gender marker without a Gender Recognition Certificate. This is in addition to the medical letter and name-usage evidence. With a GRC, no extra letter is needed.**

### Information

- Split the driving licence step by what you are changing, since someone changing only their gender marker was shown the evidence needed for a name change. Corrected the step and the banks guidance, which said that updating your driving licence first could help if a bank asked for photo ID. That is no longer possible under GOV.UK's current rules, so the step now lists which documents can be used instead.
- Corrected the passport medical letter requirements to match HM Passport Office's own caseworker guidance, including the need for a handwritten signature and for the medical professional to confirm they know you well enough to make a diagnosis. Also corrected the consent note for 16 and 17 year olds. The exceptions to needing consent are being close to your 18th birthday, both parents having died, or having no contact with one or both parents.
- Corrected the Irish passport step. It said an Irish Gender Recognition Certificate was needed first, and told people to apply for an ordinary Irish passport before that. Neither is right if you live in Northern Ireland or anywhere outside Ireland. The route is a statutory declaration plus two years of evidence using your new name, for a first passport as well as a renewal, and applying in your previous name first only resets that two-year clock. The Irish GRC route applies only to people living in Ireland. The wording on what happens to the two-year period if you already hold a passport in your previous name is also corrected.
- Corrected the Irish passport step's claim that anyone born in Northern Ireland can claim Irish citizenship. Since 1 January 2005 this depends on your parents: one must be a British or Irish citizen, or have lived on the island of Ireland for three of the four years before your birth.
- Added a "Paperwork for your GRC application" step, since a Gender Recognition Certificate application needs several documents besides the medical reports and two years of evidence. Corrected the GRC medical evidence step: there is no approval scheme for the doctors and clinical psychologists who write the two reports, and the step now describes who can actually write each one.
- Softened "public record" wording on the Scottish and Northern Ireland birth certificate steps. Neither NRS nor NI Direct uses that phrasing. What is supported, and what the planner now says, is that the change is permanent and any future certified copy shows both names.
- Added a note to the health record steps, for all four nations, explaining that updating your details with your GP may not update them with other services you use. The same applies if you are given a new NHS number, CHI number, or Health and Care Number. The England steps now include the National Adult Gender Referral Support Service, and the Wales steps the Welsh Gender Service, both with links to their change-of-details processes.
- Reworded the HMRC gender marker guidance to match GOV.UK's own wording ("usually" rather than always automatic), and made clear that restricting your record for privacy is separate from the gender marker change itself. Added a note for 16 and 17 year olds: a National Insurance number is usually sent shortly before your 16th birthday, so the letter may arrive in your old name. The number itself does not need updating, but you can still tell HMRC your new name.
- Added State Pension to the Northern Ireland benefits question and step, which the Department for Communities administers alongside Universal Credit, Personal Independence Payment (PIP), and Employment Support Allowance (ESA). Tell the Northern Ireland Pension Centre about a name change if you get State Pension or Pension Credit, as your local Jobs & Benefits Office does not handle those. Also changed the note under the Northern Ireland benefits question to say the same as the rest of the UK: a change of name or gender can affect how some benefits are administered. The step still mentions possible delays, marked as community advice, since no official source supports it.
- Rewrote the credit reference agencies guidance. Contacting one of Experian, Equifax, or TransUnion only starts the process at the other two, it does not complete it, and each still needs its own form and evidence. Added a note that a Notice of Correction can mean lenders review your applications by hand rather than automatically.
- Added a "Dentist or optician" service item, since these keep their own patient records separately from your GP, and added Housing Benefit to the Council Tax step, since the same council team usually handles both. Retitled the banks item to "Banks, building societies, and financial accounts", making clear it applies to building societies too.
- Corrected the qualifications step's professional regulator example, which named the Solicitors Regulation Authority as though it covered the whole UK. It only regulates solicitors in England and Wales. Split the step's student finance guidance for Scotland, where SAAS updates your name, gender, and title together on one confidential form, and added a note that some exam boards will waive a replacement certificate fee if asked, even though this is not documented publicly.
- Removed references pointing at other steps that may not be in your plan. The electoral register and mobile contract items pointed at the credit reference agencies item, which is only there if you chose it.
- The step-by-step note on name-change documents in Scotland wrongly said a statutory declaration is made through the National Records of Scotland. It now says a statutory declaration is more commonly used in Scotland, and that a free deed poll is accepted by most organisations.
- Two GRC steps showed "Small cost" in green, which is used for free. Small and medium costs are now always yellow, and higher costs red.

### Wording

- Added a line under the site title saying what the planner is for: "Plan updating your name and gender marker on UK documents". Rewrote the page title and the description shown in search results and link previews, so the planner can be found by people searching for it.
- Renamed two step titles that had not changed since launch. "The final step" is now "Legal gender recognition", and "The basics" is now "Your name-change document".
- Shortened the notes under the deed poll, birth registration, visa, NHS record, and HMRC questions, and made them say why each is being asked.
- Spelled out several abbreviations the first time they appear in a step, rather than assuming you had read a different step first: CHI, HSCNI, PCSE, TENI, SAAS, and the GMC and HCPC medical regulators. The driving licence step's list of eight acceptable documents is now two short lists instead of one long sentence.
- The GRC question and its answers, and the qualifications question, now read the same in the step-by-step questions and the checklist. In Northern Ireland, Council Tax is now called Rates (Land & Property Services) wherever it appears.
- The DBS, AccessNI and Disclosure Scotland checkboxes said "select no" where there is nothing to select. They now say to leave the box unticked.
- The Privacy panel now says that "New plan" keeps your light or dark mode choice.

### Code

- You can now reorder your action plan. Each step and each group has up and down arrows, and can also be dragged by a small handle. Your order is remembered on this device and carries over in a shared link, and a "🔀 Reset order" button puts everything back. If you change your answers and the plan no longer holds the same steps, your order is reset rather than applied to the wrong things, and you are told. Steps can only move within their own group, since moving one out used to leave a group's title and time estimate describing something other than what it contained. Whole groups can still be reordered freely. The usage guide now covers all of this.
- Reordered the questions in both views. What you need to update comes first, since that answer decides which later questions apply, and a Gender Recognition Certificate is asked about before your birth certificate, which you cannot change without one. The checklist previously asked about a GRC, which takes years, before a deed poll, which can be done in a day. The two questions about your visa or eVisa are now one, with the same three answers used for the driving licence and passport. You are also asked whether you have a deed poll or statutory declaration even if you are only changing your gender marker, since the DVLA, the DVA, and the NHS each accept one as evidence for a gender marker change.
- Added new answers. Wales is now its own option for both "Where do you live?" and "Where was your birth registered?", instead of being grouped with England. "I already have a Gender Recognition Certificate" skips the guidance written for people still applying, and changes the birth certificate step to describe following up with the registrar. A third employment answer, "I've already updated my records", still asks about DBS, AccessNI, or Disclosure Scotland, since that depends on your role rather than on your employer's records. The services question has an "All of these" option, so you do not have to tick each one.
- The Irish passport route is now shown only if you ask for it, rather than to everyone whose birth was registered in Northern Ireland. It is not an alternative to a Gender Recognition Certificate: it gives you a passport in your correct name and gender, but does not change your UK records. If you were born in Northern Ireland and are pursuing both, they are now two separate steps rather than one long block, each with its own time estimate and each movable on its own.
- Switching from the checklist to the step-by-step questions now carries on from where you were, instead of starting again at the first question. Your answers were always kept; only your place was lost. Editing your answers after returning to a saved plan no longer starts by asking your age again.
- With Focus mode on, a step no longer disappears the moment you mark it done. The status button has four settings, so anyone aiming for "not needed" passes through "done" on the way. It now waits about two seconds before hiding, and clicking again cancels that. Focus mode also announces when a whole group is finished, not only when the entire plan is.
- Printing your plan, or saving it as a PDF, now includes the "more information" for each step, and lists each link on its own line with its full web address after it, since you cannot click a link on paper. A step heading is no longer left stranded at the foot of a page, and a single step is not split across two. The tip about the status boxes and the "Don't show this again" button no longer print.
- The Esc key now needs two presses within a second to leave the site, and the usage guide's keyboard list says so. The red Quick exit button still works with one click.
- Added a countdown to the restart and reset-progress buttons, so you can see the warning that a screen reader already announced. Added a short, dismissible note explaining that later checklist sections change based on your region and goal, so a section disappearing is not a fault, and an explanation, shown when a shared link is broken or out of date, that the all-in-one checklist has been opened instead of the step-by-step questions.
- Fixed the "?" keyboard shortcut for the help dialog not working while a checkbox or radio button had focus, the toolbar's arrow-key order on narrow screens, where a button on the second row could be reached before one still on the first, and the checklist not showing a group's tick straight away when restored from a saved plan or a shared link.
- Opening a shared link on a device that already has a plan now asks first. You can open the shared plan, which replaces yours, its progress, its step order, and Focus mode, or keep your own.
- A shared link from someone who had already updated their work records was treated as out of date, and lost that answer and any DBS step. It now opens normally.
- A saved plan or shared link is now only called out of date when a change could affect your answers or plan. Until now, every update to the site did this, because one number set both this and the "Last updated" date at the bottom of the page. That date still changes with every update, but a separate plan version, raised only for changes that could affect a plan, now decides whether yours is out of date.
- Opening a link inside a panel with the keyboard no longer closes the panel.
- Screen readers now hear when a step's status changes, and hear "Your next step is" only when the next step changes. They now also read the usage guide's toolbar list, including the warning that a copied link contains sensitive information, and read each checklist question together with its answers.
- Steps hidden by Focus mode can no longer be reached with the Tab key or read by screen readers, and marking the step you are on as done moves you to the next visible one.
- Moving through a plan or the checklist with the keyboard no longer hides the item you are on behind the toolbar at the top or the button bar at the bottom.
- A greyed-out answer now says why it cannot be chosen yet, for everyone rather than only for screen readers.
- "Download this page" now saves an exact copy of the planner. It used to include extra code added by the site's host, which did nothing offline.
- Answering no to the age or disclaimer question now moves focus to the message that explains why, and "Go back" returns it to "Start here".

### Layout

- In the services list, a step marked done is no longer crossed out. Crossing out now means "not needed" everywhere in a plan, as it already did for every other step.
- Added a short, dismissible note at the top of a new plan explaining that the box beside each step marks it as in progress, done, or not needed. The "Estimated time" and "Approximate costs" summary can now be collapsed, with a "Don't show this again" option, matching the "Did you know about titles?" note.
- The checklist now shows which section you are in, as "Section 2 of 4: Your current documents", with a bar in the toolbar. It is a long page and previously gave no sense of where you were or how much was left. Its two long-term sections are now one, called "Long-term goals".
- Increased the spacing between steps within a group, so a group with several steps reads less cramped. On narrow screens, a step's title no longer wraps onto several lines with its difficulty and cost badges sitting across them. The title now gets its own room, with badges moving underneath when there is no space beside it.
- On a phone, toolbar buttons, including the quick exit button, are now at least 44 pixels so they are easier to hit, and the title block shrinks once you start answering questions or have a plan, leaving more room for the page itself.
- Improved the colour contrast of greyed-out checklist text, and darkened the community advice marker so it meets contrast guidelines. The marker also has a shorter screen reader announcement, is out of the tab order so it does not interrupt tabbing through a plan, and starts its own paragraph, making clear which part of a step it applies to.
- Reordered the questions in the "What is this?" panel so they follow how you use the planner: what it is, who it is for, privacy, how it works, then keeping your plan. Saving and offline use were four questions apart and are now together at the end. The panel also has a download button, so you can save the planner for offline use without a "Save page as" menu, and the offline instructions explain how to restore a saved plan from a copied link.
- Added a "Sources" link to the support and feedback panel, since the list of official sources behind the guidance was previously only reachable through GitHub, and a "Recent changes" link to the welcome-back screen, pointing here.

### Infrastructure

- Added `robots.txt` and `sitemap.xml`. Anything asking for either was previously handed the planner's own page, because any address that is not a real file serves the application. Also narrowed the rule that keeps shared plan links out of search results. It applied to any address with a query string, which caught ordinary tracking parameters added by newsletters and social media. Those addresses were told not to appear in search results while also naming the homepage as their canonical address, which risked the homepage being dropped from search results.
- Reviewed every source behind the planner's guidance, both GOV.UK and others. None of the changes found affected what the planner says. Two sources could not be reached and are due another look next time. Added sources to [SOURCES.md](SOURCES.md): the National Adult Gender Referral Support Service, the Welsh Gender Service, and the Welsh Gender Service's change-of-details process. Also added GOV.UK's identity documents, National Insurance and Housing Benefit pages, HM Passport Office's gender recognition caseworker guidance, a UK Parliament written answer on DVLA evidence, and section 9 of the Gender Recognition Act 2015 (Ireland).
- Extended the scheduled source check to sources it previously left to manual review: everything in [SOURCES.md](SOURCES.md) that is not GOV.UK or a static record such as legislation. Each is rendered, its article text extracted, and compared against a committed snapshot.
- Added a content-integrity test comparing every plan and service item's text, including evidence checklist labels, against a committed snapshot, so an unintended change to any item's wording fails the test suite and names the exact item. Also added tests covering keyboard navigation, the new employment and GRC answers, and several accessibility attributes.
- Fixed two tests that could fail for no real reason and hold up unrelated work. Both save something, reload, and check it survived. Run against a local file, the browser occasionally loses a value saved moments before a reload, and the value was gone for good. The tests now keep a copy and restore anything lost before reloading again.
- Rebuilt `bump-version.yml`. It ran on every pull request merged into `main` or `preview`, tried to push directly, and fell back to opening a pull request when that was rejected. That fallback could not complete, because this repository does not allow GitHub Actions to open pull requests, so every run since July left an abandoned branch nobody could merge. It now runs only on a push to `main` that changes `index.html`, pushes with a token that works, and fails loudly if that push is rejected.
- Removed the path filter from `playwright.yml`. Once the suite became a required check on `main`, the filter meant a pull request touching only documentation could never satisfy it, leaving the pull request stuck.
- Added notes to the GitHub issue templates pointing at the project's constraints and sourcing expectations.
- Added `llms.txt`, a short plain summary of the planner for AI tools, and an empty `ai-catalog.json` saying the site offers no AI agents or tools. Both are read by Google Lighthouse's new AI agent checks.

## [July 2026]

No government or policy changes affected the planner this month. If that looks wrong, please [open an issue](https://github.com/be-myself-uk/planner/issues).

### Information

- People living outside the UK are no longer asked about their NHS or GP record, DBS, AccessNI or Disclosure Scotland check, or DWP benefits, and Council Tax and the electoral register no longer appear in the services list. None of these apply outside the UK, and choosing "Outside the UK" previously reused England and Wales guidance for all of them. People whose birth was registered outside the UK now see a note explaining that the planner does not cover updating a birth certificate issued by another country, instead of General Register Office guidance that does not apply to them.
- Added passport notes. A gender marker change for a 16 or 17 year old needs the signed consent of everyone with parental responsibility, unlike a name-only change, which they can consent to themselves. UK passports do not currently offer a non-binary or X gender marker. For a home country passport, check with that country's embassy or consulate in the UK as a first step.
- Corrected the Northern Ireland deed poll guidance, and added the evidence the DVA accepts for a gender marker change: a deed poll, a statutory declaration, or a GRC, with no medical letter needed. A basic deed poll is no longer described as possibly not being enough. The community preference for statutory declarations is kept, and marked as community advice.
- Corrected the V5C vehicle logbook step: a name change is postal only, there is no online option. Added a note that DVLA, DVA, and vehicle keepers can face a large fine for not reporting a name change.
- Added the GRC's most basic rule, that it only recognises male or female, to the GRC steps rather than leaving it implied. Added a note that a non-consenting spouse does not block a GRC application, because an interim certificate can be used instead.
- Corrected England and Wales content on NHS gender marker options and the non-GRC route through HMRC, and corrected the Scotland gender marker guidance to match NHS National Services Scotland: no evidence is needed, and you can tell either your GP practice or Practitioner Services. Added that the "indeterminate" gender marker on NHS England records is only available from age 18, that NHS England does not give under-18s new NHS numbers or change their gender marker, and that requesting a new NHS number can mean losing your place on NHS waiting lists.
- Corrected the NHS and HMRC checklist items. Neither requires a deed poll or statutory declaration, so neither is locked behind one any more. Corrected the HMRC guidance shown to people changing only their gender marker, which included name-change wording, and clarified the HMRC team names: Special Section D handles changes, and Public Department 1 looks after restricted records.
- Added payroll guidance to the work step: name and gender changes should go to HMRC as separate submissions, and a gender change can affect National Insurance category letters.
- Corrected the DWP name change guidance. No official source says HMRC passes a name change to DWP, so the planner now tells you to contact each office that pays you a benefit. Also corrected the State Pension age guidance, and removed a broken government link.
- Added the missing Northern Ireland and Scotland options for criminal record checks, covering AccessNI and Disclosure Scotland alongside DBS, and a note that the Disclosure Scotland form only offers Male or Female, even for non-binary applicants.
- Added credit reference agencies guidance, and two new services to update: professional body or regulator registrations, and HM Land Registry property titles. The land title register item is split by region, so it shows only the guidance for where you live, and notes that a previous name can still appear on older HM Land Registry documents even after using the CNG form, and what it costs to hide those documents from public inspection.
- Added a note that Student Finance England can update a title or gender marker by phone, live chat, or letter, with no evidence needed.
- Corrected Northern Ireland service guidance. Domestic rates go through Land & Property Services rather than Council Tax, electoral registration through the Electoral Office for Northern Ireland rather than the council, and vehicle logbook updates through the DVLA rather than the DVA. Added official links about water billing in Northern Ireland and Scotland.
- Corrected Scotland deed poll content: a statutory declaration is not a National Records of Scotland process. Fixed the National Records of Scotland name change link and the AccessNI link, both of which pointed at the wrong pages.

### Wording

- Reorganised the disclaimer into clearer sections and tidied the wording throughout. Corrected the description of "Quick exit" to say what it actually does: it replaces the page in your tab's history. Corrected a line about deleting your data. Clearing your browsing history alone does not remove saved answers, because they are stored separately.
- Removed specific fees and fine amounts in favour of the cost wording used elsewhere (Free, Small cost, Medium cost, Higher cost), since exact figures go out of date.
- Added short notes to the NHS, HMRC, and UK visa checklist items making clear that ticking them means the record is already updated, not just that you have one. Simplified the deed poll "What if an organisation refuses?" note into a plain paragraph.
- Renamed the "Start now" button to "Start here".

### Code

- The step-by-step questions now always ask about your NHS record, registering with a new GP, and HMRC, so people changing only their gender marker see the same questions as the checklist. The HMRC question now comes before the driving licence and passport questions, matching the order they appear in your plan.
- The driving licence and passport questions now grey out "It is already updated" where it is not possible, instead of silently changing your answer afterwards. In the checklist they start at "It has my old details", so a plan cannot accidentally miss a step.
- Added tickable sub-checklists under the GRC medical evidence and living-proof steps, so you can track each piece of evidence separately.
- Shared links now remember the "I do not need to update any of these" services answer, and older links correctly mark an un-updated driving licence or passport as needing an update rather than as missing. Opening a broken or incomplete shared link no longer clears your saved progress.
- Fixed the eVisa question giving the opposite answer to the one selected, and changed it to unlock based on your passport status rather than your deed poll.
- Fixed the "back" button skipping the first few questions instead of stepping back one at a time, the age check on shared plan links not matching the rest of the site, and a misleading warning shown when no update goal had been chosen.
- Confirming your age or the disclaimer in the checklist now moves screen reader focus to the checkbox that needs attention, rather than only scrolling to it.
- Added a short note to the printed or saved version of a plan, including the date it was made.

### Layout

- Redesigned the site: cleaner step and question cards, and a restructured footer with separate About, Privacy, Usage guide, Support, and Disclaimer panels. Added "What is this?" and "How do I use it?" buttons to the toolbar on the start screen.
- The site title and footer are now boxed cards matching the toolbar, instead of full-width bars, and scroll normally rather than staying fixed. Tightened the spacing around them to give the main content more of the screen, and removed the tagline under the site title.
- Added a community advice marker, a small circled "i", to guidance that comes from the shared experience of trans and non-binary communities rather than an official source, and to time estimates. Hovering over it, or focusing it with the keyboard, explains what it means.
- Each selected service now has its own bordered block in a step's expanded details, so it is clearer where one service ends and the next begins. Fixed a step's "more information" text being cut off partway through when many services were selected.
- Reworked the mobile toolbar so buttons wrap onto a second row instead of running off-screen, and fixed the footer being hidden behind the browser's own toolbar on some phones.
- Removed a large embedded font in favour of the system font, making the page much smaller to load.
- Fixed a light-mode colour fault where one of the plan's four colour-coded groups showed as gold instead of yellow.

### Infrastructure

- Published [SOURCES.md](SOURCES.md), a list of the official sources behind the planner's content, including where it deliberately differs from them. Created this changelog and a [contributing guide](CONTRIBUTING.md), and brought the README into line with the site.
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
