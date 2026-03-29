# 🏳️‍⚧️ Be myself

A free, private, UK-focused legal identity planner for trans and non-binary people.

**Live site:** [bemyself.uk](https://bemyself.uk/)

---

## About

### What is this?

A free tool that helps trans and non-binary people in the UK work out what legal steps they need to take to change their name and gender marker on official documents. The planner gives general guidance based on current UK processes and is not a replacement for professional advice. It was created as a personal project and is a proof of concept.

### Who is it for?

Anyone living in the UK aged 16 or over who wants to update their legal documents to match their gender identity. This includes people who only want a name change, only a gender marker change, or both. There is also guidance for people from outside the UK who hold a visa or eVisa, and for people born in Northern Ireland who may be eligible for the Irish passport gender recognition route. The legal processes for those under 16 require parental consent and follow different steps, which this planner does not cover.

### How does it work?

You answer a short set of questions about your situation: what documents you already have, what you have already updated, and what you want to do. The planner then creates a personal step-by-step action plan with clear instructions and links to official resources.

## Features

- **Regional support**
  - England and Wales, Scotland, and Northern Ireland each have tailored guidance, covering region-specific agencies (DVLA/DVA, DBS/AccessNI, DWP/DfC, NHS/HSCNI, GRO/GRONI/NRS) and processes
  - Northern Ireland includes the Irish passport gender recognition route for those born there

- **Two input modes**
  - Step-by-step wizard or a single checklist, with a shared progress bar; switch between them at any time

- **Personalised action plan**
  - Covers deed polls, statutory declarations, NHS/HSCNI records, driving licences, passports, HMRC, employment, DBS/AccessNI checks, qualifications, the electoral register, banks, eVisas, DWP/DfC benefits, birth certificates, and GRC applications
  - Difficulty and cost badges on every item (Easy/Medium/Hard, Free/£/££/£££ with split-gradient badges for ranges)
  - Estimated time and cost summary

- **Progress tracking**
  - Four-state checkboxes: not started, in progress, done, not needed
  - Right-click or long-press to go backwards through states
  - Parent/child sync for service sub-items
  - Service detail blocks mute and strike through as items are completed
  - Focus mode hides completed items with smooth collapse animations
  - All progress saved to localStorage

- **Sticky toolbar**
  - New plan, edit plan, reset progress, focus mode, copy link, print, switch view, about, theme, and quick exit buttons
  - Expanding text labels on hover/focus (desktop)
  - Toolbar guide in the plan legend for mobile users
  - WAI-ARIA toolbar pattern with arrow key navigation and roving tabindex
  - Rainbow progress bar (plan view) and flat progress bar with question counter (wizard)

- **Shareable links**
  - Base64-encoded URL that captures all answers for use on other devices or with trusted people

- **Print and PDF export**
  - Print stylesheet shows all expanded content, plan-top headings, and current progress states

- **Privacy-first**
  - No data is ever sent to a server; everything runs in the browser
  - localStorage only; clearable by clicking "New plan" or clearing browser history
  - Shareable links contain sensitive information and should only be shared with trusted people

- **Quick exit**
  - Red ⚠️ button or Esc key instantly navigates to google.co.uk and removes the page from browser history

- **Accessible**
  - Keyboard navigable with arrow keys in toolbar, tab through all controls
  - Screen reader support: ARIA live region for announcements, aria-pressed/aria-expanded/aria-label on all interactive elements, visually hidden descriptions for locked items
  - Skip link, focus management, focus trap in help modal
  - Reduced motion support: all animations and transitions disabled
  - Responsive: hero, toolbar, and content adapt from 400px to desktop widths

- **Light and dark mode**
  - Follows system preference with a manual toggle; persisted to localStorage

- **No dependencies**
  - Single self-contained HTML file with embedded font, no external JavaScript libraries, no build step

## Privacy

- No personal data is collected or sent anywhere
- Answers and progress are stored only in your browser's localStorage
- You can delete all data at any time by clicking "New plan" or clearing your browser history
- A Cloudflare security cookie may be set by the hosting provider to protect against automated attacks; this is not used for tracking

> ⚠️ The shareable link feature encodes sensitive information (including immigration status, employment situation, and GRC intentions) into the URL. Only share it with people you fully trust.

## Disclaimer

This planner gives general information about UK legal processes only. It is not legal, medical, financial, or tax advice, and no professional relationship is created by using it. Government rules, processes, and fees can change without notice. Always check important steps against official sources, especially GOV.UK, before submitting any applications.

## Reporting issues

If you notice a broken link, an outdated process, or a bug, please [open an issue](../../issues).

## Contributing

This project is built and maintained by one person. Contributions that improve accuracy, accessibility, or coverage are welcome.

**Useful contributions include:**
- Corrections to UK government processes or broken links
- Accessibility improvements
- Welsh language support

**Tech stack**
- HTML, CSS, JS. No dependencies or external calls.
- Single file application.
- End-to-end tests using Playwright.

**Running tests**
```
npm install
npm test
```

Please [open an issue](../../issues) before starting significant work so we can discuss the approach.

## Licence

[Be myself](https://bemyself.uk) © 2026 is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

You are free to share and adapt this project for non-commercial purposes, as long as you give appropriate credit and distribute any adaptations under the same licence.

If you are an organisation such as a registered UK charity and would like to use this project for commercial purposes, please [send an email](mailto:hello@bemyself.uk).

## Acknowledgements

Made with love and care for the UK trans community. 🏳️‍⚧️

Useful resources referenced throughout the planner:
- [TransActual](https://transactual.org.uk)
- [Gendered Intelligence](https://genderedintelligence.co.uk)
- [Mermaids](https://mermaids.org.uk)
- [GIRES](https://gires.org.uk)
- [Scottish Trans](https://scottishtrans.org)
- [TransAid Cymru](https://transaid.cymru)
- [Rainbow Migration](https://www.rainbowmigration.org.uk)
- [TENI](https://teni.ie)
- [r/transgenderUK](https://reddit.com/r/transgenderUK)
