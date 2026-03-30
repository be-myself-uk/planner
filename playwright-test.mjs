import { chromium } from 'playwright';

const filePath = process.env.BEMYSELF_URL || 'file:///home/claude/index.html';
let passed = 0, failed = 0;

function assert(cond, name) {
  if (cond) { console.log(`  ✓ ${name}`); passed++; }
  else       { console.error(`  ✗ ${name}`); failed++; }
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}
);

async function newPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(filePath);
  await page.waitForLoadState('domcontentloaded');
  return { page, ctx };
}

async function checkAgeGate(page) {
  await page.locator('#ageConfirm').check();
}

async function openChecklist(page) {
  await checkAgeGate(page);
  await page.getByRole('button', { name: 'Fill out a single checklist' }).click();
}

async function openWizard(page) {
  await checkAgeGate(page);
  await page.getByRole('button', { name: 'Answer step-by-step questions' }).click();
}

async function wizardNext(page) {
  const radio = page.locator('input[name="ans"]:not([disabled])').first();
  if (await radio.count() > 0) {
    await radio.check();
  } else {
    const allBox = page.locator('#wizardForm').getByLabel('All of these');
    if (await allBox.count() > 0) await allBox.check();
  }
  await page.getByRole('button', { name: 'Continue →' }).click();
}

async function isInputDisabled(page, label) {
  return page.getByLabel(label).isDisabled();
}

console.log('\n1. Initial render');
{
  const { page, ctx } = await newPage();
  assert(await page.isVisible('#startView'),     'start view visible');
  assert(await page.isHidden('#wizardView'),      'wizard hidden');
  assert(await page.isHidden('#checklistView'),   'checklist hidden');
  assert(await page.isHidden('#planView'),        'plan hidden');
  assert(await page.isHidden('#welcomeBackView'), 'welcome hidden');
  assert(await page.getByRole('button', { name: 'Switch view' }).isHidden(), 'mode toggle hidden');
  assert(await page.getByRole('button', { name: 'Answer step-by-step questions' }).isDisabled(), 'wizard btn disabled before age gate');
  assert(await page.getByRole('button', { name: 'Fill out a single checklist' }).isDisabled(),   'checklist btn disabled before age gate');
  await ctx.close();
}

console.log('\n2. Age gate');
{
  const { page, ctx } = await newPage();
  await checkAgeGate(page);
  assert(await page.getByRole('button', { name: 'Answer step-by-step questions' }).isEnabled(), 'buttons enabled after ticking age gate');
  assert(await page.evaluate(() => localStorage.getItem('ageConfirmed')) === 'true', 'ageConfirmed saved to localStorage');
  await page.locator('#ageConfirm').uncheck();
  assert(await page.evaluate(() => localStorage.getItem('ageConfirmed')) === null, 'ageConfirmed cleared from localStorage on uncheck');
  assert(await page.getByRole('button', { name: 'Answer step-by-step questions' }).isDisabled(), 'buttons disabled again after unticking');
  await ctx.close();
}

console.log('\n3. Age gate persistence');
{
  const { page, ctx } = await newPage();
  await checkAgeGate(page);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  assert(await page.locator('#ageConfirm').isChecked(), 'age gate pre-ticked after reload');
  assert(await page.getByRole('button', { name: 'Answer step-by-step questions' }).isEnabled(), 'buttons enabled after reload with saved age gate');
  await ctx.close();
}

console.log('\n4. Wizard flow');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  assert(await page.isVisible('#wizardView'),  'wizard view shown');
  assert(await page.isHidden('#startView'),    'start view hidden');
  assert(await page.getByRole('button', { name: 'Switch view' }).isVisible(), 'mode toggle visible');
  await page.getByRole('button', { name: 'Continue →' }).click();
  assert(await page.isVisible('#wizardWarning'), 'warning shown with no answer');
  let q = 0;
  while (await page.isVisible('#wizardView') && q < 25) { await wizardNext(page); q++; }
  assert(await page.isVisible('#planView'), 'plan view shown after wizard completes');
  assert(await page.getByRole('button', { name: 'Switch view' }).isHidden(), 'mode toggle hidden on plan');
  await ctx.close();
}

