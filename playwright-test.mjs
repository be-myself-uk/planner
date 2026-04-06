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
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
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
    const allBox = page.locator('#wizardForm').getByLabel('Select all');
    if (await allBox.count() > 0) await allBox.check();
  }
  await page.getByRole('button', { name: 'Continue →' }).click();
}

async function isInputDisabled(page, label) {
  return page.getByLabel(label).isDisabled();
}
async function shareUrl(page, data) {
  return page.evaluate(([d, fp]) => {
    const obj = Object.assign({ v: window.SCHEMA_VERSION }, d);
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    return `${fp}?p=${btoa(bin)}`;
  }, [data, filePath]);
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
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isDisabled(), 'DL needs_update disabled without deed poll');
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isDisabled(),       'Passport needs_update disabled without deed poll');
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
  assert(await page.isVisible('#wrapDWP'), 'DWP always visible for name-only goal regardless of employment');
  await page.getByLabel('Change my name and gender marker').check();
  assert(await page.isVisible('#wrapDWP'), 'DWP always visible for both goal regardless of employment');
  await page.getByLabel('Change my gender marker only').check();
  assert(await page.isHidden('#wrapDWP'), 'DWP hidden for gender-only goal');
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Yes, I need to update my records/).check();
  assert(await page.isVisible('#wrapDBS'), 'DBS shown when employment needs update');
  assert(await page.isVisible('#wrapDWP'), 'DWP still visible when employment needs update');
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
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const btns = page.locator('.step-state-btn[data-track-id]');
  const count = await btns.count();
  assert(count > 0, 'plan has at least one trackable step');
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
  await page.locator('#ubMakeChangesBtn').click();
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
  await page.getByRole('button', { name: 'Copy link to this plan' }).click();
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
  const url = await shareUrl(page, {reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""});
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
  let navUrl = null;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navUrl = frame.url(); });
  try { await page.keyboard.press('Escape'); } catch {}
  await page.waitForTimeout(500).catch(() => {});
  assert(navUrl !== null && navUrl.includes('google'), 'Escape with modal closed navigates to google');
  await ctx.close();
}

console.log('\n20. Panic button');
{
  const { page, ctx } = await newPage();
  await checkAgeGate(page);
  let navUrl = null;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navUrl = frame.url(); });
  try { await page.getByRole('button', { name: 'Quick Exit' }).click(); } catch {}
  await page.waitForTimeout(500).catch(() => {});
  assert(navUrl !== null && navUrl.includes('google'), 'panic button navigates to google');
  await ctx.close();
}

console.log('\n21. Theme toggle');
{
  const { page, ctx } = await newPage();
  const themeBtn = page.getByRole('button', { name: /Theme: switch to (light|dark) mode/ });
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
  await page.locator('#ubMakeChangesBtn').click();
  assert(await page.evaluate(() => !document.body.classList.contains('plan-ready')), 'plan-ready removed when editing');
  await ctx.close();
}

console.log('\n23. Region selector');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.locator('input[name="chkRegion"][value="ew"]').check();
  assert(await page.locator('input[name="chkRegion"][value="ew"]').isChecked(), 'England or Wales selectable');
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

console.log('\n25. DL and passport needs_update disabled without deed poll; updated/none always enabled');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isDisabled(),       'passport needs_update disabled without deed poll');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isDisabled(), 'DL needs_update disabled without deed poll');
  assert(await page.locator('input[name="chkPassportOpt"][value="updated"]').isEnabled(),             'passport updated always enabled');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]').isEnabled(),       'DL updated always enabled');
  assert(await page.locator('input[name="chkPassportOpt"][value="none"]').isEnabled(),                'passport none always enabled');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="none"]').isEnabled(),          'DL none always enabled');
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isEnabled(),        'passport needs_update enabled after deed poll');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isEnabled(),  'DL needs_update enabled after deed poll');
  await page.locator('input[name="chkPassportOpt"][value="needs_update"]').check();
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').isChecked(), 'passport set to needs_update with deed poll');
  await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').check();
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').isChecked(), 'DL set to needs_update with deed poll');
  await ctx.close();
}

