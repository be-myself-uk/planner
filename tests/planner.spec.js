import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
const localFilePath = `file://${path.resolve('index.html')}`;
const filePath = process.env.BEMYSELF_URL || localFilePath;

async function checkAgeGate(page) {
  await page.evaluate(() => localStorage.setItem('ageConfirmed', 'true'));
}

async function checkAgeGateShared(page) {
  await page.locator('#ageConfirmShared').check();
  await page.locator('#disclaimerConfirmShared').check();
}

async function openChecklist(page) {
  await checkAgeGate(page);
  await page.locator('.start-checklist-link').click();
  await page.locator('#checklistAgeConfirm').check();
  await page.locator('#checklistDisclaimerConfirm').check();
}

async function openWizard(page) {
  await checkAgeGate(page);
  await page.getByRole('button', { name: 'Start here' }).click();
}

async function openMultiPhasePlan(page) {
  await openChecklist(page);
  await page.locator('#chkEmployedNeeds').check();
  await page.locator('#chkDBS').check();
  await page.getByRole('button', { name: 'Show my action plan' }).click();
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

async function readStorage(page) {
  return page.evaluate(() => {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  });
}

async function restoreStorage(page, snapshot) {
  return page.evaluate((snap) => {
    const restored = [];
    try {
      for (const k of Object.keys(snap)) {
        if (localStorage.getItem(k) !== snap[k]) {
          localStorage.setItem(k, snap[k]);
          restored.push(k);
        }
      }
    } catch (e) {}
    return restored;
  }, snapshot);
}

async function navigateUntil(page, navigate, conditionFn, budget, label) {
  let used = 0;
  let lastError = null;
  const check = async () => {
    try {
      return await conditionFn();
    } catch (e) {
      lastError = e;
      return false;
    }
  };
  while (used < budget) {
    const before = await readStorage(page);
    await page.waitForTimeout(100);
    await navigate();
    used++;
    if (await check()) return;
    if (used >= budget) break;
    const restored = await restoreStorage(page, before);
    if (restored.length === 0) continue;
    test.info().annotations.push({
      type: 'storage-restored',
      description: `${label}: put back ${restored.join(', ')} after a dropped file:// localStorage write`,
    });
    await navigate();
    used++;
    if (await check()) return;
  }
  throw new Error(
    `${label}: condition still false after ${used} navigations` +
    (lastError ? ` (last condition error: ${lastError.message})` : '')
  );
}

async function reloadUntil(page, conditionFn, attempts = 12) {
  return navigateUntil(page, () => page.reload(), conditionFn, attempts, 'reloadUntil');
}

async function gotoUntil(page, url, conditionFn, attempts = 12) {
  return navigateUntil(page, () => page.goto(url), conditionFn, attempts, 'gotoUntil');
}

function decodeState(encoded) {
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

test.describe('Be myself Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('disclaimerSeen', '1'));
    await page.goto(filePath);
  });

  test.describe('Core flows', () => {
    test('1. Initial render', async ({ page }) => {
      await expect(page.locator('#startView')).toBeVisible();
      await expect(page.locator('#wizardView')).toBeHidden();
      await expect(page.locator('#checklistView')).toBeHidden();
      await expect(page.locator('#planView')).toBeHidden();
      await expect(page.locator('#welcomeBackView')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Switch view' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Start here' })).toBeEnabled();
      await expect(page.locator('.start-checklist-link')).toBeVisible();
    });

    test('85. Toolbar About/Usage buttons only show on the start view and open their dialogs', async ({ page }) => {
      const aboutBtn = page.locator('#cbAboutBtn');
      const usageBtn = page.locator('#cbUsageBtn');
      await expect(aboutBtn).toBeVisible();
      await expect(usageBtn).toBeVisible();

      await aboutBtn.click();
      await expect(page.locator('#dlgAbout')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#dlgAbout')).toBeHidden();

      await usageBtn.click();
      await expect(page.locator('#dlgUsage')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#dlgUsage')).toBeHidden();

      await page.getByRole('button', { name: 'Start here' }).click();
      await expect(aboutBtn).toBeHidden();
      await expect(usageBtn).toBeHidden();
    });

    test('2. Age gate — wizard Q1', async ({ page }) => {
      await page.getByRole('button', { name: 'Start here' }).click();
      await expect(page.locator('#wizardView')).toBeVisible();
      const qText = await page.locator('#wizardStepFieldset legend, #wizardStepFieldset .chk-q, #wizardOptionsGroup').first().textContent();
      expect(qText).toMatch(/16|aged/);
      await page.locator('input[name=ans][value=yes]').check();
      await page.getByRole('button', { name: 'Continue' }).click();
      expect(await page.evaluate(() => localStorage.getItem('ageConfirmed'))).toBe('true');
    });

    test('2b. Disclaimer gate — wizard Q2', async ({ page }) => {
      await page.getByRole('button', { name: 'Start here' }).click();
      await page.locator('input[name=ans][value=yes]').check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.locator('#wizardView')).toBeVisible();
      const qText = await page.locator('#wizardStepFieldset legend, #wizardStepFieldset .chk-q, #wizardOptionsGroup').first().textContent();
      expect(qText).toMatch(/understand|guidance/i);
      await page.locator('input[name=ans][value=yes]').check();
      await page.getByRole('button', { name: 'Continue' }).click();
      expect(await page.evaluate(() => localStorage.getItem('disclaimerConfirmed'))).toBe('true');
    });

    test('3. Age gate persistence', async ({ page }) => {
      await checkAgeGate(page);
      await reloadUntil(page, () => page.evaluate(() => localStorage.getItem('ageConfirmed') === 'true'));
      expect(await page.evaluate(() => localStorage.getItem('ageConfirmed'))).toBe('true');
      await expect(page.getByRole('button', { name: 'Start here' })).toBeEnabled();
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
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(page.locator('#startView')).toBeHidden();
      await backBtn.click();
      await expect(page.locator('#startView')).toBeVisible();
      await expect(page.locator('#wizardView')).toBeHidden();
    });

    test('6. Checklist flow', async ({ page }) => {
      await openChecklist(page);
      await expect(page.locator('#checklistView')).toBeVisible();
      await expect(page.locator('#wizardView')).toBeHidden();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planView')).toBeVisible();
    });

    test('6b. Checklist disclaimer validation', async ({ page }) => {
      await page.locator('.start-checklist-link').click();
      await page.locator('#checklistAgeConfirm').check();
      await page.locator('#chkGoalName').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#checklistWarning')).toBeVisible();
      await expect(page.locator('#checklistDisclaimerGate')).toHaveClass(/error/);
      expect(await page.evaluate(() => localStorage.getItem('appState'))).toBeNull();
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

    test('94. Confirm button shows a visible countdown while awaiting confirmation', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#ubRestartBtn').click();
      const confirmBtn = page.getByRole('button', { name: /Confirm/ });
      await expect(confirmBtn).toHaveText('Confirm? · 4s');
      await page.waitForTimeout(1100);
      await expect(confirmBtn).toHaveText('Confirm? · 3s');
      await confirmBtn.click();
      await expect(page.locator('#startView')).toBeVisible();
    });

    test('14. Welcome back', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await reloadUntil(page, () => page.locator('#welcomeBackView').isVisible());
      await expect(page.locator('#welcomeBackView')).toBeVisible();
      await expect(page.locator('#startView')).toBeHidden();
      await page.getByRole('button', { name: 'Continue my plan' }).click();
      await expect(page.locator('#planView')).toBeVisible();
    });

    test('111. Welcome-back "Recent changes" link is a plain-English, contraction-free label', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await reloadUntil(page, () => page.locator('#welcomeBackView').isVisible());
      const link = page.locator('#welcomeNormal a.contact-btn');
      await expect(link).toContainText('Recent changes');
      await expect(link).not.toContainText("what's");
      await expect(link).not.toContainText('what has');
    });

    test('58. Home button shows welcome back after editing plan', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('#checklistView')).toBeVisible();
      await page.getByRole('button', { name: 'Back to start' }).click();
      await expect(page.locator('#welcomeBackView')).toBeVisible();
      await expect(page.locator('#startView')).toBeHidden();
    });

    test('59. Age/disclaimer gate sync between wizard and checklist', async ({ page }) => {
      await page.getByRole('button', { name: 'Start here' }).click();
      await wizardNext(page);
      await wizardNext(page);
      await page.getByRole('button', { name: 'Switch view' }).click();
      await expect(page.locator('#checklistAgeConfirm')).toBeChecked();
      await expect(page.locator('#checklistDisclaimerConfirm')).toBeChecked();
    });

    test('62. Wizard back navigation steps back one question at a time from a fresh session', async ({ page }) => {
      await page.goto(filePath);
      await page.getByRole('button', { name: 'Start here' }).click();
      await page.locator('input[name="ans"]:not([disabled])').first().check();
      await page.getByRole('button', { name: 'Continue →' }).click();
      await page.locator('input[name="ans"]:not([disabled])').first().check();
      await page.getByRole('button', { name: 'Continue →' }).click();
      const backBtn = page.getByRole('button', { name: '← Back' });
      await backBtn.click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(page.locator('.wizard-legend')).toContainText('Do you understand that this is only general guidance?');
      await backBtn.click();
      await expect(page.locator('.wizard-legend')).toContainText('Are you aged 16 or over?');
      await backBtn.click();
      await expect(page.locator('#startView')).toBeVisible();
      await expect(page.locator('#wizardView')).toBeHidden();
    });

    test('65. Wizard edit tip shows once and stays dismissed', async ({ page }) => {
      await openWizard(page);
      let q = 0;
      while (await page.locator('#wizardView').isVisible() && q < 40) {
        await wizardNext(page);
        q++;
      }
      await expect(page.locator('#planView')).toBeVisible();
      const tip = page.locator('#wizardEditTip');
      await expect(tip).toBeHidden();
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(tip).toBeVisible();
      await tip.getByRole('button', { name: 'Dismiss tip' }).click();
      await expect(tip).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('editTipSeen'))).toBe('1');
      await page.getByRole('button', { name: /Continue|Show my plan/ }).click();
      await expect(page.locator('#planView')).toBeVisible();
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(tip).toBeHidden();
    });

    test('68. Wizard edit tip does not resurface after New plan then Start here', async ({ page }) => {
      await openWizard(page);
      let q = 0;
      while (await page.locator('#wizardView').isVisible() && q < 40) {
        await wizardNext(page);
        q++;
      }
      await expect(page.locator('#planView')).toBeVisible();
      await page.locator('#ubMakeChangesBtn').click();
      const tip = page.locator('#wizardEditTip');
      await expect(tip).toBeVisible();
      await page.locator('#cbHomeBtn').click();
      await expect(page.locator('#welcomeBackView')).toBeVisible();
      const restartBtn = page.locator('#welcomeNormal button.secondary');
      await restartBtn.click();
      await restartBtn.click();
      await page.locator('#dlgDisclaimer').getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Start here' }).click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(tip).toBeHidden();
    });

    test('69. Checklist warning banners do not leak across a fresh checklist entry', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#chkGoalGender').uncheck();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#checklistGoalWarning')).toBeVisible();
      await page.locator('#cbHomeBtn').click();
      await expect(page.locator('#startView')).toBeVisible();
      await page.locator('.start-checklist-link').click();
      await expect(page.locator('#checklistGoalWarning')).toBeHidden();
    });

    test('105. Checklist adaptive note shows once and stays dismissed', async ({ page }) => {
      await checkAgeGate(page);
      await page.locator('.start-checklist-link').click();
      const note = page.locator('#checklistAdaptiveNote');
      await expect(note).toBeVisible();
      await note.getByRole('button', { name: 'Dismiss tip' }).click();
      await expect(note).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('adaptiveNoteSeen'))).toBe('1');
      await page.locator('#cbHomeBtn').click();
      await page.locator('.start-checklist-link').click();
      await expect(note).toBeHidden();
      await page.locator('#checklistAgeConfirm').check();
      await page.locator('#checklistDisclaimerConfirm').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#ubRestartBtn').click();
      await page.getByRole('button', { name: /Confirm/ }).click();
      await page.locator('#dlgDisclaimer').getByRole('button', { name: 'Close' }).click();
      await expect(page.locator('#startView')).toBeVisible();
      await page.locator('.start-checklist-link').click();
      await expect(note).toBeVisible();
    });

    test('110. Switching from the wizard to the checklist view also shows the adaptive note', async ({ page }) => {
      await openWizard(page);
      await page.getByRole('button', { name: 'Switch view' }).click();
      await expect(page.locator('#checklistView')).toBeVisible();
      await expect(page.locator('#checklistAdaptiveNote')).toBeVisible();
    });

    test('137. Wizard question number never decreases while answering forward', async ({ page }) => {
      await openWizard(page);
      const seen = [];
      for (let i = 0; i < 30; i++) {
        if (!(await page.locator('#wizardView').isVisible())) break;
        const text = await page.locator('#controlBarProgressText').textContent();
        const m = text.match(/Question (\d+) of (\d+)/);
        if (!m) break;
        seen.push(Number(m[1]));
        await wizardNext(page);
      }
      expect(seen.length).toBeGreaterThan(5);
      for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
      expect(seen[0]).toBe(1);
      expect(seen[1]).toBe(2);
    });

    test('138. Checklist intro, generate button and sticky bar agree from every entry point', async ({ page }) => {
      const state = () => page.evaluate(() => ({
        intro: document.getElementById('checklistIntroText').textContent.trim(),
        label: document.getElementById('checklistGenerateBtn').textContent.trim(),
        hidden: document.getElementById('checklistGenerateBtn').classList.contains('hidden'),
        sticky: document.getElementById('checklistStickyBar').classList.contains('hidden')
          ? null : document.querySelector('#checklistStickyBar button').textContent.trim(),
      }));
      const agrees = (s) => {
        const named = (s.intro.match(/"([^"]+)"/) || [])[1];
        return s.hidden ? (named === 'Update my action plan' && s.sticky === 'Update my action plan')
                        : (named === 'Show my action plan' && s.label === 'Show my action plan' && s.sticky === null);
      };

      await openChecklist(page);
      expect(agrees(await state())).toBe(true);

      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.getByRole('button', { name: 'Edit plan' }).click();
      expect(agrees(await state())).toBe(true);

      await page.getByRole('button', { name: 'Switch view' }).click();
      await page.getByRole('button', { name: 'Switch view' }).click();
      expect(agrees(await state())).toBe(true);
    });
  });

  test.describe('Locks, gating & validation', () => {
    test('8. Checklist locks', async ({ page }) => {
      await openChecklist(page);
      await expect(page.getByLabel('NHS record')).toBeEnabled();
      await expect(page.getByLabel('HMRC and taxes')).toBeEnabled();
      await expect(page.locator('#wrapNHS .note')).toContainText('already updated');
      await expect(page.locator('#wrapHMRC .note')).toContainText('already updated');
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]')).toBeDisabled();
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]')).toBeEnabled();
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#chkGoalGender').check();
      await expect(page.locator('#wrapDeedPoll')).toBeVisible();
      await expect(page.locator('#wrapDeedPoll .label-dp-gender')).toBeVisible();
      await expect(page.locator('#wrapDeedPoll .label-dp-dft')).toBeHidden();
      await expect(page.getByLabel('NHS record')).toBeEnabled();
      await expect(page.getByLabel('HMRC and taxes')).toBeVisible();
      await page.locator('#chkGoalName').check();
      await page.locator('#chkGoalGender').uncheck();
      await expect(page.locator('#wrapGRC')).toBeHidden();
      await expect(page.locator('#wrapVisa')).toBeVisible();
      await expect(page.locator('#wrapVisa .chk-q--flex')).toContainText('Do you have a visa or eVisa?');
      await expect(page.locator('#chkVisaNone')).toBeChecked();
      await expect(page.locator('#wrapDBS')).toBeHidden();
      await expect(page.locator('#wrapDWP')).toBeVisible();
      await page.getByLabel(/Yes, I need to update my records/).check();
      await expect(page.locator('#wrapDBS')).toBeVisible();
      await expect(page.locator('#wrapDWP')).toBeVisible();
      await page.getByLabel(/I've already updated my records/).check();
      await expect(page.locator('#wrapDBS')).toBeVisible();
      await page.getByLabel(/Deed poll or statutory declaration/).uncheck();
      await expect(page.locator('#chkVisaUpdated')).toBeDisabled();
      await expect(page.locator('#chkVisaUpdated')).toHaveAttribute('aria-describedby', 'lock-visa-reason');
    });

    test('99. Employment "already updated" hides the HR step but still offers DBS', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedUpdated').check();
      await expect(page.locator('#wrapDBS')).toBeVisible();
      await page.locator('#chkDBS').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByText('Work, payroll, and volunteering')).toHaveCount(0);
      await expect(page.getByText('DBS checks', { exact: true })).toBeVisible();
    });

    test('9. Plan content conditions', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').check();
      await page.locator('#chkGoalGender').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByRole('heading', { name: 'Step 1: Your name-change document' })).toBeVisible();
    });

    test('41. Specific choices section hidden for EW; Scotland shows birth cert name', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkBirthRegion"][value="e"]').check();
      await page.locator('#chkGoalName').check();
      await page.locator('#chkGoalGender').uncheck();
      await expect(page.locator('#wrapSpecificChoices')).toBeHidden();
      await page.locator('input[name="chkBirthRegion"][value="s"]').check();
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

    test('91. Checklist "All of these" services checkbox checks every service, clears none-of-these, and unticking one after does not disable the rest', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcNone').check();
      await expect(page.locator('#chkSvcBanks')).toBeDisabled();
      await page.locator('#chkSvcAll').check();
      await expect(page.locator('#chkSvcNone')).not.toBeChecked();
      const boxes = page.locator('.chk-service');
      const count = await boxes.count();
      for (let i = 0; i < count; i++) {
        await expect(boxes.nth(i)).toBeChecked();
        await expect(boxes.nth(i)).toBeEnabled();
      }
      await page.locator('#chkSvcBanks').uncheck();
      await expect(page.locator('#chkSvcBanks')).toBeEnabled();
      await expect(page.locator('#chkSvcInsurance')).toBeChecked();
      await expect(page.locator('#chkSvcAll')).not.toBeChecked();
    });

    test('91b. Wizard "All of these" services checkbox checks every service, clears none-of-these, and unticking one after does not disable the rest', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        wizardState.svcNone = 'yes';
        step = questions.findIndex(q => q.id === 'services');
        renderWizard(false);
      });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('Do you need to update any of these services?');
      await expect(page.locator('.multi-none')).toBeChecked();
      await page.locator('.multi-all').check();
      await expect(page.locator('.multi-none')).not.toBeChecked();
      const boxes = page.locator('.multi-opt');
      const count = await boxes.count();
      for (let i = 0; i < count; i++) {
        await expect(boxes.nth(i)).toBeChecked();
        await expect(boxes.nth(i)).toBeEnabled();
      }
      await boxes.first().uncheck();
      await expect(boxes.first()).toBeEnabled();
      await expect(page.locator('.multi-all')).not.toBeChecked();
    });

    test('61. Checklist goal warning shows correct message inline under the question', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#chkGoalGender').uncheck();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#checklistGoalWarning')).toBeVisible();
      await expect(page.locator('#checklistGoalWarning')).toContainText('Please select at least one option for what you need to update on your documents.');
      await expect(page.locator('#checklistWarning')).toBeHidden();
    });

    test('67. Checklist "Outside the UK" region can be selected and survives regeneration', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkRegionOut').check();
      await expect(page.locator('#chkRegionOut')).toBeChecked();
      await page.locator('#chkGoalGender').uncheck();
      await page.locator('#chkGoalGender').check();
      await expect(page.locator('#chkRegionOut')).toBeChecked();
    });

    test('73. Wizard: NHS/HMRC never skipped or locked; driving licence locks instead of silently discarding; newGP and HMRC shown for gender-only', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        wizardState.region = 'e';
        wizardState.birthRegion = 'e';
        wizardState.goal = 'name';
        wizardState.deedpoll = 'no';
        step = questions.findIndex(q => q.id === 'nhs');
        renderWizard(false);
      });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('NHS');
      await expect(page.locator('input[name="ans"]')).toHaveCount(2);
      await expect(page.locator('input[name="ans"]:disabled')).toHaveCount(0);

      await page.evaluate(() => { step = questions.findIndex(q => q.id === 'hmrc'); renderWizard(false); });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('HMRC');
      await expect(page.locator('input[name="ans"]:disabled')).toHaveCount(0);

      await page.evaluate(() => { step = questions.findIndex(q => q.id === 'driving'); renderWizard(false); });
      await expect(page.locator('input[name="ans"][value="updated"]')).toBeDisabled();

      await page.evaluate(() => {
        wizardState.goal = 'gender';
        step = questions.findIndex(q => q.id === 'newGP');
        renderWizard(false);
      });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('GP');

      await page.evaluate(() => { step = questions.findIndex(q => q.id === 'hmrc'); renderWizard(false); });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('HMRC');
      await expect(page.locator('input[name="ans"]:disabled')).toHaveCount(0);

      await page.evaluate(() => { step = questions.findIndex(q => q.id === 'driving'); renderWizard(false); });
      await expect(page.locator('input[name="ans"][value="updated"]')).toBeEnabled();
    });

    test('74. Wizard visa answer maps correctly, locks on passport, and produces the eVisa step', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        Object.assign(wizardState, { region:'e', birthRegion:'e', goal:'both', goalParts:['name','gender'], visa:'needs_update', deedpoll:'yes', nhs:'yes', newGP:'no', hmrc:'yes', driving:'none', passport:'needs_update', employment:'no', dbs:'no', dwp:'no', services:[], svcNone:'yes', vehicle:'no', student:'no', birthCertName:'no', birthCert:'no', grc:'no' });
        step = questions.findIndex(q => q.id === 'visa');
        renderWizard(false);
      });
      await expect(page.locator('input[name="ans"][value="updated"]')).toBeDisabled();
      await expect(page.locator('input[name="ans"][value="needs_update"]')).toBeEnabled();
      await expect(page.locator('input[name="ans"][value="none"]')).toBeEnabled();
      await page.evaluate(() => { wizardState.passport = 'updated'; renderWizard(false); });
      await expect(page.locator('input[name="ans"][value="updated"]')).toBeEnabled();
      await page.evaluate(() => {
        wizardState.passport = 'needs_update';
        wizardState.visa = 'needs_update';
        step = questions.findIndex(q => q.id === 'grc');
        renderWizard(false);
      });
      await page.locator('input[name="ans"][value="no"]').check();
      await page.getByRole('button', { name: 'Show my plan →' }).click();
      await expect(page.locator('#planContent')).toContainText('UK eVisa and UKVI');
      await expect(page.locator('#planContent')).toContainText('Home country passport');
      await expect(page.locator('#planContent')).not.toContainText('UK passport:');
    });

    test('102. Wizard GRC question offers "already have one" and is still shown after answering birthCert yes', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        Object.assign(wizardState, { region:'e', birthRegion:'e', goal:'both', goalParts:['name','gender'], citizen:'no', deedpoll:'yes', nhs:'yes', newGP:'no', hmrc:'yes', driving:'none', passport:'none', employment:'no', dbs:'no', dwp:'no', services:[], svcNone:'yes', vehicle:'no', student:'no', birthCertName:'no', birthCert:'yes' });
        step = questions.findIndex(q => q.id === 'grc');
        renderWizard(false);
      });
      await expect(page.locator('#wizardStepFieldset legend')).toContainText('Gender Recognition Certificate');
      await expect(page.locator('input[name="ans"]')).toHaveCount(3);
      await expect(page.locator('input[name="ans"][value="updated"]')).toHaveCount(1);
      await page.locator('input[name="ans"][value="updated"]').check();
      await page.getByRole('button', { name: 'Show my plan →' }).click();
      await expect(page.locator('#planContent')).toContainText('You already have a Gender Recognition Certificate (GRC).');
      await expect(page.locator('.step-state-btn[data-svc-parent="trk_grc_med"]')).toHaveCount(0);
    });

    test('75. Checklist eVisa lock releases on passport status, not the deed poll', async ({ page }) => {
      await openChecklist(page);
      await expect(page.locator('#chkVisaUpdated')).toBeDisabled();
      await expect(page.locator('#chkVisaUpdated')).toHaveAttribute('aria-describedby', 'lock-visa-reason');
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await expect(page.locator('#chkVisaUpdated')).toBeDisabled();
      await page.locator('input[name="chkPassportOpt"][value="updated"]').check();
      await expect(page.locator('#chkVisaUpdated')).toBeEnabled();
    });

    test('142. The checklist shows which section you are in, and clears it on leaving', async ({ page }) => {
      const label = () => page.locator('#controlBarProgressText').textContent();
      await openChecklist(page);
      await expect(page.locator('#controlBarProgress')).toBeVisible();
      await expect(page.locator('#controlBarProgress')).toHaveAttribute('aria-label', 'Checklist position');
      expect(await label()).toBe('Section 1 of 4: About you');

      const ids = await page.evaluate(() =>
        [...document.querySelectorAll('#checklistView > fieldset')].filter(f => f.offsetParent).map(f => f.id));
      for (let i = 0; i < ids.length; i++) {
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          const bar = document.getElementById('controlBar').getBoundingClientRect().height;
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - bar - 4);
        }, ids[i]);
        await expect.poll(label).toContain(`Section ${i + 1} of ${ids.length}`);
      }

      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#controlBarProgress')).toHaveAttribute('aria-label', 'Plan progress');
      expect(await label()).toBe('');
    });

    test('145. CHK_MAP is derived from the question array and stays in step with the DOM', async ({ page }) => {
      await openChecklist(page);
      const state = await page.evaluate(() => ({
        pairs: CHK_MAP.map(([id, prop]) => [id, prop]),
        idsPresent: CHK_MAP.filter(([id]) => !document.getElementById(id)).map(([id]) => id),
        propsWithoutQuestion: CHK_MAP.filter(([, prop]) => !questions.some(q => q.id === prop)).map(([, p]) => p),
        taggedQuestions: questions.filter(q => q.chk).map(q => q.id),
      }));
      expect(state.pairs.length).toBe(10);
      expect(state.idsPresent).toEqual([]);
      expect(state.propsWithoutQuestion).toEqual([]);
      expect(state.pairs.map(([, prop]) => prop)).toEqual(state.taggedQuestions);
    });

    test('144. Shared question notes come from one source and match in both views', async ({ page }) => {
      await openChecklist(page);
      const slots = await page.evaluate(() =>
        [...document.querySelectorAll('#checklistView [data-note]')].map(el => ({
          key: el.dataset.note,
          rendered: el.textContent.replace(/\s+/g, ' ').trim(),
          source: (window.NOTES || {})[el.dataset.note],
        })));
      expect(slots.length).toBeGreaterThan(8);
      for (const s of slots) {
        expect(s.source, `NOTES is missing an entry for ${s.key}`).toBeTruthy();
        expect(s.rendered).toBe(s.source.replace(/\s+/g, ' ').trim());
      }

      // the wizard renders the same strings, so the two views cannot drift apart
      const inWizard = await page.evaluate(() => {
        const seen = {};
        questions.forEach(q => {
          const t = typeof q.q === 'function' ? q.q() : q.q;
          Object.entries(window.NOTES).forEach(([k, v]) => { if (t.includes(v)) seen[k] = true; });
        });
        return seen;
      });
      for (const key of ['goal', 'visa', 'employment', 'student', 'vehicle', 'services']) {
        expect(inWizard[key], `${key} note not found in any wizard question`).toBe(true);
      }
    });

    test('143. Every question is shown in both views or neither, across goal, region and employment', async ({ page }) => {
      await openChecklist(page);
      const mismatches = await page.evaluate(() => {
        const bad = [];
        for (const reg of ['e', 'w', 's', 'ni', 'out'])
          for (const goal of ['both', 'name', 'gender'])
            for (const emp of ['no', 'needs_update', 'updated'])
              for (const br of ['e', 'w', 's', 'ni']) {
                Object.assign(wizardState, {
                  region: reg === 'out' ? 'e' : reg, regionOutsideUK: reg === 'out' ? 'yes' : 'no',
                  birthRegion: br, birthOutsideUK: 'no',
                  goal, goalParts: goal === 'both' ? ['name', 'gender'] : [goal], employment: emp,
                });
                updateLocks();
                const askedInWizard = questions
                  .filter(q => q.wrap && (!q.cond || q.cond())).map(q => q.wrap).sort();
                const shownInChecklist = questions.filter(q => q.wrap)
                  .filter(q => {
                    const el = document.getElementById(q.wrap);
                    return el && !el.classList.contains('hidden');
                  }).map(q => q.wrap).sort();
                if (JSON.stringify(askedInWizard) !== JSON.stringify(shownInChecklist)) {
                  bad.push({ reg, goal, emp, br, askedInWizard, shownInChecklist });
                }
              }
        return bad;
      });
      expect(mismatches).toEqual([]);

      const missing = await page.evaluate(() =>
        questions.filter(q => q.wrap && !document.getElementById(q.wrap)).map(q => q.wrap));
      expect(missing).toEqual([]);
    });

    test('141. Checklist sections run documents before long-term goals, numbered without gaps', async ({ page }) => {
      await openChecklist(page);
      const labels = () => page.evaluate(() =>
        [...document.querySelectorAll('#checklistView > fieldset')].filter(f => f.offsetParent)
          .map(f => f.querySelector('legend').textContent.trim()));

      let ls = await labels();
      expect(ls.map(l => l.replace(/^\d+\.\s*/, ''))).toEqual(
        ['About you', 'Your current documents', 'Your situation', 'Long-term legal goals']);
      expect(ls.map(l => Number(l.match(/^(\d+)/)[1]))).toEqual([1, 2, 3, 4]);

      await expect(page.locator('#wrapSectionBasics .chk-q').first())
        .toContainText('What do you need to update on your documents?');

      await page.locator('input[name="chkBirthRegion"][value="s"]').check();
      ls = await labels();
      expect(ls.map(l => Number(l.match(/^(\d+)/)[1]))).toEqual([1, 2, 3, 4, 5]);
      expect(ls[3]).toContain('Long-term goals (additional)');
    });

    test('140. The merged visa question derives both legacy fields, and cascades down with the passport', async ({ page }) => {
      await openChecklist(page);
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await page.locator('input[name="chkPassportOpt"][value="updated"]').check();
      await page.locator('#chkVisaUpdated').check();
      expect(await page.evaluate(() => [wizardState.visa, wizardState.citizen, wizardState.visaUpdated]))
        .toEqual(['updated', 'yes', 'yes']);
      await page.getByLabel(/Deed poll or statutory declaration/).uncheck();
      expect(await page.evaluate(() => [wizardState.visa, wizardState.citizen, wizardState.visaUpdated]))
        .toEqual(['needs_update', 'yes', 'no']);
      await page.locator('#chkVisaNone').check();
      expect(await page.evaluate(() => [wizardState.visa, wizardState.citizen, wizardState.visaUpdated]))
        .toEqual(['none', 'no', 'no']);
    });

    test('80. Checklist defaults fail safe: driving licence and passport steps included', async ({ page }) => {
      await openChecklist(page);
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]')).toBeChecked();
      await expect(page.locator('input[name="chkPassportOpt"][value="needs_update"]')).toBeChecked();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByRole('heading', { name: /Identity documents/ })).toBeVisible();
      await expect(page.locator('#planContent')).toContainText('Driving licence');
    });
  });

  test.describe('Progress tracking & plan state', () => {
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
      const planSummaryBox = page.locator('#planSummaryBox');
      const titlesInfoBox = page.locator('#titlesInfoBox');
      await expect(planSummaryBox).toBeVisible();
      await expect(titlesInfoBox).toBeVisible();
      const btns = page.locator('.step-state-btn[data-track-id]');
      const count = await btns.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await btns.nth(i).click();
        await btns.nth(i).click();
      }
      await expect(page.locator('#allDoneBanner')).toBeVisible();
      await expect(planSummaryBox).toBeHidden();
      await expect(titlesInfoBox).toBeHidden();
      await btns.first().click();
      await btns.first().click();
      await expect(page.locator('#allDoneBanner')).toHaveCount(0);
      await expect(planSummaryBox).toBeVisible();
      await expect(titlesInfoBox).toBeVisible();
    });

    test('22. plan-ready class', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('body')).toHaveClass(/plan-ready/);
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('body')).not.toHaveClass(/plan-ready/);
    });

    test('100. Already having a GRC skips the medical/living-proof evidence checklists', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCUpdated').check();
      await page.locator('#chkBirthCert').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('.step-state-btn[data-svc-parent="trk_grc_med"]')).toHaveCount(0);
      await expect(page.locator('.step-state-btn[data-svc-parent="trk_grc_life"]')).toHaveCount(0);
      await expect(page.locator('#planContent')).toContainText('You already have a Gender Recognition Certificate (GRC).');
      await expect(page.locator('#planContent')).toContainText('You already have a GRC. If the General Register Office (GRO) has not already issued you a new birth certificate, contact them to follow up.');
      await expect(page.locator('#planContent')).not.toContainText('Once you receive your GRC, the General Register Office (GRO) will usually contact you');
    });

    test('101. Checking "update birth certificate" does not downgrade an existing "already have a GRC" answer', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCUpdated').check();
      await page.locator('#chkBirthCert').check();
      await expect(page.locator('#chkGRCUpdated')).toBeChecked();
      await page.locator('#chkBirthCert').uncheck();
      await expect(page.locator('#chkGRCUpdated')).toBeChecked();
      await page.locator('#chkBirthCert').check();
      await page.locator('#chkGRCNo').check();
      await expect(page.locator('#chkBirthCert')).not.toBeChecked();
    });

    test('66. GRC medical and living-proof sub-checklists', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const medBtns = page.locator('.step-state-btn[data-svc-parent="trk_grc_med"]');
      const lifeBtns = page.locator('.step-state-btn[data-svc-parent="trk_grc_life"]');
      await expect(medBtns).toHaveCount(2);
      await expect(lifeBtns).toHaveCount(8);
      for (let i = 0; i < 2; i++) {
        await medBtns.nth(i).click();
        await medBtns.nth(i).click();
      }
      await expect(page.locator('[data-track-id="trk_grc_med"]')).toHaveAttribute('data-state', '2');
      await expect(page.locator('[data-track-id="trk_grc_life"]')).toHaveAttribute('data-state', '0');
      await page.evaluate(() => {
        window._shareUrl = null;
        navigator.clipboard.writeText = async (text) => { window._shareUrl = text.split('\n').pop(); };
      });
      await page.getByRole('button', { name: 'Copy link to this plan' }).click();
      await page.waitForFunction(() => window._shareUrl !== null);
      const clip = await page.evaluate(() => window._shareUrl);
      await page.goto(clip);
      const ageCb = page.locator('#ageConfirmShared');
      if (await ageCb.isVisible()) await ageCb.check();
      const discCb = page.locator('#disclaimerConfirmShared');
      if (await discCb.isVisible()) await discCb.check();
      await expect(page.locator('[data-track-id="trk_grcmed_r1"]')).toHaveAttribute('data-state', '2');
      await expect(page.locator('[data-track-id="trk_grc_med"]')).toHaveAttribute('data-state', '2');
    });

    test('132. GRC evidence ids are stable and unique across the plan', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const ids = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-track-id]')).map(e => e.dataset.trackId));
      expect(ids).toEqual(expect.arrayContaining([
        'trk_grcmed_r1', 'trk_grcmed_r2',
        'trk_grclife_p1', 'trk_grclife_p8',
        'trk_grcdocs_sd', 'trk_grcdocs_bc',
      ]));
      expect(ids.filter((v, i, a) => a.indexOf(v) !== i)).toEqual([]);
    });

    test('133. GRC paperwork evidence adapts to whether the plan involves a name change', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('[data-track-id="trk_grcdocs_np"]')).toHaveCount(1);
      await expect(page.locator('[data-track-id="trk_grcdocs_sd"]')).toHaveCount(1);
      await expect(page.locator('[data-track-id="trk_grcdocs_bc"]')).toHaveCount(1);

      await page.locator('#ubMakeChangesBtn').click();
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('[data-track-id="trk_grcdocs_sd"]')).toHaveCount(1);
      await expect(page.locator('[data-track-id="trk_grcdocs_np"]')).toHaveCount(0);
    });

    test('134. Evidence ticks clear with Reset progress and survive a share round trip', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const sd = page.locator('[data-track-id="trk_grcdocs_sd"]');
      await sd.click();
      await sd.click();
      await expect(sd).toHaveAttribute('data-state', '2');

      await page.evaluate(() => {
        window._shareUrl = null;
        navigator.clipboard.writeText = async (text) => { window._shareUrl = text.split('\n').pop(); };
      });
      await page.getByRole('button', { name: 'Copy link to this plan' }).click();
      await page.waitForFunction(() => window._shareUrl !== null);
      const clip = await page.evaluate(() => window._shareUrl);

      page.once('dialog', d => d.accept());
      await page.locator('#resetProgressBtn').click();
      await page.locator('#resetProgressBtn').click();
      await expect(page.locator('[data-track-id="trk_grcdocs_sd"]')).toHaveAttribute('data-state', '0');

      await page.goto(clip);
      const ageCb = page.locator('#ageConfirmShared');
      if (await ageCb.isVisible()) await ageCb.check();
      const discCb = page.locator('#disclaimerConfirmShared');
      if (await discCb.isVisible()) await discCb.check();
      await expect(page.locator('[data-track-id="trk_grcdocs_sd"]')).toHaveAttribute('data-state', '2');
    });
  });

  test.describe('Sharing & links', () => {
    test('15. Shareable link clipboard', async ({ page }) => {
      await openChecklist(page);
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await page.getByLabel(/Yes, I plan to apply for one at some point/).check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
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

    test('63. Shared link gate replaces a plan baked into a saved file', async ({ page }) => {
      await page.evaluate(() => { document.getElementById('planView').classList.remove('hidden'); });
      const shareUrl = await getShareUrl(page, {reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""});
      const qs = new URL(shareUrl).search;
      await page.evaluate((qs) => history.replaceState(null, '', qs), qs);
      await page.evaluate(() => window.onload());
      await expect(page.locator('#welcomeNewDevice')).toBeVisible();
      await expect(page.locator('#planView')).toBeHidden();
    });

    test('16. Share URL age gate guard', async ({ page }) => {
      const url = await getShareUrl(page, {reg:"ew",goal:"both",nonUK:false,pid:false,emp:"no",dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:""});
      await page.evaluate(() => localStorage.clear());
      await page.goto(url);
      await expect(page.locator('#startView')).toBeHidden();
      await expect(page.locator('#welcomeNewDevice')).toBeVisible();
      await expect(page.locator('#planView')).toBeHidden();
      await page.locator('#ageConfirmShared').check();
      await page.locator('#disclaimerConfirmShared').check();
      await expect(page.locator('#planView')).toBeVisible();
    });

    test('17. Outdated schema link', async ({ page }) => {
      const shareData = Buffer.from(JSON.stringify({v:100,reg:"ew",goal:"both",emp:"no"})).toString('base64');
      const url = `${filePath}?p=${shareData}`;
      await page.evaluate(() => localStorage.clear());
      await page.goto(url);
      await page.locator('#ageConfirmShared').check();
      await page.locator('#disclaimerConfirmShared').check();
      await expect(page.locator('#welcomeOutdated')).toBeVisible();
      await expect(page.locator('#welcomeOutdated')).toContainText("we've opened the all-in-one checklist", { ignoreCase: true });
      await expect(page.locator('#planView')).toBeHidden();
      await page.getByRole('button', { name: 'Review my answers' }).click();
      await expect(page.locator('#checklistView')).toBeVisible();
    });

    test('26 & 27. Share link encodes step progress', async ({ page }) => {
      await openChecklist(page);
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const hmrcBtn = page.locator('#ssb_trk_hmrc');
      await hmrcBtn.click();
      await hmrcBtn.click();
      await expect(hmrcBtn).toHaveAttribute('data-state', '2');
      const urlStr = await page.evaluate((fp) => {
        const prg = { hmrc: 2 };
        const ps = { v: window.SCHEMA_VERSION, goal: 'both', reg: 'ew', emp: 'no', prg };
        const url = new URL(fp);
        url.searchParams.set('p', btoa(JSON.stringify(ps)));
        return url.toString();
      }, filePath);
      await page.evaluate(() => localStorage.clear());
      await page.goto(urlStr);
      await page.locator('#ageConfirmShared').check();
      await page.locator('#disclaimerConfirmShared').check();
      await expect(page.locator('#planView')).toBeVisible();
      const restoredBtn = page.locator('#ssb_trk_hmrc');
      await expect(restoredBtn).toHaveAttribute('data-state', '2');
      await expect(restoredBtn).toHaveAttribute('aria-pressed', 'true');
    });

    test('34. Progress bleed prevention', async ({ page }) => {
      const url = await getShareUrl(page, {reg:'ew',goal:'both',nonUK:false,pid:false,emp:'no',dbs:false,stu:false,dp:false,visa:false,nhs:false,dl:false,hmrc:false,pass:false,grc:false,newgp:false,dwp:false,bcn:false,bc:false,bni:false,srv:''});
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('st_trk_deedpoll', '1');
      });
      await page.goto(url);
      await page.locator('#ageConfirmShared').check();
      await page.locator('#disclaimerConfirmShared').check();
      await expect(page.locator('#planView')).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('st_trk_deedpoll'))).toBeNull();
    });

    test('81. Share link round-trips the none-of-these services answer', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcNone').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.evaluate(() => {
        window._shareUrl = null;
        navigator.clipboard.writeText = async (text) => { window._shareUrl = text.split('\n').pop(); };
      });
      await page.getByRole('button', { name: 'Copy link to this plan' }).click();
      await page.waitForFunction(() => window._shareUrl !== null);
      const clip = await page.evaluate(() => window._shareUrl);
      const decoded = decodeState(new URL(clip).searchParams.get('p'));
      expect(decoded.svn).toBe(true);
      await gotoUntil(page, clip, () => page.evaluate(() => wizardState.svcNone === 'yes'));
      expect(await page.evaluate(() => wizardState.svcNone)).toBe('yes');
    });

    test('82. A malformed shared link does not destroy saved progress', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const firstBtn = page.locator('.step-state-btn[data-track-id]').first();
      const trackId = await firstBtn.getAttribute('data-track-id');
      await firstBtn.click();
      await expect(firstBtn).toHaveAttribute('data-state', '1');
      await page.waitForTimeout(200);
      await gotoUntil(page, filePath + '?p=%%%notvalid%%%',
        () => page.locator('#welcomeOutdated').isVisible());
      await expect(page.locator('#welcomeOutdated')).toBeVisible();
      expect(await page.evaluate(id => localStorage.getItem('st_' + id), trackId)).toBe('1');
    });

    test('83. Legacy links map an un-updated licence and passport to needing an update', async ({ page }) => {
      await page.goto(filePath + '?goal=both&dl=false&pass=false');
      await checkAgeGateShared(page);
      await expect(page.locator('#welcomeOutdated')).toBeVisible();
      await page.getByRole('button', { name: 'Review my answers' }).click();
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="needs_update"]')).toBeChecked();
      await expect(page.locator('input[name="chkPassportOpt"][value="needs_update"]')).toBeChecked();
    });

    test('83b. Links encoded with the old region codes (ew/wales/scot) still load correctly', async ({ page }) => {
      const cases = [['wales', 'w'], ['scot', 's'], ['ew', 'e']];
      for (const [legacy, current] of cases) {
        const url = await getShareUrl(page, { goal: 'both', reg: legacy, emp: 'no' });
        await page.evaluate(() => localStorage.clear());
        await page.goto(url);
        await checkAgeGateShared(page);
        await expect(page.locator('#planView')).toBeVisible();
        expect(await page.evaluate(() => wizardState.region)).toBe(current);
      }
    });
  });

  test.describe('Plan generation & content accuracy', () => {
    test('46-52. PLAN_ITEMS rendering tests', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="s"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('Deed poll or statutory declaration');
      await expect(page.locator('#planContent')).toContainText('National Records of Scotland');
    });

    test('127. UK passport gender-marker guidance mentions the letter requesting the change of gender', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const plan = page.locator('#planContent');
      await expect(plan).toContainText('a written letter asking for the change of gender');
      await page.getByText('More information about: UK passport').click();
      await expect(plan).toContainText('you will also need to write a letter asking for the change of gender');
      await expect(plan.locator('a', { hasText: 'Change of name because of a change of gender' })).toBeVisible();
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

    test('64. Credit reference agencies service item', async ({ page }) => {
      await openChecklist(page);
      await expect(page.locator('#chkSvcCRA')).toBeVisible();
      await page.locator('#chkSvcCRA').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByText('Credit reference agencies', { exact: true })).toBeVisible();
      await expect(page.locator('#planContent')).toContainText('Experian, Equifax, or TransUnion');
      await expect(page.locator('#planContent')).toContainText('this only starts the process at the other two');
      await expect(page.locator('#planContent')).toContainText('Notice of Correction');
      await page.evaluate(() => {
        window._shareUrl = null;
        navigator.clipboard.writeText = async (text) => { window._shareUrl = text.split('\n').pop(); };
      });
      await page.getByRole('button', { name: 'Copy link to this plan' }).click();
      await page.waitForFunction(() => window._shareUrl !== null);
      const clip = await page.evaluate(() => window._shareUrl);
      const decoded = decodeState(new URL(clip).searchParams.get('p'));
      expect(decoded.srv.split(',')).toContain('cra');
    });

    test('71. GRC step shows the minimum age note', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('You must be 18 or over to apply for a UK GRC.');
    });

    test('72. Land title register service shows England and Wales guidance by default', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcLandReg').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByText('Land title register', { exact: true })).toBeVisible();
      await expect(page.locator('#svc_detail_landreg')).toContainText('HM Land Registry');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('Registers of Scotland');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('Land & Property Services');
    });

    test('72b. Land title register service switches guidance for Scotland and Northern Ireland', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="s"]').check();
      await page.locator('#chkSvcLandReg').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#svc_detail_landreg')).toContainText('Registers of Scotland');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('form (CNG)');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('Land & Property Services');

      await page.locator('#ubMakeChangesBtn').click();
      await page.locator('input[name="chkRegion"][value="ni"]').check();
      await page.getByRole('button', { name: 'Update my action plan' }).click();
      await expect(page.locator('#svc_detail_landreg')).toContainText('Land & Property Services');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('form (CNG)');
      await expect(page.locator('#svc_detail_landreg')).not.toContainText('Registers of Scotland');
    });

    test('105. Student finance guidance names England/Wales/NI bodies by default, and switches to SAAS for Scotland', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkStudent').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const planContent = page.locator('#planContent');
      await expect(planContent).toContainText('Student Finance England');
      await expect(planContent).toContainText('Student Finance Wales');
      await expect(planContent).toContainText('Student Finance NI');
      await expect(planContent).not.toContainText('SAAS');

      await page.locator('#ubMakeChangesBtn').click();
      await page.locator('input[name="chkRegion"][value="s"]').check();
      await page.getByRole('button', { name: 'Update my action plan' }).click();
      await expect(planContent).toContainText('SAAS');
      await expect(planContent).toContainText('confidential mailbox');
      await expect(planContent).not.toContainText('Student Finance England');
      await expect(planContent).not.toContainText('Student Finance Wales');
      await expect(planContent).not.toContainText('Student Finance NI');
    });

    test('76. HMRC plan item varies by goal; titles tip shows on gender-only plans', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('Gender marker changes');
      await expect(page.locator('#planContent')).not.toContainText('Name changes:');
      await expect(page.locator('#planContent')).toContainText('Did you know about titles?');
      await page.getByRole('button', { name: 'Edit plan' }).click();
      await page.locator('#chkGoalName').check();
      await page.locator('#chkGoalGender').uncheck();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('#planContent')).toContainText('Name changes:');
      await expect(page.locator('#planContent')).not.toContainText('Gender marker changes');
    });

    test('107. "Did you know about titles?" is dismissible and stays dismissed until a fresh plan', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const box = page.locator('#titlesInfoBox');
      await expect(box).toBeAttached();
      await box.locator('summary').click();
      await box.getByRole('button', { name: "Don't show this again" }).click();
      await expect(box).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('titlesInfoDismissed'))).toBe('1');
      await page.getByRole('button', { name: 'Edit plan' }).click();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('#titlesInfoBox')).toHaveCount(0);
      await page.locator('#ubRestartBtn').click();
      await page.getByRole('button', { name: /Confirm/ }).click();
      await page.locator('#dlgDisclaimer').getByRole('button', { name: 'Close' }).click();
      await page.locator('.start-checklist-link').click();
      await page.locator('#checklistAgeConfirm').check();
      await page.locator('#checklistDisclaimerConfirm').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#titlesInfoBox')).toBeAttached();
    });

    test('112. Estimated time and costs box is collapsible and dismissible', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const box = page.locator('#planSummaryBox');
      await expect(box).toBeAttached();
      await expect(box).toHaveAttribute('open', '');
      await box.locator('summary').click();
      await expect(box).not.toHaveAttribute('open', '');
      await box.locator('summary').click();
      await expect(box).toHaveAttribute('open', '');
      await box.getByRole('button', { name: "Don't show this again" }).click();
      await expect(box).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('planSummaryDismissed'))).toBe('1');
      await page.getByRole('button', { name: 'Edit plan' }).click();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('#planSummaryBox')).toHaveCount(0);
    });

    test('77. Services details are grouped only when more than one service is selected', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcBanks').check();
      await page.locator('#chkSvcCouncil').check();
      await page.locator('#chkSvcPension').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent .svc-group')).toHaveCount(3);
      await page.getByRole('button', { name: 'Edit plan' }).click();
      await page.locator('#chkSvcCouncil').uncheck();
      await page.locator('#chkSvcPension').uncheck();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('#planContent .svc-group')).toHaveCount(0);
      await expect(page.locator('#svc_detail_banks')).toBeAttached();
    });

    test('78. Northern Ireland service items are not conflated with Great Britain processes', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="ni"]').check();
      await page.locator('#chkSvcCouncil').check();
      await page.locator('#chkSvcElectoral').check();
      await page.getByLabel(/I have a vehicle registered in my name/).check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#svc_detail_council')).toContainText('Land & Property Services');
      await expect(page.locator('#svc_detail_electoral')).toContainText('Electoral Office for Northern Ireland');
      await expect(page.locator('#svc_detail_electoral')).not.toContainText('open register');
      await expect(page.locator('#planContent')).toContainText('Update your V5C with the DVLA to show your new name.');
    });

    test('78b. Wales falls back to the shared England-and-Wales processes, not a duplicated regional copy', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="w"]').check();
      await page.locator('#chkSvcCouncil').check();
      await page.locator('#chkSvcElectoral').check();
      await page.getByLabel(/I have a vehicle registered in my name/).check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('Update your V5C with the DVLA to show your new name.');
      await expect(page.locator('#planContent')).toContainText('Driving licence');
      await expect(page.locator('#planContent')).not.toContainText('Driving licence (DVA)');
      await expect(page.locator('#svc_detail_council')).not.toContainText('Land & Property Services');
      await expect(page.locator('#svc_detail_electoral')).not.toContainText('Electoral Office for Northern Ireland');
    });

    test('87. Community advice markers are shown in the plan and explained in the usage guide', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="ni"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const marker = page.locator('#planContent .community-note').first();
      await expect(marker).toBeVisible();
      await expect(marker).toHaveAttribute('title', /Community advice/);
      await expect(marker).toHaveAttribute('aria-label', /Community advice/);
      await page.locator('#helpBtn').click();
      await expect(page.locator('#dlgUsage')).toContainText('Community advice');
      await expect(page.locator('#dlgUsage .community-note')).toBeVisible();
    });

    test('79. NI-born users who decline a GRC get an Irish-passport-only final step', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkBirthRegion"][value="ni"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('Legal gender recognition (Irish passport)');
      await expect(page.locator('#planContent')).not.toContainText('Irish passport and GRC');
      await expect(page.locator('#planContent')).toContainText('You have not included a UK Gender Recognition Certificate');
    });

    test('79b. Wales-born and England-born produce identical GRC final-step content, unlike Scotland/NI', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const englandHtml = await page.locator('#planContent').innerHTML();
      await page.getByRole('button', { name: 'Edit plan' }).click();
      await page.locator('input[name="chkBirthRegion"][value="w"]').check();
      await page.locator('#checklistStickyBar button').click();
      const walesHtml = await page.locator('#planContent').innerHTML();
      expect(walesHtml).toBe(englandHtml);
      await expect(page.locator('#planContent')).toContainText('Legal gender recognition (GRC)');
      await expect(page.locator('#planContent')).not.toContainText('Irish passport');
    });

    test('103. NI-born pursuing both the Irish passport and UK GRC routes gets two separate final steps', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="ni"]').check();
      await page.locator('input[name="chkBirthRegion"][value="ni"]').check();
      await page.locator('#chkGRCYes').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();

      const irish = page.locator('.phase[data-phase-key="final_irish"]');
      const grc = page.locator('.phase[data-phase-key="final_grc"]');
      await expect(irish).toHaveCount(1);
      await expect(grc).toHaveCount(1);
      await expect(page.locator('.phase[data-phase-key="final"]')).toHaveCount(0);

      await expect(irish.locator('> .phase-header h3')).toContainText('Legal gender recognition (Irish passport)');
      await expect(grc.locator('> .phase-header h3')).toContainText('Legal gender recognition (GRC)');
      await expect(irish.locator('.badge-time')).toContainText('Irish passport: 2+ years of name-use proof');
      await expect(grc.locator('.badge-time')).toContainText('Long-term (2+ years)');

      await expect(irish).toContainText('Irish passport (Good Friday Agreement route)');
      await expect(grc).toContainText('UK Gender Recognition Certificate (GRC)');
      await expect(grc).toContainText('Living proof for GRC');
      await expect(grc.locator('.step-state-btn[data-svc-parent="trk_grc_med"]')).toHaveCount(2);
      await expect(grc.locator('.step-state-btn[data-svc-parent="trk_grc_life"]')).toHaveCount(8);

      // each route stands on its own, so neither points at the other
      await expect(irish).not.toContainText('described first below');
      await expect(grc).not.toContainText('described below alongside');
    });

    test('104. NI-born already having a GRC with no birth-cert follow-up gets a single, unsplit final step', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkBirthRegion"][value="ni"]').check();
      await page.locator('#chkGRCUpdated').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const finalPhase = page.locator('.phase[data-phase-key="final"]');
      await expect(finalPhase).toHaveCount(1);
      await expect(page.locator('.phase[data-phase-key="final_irish"]')).toHaveCount(0);
      await expect(finalPhase).toContainText('Irish passport (Good Friday Agreement route)');
    });

    const NOTE_OPENER = 'Updating your details with your GP may not update them with other services you use.';
    const NOTE_ACTION = 'Tell any service that is treating you, or that you are waiting to see, yourself.';

    async function expectRecordNote(page, stepId, number) {
      await expect(page.locator(stepId)).toBeAttached();
      const plan = page.locator('#planContent');
      await expect(plan).toContainText(NOTE_OPENER);
      await expect(plan).toContainText(number);
      await expect(plan).toContainText(NOTE_ACTION);
    }

    async function switchRegion(page, region) {
      await page.locator('#ubMakeChangesBtn').click();
      await page.locator(`input[name="chkRegion"][value="${region}"]`).check();
      await page.getByRole('button', { name: 'Update my action plan' }).click();
    }

    test('88. The existing health record item carries the other-services note in every nation', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expectRecordNote(page, '#ssb_trk_nhs', 'a new NHS number');
      await switchRegion(page, 'w');
      await expectRecordNote(page, '#ssb_trk_nhs', 'a new NHS number');
      await switchRegion(page, 's');
      await expectRecordNote(page, '#ssb_trk_nhs', 'a new CHI number');
      await switchRegion(page, 'ni');
      await expectRecordNote(page, '#ssb_trk_nhs', 'a new Health and Care Number');
    });

    test('88b. The new GP item carries the other-services note in every nation', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkNewGP').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expectRecordNote(page, '#ssb_trk_newgp', 'a new NHS number');
      await switchRegion(page, 'w');
      await expectRecordNote(page, '#ssb_trk_newgp', 'a new NHS number');
      await switchRegion(page, 's');
      await expectRecordNote(page, '#ssb_trk_newgp', 'a new CHI number');
      await switchRegion(page, 'ni');
      await expectRecordNote(page, '#ssb_trk_newgp', 'a new Health and Care Number');
    });

    test('89. The gender service waiting list note is England only, and appears once', async ({ page }) => {
      const referralDate = 'Your place on the list is set by your original referral date.';
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('National Adult Gender Referral Support Service');
      expect(await page.locator('#planContent').getByText(referralDate).count()).toBe(1);
      await switchRegion(page, 'w');
      await expect(page.locator('#planContent')).not.toContainText('National Adult Gender Referral Support Service');
      await switchRegion(page, 's');
      await expect(page.locator('#planContent')).not.toContainText('National Adult Gender Referral Support Service');
      await switchRegion(page, 'ni');
      await expect(page.locator('#planContent')).not.toContainText('National Adult Gender Referral Support Service');
    });

    test('89b. The Wales gender service waiting list note is Wales only, and is distinct from the England note', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="w"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('Welsh Gender Service');
      await expect(page.locator('#planContent')).not.toContainText('National Adult Gender Referral Support Service');
      await switchRegion(page, 'e');
      await expect(page.locator('#planContent')).not.toContainText('Welsh Gender Service');
      await switchRegion(page, 's');
      await expect(page.locator('#planContent')).not.toContainText('Welsh Gender Service');
      await switchRegion(page, 'ni');
      await expect(page.locator('#planContent')).not.toContainText('Welsh Gender Service');
    });

    test('90. Driving licence and bank guidance no longer point users into the DVLA new-name-evidence deadlock', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcBanks').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const plan = page.locator('#planContent');
      await expect(plan).not.toContainText('driving licence updated first');
      await expect(plan).toContainText('Evidence needed');
      await expect(plan).toContainText('dated after your deed poll or statutory declaration');
      await expect(plan).toContainText('mobile, broadband, or streaming bill');
      await expect(plan).toContainText('a recent bill or letter that already shows your new name is often accepted instead');
    });

    test('92. DVLA gender-only variant does not show name-change evidence text', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await expect(page.locator('#chkGoalGender')).toBeChecked();
      await page.locator('#chkDrivingLicenceNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const plan = page.locator('#planContent');
      await expect(plan).toContainText('The DVLA accepts a deed poll, a statutory declaration, or a GRC as evidence for a gender marker change');
      await expect(plan).toContainText('A medical letter is not needed');
      await expect(plan).not.toContainText('one other document that already shows your new name');
      await expect(plan).not.toContainText('mobile, broadband, or streaming bill');
    });

    test('139. A gender-only plan that asks for a name-change document also gives a step for getting one', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await expect(page.locator('#wrapDeedPoll')).toBeVisible();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const text = await page.locator('#planContent').innerText();
      if (/deed poll|statutory declaration/i.test(text)) {
        await expect(page.locator('#planContent [data-item-id="trk_deedpoll"]')).toHaveCount(1);
      }
    });
  });

  test.describe('Plan reordering', () => {
    test('126. Phase item lists carry an explicit list/listitem role, restored after list-style: none', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workUl = page.locator('.phase[data-phase-key="work"] > ul');
      await expect(workUl).toHaveAttribute('role', 'list');
      await expect(workUl.locator('> li.plan-item').first()).toHaveAttribute('role', 'listitem');
    });

    test('113. First phase and first item have no further "up" to go; last phase and last item have no further "down"', async ({ page }) => {
      await openMultiPhasePlan(page);
      const firstPhase = page.locator('.phase[data-phase-key="deedpoll"]');
      const lastPhase = page.locator('.phase[data-phase-key="documents"]');
      await expect(firstPhase.locator('.phase-move-group .tmpl-move-up')).toBeDisabled();
      await expect(lastPhase.locator('.phase-move-group .tmpl-move-down')).toBeDisabled();
      const firstItem = firstPhase.locator('li.plan-item').first();
      await expect(firstItem.locator('.item-move-group .tmpl-move-up')).toBeDisabled();
      const lastItemOfLastPhase = lastPhase.locator('li.plan-item').last();
      await expect(lastItemOfLastPhase.locator('.item-move-group .tmpl-move-down')).toBeDisabled();
    });

    test('114. Moving an item down swaps it with its sibling within the same phase', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const items = workPhase.locator('li.plan-item');
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_dbs');
      await items.nth(0).locator('.item-move-group .tmpl-move-down').click();
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_hr');
    });

    test('115. The first item of any phase (not just the first phase) has no further "up" to go', async ({ page }) => {
      await openMultiPhasePlan(page);
      const civicPhase = page.locator('.phase[data-phase-key="civic"]');
      await expect(civicPhase.locator('li.plan-item')).toHaveCount(2);
      const civicFirstItem = civicPhase.locator('li.plan-item').first();
      await expect(civicFirstItem.locator('.item-move-group')).toBeVisible();
      await expect(civicFirstItem.locator('.item-move-group .tmpl-move-up')).toBeDisabled();
      await expect(civicFirstItem.locator('.item-move-group .tmpl-move-up')).toHaveAttribute('aria-label', /already first/);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      await workPhase.locator('li.plan-item').first().locator('.item-move-group .tmpl-move-up').evaluate(btn => btn.disabled = false);
      await workPhase.locator('li.plan-item').first().locator('.item-move-group .tmpl-move-up').click();
      const healthPhase = page.locator('.phase[data-phase-key="health"]');
      await expect(healthPhase.locator('li.plan-item')).toHaveCount(1);
      await expect(workPhase.locator('li.plan-item')).toHaveCount(2);
      await expect(workPhase.locator('li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_hr');
    });

    test('116. The last item of any phase (not just the last phase) has no further "down" to go', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const civicPhase = page.locator('.phase[data-phase-key="civic"]');
      const workLastItem = workPhase.locator('li.plan-item').last();
      await expect(workLastItem.locator('.item-move-group .tmpl-move-down')).toBeDisabled();
      await expect(workLastItem.locator('.item-move-group .tmpl-move-down')).toHaveAttribute('aria-label', /already last/);
      await workLastItem.locator('.item-move-group .tmpl-move-down').evaluate(btn => btn.disabled = false);
      await workLastItem.locator('.item-move-group .tmpl-move-down').click();
      await expect(civicPhase.locator('li.plan-item').first()).not.toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(workPhase.locator('li.plan-item')).toHaveCount(2);
      await expect(workPhase.locator('li.plan-item').last()).toHaveAttribute('data-item-id', 'trk_dbs');
    });

    test('117. Moving a phase up reorders the phases and renumbers the Step headers', async ({ page }) => {
      await openMultiPhasePlan(page);
      const civicPhase = page.locator('.phase[data-phase-key="civic"]');
      await expect(civicPhase.locator('> .phase-header h3')).toContainText('Step 4:');
      await civicPhase.locator('.phase-move-group .tmpl-move-up').click();
      const phases = page.locator('#planContent > .phase[data-phase-key]');
      await expect(phases.nth(2)).toHaveAttribute('data-phase-key', 'civic');
      await expect(phases.nth(3)).toHaveAttribute('data-phase-key', 'work');
      await expect(civicPhase.locator('> .phase-header h3')).toContainText('Step 3:');
      await expect(page.locator('.phase[data-phase-key="work"] > .phase-header h3')).toContainText('Step 4:');
    });

    test('118. A custom order persists across a reload, and is announced as reset if answers change what the plan contains', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      await workPhase.locator('li.plan-item').first().locator('.item-move-group .tmpl-move-down').click();
      await expect(workPhase.locator('li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_dbs');
      await reloadUntil(page, () => page.locator('#welcomeBackView').isVisible());
      await page.getByRole('button', { name: 'Continue my plan' }).click();
      await expect(page.locator('.phase[data-phase-key="work"] li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_dbs');
      await page.locator('#ubMakeChangesBtn').click();
      await page.locator('#chkDBS').uncheck();
      await page.locator('#checklistStickyBar button').click();
      await expect(page.locator('#liveRegion')).toContainText('Your custom order was reset');
      await expect(page.locator('.phase[data-phase-key="work"] li.plan-item')).toHaveCount(1);
      await expect(page.locator('.phase[data-phase-key="work"] li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_hr');
    });

    test('119. A move button is keyboard-operable', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const items = workPhase.locator('li.plan-item');
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_dbs');
      const downBtn = items.nth(0).locator('.item-move-group .tmpl-move-down');
      await downBtn.focus();
      await page.keyboard.press('Enter');
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('120. A single-item phase\'s only item has its move/drag controls hidden, since it can\'t leave its phase', async ({ page }) => {
      await openMultiPhasePlan(page);
      const deedpollPhase = page.locator('.phase[data-phase-key="deedpoll"]');
      await expect(deedpollPhase.locator('li.plan-item')).toHaveCount(1);
      const onlyItem = deedpollPhase.locator('li.plan-item').first();
      await expect(onlyItem.locator('.item-move-group')).toBeHidden();
      await expect(deedpollPhase.locator('> .phase-header .phase-move-group')).toBeVisible();
      await onlyItem.locator('.item-move-group').evaluate(g => g.classList.remove('hidden'));
      await onlyItem.locator('.item-move-group .tmpl-move-down').evaluate(btn => btn.disabled = false);
      await onlyItem.locator('.item-move-group .tmpl-move-down').click();
      await expect(deedpollPhase).toBeVisible();
      await expect(deedpollPhase.locator('li.plan-item')).toHaveCount(1);
      await expect(onlyItem).toHaveAttribute('data-item-id', 'trk_deedpoll');
    });

    test('121. "Reset order" only appears once something has been reordered, and puts the plan back to default', async ({ page }) => {
      await openMultiPhasePlan(page);
      const resetBtn = page.locator('#resetOrderBtn');
      await expect(resetBtn).toBeHidden();
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      await workPhase.locator('li.plan-item').first().locator('.item-move-group .tmpl-move-down').click();
      await expect(workPhase.locator('li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(resetBtn).toBeVisible();
      await resetBtn.click();
      await expect(resetBtn).toHaveText(/Confirm/);
      await resetBtn.click();
      await expect(page.locator('.phase[data-phase-key="work"] li.plan-item').first()).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(resetBtn).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('planOrder'))).toBeNull();
    });

    test('122. A shared link\'s custom order round-trips through loadUrlParams', async ({ page }) => {
      const urlStr = await page.evaluate((fp) => {
        const ps = {
          v: window.SCHEMA_VERSION, goal: 'both', reg: 'e', emp: 'needs_update', dbs: true,
          ord: { ph: ['deedpoll', 'work', 'health', 'civic', 'documents'], it: { work: ['dbs', 'hr'] } },
        };
        const url = new URL(fp);
        url.searchParams.set('p', btoa(JSON.stringify(ps)));
        return url.toString();
      }, filePath);
      await page.evaluate(() => localStorage.clear());
      await page.goto(urlStr);
      await page.locator('#ageConfirmShared').check();
      await page.locator('#disclaimerConfirmShared').check();
      await expect(page.locator('#planView')).toBeVisible();
      const phases = page.locator('#planContent > .phase[data-phase-key]');
      await expect(phases.nth(1)).toHaveAttribute('data-phase-key', 'work');
      await expect(phases.nth(2)).toHaveAttribute('data-phase-key', 'health');
      const workItems = page.locator('.phase[data-phase-key="work"] li.plan-item');
      await expect(workItems.first()).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(workItems.last()).toHaveAttribute('data-item-id', 'trk_hr');
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('planOrder')).fingerprint)).toBeTruthy();
    });

    test('123. Dragging an item\'s handle reorders it via pointer events', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const items = workPhase.locator('li.plan-item');
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_dbs');
      await items.nth(1).scrollIntoViewIfNeeded();
      const handleBox = await items.nth(0).locator('.item-drag-handle').boundingBox();
      const dbsBox = await items.nth(1).boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dbsBox.x + dbsBox.width / 2, dbsBox.y + dbsBox.height - 5, { steps: 5 });
      await page.mouse.up();
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_hr');
      expect(await page.evaluate(() => localStorage.getItem('planOrder'))).not.toBeNull();
    });

    test('123b. Dragging an item\'s handle past its phase\'s boundary does not move it into another phase', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const civicPhase = page.locator('.phase[data-phase-key="civic"]');
      const workItems = workPhase.locator('li.plan-item');
      await expect(workItems).toHaveCount(2);
      const lastItem = workItems.last();
      await lastItem.scrollIntoViewIfNeeded();
      const handleBox = await lastItem.locator('.item-drag-handle').boundingBox();
      const civicBox = await civicPhase.boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(civicBox.x + civicBox.width / 2, civicBox.y + civicBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await expect(workPhase.locator('li.plan-item')).toHaveCount(2);
      await expect(workPhase.locator('li.plan-item').last()).toHaveAttribute('data-item-id', 'trk_dbs');
      await expect(civicPhase.locator('li.plan-item[data-item-id="trk_dbs"]')).toHaveCount(0);
    });

    test('124. Dragging a phase\'s handle reorders whole phases via pointer events', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const civicPhase = page.locator('.phase[data-phase-key="civic"]');
      await workPhase.scrollIntoViewIfNeeded();
      const handleBox = await civicPhase.locator('.phase-move-group .item-drag-handle').boundingBox();
      const workBox = await workPhase.boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(workBox.x + workBox.width / 2, workBox.y + workBox.height / 4, { steps: 5 });
      await page.mouse.up();
      const phases = page.locator('#planContent > .phase[data-phase-key]');
      await expect(phases.nth(2)).toHaveAttribute('data-phase-key', 'civic');
      await expect(phases.nth(3)).toHaveAttribute('data-phase-key', 'work');
    });

    test('125. A short pointer wiggle on a drag handle, below the move threshold, does not reorder anything', async ({ page }) => {
      await openMultiPhasePlan(page);
      const workPhase = page.locator('.phase[data-phase-key="work"]');
      const items = workPhase.locator('li.plan-item');
      await items.nth(0).scrollIntoViewIfNeeded();
      const handleBox = await items.nth(0).locator('.item-drag-handle').boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 1);
      await page.mouse.up();
      await expect(items.nth(0)).toHaveAttribute('data-item-id', 'trk_hr');
      await expect(items.nth(1)).toHaveAttribute('data-item-id', 'trk_dbs');
      expect(await page.evaluate(() => localStorage.getItem('planOrder'))).toBeNull();
    });
  });

  test.describe('Accessibility & layout', () => {
    test('18. Help modal', async ({ page }) => {
      const usageLink = page.getByRole('link', { name: 'Usage guide' });
      const dlg = page.locator('#dlgUsage');
      await expect(dlg).toBeHidden();
      await usageLink.click();
      await expect(dlg).toBeVisible();
      await dlg.getByRole('button', { name: 'Close' }).click();
      await expect(dlg).toBeHidden();
      await usageLink.click();
      await page.mouse.click(5, 5);
      await expect(dlg).toBeHidden();
    });

    test('19. Keyboard Escape navigation', async ({ page }) => {
      const dlg = page.locator('#dlgUsage');
      await page.getByRole('link', { name: 'Usage guide' }).click();
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await expect(page).not.toHaveURL(/google\.(co\.uk|com)|chrome-error:/);
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/google\.(co\.uk|com)|chrome-error:/);
    });

    test('135. Two slow Escape presses do not trigger the quick exit', async ({ page }) => {
      await openWizard(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await expect(page).not.toHaveURL(/google\.(co\.uk|com)|chrome-error:/);
      await expect(page.locator('#wizardView')).toBeVisible();
    });

    test('19b. Keyboard ? shortcut opens help modal', async ({ page }) => {
      const dlg = page.locator('#dlgUsage');
      await expect(dlg).toBeHidden();
      await page.keyboard.press('?');
      await expect(dlg).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();

      await openChecklist(page);
      await page.locator('#chkGoalName').focus();
      await page.keyboard.press('?');
      await expect(dlg).toBeVisible();
    });

    test('20. Panic button', async ({ page }) => {
      await checkAgeGate(page);
      await page.getByRole('button', { name: 'Quick Exit' }).click();
      await expect(page).toHaveURL(/google\.(co\.uk|com)|chrome-error:/);
    });

    test('21. Theme toggle', async ({ page }) => {
      const themeBtn = page.getByRole('button', { name: /Theme: switch to (light|dark) mode/ });
      await themeBtn.click();
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(['dark', 'light']).toContain(theme);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).not.toBeNull();
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

    test('108. Step-state button aria-pressed is correct across all four cycle states', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const btn = page.locator('.step-state-btn[data-track-id]').first();
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    test('109. Warning banners use role="alert"', async ({ page }) => {
      await expect(page.locator('#saveWarnBanner')).toHaveAttribute('role', 'alert');
      await openWizard(page);
      await expect(page.locator('#wizardWarning')).toHaveAttribute('role', 'alert');
      await page.locator('#cbHomeBtn').click();
      await page.locator('.start-checklist-link').click();
      await expect(page.locator('#checklistWarning')).toHaveAttribute('role', 'alert');
      await expect(page.locator('#checklistGoalWarning')).toHaveAttribute('role', 'alert');
    });

    test('106. Focus mode announces per-phase completion once, not on every refresh', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#focusToggleBtn').click();
      const workPhase = page.locator('.phase', { hasText: 'Work and qualifications' });
      const workBtn = workPhase.locator('.step-state-btn[data-track-id]').first();
      await workBtn.click();
      await workBtn.click();
      await expect(workPhase).toHaveClass(/collapsed-phase/);
      await expect(page.locator('#liveRegion')).toContainText('Work and qualifications complete and hidden by Focus mode.');
      const deedPhase = page.locator('.phase', { hasText: 'Your name-change document' });
      await expect(deedPhase).not.toHaveClass(/collapsed-phase/);
      await page.evaluate(() => { document.getElementById('liveRegion').textContent = ''; window.refreshPlan(); });
      await page.waitForTimeout(250);
      await expect(page.locator('#liveRegion')).not.toContainText('Work and qualifications complete');
    });

    test('128. Focus mode defers hiding a completed step, then hides it', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#focusToggleBtn').click();
      const workPhase = page.locator('.phase', { hasText: 'Work and qualifications' });
      const workItem = workPhase.locator('li.plan-item').first();
      const workBtn = workPhase.locator('.step-state-btn[data-track-id]').first();
      await workBtn.click();
      await workBtn.click();
      expect(await workItem.evaluate(el => el.classList.contains('collapsed-step'))).toBe(false);
      await expect(workItem).toHaveClass(/collapsed-step/);
    });

    test('129. A click inside the grace period cancels the hide', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#focusToggleBtn').click();
      const workPhase = page.locator('.phase', { hasText: 'Work and qualifications' });
      const workItem = workPhase.locator('li.plan-item').first();
      const workBtn = workPhase.locator('.step-state-btn[data-track-id]').first();
      await workBtn.click();
      await workBtn.click();
      await workBtn.click();
      await expect(workBtn).toHaveAttribute('data-state', '3');
      await workBtn.click();
      await page.waitForTimeout(2600);
      await expect(workBtn).toHaveAttribute('data-state', '0');
      await expect(workItem).not.toHaveClass(/collapsed-step/);
      await expect(workPhase).not.toHaveClass(/collapsed-phase/);
    });

    test('130. A phase cancelled mid-grace can still announce when completed again', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#focusToggleBtn').click();
      const workPhase = page.locator('.phase', { hasText: 'Work and qualifications' });
      const workBtn = workPhase.locator('.step-state-btn[data-track-id]').first();
      await workBtn.click();
      await workBtn.click();
      await workBtn.click();
      await workBtn.click();
      await page.evaluate(() => { document.getElementById('liveRegion').textContent = ''; });
      await workBtn.click();
      await workBtn.click();
      await expect(page.locator('#liveRegion')).toContainText('Work and qualifications complete and hidden by Focus mode.');
      await expect(workPhase).toHaveClass(/collapsed-phase/);
    });

    test('131. The grace period still applies under prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openChecklist(page);
      await page.locator('#chkEmployedNeeds').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await page.locator('#focusToggleBtn').click();
      const workPhase = page.locator('.phase', { hasText: 'Work and qualifications' });
      const workItem = workPhase.locator('li.plan-item').first();
      const workBtn = workPhase.locator('.step-state-btn[data-track-id]').first();
      await workBtn.click();
      await workBtn.click();
      expect(await workItem.evaluate(el => el.classList.contains('collapsed-step'))).toBe(false);
      await expect(workItem).toHaveClass(/collapsed-step/);
    });

    test('35-40. Accessibility / WCAG checks', async ({ page }) => {
      await page.getByRole('link', { name: 'Usage guide' }).click();
      const table = page.locator('.shortcut-table');
      await expect(table.locator('thead th[scope="col"]')).toHaveCount(2);
      const controlBar = page.locator('#controlBar');
      await expect(controlBar).toHaveAttribute('role', 'region');
      await page.keyboard.press('Escape');
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#ubMakeChangesBtn')).toHaveAttribute('aria-label', 'Edit plan');
      await expect(page.locator('svg.cc-icon[role="img"]')).toHaveCount(4);
    });

    test('55. About dialog', async ({ page }) => {
      const dlg = page.locator('#dlgAbout');
      await expect(dlg).toBeHidden();
      await page.getByRole('link', { name: 'About' }).click();
      await expect(dlg).toBeVisible();
      const headings = ['What is this?', 'Who is it for?', 'Is my information safe?', 'Can I use this offline?', 'How does it work?', 'Step-by-step or checklist?', 'Is this legal advice?', 'How do I save or share my plan?'];
      for (const h of headings) {
        await expect(dlg.getByRole('heading', { name: h })).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
    });

    test('56. Footer link order', async ({ page }) => {
      const links = page.locator('.footer-links a');
      await expect(links).toHaveCount(5);
      await expect(links.nth(0)).toHaveText('About');
      await expect(links.nth(1)).toHaveText('Privacy');
      await expect(links.nth(2)).toHaveText('Usage guide');
      await expect(links.nth(3)).toHaveText('Support & feedback');
      await expect(links.nth(4)).toHaveText('Disclaimer');
    });

    test('57. Help toolbar button', async ({ page }) => {
      const dlg = page.locator('#dlgUsage');
      await expect(dlg).toBeHidden();
      await page.locator('#helpBtn').click();
      await expect(dlg).toBeVisible();
    });

    test('60. Mobile toolbar layout: one row for wizard, two rows for plan and start views', async ({ page }) => {
      await page.setViewportSize({ width: 412, height: 915 });

      const leftTopStart = await page.locator('#cbLeftGroup').evaluate(el => el.getBoundingClientRect().top);
      const rightTopStart = await page.locator('#cbRightGroup').evaluate(el => el.getBoundingClientRect().top);
      expect(leftTopStart).toBeGreaterThan(rightTopStart + 5);
      const leftBoxStart = await page.locator('#cbLeftGroup').evaluate(el => el.getBoundingClientRect());
      const aboutBoxStart = await page.locator('#cbAboutBtn').evaluate(el => el.getBoundingClientRect());
      expect(aboutBoxStart.left).toBeGreaterThan(leftBoxStart.left + 5);

      await openWizard(page);
      const leftTopWizard = await page.locator('#cbLeftGroup').evaluate(el => el.getBoundingClientRect().top);
      const rightTopWizard = await page.locator('#cbRightGroup').evaluate(el => el.getBoundingClientRect().top);
      expect(Math.abs(leftTopWizard - rightTopWizard)).toBeLessThan(5);

      await page.goto(filePath);
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const leftTopPlan = await page.locator('#cbLeftGroup').evaluate(el => el.getBoundingClientRect().top);
      const rightTopPlan = await page.locator('#cbRightGroup').evaluate(el => el.getBoundingClientRect().top);
      expect(leftTopPlan).toBeGreaterThan(rightTopPlan + 5);
    });

    test('95. Toolbar roving tabindex follows visual row order on mobile, not just horizontal position', async ({ page }) => {
      await page.setViewportSize({ width: 412, height: 915 });
      const ids = await page.evaluate(() => window.getToolbarButtons().map(b => b.id));
      const rowOneIds = ['helpBtn', 'themeToggleBtn', 'panicBtn'];
      const rowTwoIds = ['cbAboutBtn', 'cbUsageBtn'];
      const lastRowOneIdx = Math.max(...rowOneIds.map(id => ids.indexOf(id)));
      const firstRowTwoIdx = Math.min(...rowTwoIds.map(id => ids.indexOf(id)));
      expect(ids.indexOf('helpBtn')).toBeGreaterThanOrEqual(0);
      expect(firstRowTwoIdx).toBeGreaterThanOrEqual(0);
      expect(lastRowOneIdx).toBeLessThan(firstRowTwoIdx);

      await page.locator('#helpBtn').focus();
      const visited = ['helpBtn'];
      for (let i = 0; i < ids.length - 1; i++) {
        await page.keyboard.press('ArrowRight');
        visited.push(await page.evaluate(() => document.activeElement.id));
      }
      const startIdx = ids.indexOf('helpBtn');
      const expectedOrder = ids.slice(startIdx).concat(ids.slice(0, startIdx));
      expect(visited).toEqual(expectedOrder);
    });

    test('96. A toolbar button keeps tabindex 0 after leaving and returning to the start view', async ({ page }) => {
      await openWizard(page);
      await page.getByRole('button', { name: 'Back to start' }).click();
      await expect(page.locator('#startView')).toBeVisible();
      const zeroCount = await page.locator('#controlBarCard .ub-icon-btn[tabindex="0"]').count();
      expect(zeroCount).toBe(1);
    });

    test('97. Tab from outside the toolbar lands on the tabindex-0 button, not a -1 one', async ({ page }) => {
      const zeroBtnId = await page.locator('#controlBarCard .ub-icon-btn[tabindex="0"]').first().getAttribute('id');
      await page.locator('.skip-link').focus();
      await page.keyboard.press('Tab');
      const focusedId = await page.evaluate(() => document.activeElement.id);
      expect(focusedId).toBe(zeroBtnId);
    });

    test('136. Printing renders the guidance inside collapsed details, not just titles', async ({ page }) => {
      await openMultiPhasePlan(page);
      const screenWords = await page.evaluate(() => document.body.innerText.split(/\s+/).length);
      await page.emulateMedia({ media: 'print' });
      const printWords = await page.evaluate(() => document.body.innerText.split(/\s+/).length);
      expect(printWords).toBeGreaterThan(screenWords * 1.5);
      const probe = await page.evaluate(() => {
        const d = [...document.querySelectorAll('#planContent details.tmpl-details')].find(x => !x.open);
        return d ? d.querySelector('.details-body').textContent.trim().split(/\s+/).slice(3, 11).join(' ') : null;
      });
      expect(probe).toBeTruthy();
      expect(await page.evaluate(() => document.body.innerText)).toContain(probe);
      await page.emulateMedia({ media: 'screen' });
      const stillOpen = await page.locator('#planContent details[open]').count();
      expect(stillOpen).toBeLessThanOrEqual(1);
    });

    test('70. Print-only disclaimer footer shows on the plan, hidden on screen', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planView')).toBeVisible();
      const footer = page.locator('#planPrintFooter');
      await expect(footer).toBeHidden();
      const expectedDate = await page.evaluate(() => {
        const now = new Date();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      });
      await expect(page.locator('#planGeneratedDate')).toHaveText(expectedDate);
      await page.emulateMedia({ media: 'print' });
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('General guidance only, not legal advice.');
      await expect(footer).toContainText(expectedDate);
      await page.emulateMedia({ media: 'screen' });
      await expect(footer).toBeHidden();
    });

    test('84. A phase with many expanded services is not clipped by its collapse-animation max-height', async ({ page }) => {
      await openChecklist(page);
      for (const id of ['#chkSvcBanks','#chkSvcInsurance','#chkSvcCouncil','#chkSvcUtilities','#chkSvcElectoral','#chkSvcCRA','#chkSvcLandlord','#chkSvcDentist','#chkSvcPension','#chkSvcMortgage','#chkSvcMobile','#chkSvcProfBody','#chkSvcLandReg']) {
        await page.locator(id).check();
      }
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const summary = page.getByText('More information about: Services to update');
      await summary.click();
      await expect(page.locator('#svc_detail_landreg')).toBeAttached();
      const phase = page.locator('#svc_detail_landreg').locator('xpath=ancestor::div[contains(@class,"phase")]');
      const [scrollHeight, clientHeight] = await phase.evaluate(el => [el.scrollHeight, el.clientHeight]);
      expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1);
    });
  });

  test.describe('Content integrity', () => {




    test('146. Every data-action resolves to a handler, and no inline event handlers remain', async ({ page }) => {
      const source = fs.readFileSync(filePath.replace(/^file:\/\//, ''), 'utf8');
      const inline = source.match(/\son(click|change|input|submit|keydown|keyup)\s*=/gi) || [];
      expect(inline).toEqual([]);

      const before = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[data-action]')];
        return {
          total: els.length,
          unresolved: [...new Set(els.map(el => el.dataset.action))]
            .filter(a => typeof window.ACTIONS[a] !== 'function'),
        };
      });
      expect(before.total).toBeGreaterThan(50);
      expect(before.unresolved).toEqual([]);

      await openMultiPhasePlan(page);

      const after = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[data-action]')];
        return {
          total: els.length,
          unresolved: [...new Set(els.map(el => el.dataset.action))]
            .filter(a => typeof window.ACTIONS[a] !== 'function'),
        };
      });
      expect(after.total).toBeGreaterThan(before.total);
      expect(after.unresolved).toEqual([]);
    });

    test('93. Plan item and service content matches the committed snapshot', async ({ page }) => {
      const { extractContentMap } = require('./content-snapshot-lib');
      const expected = JSON.parse(fs.readFileSync(path.resolve('content-snapshots.json'), 'utf8'));
      const actual = await page.evaluate(extractContentMap);
      expect(actual).toEqual(expected);
    });

    test('98. Checklist inputs reflect wizardState for every CHK_MAP field and tri-state document radios', async ({ page }) => {
      await openChecklist(page);
      const chkMap = await page.evaluate(() => window.CHK_MAP);
      for (const [id, prop] of chkMap) {
        for (const val of ['yes', 'no']) {
          await page.evaluate(({ prop, val }) => {
            window.wizardState[prop] = val;
            window.renderChecklist();
          }, { prop, val });
          const checked = await page.locator('#' + id).isChecked();
          expect(checked, `#${id} (wizardState.${prop}) should be ${val === 'yes'} when set to '${val}'`).toBe(val === 'yes');
        }
      }
      for (const [prop, name] of [['driving', 'chkDrivingLicenceOpt'], ['passport', 'chkPassportOpt']]) {
        for (const val of ['needs_update', 'updated', 'none']) {
          await page.evaluate(({ prop, val }) => {
            window.wizardState[prop] = val;
            window.renderChecklist();
          }, { prop, val });
          const checkedVal = await page.locator(`input[name="${name}"]:checked`).getAttribute('value');
          expect(checkedVal, `${name} should show '${val}' when wizardState.${prop} is '${val}'`).toBe(val);
        }
      }
      for (const val of ['no', 'yes', 'updated']) {
        await page.evaluate((val) => {
          window.wizardState.grc = val;
          window.wizardState.birthCert = 'no';
          window.renderChecklist();
        }, val);
        const checkedVal = await page.locator('input[name="chkGRCOpt"]:checked').getAttribute('value');
        expect(checkedVal, `chkGRCOpt should show '${val}' when wizardState.grc is '${val}'`).toBe(val);
      }
      await page.evaluate(() => { window.wizardState.employment = 'needs_update'; window.renderChecklist(); });
      await expect(page.locator('#chkEmployedNeeds')).toBeChecked();
      await page.evaluate(() => { window.wizardState.employment = 'updated'; window.renderChecklist(); });
      await expect(page.locator('#chkEmployedUpdated')).toBeChecked();
      await page.evaluate(() => { window.wizardState.employment = 'no'; window.renderChecklist(); });
      await expect(page.locator('#chkEmployedNo')).toBeChecked();
    });
  });

});