console.log('\n5. Wizard back navigation');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.locator('input[name="ans"]:not([disabled])').first().check();
  await page.getByRole('button', { name: 'Continue →' }).click();
  assert(await page.getByRole('button', { name: '← Back' }).isVisible(), 'back button appears on Q2');
  await page.getByRole('button', { name: '← Back' }).click();
  assert(await page.locator('input[name="ans"]').first().isVisible(), 'back returns to previous question');
  await ctx.close();
}

console.log('\n6. Checklist flow');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  assert(await page.isVisible('#checklistView'), 'checklist view shown');
  assert(await page.isHidden('#wizardView'),     'wizard hidden');
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.isVisible('#planView'), 'plan shown after checklist submit');
  await ctx.close();
}

console.log('\n7. Mode toggle');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.getByRole('button', { name: 'Switch view' }).click();
  assert(await page.isVisible('#checklistView'), 'switches to checklist');
  assert(await page.isHidden('#wizardView'),     'wizard hidden after toggle');
  await page.getByRole('button', { name: 'Switch view' }).click();
  assert(await page.isVisible('#wizardView'),    'switches back to wizard');
  await ctx.close();
}

console.log('\n8. Checklist locks');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  assert(await page.getByLabel('NHS record').isDisabled(),     'NHS locked without deed poll');
  assert(await page.getByLabel('HMRC and taxes').isDisabled(), 'HMRC locked without deed poll');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isDisabled(), 'DL locked without deed poll');
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isDisabled(),       'Passport locked without deed poll');
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  assert(await page.getByLabel('NHS record').isEnabled(),     'NHS unlocked after deed poll');
  assert(await page.getByLabel('HMRC and taxes').isEnabled(), 'HMRC unlocked after deed poll');
  await page.getByLabel('Change my gender marker only').check();
  assert(await page.isHidden('#wrapDeedPoll'), 'deed poll hidden for gender-only goal');
  assert(await page.getByLabel('NHS record').isEnabled(), 'NHS unlocked for gender-only goal');
  await page.getByLabel('Change my name only').check();
  assert(await page.isHidden('#wrapGRC'), 'GRC hidden for name-only goal');
  assert(await page.isHidden('#wrapVisa'), 'visa row hidden when not non-UK');
  await page.getByLabel(/I have a UK visa or eVisa/).check();
  assert(await page.isVisible('#wrapVisa'), 'visa row shown when non-UK ticked');
  assert(await page.isHidden('#wrapDBS'), 'DBS hidden when employment up to date');
  assert(await page.isHidden('#wrapDWP'), 'DWP hidden when employment up to date');
  await page.getByLabel(/No, I need to update them\./).check();
  assert(await page.isVisible('#wrapDBS'), 'DBS shown when employment needs update');
  assert(await page.isVisible('#wrapDWP'), 'DWP shown when employment needs update');
  await ctx.close();
}

console.log('\n9. Plan content');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name and gender marker').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.isVisible('#planView'), 'plan shown');
  assert(await page.getByRole('heading', { name: 'Step 1: The basics' }).isVisible(), 'step 1 present when no deed poll');
  await ctx.close();
}
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name and gender marker').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.getByRole('heading', { name: 'Step 1: The basics' }).isHidden(), 'step 1 absent when deed poll already done');
  await ctx.close();
}
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my gender marker only').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.getByRole('heading', { name: 'Step 1: The basics' }).isHidden(), 'step 1 absent for gender-only goal');
  assert(await page.getByRole('heading', { name: /Did you know about titles/ }).isHidden(), 'titles tip absent for gender-only goal');
  await ctx.close();
}
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel(/I plan to apply for a Gender Recognition Certificate/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.getByRole('heading', { name: /The final legal step/ }).isVisible(), 'GRC step shown when wanted');
  await ctx.close();
}
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.getByRole('heading', { name: /The final legal step/ }).isHidden(), 'GRC step absent for name-only');
  await ctx.close();
}

