import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Resolve the file path to index.html
const localFilePath = `file://${path.resolve('index.html')}`;
const filePath = process.env.BEMYSELF_URL || localFilePath;

// --- Helper Functions ---
async function checkAgeGate(page) {
  await page.evaluate(() => localStorage.setItem('ageConfirmed', 'true'));
}

async function openChecklist(page) {
  await checkAgeGate(page);
  await page.locator('.start-checklist-link').click();
  await page.locator('#checklistAgeConfirm').check();
}

async function openWizard(page) {
  await checkAgeGate(page);
  await page.getByRole('button', { name: 'Start now' }).click();
}

async function wizardNext(page) {
  const radio = page.locator('input[name="ans"]:not([disabled])').first();
  if (await radio.count() > 0) {
    await radio.check();
  } else {
    const multiOpt = page.locator('#wizardForm .multi-opt').first();
    if (await multiOpt.count() > 0 && !(await multiOpt.isChecked())) {
      await multiOpt.check();
    }
  }
  const nextBtn = page.getByRole('button', { name: /Continue|Show my plan/ });
  await nextBtn.click();
}

function decodeState(encoded) {
  // Use Node's Buffer to safely decode base64
  const bin = Buffer.from(encoded, 'base64').toString('binary');
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function getShareUrl(page, data) {
  return page.evaluate((d) => {
    const obj = Object.assign({ v: window.SCHEMA_VERSION }, d);
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    const fp = window.location.href.split('?')[0];
    return `${fp}?p=${btoa(bin)}`;
  }, data);
}

// --- Test Suite ---
test.describe('Be myself Planner', () => {

  // Before every single test, navigate to a fresh instance of the page
  test.beforeEach(async ({ page }) => {
    await page.goto(filePath);
  });

  test('1. Initial render', async ({ page }) => {
    await expect(page.locator('#startView')).toBeVisible();
    await expect(page.locator('#wizardView')).toBeHidden();
    await expect(page.locator('#checklistView')).toBeHidden();
    await expect(page.locator('#planView')).toBeHidden();
    await expect(page.locator('#welcomeBackView')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Switch view' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Start now' })).toBeEnabled();
    await expect(page.locator('.start-checklist-link')).toBeVisible();
  });

  test('2. Age gate — wizard Q1', async ({ page }) => {
    await page.getByRole('button', { name: 'Start now' }).click();
    await expect(page.locator('#wizardView')).toBeVisible();
    const qText = await page.locator('#wizardStepFieldset legend, #wizardStepFieldset .chk-q, #wizardOptionsGroup').first().textContent();
    expect(qText).toMatch(/16|aged/);
    await page.locator('input[name=ans][value=yes]').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    expect(await page.evaluate(() => localStorage.getItem('ageConfirmed'))).toBe('true');
  });

  test('3. Age gate persistence', async ({ page }) => {
    await checkAgeGate(page);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('ageConfirmed'))).toBe('true');
    await expect(page.getByRole('button', { name: 'Start now' })).toBeEnabled();
  });

  test('4. Wizard flow', async ({ page }) => {
    await openWizard(page);
    await expect(page.locator('#wizardView')).toBeVisible();
    await expect(page.locator('#startView')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Switch view' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.locator('#wizardWarning')).toBeVisible();

    let q = 0;
    while (await page.locator('#wizardView').isVisible() && q < 40) { 
      await wizardNext(page); 
      q++; 
    }
    
    await expect(page.locator('#planView')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch view' })).toBeHidden();
  });

  test('5. Wizard back navigation', async ({ page }) => {
    await openWizard(page);
    await page.locator('input[name="ans"]:not([disabled])').first().check();
    await page.getByRole('button', { name: 'Continue →' }).click();
    
    const backBtn = page.getByRole('button', { name: '← Back' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await expect(page.locator('input[name="ans"]').first()).toBeVisible();
  });

  test('6. Checklist flow', async ({ page }) => {
    await openChecklist(page);
    await expect(page.locator('#checklistView')).toBeVisible();
    await expect(page.locator('#wizardView')).toBeHidden();
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await expect(page.locator('#planView')).toBeVisible();
  });

  test('7. Mode toggle', async ({ page }) => {
    await openWizard(page);
    const switchBtn = page.getByRole('button', { name: 'Switch view' });
    
    await switchBtn.click();
    await expect(page.locator('#checklistView')).toBeVisible();
    await expect(page.locator('#wizardView')).toBeHidden();
    
    await switchBtn.click();
    await expect(page.locator('#wizardView')).toBeVisible();
  });

  test('8. Checklist locks', async ({ page }) => {
    await openChecklist(page);
    
    await expect(page.getByLabel('NHS record')).toBeDisabled();
    await expect(page.getByLabel('HMRC and taxes')).toBeDisabled();
    await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]')).toBeDisabled();
    
    await page.getByLabel(/Deed poll or statutory declaration/).check();
    await expect(page.getByLabel('NHS record')).toBeEnabled();
    await expect(page.getByLabel('HMRC and taxes')).toBeEnabled();
    
    await page.locator('#chkGoalName').uncheck();
    await page.locator('#chkGoalGender').check();
    await expect(page.locator('#wrapDeedPoll')).toBeHidden();
    await expect(page.getByLabel('NHS record')).toBeEnabled();
    
    await page.locator('#chkGoalName').check();
    await page.locator('#chkGoalGender').uncheck();
    await expect(page.locator('#wrapGRC')).toBeHidden();
    await expect(page.locator('#wrapVisa')).toBeHidden();
    
    await page.getByLabel(/I have a UK visa or eVisa/).check();
    await expect(page.locator('#wrapVisa')).toBeVisible();
    
    await expect(page.locator('#wrapDBS')).toBeHidden();
    await expect(page.locator('#wrapDWP')).toBeVisible();
    
    await page.getByLabel(/Yes, I need to update my records/).check();
    await expect(page.locator('#wrapDBS')).toBeVisible();
    await expect(page.locator('#wrapDWP')).toBeVisible();
  });

  test('9. Plan content conditions', async ({ page }) => {
    await openChecklist(page);
    await page.locator('#chkGoalName').check();
    await page.locator('#chkGoalGender').check();
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await expect(page.getByRole('heading', { name: 'Step 1: The basics' })).toBeVisible();
  });

  test('10. Progress tracker', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    const firstBtn = page.locator('.step-state-btn[data-track-id]').first();
    const trackId = await firstBtn.getAttribute('data-track-id');
    
    await firstBtn.click();
    expect(await page.evaluate(id => localStorage.getItem('st_' + id), trackId)).toBe('1');
    await expect(firstBtn).toHaveAttribute('data-state', '1');
    
    await firstBtn.click();
    expect(await page.evaluate(id => localStorage.getItem('st_' + id), trackId)).toBe('2');
    
    await firstBtn.click();
    expect(await page.evaluate(id => localStorage.getItem('st_' + id), trackId)).toBe('3');
    
    await firstBtn.click();
    expect(await page.evaluate(id => localStorage.getItem('st_' + id), trackId)).toBe('0');
  });

  test('11. All done banner', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    const btns = page.locator('.step-state-btn[data-track-id]');
    const count = await btns.count();
    expect(count).toBeGreaterThan(0);
    
    for (let i = 0; i < count; i++) { 
      await btns.nth(i).click(); 
      await btns.nth(i).click(); 
    }
    await expect(page.locator('#allDoneBanner')).toBeVisible();
  });

  test('12. Make changes', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await page.locator('#ubMakeChangesBtn').click();
    
    await expect(page.locator('#checklistView')).toBeVisible();
    await expect(page.locator('#planView')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Update my action plan' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Update my action plan' }).click();
    await expect(page.locator('#planView')).toBeVisible();
  });

  test('13. Start again', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await page.locator('#ubRestartBtn').click();
    
    const confirmBtn = page.getByRole('button', { name: /Confirm/ });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    
    await expect(page.locator('#startView')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('appState'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('ageConfirmed'))).toBeNull();
  });

  test('14. Welcome back', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await page.reload();
    
    await expect(page.locator('#welcomeBackView')).toBeVisible();
    await expect(page.locator('#startView')).toBeHidden();
    
    await page.getByRole('button', { name: 'Continue my plan' }).click();
    await expect(page.locator('#planView')).toBeVisible();
  });

  test('15. Shareable link clipboard', async ({ page }) => {
    await openChecklist(page);
    await page.getByLabel(/Deed poll or statutory declaration/).check();
    await page.getByLabel(/I plan to apply for a Gender Recognition Certificate/).check();
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    // Mock the clipboard API for testing
    await page.evaluate(() => {
      window._shareUrl = null;
      navigator.clipboard.writeText = async (text) => { window._shareUrl = text.split('\n').pop(); };
    });
    
    await page.getByRole('button', { name: 'Copy link to this plan' }).click();
    await page.waitForFunction(() => window._shareUrl !== null);
    
    const clip = await page.evaluate(() => window._shareUrl);
    expect(clip).toContain('?p=');
    
    const decoded = decodeState(new URL(clip).searchParams.get('p'));
    expect(decoded.goal).toBe('both');
    expect(decoded.dp).toBe(true);
    expect(decoded.grc).toBe(true);
  });

  test('16. Share URL age gate guard', async ({ page }) => {
    const url = await getShareUrl(page, {reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""});
    
    // Clear localStorage to simulate loading the link on a fresh device
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    
    await expect(page.locator('#startView')).toBeHidden();
    await expect(page.locator('#welcomeNewDevice')).toBeVisible();
    await expect(page.locator('#planView')).toBeHidden();
    
    await page.locator('#ageConfirmShared').check();
    await expect(page.locator('#planView')).toBeVisible();
  });

  test('17. Outdated schema link', async ({ page }) => {
    const shareData = Buffer.from(JSON.stringify({v:100,reg:"ew",goal:"both",emp:"no"})).toString('base64');
    const url = `${filePath}?p=${shareData}`;
    
    // Clear localStorage to simulate loading the link on a fresh device
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    
    await page.locator('#ageConfirmShared').check();
    await expect(page.locator('#welcomeOutdated')).toBeVisible();
    await expect(page.locator('#planView')).toBeHidden();
    
    await page.getByRole('button', { name: 'Review my answers' }).click();
    await expect(page.locator('#checklistView')).toBeVisible();
  });

  test('18. Help modal', async ({ page }) => {
    const helpBtn = page.getByRole('button', { name: 'About this planner' });
    await expect(page.locator('#helpOverlay')).toBeHidden();
    
    await helpBtn.click();
    await expect(page.locator('#helpOverlay')).toBeVisible();
    await expect(helpBtn).toHaveAttribute('aria-expanded', 'true');
    
    await page.getByRole('button', { name: 'Close help dialog' }).click();
    await expect(page.locator('#helpOverlay')).toBeHidden();
    
    await helpBtn.click();
    await page.mouse.click(5, 5); // click backdrop
    await expect(page.locator('#helpOverlay')).toBeHidden();
  });

  test('19. Keyboard Escape navigation', async ({ page }) => {
    await page.getByRole('button', { name: 'About this planner' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#helpOverlay')).toBeHidden();

    // Escape with modal closed triggers quick exit
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/google\.(co\.uk|com)/);
  });

  test('20. Panic button', async ({ page }) => {
    await checkAgeGate(page);
    await page.getByRole('button', { name: 'Quick Exit' }).click();
    await expect(page).toHaveURL(/google\.(co\.uk|com)/);
  });

  test('21. Theme toggle', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /Theme: switch to (light|dark) mode/ });
    await themeBtn.click();
    
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['dark', 'light']).toContain(theme);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).not.toBeNull();
  });

  test('22. plan-ready class', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    await expect(page.locator('body')).toHaveClass(/plan-ready/);
    await page.locator('#ubMakeChangesBtn').click();
    await expect(page.locator('body')).not.toHaveClass(/plan-ready/);
  });

  test('24. Utility bar and Focus mode', async ({ page }) => {
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    await expect(page.locator('#controlBar')).toBeVisible();
    
    const focusBtn = page.locator('#focusToggleBtn');
    await expect(focusBtn).toHaveAttribute('aria-pressed', 'false');
    
    await focusBtn.click();
    await expect(focusBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(focusBtn).toHaveClass(/focus-active/);
    
    await focusBtn.click();
    await expect(focusBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('26 & 27. Share link encodes step progress', async ({ page }) => {
    await openChecklist(page);
    await page.getByLabel(/Deed poll or statutory declaration/).check();
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    const hmrcBtn = page.locator('#ssb_trk_hmrc');
    await hmrcBtn.click();
    await hmrcBtn.click(); // set to Done (2)
    
    await expect(hmrcBtn).toHaveAttribute('data-state', '2');
    
    // Generate share URL
    const urlStr = await page.evaluate((fp) => {
      const prg = { hmrc: 2 };
      const ps = { v: window.SCHEMA_VERSION, goal: 'both', reg: 'ew', emp: 'no', prg };
      const url = new URL(fp);
      url.searchParams.set('p', btoa(JSON.stringify(ps)));
      return url.toString();
    }, filePath);

    // Simulate opening on a new device by clearing local storage
    await page.evaluate(() => localStorage.clear());
    await page.goto(urlStr);
    
    await page.locator('#ageConfirmShared').check();
    await expect(page.locator('#planView')).toBeVisible();
    
    const restoredBtn = page.locator('#ssb_trk_hmrc');
    await expect(restoredBtn).toHaveAttribute('data-state', '2');
    await expect(restoredBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('34. Progress bleed prevention', async ({ page }) => {
    // Generate a clean share URL
    const url = await getShareUrl(page, {reg:'ew',goal:'both',nonUK:false,pid:false,emp:'no',dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:''});
    
    // Simulate a new device that has dirty progress data, but hasn't passed the age gate
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('st_trk_deedpoll', '1');
    });
    
    await page.goto(url);
    await page.locator('#ageConfirmShared').check();
    await expect(page.locator('#planView')).toBeVisible();
    
    // Previous progress should be wiped by loading a new share link
    expect(await page.evaluate(() => localStorage.getItem('st_trk_deedpoll'))).toBeNull();
  });

  test('35-40. Accessibility / WCAG checks', async ({ page }) => {
    // 35. Keyboard shortcuts table has column headers
    await page.getByRole('button', { name: 'About this planner' }).click();
    const table = page.locator('.shortcut-table');
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(2);
    
    // 36. ControlBar landmark role
    const controlBar = page.locator('#controlBar');
    await expect(controlBar).toHaveAttribute('role', 'region');
    
    // 38. Edit plan button aria-label
    await page.keyboard.press('Escape');
    await openChecklist(page);
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await expect(page.locator('#ubMakeChangesBtn')).toHaveAttribute('aria-label', 'Edit plan');
    
    // 40. CC licence SVGs have role=img
    await expect(page.locator('svg.cc-icon[role="img"]')).toHaveCount(4);
  });

  test('41. Specific choices section hidden for EW; Scotland shows birth cert name', async ({ page }) => {
    await openChecklist(page);
    await page.locator('input[name="chkBirthRegion"][value="ew"]').check();
    await page.locator('#chkGoalName').check();
    await page.locator('#chkGoalGender').uncheck();
    
    await expect(page.locator('#wrapSpecificChoices')).toBeHidden();
    
    await page.locator('input[name="chkBirthRegion"][value="scot"]').check();
    await expect(page.locator('#wrapSpecificChoices')).toBeVisible();
    await expect(page.locator('#wrapBirthCertName')).toBeVisible();
  });

  test('45. Services none-of-these checkbox', async ({ page }) => {
    await openChecklist(page);
    await page.locator('#chkSvcBanks').check();
    await expect(page.locator('#chkSvcBanks')).toBeChecked();
    
    await page.locator('#chkSvcNone').check();
    await expect(page.locator('#chkSvcBanks')).toBeDisabled();
    await expect(page.locator('#chkSvcBanks')).not.toBeChecked();
    
    await page.locator('#chkSvcNone').uncheck();
    await expect(page.locator('#chkSvcBanks')).toBeEnabled();
  });

  test('46-52. PLAN_ITEMS rendering tests', async ({ page }) => {
    await openChecklist(page);
    await page.locator('input[name="chkRegion"][value="scot"]').check();
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    
    // Scotland deed poll variant
    await expect(page.locator('#planContent')).toContainText('Deed poll or statutory declaration');
    await expect(page.locator('#planContent')).toContainText('National Records of Scotland');
  });

  test('54. renderCost: split cost badge renders correctly', async ({ page }) => {
    await openChecklist(page);
    await page.locator('#chkGoalName').check();
    await page.locator('#chkGoalGender').uncheck();
    await page.getByLabel(/Deed poll or statutory declaration/).check();
    await page.getByLabel(/Yes, I need to update my records/).check();
    await page.getByLabel(/I have qualifications/).check();
    
    await page.getByRole('button', { name: 'Show my action plan' }).click();
    await expect(page.locator('#planContent .split-badge').first()).toBeVisible();
  });

});