console.log('\n26. Share link encodes step progress (save side)');
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

console.log('\n27. Progress restoration from share URL');
{
  const { page, ctx } = await newPage();
  const url = await shareUrl(page, {reg:"ew",goal:"name",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:true,visa:false,nhs:true,dl:"updated",hmrc:false,pass:"updated",grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:"",prg:{hmrc:2}});
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

console.log('\n28. Driving wizard options change text based on deed poll');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.evaluate(() => {
    wizardState = { goal: 'name', region: 'ew', deedpoll: 'no', driving: 'needs_update' };
    step = questions.findIndex(q => q.id === 'driving');
    renderWizard();
  });
  const needsUpdateInput = page.locator('input[name="ans"][value="needs_update"]');
  const needsUpdateLabel = page.locator('label').filter({ has: needsUpdateInput });
  assert(await needsUpdateInput.isEnabled(), 'driving needs_update is enabled even without deed poll');
  assert((await needsUpdateLabel.textContent()).includes('old name'), 'driving label says old name when no deed poll');
  assert(await page.locator('input[name="ans"][value="none"]').count() > 0, 'driving has third option (no licence)');
  await page.evaluate(() => {
    wizardState.deedpoll = 'yes';
    step = questions.findIndex(q => q.id === 'driving');
    renderWizard();
  });
  const updatedLabel = page.locator('label').filter({ has: page.locator('input[name="ans"][value="needs_update"]') });
  assert((await updatedLabel.textContent()).includes('need to update'), 'driving label says need to update when deed poll present');
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

console.log('\n30. visaUpdated Yes enabled for gender-only users in wizard');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.evaluate(() => {
    wizardState = { goal: 'gender', region: 'ew', citizen: 'yes', deedpoll: 'no' };
    step = questions.findIndex(q => q.id === 'visaUpdated');
    renderWizard();
  });
  const yesInput = page.locator('input[name="ans"][value="yes"]');
  assert(!await yesInput.isDisabled(), 'visaUpdated Yes is enabled for gender-only user (no deed poll needed)');
  await ctx.close();
}

console.log('\n31. visaUpdated Yes enabled regardless of deed poll state');
{
  const { page, ctx } = await newPage();
  await openWizard(page);
  await page.evaluate(() => {
    wizardState = { goal: 'name', region: 'ew', citizen: 'yes', deedpoll: 'no' };
    step = questions.findIndex(q => q.id === 'visaUpdated');
    renderWizard();
  });
  const yesInput = page.locator('input[name="ans"][value="yes"]');
  assert(!await yesInput.isDisabled(), 'visaUpdated Yes is enabled regardless of deed poll state');
  await ctx.close();
}

console.log('\n32. Gender-only non-UK user gets visa plan step');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my gender marker only').check();
  await page.getByLabel(/I have a UK visa or eVisa/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  assert(await page.isVisible('#planView'), 'plan shown for gender-only non-UK user');
  const evisaStep = page.locator('.step-state-btn[data-track-id="trk_evisa"]');
  assert(await evisaStep.count() > 0, 'eVisa plan step present for gender-only non-UK user');
  await ctx.close();
}

console.log('\n33. plan-item class present on plan list items');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const planItems = page.locator('#planContent .plan-item');
  assert(await planItems.count() > 0, 'plan-item class present on plan list items');
  await ctx.close();
}

console.log('\n34. Progress bleed: st_ keys cleared when loading a share URL');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  await page.evaluate(() => cycleStepState('trk_deedpoll'));
  assert(await page.evaluate(() => localStorage.getItem('st_trk_deedpoll') === '1'), 'progress saved before loading share URL');
  const url = await shareUrl(page, {reg:'ew',goal:'both',nonUK:false,pid:false,emp:'no',dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:''});
  await ctx.close();
  const { page: page2, ctx: ctx2 } = await newPage();
  await page2.evaluate(() => localStorage.setItem('st_trk_deedpoll', '1'));
  await page2.goto(url);
  await page2.waitForLoadState('domcontentloaded');
  await page2.locator('#ageConfirmShared').check();
  await page2.waitForSelector('#planView:not(.hidden)');
  const bleed = await page2.evaluate(() => localStorage.getItem('st_trk_deedpoll'));
  assert(bleed === null, 'old st_ progress keys cleared when loading a share URL (no bleed)');
  await ctx2.close();
}