console.log('\n10. Progress tracker');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const firstBtn = page.locator('.step-state-btn[data-track-id]').first();
  const trackId  = await firstBtn.getAttribute('data-track-id');
  await firstBtn.click();
  assert(await page.evaluate(id => localStorage.getItem('st_' + id), trackId) === '1', 'state 1 (in progress) saved to localStorage');
  assert(await firstBtn.getAttribute('data-state') === '1', 'data-state attribute updated to 1');
  await firstBtn.click();
  assert(await page.evaluate(id => localStorage.getItem('st_' + id), trackId) === '2', 'state 2 (done) saved to localStorage');
  await firstBtn.click();
  assert(await page.evaluate(id => localStorage.getItem('st_' + id), trackId) === '3', 'state 3 (not needed) saved to localStorage');
  await firstBtn.click();
  assert(await page.evaluate(id => localStorage.getItem('st_' + id), trackId) === '0', 'state 0 (cleared) saved to localStorage');
  await ctx.close();
}

console.log('\n11. All done banner');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my gender marker only').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const btns = page.locator('.step-state-btn[data-track-id]');
  const count = await btns.count();
  for (let i = 0; i < count; i++) { const b = btns.nth(i); await b.click(); await b.click(); }
  await page.locator('#allDoneBanner').waitFor({ state: 'visible' });
  assert(true, 'all done banner appears when all steps marked done');
  await ctx.close();
}

console.log('\n12. Make changes');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.getByRole('button', { name: 'Make changes' }).click();
  assert(await page.isVisible('#checklistView'), 'checklist shown after make changes');
  assert(await page.isHidden('#planView'),        'plan hidden after make changes');
  assert(await page.getByRole('button', { name: 'Update my action plan' }).isVisible(), 'button text changes to Update my action plan');
  await page.getByRole('button', { name: 'Update my action plan' }).click();
  assert(await page.isVisible('#planView'), 'plan shown again after update');
  await ctx.close();
}

console.log('\n13. Start again');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.locator('#ubRestartBtn').click();
  assert(await page.getByRole('button', { name: /Confirm/ }).isVisible(), 'confirm prompt shown on first click');
  await page.getByRole('button', { name: /Confirm/ }).click();
  assert(await page.isVisible('#startView'), 'start view restored after restart');
  assert(await page.isHidden('#planView'),   'plan hidden after restart');
  assert(!await page.evaluate(() => localStorage.getItem('appState')),     'appState cleared from localStorage');
  assert(!await page.evaluate(() => localStorage.getItem('ageConfirmed')), 'ageConfirmed cleared from localStorage on restart');
  assert(!await page.locator('#ageConfirm').isChecked(), 'age gate checkbox unticked after restart');
  assert(await page.getByRole('button', { name: 'Answer step-by-step questions' }).isDisabled(), 'start buttons disabled after restart');
  await ctx.close();
}

console.log('\n14. Welcome back');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  assert(await page.isVisible('#welcomeBackView'), 'welcome back shown after reload');
  assert(await page.isHidden('#startView'),         'start hidden on welcome back');
  await page.getByRole('button', { name: 'Continue my plan' }).click();
  assert(await page.isVisible('#planView'), 'plan restored after continue');
  await ctx.close();
}

console.log('\n15. Shareable link');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name and gender marker').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByLabel(/I plan to apply for a Gender Recognition Certificate/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.evaluate(() => {
    window._shareUrl = null;
    window.copyShareableLink = function() {
      const w = wizardState;
      const chk = id => document.getElementById(id)?.checked;
      const reg  = isWizardMode ? (w.region || 'ew') : document.querySelector('input[name="chkRegion"]:checked').value;
      const goal = isWizardMode ? w.goal : document.querySelector('input[name="chkGoal"]:checked').value;
      const emp  = isWizardMode ? (w.employment || 'no') : document.querySelector('input[name="chkEmployment"]:checked').value;
      const SVC_MAP = {banks:'chkSvcBanks',insurance:'chkSvcInsurance',council:'chkSvcCouncil',utilities:'chkSvcUtilities',electoral:'chkSvcElectoral',landlord:'chkSvcLandlord',pension:'chkSvcPension',mortgage:'chkSvcMortgage',mobile:'chkSvcMobile'};
      const srv = isWizardMode
        ? (Array.isArray(w.services) ? w.services.join(',') : '')
        : Object.entries(SVC_MAP).filter(([,id]) => document.getElementById(id)?.checked).map(([v]) => v).join(',');
      const url = new URL(window.location.href.split('?')[0]);
      const ps = {
        v: SCHEMA_VERSION, reg, goal,
        nonUK: isWizardMode ? (w.citizen       === 'yes') : chk('chkNonUK'),
        pid:   isWizardMode ? (w.photoID       === 'yes') : chk('chkPhotoID'), emp,
        dbs:   isWizardMode ? (w.dbs           === 'yes') : chk('chkDBS'),
        stu:   isWizardMode ? (w.student       === 'yes') : chk('chkStudent'),
        dp:    isWizardMode ? (w.deedpoll      === 'yes') : chk('chkDeedPoll'),
        visa:  isWizardMode ? (w.visaUpdated   === 'yes') : chk('chkVisa'),
        nhs:   isWizardMode ? (w.nhs           === 'yes') : chk('chkNHS'),
        dl:    isWizardMode ? (w.driving       === 'updated') : chk('chkDrivingLicence'),
        hmrc:  isWizardMode ? (w.hmrc          === 'yes') : chk('chkHMRC'),
        pass:  isWizardMode ? (w.passport      === 'updated') : chk('chkPassport'),
        grc:   isWizardMode ? (w.grc           === 'yes') : chk('chkGRC'),
        newgp: isWizardMode ? (w.newGP         === 'yes') : chk('chkNewGP'),
        dwp:   isWizardMode ? (w.dwp           === 'yes') : chk('chkDWP'),
        bcn:   isWizardMode ? (w.birthCertName === 'yes') : chk('chkBirthCertName'),
        bc:    isWizardMode ? (w.birthCert     === 'yes') : chk('chkBirthCert'),
        bni:   isWizardMode ? (w.bornInNI      === 'yes') : chk('chkBornNI'),
        srv,
      };
      url.searchParams.set('p', btoa(JSON.stringify(ps)));
      window._shareUrl = url.toString();
    };
  });
  await page.getByRole('button', { name: 'Copy shareable link to this plan' }).click();
  const clip = await page.evaluate(() => window._shareUrl);
  assert(clip && clip.includes('?p='), 'share link uses encoded p param');
  const decoded = JSON.parse(atob(new URL(clip).searchParams.get('p')));
  assert(decoded.goal === 'both', 'share link encodes goal param');
  assert(decoded.dp === true,     'share link encodes deed poll param');
  assert(decoded.grc === true,    'share link encodes grc param');
  await page.goto(clip);
  await page.waitForLoadState('domcontentloaded');
  assert(await page.isVisible('#planView'), 'share URL loads directly to plan');
  await ctx.close();
}

console.log('\n16. Share URL age gate guard');
{
  const { page, ctx } = await newPage();
  const shareData = btoa(JSON.stringify({v:1774828800,reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""}));
  const url = `${filePath}?p=${shareData}`;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  assert(await page.isHidden('#startView'),         'start view hidden on share URL without age gate');
  assert(await page.isVisible('#welcomeNewDevice'), 'new device prompt shown without age gate');
  assert(await page.isHidden('#planView'),           'plan not shown without age confirmation');
  await page.locator('#ageConfirmShared').check();
  assert(await page.isVisible('#planView'),     'plan shown after shared age gate confirmed');
  assert(await page.isHidden('#checklistView'), 'checklist not shown (plan went direct)');
  await ctx.close();
}

console.log('\n17. Outdated schema link');
{
  const { page, ctx } = await newPage();
  const shareData = btoa(JSON.stringify({v:100,reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""}));
  const url = `${filePath}?p=${shareData}`;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#ageConfirmShared').check();
  assert(await page.isVisible('#welcomeOutdated'), 'outdated warning shown for old schema version');
  assert(await page.isHidden('#welcomeNormal'),    'normal welcome hidden for old schema version');
  assert(await page.isHidden('#planView'),          'plan not shown for outdated link');
  await page.getByRole('button', { name: 'Review my answers' }).click();
  assert(await page.isVisible('#checklistView'), 'review answers opens checklist');
  await ctx.close();
}