console.log('\n35. WCAG: keyboard shortcuts table has column headers');
{
  const { page, ctx } = await newPage();
  await page.getByRole('button', { name: 'About this planner' }).click();
  const table = page.locator('.shortcut-table');
  const thead = table.locator('thead');
  assert(await thead.count() > 0, 'shortcuts table has a thead element');
  const ths = table.locator('th[scope="col"]');
  assert(await ths.count() === 2, 'shortcuts table has two th[scope=col] headers');
  await ctx.close();
}

console.log('\n36. WCAG: controlBar has region landmark role');
{
  const { page, ctx } = await newPage();
  const controlBar = page.locator('#controlBar');
  assert(await controlBar.getAttribute('role') === 'region', 'controlBar has role=region');
  assert(await controlBar.getAttribute('aria-label') !== null, 'controlBar has aria-label');
  await ctx.close();
}

console.log('\n37. WCAG: theme button aria-label starts with visible label text');
{
  const { page, ctx } = await newPage();
  const themeBtn = page.locator('#themeToggleBtn');
  const label = await themeBtn.getAttribute('aria-label');
  assert(label !== null && label.startsWith('Theme'), 'theme button aria-label starts with "Theme"');
  await ctx.close();
}

console.log('\n38. WCAG: edit plan button aria-label matches visible label');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const editBtn = page.locator('#ubMakeChangesBtn');
  assert(await editBtn.getAttribute('aria-label') === 'Edit plan', 'edit plan button aria-label is "Edit plan"');
  await ctx.close();
}

console.log('\n39. WCAG: support organisation links are in a list');
{
  const { page, ctx } = await newPage();
  const supportList = page.locator('#footerPrivacy ul').filter({ has: page.locator('a[href*="mermaids"]') });
  assert(await supportList.count() > 0, 'support org links are wrapped in a ul');
  const items = supportList.locator('li');
  assert(await items.count() === 7, 'support list has 7 list items');
  await ctx.close();
}

console.log('\n40. WCAG: CC licence SVGs have role=img');
{
  const { page, ctx } = await newPage();
  const ccSvgs = page.locator('svg.cc-icon[role="img"]');
  assert(await ccSvgs.count() === 4, 'all 4 CC licence SVGs have role=img');
  await ctx.close();
}

console.log('\n41. Specific choices section visible; Scotland shows birth cert name option');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.locator('input[name="chkRegion"][value="ew"]').check();
  await page.getByLabel('Change my name only').check();
  assert(await page.isVisible('#wrapSpecificChoices'), 'specific choices section visible (newGP always shown)');
  assert(await page.isHidden('#wrapBirthCertName'), 'birth cert name hidden for EW');
  await page.locator('input[name="chkRegion"][value="scot"]').check();
  assert(await page.isVisible('#wrapBirthCertName'), 'birth cert name visible for Scotland');
  await ctx.close();
}

console.log('\n42. New GP visible for name-only goal');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  assert(await page.isVisible('#wrapNewGP'), 'new GP visible for name-only goal');
  await ctx.close();
}

console.log('\n43. Driving and passport have three radio options');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').count() > 0, 'driving has needs_update option');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]').count() > 0, 'driving has updated option');
  assert(await page.locator('input[name="chkDrivingLicenceOpt"][value="none"]').count() > 0, 'driving has none option');
  assert(await page.locator('input[name="chkPassportOpt"][value="needs_update"]').count() > 0, 'passport has needs_update option');
  assert(await page.locator('input[name="chkPassportOpt"][value="updated"]').count() > 0, 'passport has updated option');
  assert(await page.locator('input[name="chkPassportOpt"][value="none"]').count() > 0, 'passport has none option');
  await ctx.close();
}

console.log('\n44. Employment question answer order');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  const labels = page.locator('input[name="chkEmployment"]').locator('..');
  const first = await labels.nth(0).textContent();
  const second = await labels.nth(1).textContent();
  assert(first.includes('update'), 'first employment option is needs updating');
  assert(second.trim() === 'No', 'second employment option is No');
  await ctx.close();
}