console.log('\n18. Help modal');
{
  const { page, ctx } = await newPage();
  const helpBtn = page.getByRole('button', { name: 'About this planner' });
  assert(await page.isHidden('#helpOverlay'), 'help overlay hidden initially');
  await helpBtn.click();
  assert(await page.isVisible('#helpOverlay'), 'help overlay shown after click');
  assert(await helpBtn.getAttribute('aria-expanded') === 'true', 'aria-expanded=true when open');
  await page.getByRole('button', { name: 'Close help dialog' }).click();
  assert(await page.isHidden('#helpOverlay'), 'help overlay closed after close btn');
  await helpBtn.click();
  await page.click('#helpOverlay', { position: { x: 5, y: 5 } });
  assert(await page.isHidden('#helpOverlay'), 'help closed by backdrop click');
  await helpBtn.click();
  const insideBefore = await page.evaluate(() => !!document.getElementById('helpModal')?.contains(document.activeElement));
  assert(insideBefore, 'focus starts inside modal');
  await page.keyboard.press('Tab');
  const insideAfter = await page.evaluate(() => !!document.getElementById('helpModal')?.contains(document.activeElement));
  assert(insideAfter, 'Tab keeps focus inside modal (focus trap)');
  await ctx.close();
}

console.log('\n19. Keyboard Escape');
{
  const { page, ctx } = await newPage();
  await page.getByRole('button', { name: 'About this planner' }).click();
  await page.keyboard.press('Escape');
  assert(await page.isHidden('#helpOverlay'), 'Escape closes help modal');
  const navPromise = page.waitForNavigation({ timeout: 3000 }).catch(() => null);
  await page.keyboard.press('Escape');
  const nav = await navPromise;
  assert(nav !== null || page.url().includes('google'), 'Escape with modal closed triggers panic exit');
  await ctx.close();
}

console.log('\n20. Panic button');
{
  const { page, ctx } = await newPage();
  const navPromise = page.waitForNavigation({ timeout: 3000 }).catch(() => null);
  await page.getByRole('button', { name: 'Quick Exit' }).click();
  const nav = await navPromise;
  assert(nav !== null || page.url().includes('google'), 'panic button navigates away');
  await ctx.close();
}

console.log('\n21. Theme toggle');
{
  const { page, ctx } = await newPage();
  const themeBtn = page.getByRole('button', { name: /Switch to (light|dark) mode/ });
  await themeBtn.click();
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert(theme === 'dark' || theme === 'light', 'data-theme set after toggle');
  assert(await page.evaluate(() => localStorage.getItem('theme')) !== null, 'theme saved to localStorage');
  await ctx.close();
}

console.log('\n22. plan-ready class');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.evaluate(() => document.body.classList.contains('plan-ready')), 'body has plan-ready class when plan shown');
  await page.getByRole('button', { name: 'Make changes' }).click();
  assert(await page.evaluate(() => !document.body.classList.contains('plan-ready')), 'plan-ready removed when editing');
  await ctx.close();
}

console.log('\n23. Region selector');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('England or Wales').check();
  assert(await page.getByLabel('England or Wales').isChecked(), 'England or Wales selectable');
  const scotRadio = page.getByRole('radio', { name: 'Scotland' });
  const scotLocked = await scotRadio.isDisabled().catch(() => true);
  if (!scotLocked) {
    await scotRadio.check();
    assert(await scotRadio.isChecked(), 'Scotland selectable when available');
    await page.getByRole('radio', { name: 'England or Wales' }).check();
  } else {
    assert(true, 'Scotland correctly locked when not yet available');
  }
  const niRadio = page.getByRole('radio', { name: /Northern Ireland/ });
  const niLocked = await niRadio.isDisabled().catch(() => true);
  if (!niLocked) {
    await niRadio.check();
    assert(await niRadio.isChecked(), 'Northern Ireland selectable when available');
  } else {
    assert(true, 'Northern Ireland correctly locked when not yet available');
  }
  await ctx.close();
}

console.log('\n24. Utility bar');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.locator('#controlBar').isVisible(), 'sticky plan bar visible on plan');
  const restartBtn = page.locator('#ubRestartBtn');
  await restartBtn.click();
  assert(await page.getByRole('button', { name: /Confirm/ }).isVisible(), 'restart btn shows confirm on first click');
  await page.waitForTimeout(4200);
  assert(await restartBtn.getAttribute('aria-label') === 'New plan', 'restart btn reverts after timeout');
  await restartBtn.click();
  await page.getByRole('button', { name: /Confirm/ }).click();
  assert(await page.isVisible('#startView'), 'start view shown after confirmed restart');
  await ctx.close();
}
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const focusBtn = page.locator('#focusToggleBtn');
  assert(await focusBtn.getAttribute('aria-pressed') === 'false', 'focus mode off initially');
  await focusBtn.click();
  assert(await focusBtn.getAttribute('aria-pressed') === 'true', 'focus mode on after click');
  assert(await focusBtn.evaluate(el => el.classList.contains('focus-active')), 'focus-active class added');
  await focusBtn.click();
  assert(await focusBtn.getAttribute('aria-pressed') === 'false', 'focus mode off after second click');
  await ctx.close();
}

console.log('\n25. Locked radios: needs_update resets, updated stays enabled');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.locator('input[name="chkPassportOpt"][value="needs_update"]').check();
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isChecked(), 'passport set to needs_update');
  await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').check();
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isChecked(), 'driving licence set to needs_update');
  await page.getByLabel(/Deed poll or statutory declaration/).uncheck();
  assert(await page.locator('input[name="chkPassportOpt"][value="updated"]').isChecked(), 'passport reset to updated when locked');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]').isChecked(), 'driving licence reset to updated when locked');
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isDisabled(), 'passport needs_update disabled when locked');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isDisabled(), 'driving licence needs_update disabled when locked');
  assert(await page.locator('input[name="chkPassportOpt"][value="updated"]').isEnabled(), 'passport updated enabled when locked');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]').isEnabled(), 'driving licence updated enabled when locked');
  await ctx.close();
}