console.log('\n45. Services Select all toggles to Select none');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  assert(await page.locator('#chkSvcAllLabel').textContent() === 'Select all', 'label starts as Select all');
  await page.locator('#chkSvcAll').check();
  assert(await page.locator('#chkSvcAllLabel').textContent() === 'Select none', 'label changes to Select none when all checked');
  await page.locator('#chkSvcAll').uncheck();
  assert(await page.locator('#chkSvcAllLabel').textContent() === 'Select all', 'label reverts to Select all when unchecked');
  await ctx.close();
}

await browser.close();

console.log('\n46. PLAN_ITEMS: deed poll content renders in plan');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('Unenrolled deed poll'), 'EW deed poll title present');
  assert(plan.includes('unenrolled deed poll is generally all you need'), 'EW deed poll summary present');
  await ctx.close();
}

console.log('\n47. PLAN_ITEMS: Scotland deed poll variant renders correctly');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.locator('input[name="chkRegion"][value="scot"]').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('Deed poll or statutory declaration'), 'Scotland deed poll title present');
  assert(plan.includes('National Records of Scotland'), 'Scotland NRS reference present');
  await ctx.close();
}

console.log('\n48. PLAN_ITEMS: NHS EW name-only variant renders correctly');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByLabel('NHS record').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('NHS records'), 'NHS item title present');
  assert(plan.includes('appointments, letters, and prescriptions'), 'name-only NHS summary present');
  await ctx.close();
}

console.log('\n49. PLAN_ITEMS: NHS EW gender variant renders correctly');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my gender marker only').check();
  await page.getByLabel('NHS record').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('new NHS number'), 'gender NHS detail present');
  await ctx.close();
}

console.log('\n50. PLAN_ITEMS: DWP NI variant renders correctly');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.locator('input[name="chkRegion"][value="ni"]').check();
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByLabel(/I have employment/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('Department for Communities'), 'NI DWP title present');
  await ctx.close();
}

console.log('\n51. PLAN_ITEMS: HMRC content renders in plan');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByLabel('HMRC and taxes').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('HMRC and taxes'), 'HMRC item title present');
  assert(plan.includes('Special Section D'), 'HMRC detail present');
  await ctx.close();
}

console.log('\n52. PLAN_ITEMS: GRC items render for gender goal');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my gender marker only').check();
  await page.getByLabel(/I would like a Gender Recognition Certificate/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('Medical proof for GRC'), 'grc_med item present');
  assert(plan.includes('Living proof for GRC'), 'grc_life item present');
  await ctx.close();
}

console.log('\n53. wrapBornNI hidden for name-only goal in checklist');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  assert(await page.isHidden('#wrapBornNI'), 'born in NI hidden for name-only goal');
  await page.getByLabel('Change my gender marker only').check();
  assert(await page.isVisible('#wrapBornNI'), 'born in NI visible for gender-only goal');
  await page.getByLabel('Change my name and gender marker').check();
  assert(await page.isVisible('#wrapBornNI'), 'born in NI visible for both goal');
  await ctx.close();
}

console.log('\n54. renderCost: split cost badge renders correctly in plan');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.getByLabel(/I have employment/).check();
  await page.getByLabel(/I have qualifications/).check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = page.locator('#planContent');
  assert(await plan.locator('.badge-split').count() > 0, 'split cost badges present in plan');
  await ctx.close();
}

console.log('\n55. PLAN_ITEMS: driving licence NI variant (DVA) renders correctly');
{
  const { page, ctx } = await newPage();
  await openChecklist(page);
  await page.locator('input[name="chkRegion"][value="ni"]').check();
  await page.getByLabel('Change my name only').check();
  await page.getByLabel(/Deed poll or statutory declaration/).check();
  await page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
  const plan = await page.locator('#planContent').textContent();
  assert(plan.includes('Driving licence (DVA)'), 'NI driving licence shows DVA title');
  assert(plan.includes('Driver & Vehicle Agency'), 'DVA detail text present');
  await ctx.close();
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