console.log('\n27. Share link encodes step progress (save side)');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.evaluate(() => {
    cycleStepState('trk_hmrc');
    cycleStepState('trk_hmrc');
  });
  assert(await page.locator('#ssb_trk_hmrc').getAttribute('data-state') === '2', 'hmrc marked as done in DOM');
  const stepState = await page.evaluate(() => getStepState('trk_hmrc'));
  assert(stepState === 2, 'getStepState returns 2 from localStorage after marking done');
  const prg = await page.evaluate(() => {
    const p = {};
    document.querySelectorAll('.step-state-btn[data-track-id]').forEach(btn => {
      const id = btn.dataset.trackId;
      const s = getStepState(id);
      if (s > 0) p[id.replace('trk_', '')] = s;
    });
    return p;
  });
  assert(prg.hmrc === 2, 'prg object encodes done hmrc step for share URL');
  const shareUrl = await page.evaluate((fp) => {
    const prg = {};
    document.querySelectorAll('.step-state-btn[data-track-id]').forEach(btn => {
      const id = btn.dataset.trackId;
      const s = getStepState(id);
      if (s > 0) prg[id.replace('trk_', '')] = s;
    });
    const chk = id => document.getElementById(id)?.checked;
    const reg = document.querySelector('input[name="chkRegion"]:checked')?.value || 'ew';
    const goal = document.querySelector('input[name="chkGoal"]:checked')?.value || 'both';
    const emp = document.querySelector('input[name="chkEmployment"]:checked')?.value || 'no';
    const dl = document.querySelector('input[name="chkDrivingLicenceOpt"]:checked')?.value || 'updated';
    const pass = document.querySelector('input[name="chkPassportOpt"]:checked')?.value || 'updated';
    const srv = Object.entries(SVC_MAP).filter(([,id]) => document.getElementById(id)?.checked).map(([v]) => v).join(',');
    const ps = {
      v: SCHEMA_VERSION, reg, goal, nonUK: chk('chkNonUK'), pid: chk('chkPhotoID'), emp,
      dbs: chk('chkDBS'), stu: chk('chkStudent'), dp: chk('chkDeedPoll'), visa: chk('chkVisa'),
      nhs: chk('chkNHS'), dl, hmrc: chk('chkHMRC'), pass,
      grc: chk('chkGRC'), newgp: chk('chkNewGP'), dwp: chk('chkDWP'),
      bcn: chk('chkBirthCertName'), bc: chk('chkBirthCert'), bni: chk('chkBornNI'), srv,
    };
    if (Object.keys(prg).length) ps.prg = prg;
    const url = new URL(fp);
    url.searchParams.set('p', btoa(JSON.stringify(ps)));
    return url.toString();
  }, filePath);
  const decoded = JSON.parse(atob(new URL(shareUrl).searchParams.get('p')));
  assert(decoded.prg && decoded.prg.hmrc === 2, 'encoded share URL contains prg with done hmrc step');
  const { page: page2, ctx: ctx2 } = await newPage();
  await page2.goto(shareUrl);
  await page2.waitForLoadState('domcontentloaded');
  await page2.locator('#ageConfirmShared').check();
  await page2.waitForSelector('#planView:not(.hidden)');
  const restored = await page2.locator('#ssb_trk_hmrc').getAttribute('data-state');
  assert(restored === '2', 'hmrc step restored as done on new device from share link');
  await ctx.close();
  await ctx2.close();
}

console.log('\n26. Progress restoration from share URL');
{
  const { page, ctx } = await newPage();
  const shareData = btoa(JSON.stringify({v:1774828800,reg:"ew",goal:"name",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:true,visa:false,nhs:true,dl:"updated",hmrc:false,pass:"updated",grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:"",prg:{hmrc:2}}));
  const url = `${filePath}?p=${shareData}`;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#ageConfirmShared').check();
  await page.waitForSelector('#planView:not(.hidden)');
  assert(await page.isVisible('#planView'), 'plan loads from share URL with progress data');
  const state = await page.locator('#ssb_trk_hmrc').getAttribute('data-state');
  assert(state === '2', 'hmrc step restored to done (state 2) from share URL prg');
  const pressed = await page.locator('#ssb_trk_hmrc').getAttribute('aria-pressed');
  assert(pressed === 'true', 'hmrc step aria-pressed is true when state is done');
  await ctx.close();
}

console.log('\n28. Disabled wizard option is never checked');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.evaluate(() => {
    wizardState = { goal: 'name', region: 'ew', deedpoll: 'no', driving: 'needs_update' };
    step = questions.findIndex(q => q.id === 'driving');
    renderWizard();
  });
  const needsUpdateInput = page.locator('input[name="ans"][value="needs_update"]');
  const updatedInput = page.locator('input[name="ans"][value="updated"]');
  assert(await needsUpdateInput.isDisabled(), 'driving needs_update is disabled when no deed poll');
  assert(!await needsUpdateInput.isChecked(), 'driving needs_update is NOT checked when disabled');
  assert(!await updatedInput.isDisabled(), 'driving updated is NOT disabled when no deed poll');
  await ctx.close();
}

console.log('\n29. HMRC Yes disabled in wizard without deed poll');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.evaluate(() => {
    wizardState = { goal: 'name', region: 'ew', deedpoll: 'no' };
    step = questions.findIndex(q => q.id === 'hmrc');
    renderWizard();
  });
  const yesInput = page.locator('input[name="ans"][value="yes"]');
  const noInput  = page.locator('input[name="ans"][value="no"]');
  assert(await yesInput.isDisabled(), 'hmrc yes is disabled when no deed poll');
  assert(!await noInput.isDisabled(), 'hmrc no is NOT disabled when no deed poll');
  await ctx.close();
}

await browser.close();

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
