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

// Chromium's localStorage backend for file:// origins occasionally hasn't
// finished committing a write before a reload's navigation tears down the
// old document, especially under back-to-back automated test load (this
// doesn't happen in normal browser use). Retry the reload a few times so
// tests aren't flaky on this environment quirk.
async function reloadUntil(page, conditionFn, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    await page.waitForTimeout(100);
    await page.reload();
    if (await conditionFn()) return;
  }
  throw new Error(`reloadUntil: condition still false after ${attempts} reloads`);
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

  // --- Core flows ---
  // Entering the wizard or checklist, moving through them, and the basic exits (restart, home, mode toggle). If these break, nothing else works.
  test.describe('Core flows', () => {
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

    test('2b. Disclaimer gate — wizard Q2', async ({ page }) => {
      await page.getByRole('button', { name: 'Start now' }).click();
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
      // Back from the 2nd question returns to the 1st question, not the start view
      await backBtn.click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(page.locator('#startView')).toBeHidden();
      // Back from the 1st (visible) question returns to the start view
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

    test('14. Welcome back', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await reloadUntil(page, () => page.locator('#welcomeBackView').isVisible());
      await expect(page.locator('#welcomeBackView')).toBeVisible();
      await expect(page.locator('#startView')).toBeHidden();
      await page.getByRole('button', { name: 'Continue my plan' }).click();
      await expect(page.locator('#planView')).toBeVisible();
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
      await page.getByRole('button', { name: 'Start now' }).click();
      await wizardNext(page); // age question
      await wizardNext(page); // disclaimer question
      await page.getByRole('button', { name: 'Switch view' }).click();
      await expect(page.locator('#checklistAgeConfirm')).toBeChecked();
      await expect(page.locator('#checklistDisclaimerConfirm')).toBeChecked();
    });

    test('62. Wizard back navigation steps back one question at a time from a fresh session', async ({ page }) => {
      await page.goto(filePath);
      await page.getByRole('button', { name: 'Start now' }).click();
      await page.locator('input[name="ans"]:not([disabled])').first().check();
      await page.getByRole('button', { name: 'Continue →' }).click();
      await page.locator('input[name="ans"]:not([disabled])').first().check();
      await page.getByRole('button', { name: 'Continue →' }).click();
      const backBtn = page.getByRole('button', { name: '← Back' });
      // Currently on Q3 (region). Back should return to Q2 (disclaimer), not the start view.
      await backBtn.click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(page.locator('.wizard-legend')).toContainText('Do you understand that this is only general guidance?');
      // Back again should return to Q1 (age).
      await backBtn.click();
      await expect(page.locator('.wizard-legend')).toContainText('Are you aged 16 or over?');
      // Back again from the first question should return to the start view.
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
      // Generate the plan again and re-enter edit mode: tip stays dismissed
      await page.getByRole('button', { name: /Continue|Show my plan/ }).click();
      await expect(page.locator('#planView')).toBeVisible();
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(tip).toBeHidden();
    });

    test('68. Wizard edit tip does not resurface after New plan then Start now', async ({ page }) => {
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
      // Leave the tip undismissed, go home, and start a brand new plan
      await page.locator('#cbHomeBtn').click();
      await expect(page.locator('#welcomeBackView')).toBeVisible();
      const restartBtn = page.locator('#welcomeNormal button.secondary');
      await restartBtn.click();
      await restartBtn.click();
      await page.locator('#dlgDisclaimer').getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Start now' }).click();
      await expect(page.locator('#wizardView')).toBeVisible();
      await expect(tip).toBeHidden();
    });

    test('69. Checklist warning banners do not leak across a fresh checklist entry', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#chkGoalGender').uncheck();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#checklistGoalWarning')).toBeVisible();
      // Leave via Home without ever touching a field again (so the change handler never fires),
      // then re-enter the checklist fresh.
      await page.locator('#cbHomeBtn').click();
      await expect(page.locator('#startView')).toBeVisible();
      await page.locator('.start-checklist-link').click();
      await expect(page.locator('#checklistGoalWarning')).toBeHidden();
    });
  });

  // --- Locks, gating & validation ---
  // Options that should be disabled/hidden based on other answers, and the warnings shown for incomplete or invalid input.
  test.describe('Locks, gating & validation', () => {
    test('8. Checklist locks', async ({ page }) => {
      await openChecklist(page);
      // NHS and HMRC never require a deed poll in practice, so they are never locked.
      await expect(page.getByLabel('NHS record')).toBeEnabled();
      await expect(page.getByLabel('HMRC and taxes')).toBeEnabled();
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]')).toBeDisabled();
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await expect(page.locator('input[name="chkDrivingLicenceOpt"][value="updated"]')).toBeEnabled();
      await page.locator('#chkGoalName').uncheck();
      await page.locator('#chkGoalGender').check();
      await expect(page.locator('#wrapDeedPoll')).toBeHidden();
      await expect(page.getByLabel('NHS record')).toBeEnabled();
      // HMRC is relevant to a gender-only change too (a no-GRC restricted-record route exists).
      await expect(page.getByLabel('HMRC and taxes')).toBeVisible();
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
      // eVisa lock follows passport status, matching its stated reasoning.
      await page.getByLabel(/Deed poll or statutory declaration/).uncheck();
      await expect(page.locator('#chkVisa')).toBeDisabled();
      await expect(page.locator('#chkVisa')).toHaveAttribute('aria-describedby', 'lock-visa-reason');
    });

    test('9. Plan content conditions', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGoalName').check();
      await page.locator('#chkGoalGender').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByRole('heading', { name: 'Step 1: The basics' })).toBeVisible();
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
      // Trigger another change event elsewhere, which re-renders the checklist from wizardState
      await page.locator('#chkGoalGender').uncheck();
      await page.locator('#chkGoalGender').check();
      await expect(page.locator('#chkRegionOut')).toBeChecked();
    });

    test('73. Wizard: NHS/HMRC never skipped or locked; driving licence locks instead of silently discarding; newGP and HMRC shown for gender-only', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        wizardState.region = 'ew';
        wizardState.birthRegion = 'ew';
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

    test('74. Wizard eVisa answer maps correctly, locks on passport, and produces the eVisa step', async ({ page }) => {
      await openWizard(page);
      await page.evaluate(() => {
        Object.assign(wizardState, { region:'ew', birthRegion:'ew', goal:'both', goalParts:['name','gender'], citizen:'yes', deedpoll:'yes', nhs:'yes', newGP:'no', hmrc:'yes', driving:'none', passport:'needs_update', employment:'no', dbs:'no', dwp:'no', services:[], svcNone:'yes', vehicle:'no', student:'no', birthCertName:'no', birthCert:'no', grc:'no' });
        step = questions.findIndex(q => q.id === 'visaUpdated');
        renderWizard(false);
      });
      await expect(page.locator('input[name="ans"][value="yes"]')).toBeDisabled();
      await expect(page.locator('input[name="ans"][value="no"]')).toBeEnabled();
      await page.evaluate(() => { wizardState.passport = 'updated'; renderWizard(false); });
      await expect(page.locator('input[name="ans"][value="yes"]')).toBeEnabled();
      await page.evaluate(() => {
        wizardState.passport = 'needs_update';
        wizardState.visaUpdated = 'no';
        step = questions.findIndex(q => q.id === 'grc');
        renderWizard(false);
      });
      await page.locator('input[name="ans"][value="no"]').check();
      await page.getByRole('button', { name: 'Show my plan →' }).click();
      await expect(page.locator('#planContent')).toContainText('UK eVisa and UKVI');
      await expect(page.locator('#planContent')).toContainText('Home country passport');
      await expect(page.locator('#planContent')).not.toContainText('UK passport:');
    });

    test('75. Checklist eVisa lock releases on passport status, not the deed poll', async ({ page }) => {
      await openChecklist(page);
      await page.getByLabel(/I have a UK visa or eVisa/).check();
      await expect(page.locator('#chkVisa')).toBeDisabled();
      await expect(page.locator('#chkVisa')).toHaveAttribute('aria-describedby', 'lock-visa-reason');
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await expect(page.locator('#chkVisa')).toBeDisabled();
      await page.locator('input[name="chkPassportOpt"][value="updated"]').check();
      await expect(page.locator('#chkVisa')).toBeEnabled();
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

  // --- Progress tracking & plan state ---
  // The per-step status tracker (not started/in progress/done), its sub-checklists, and the plan-ready UI state.
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
      const btns = page.locator('.step-state-btn[data-track-id]');
      const count = await btns.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) { 
        await btns.nth(i).click(); 
        await btns.nth(i).click(); 
      }
      await expect(page.locator('#allDoneBanner')).toBeVisible();
    });

    test('22. plan-ready class', async ({ page }) => {
      await openChecklist(page);
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('body')).toHaveClass(/plan-ready/);
      await page.locator('#ubMakeChangesBtn').click();
      await expect(page.locator('body')).not.toHaveClass(/plan-ready/);
    });

    test('66. GRC medical and living-proof sub-checklists', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkGRC').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      const medBtns = page.locator('.step-state-btn[data-svc-parent="trk_grc_med"]');
      const lifeBtns = page.locator('.step-state-btn[data-svc-parent="trk_grc_life"]');
      await expect(medBtns).toHaveCount(2);
      await expect(lifeBtns).toHaveCount(8);
      // Complete all medical sub-items; medical parent should be done, living-proof parent untouched
      for (let i = 0; i < 2; i++) {
        await medBtns.nth(i).click();
        await medBtns.nth(i).click();
      }
      await expect(page.locator('[data-track-id="trk_grc_med"]')).toHaveAttribute('data-state', '2');
      await expect(page.locator('[data-track-id="trk_grc_life"]')).toHaveAttribute('data-state', '0');
      // Copy-link round trip preserves sub-item progress
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
    });
  });

  // --- Sharing & links ---
  // Encoding/decoding the shareable link, and the various edge cases around opening one (outdated, malformed, legacy, saved-to-disk).
  test.describe('Sharing & links', () => {
    test('15. Shareable link clipboard', async ({ page }) => {
      await openChecklist(page);
      await page.getByLabel(/Deed poll or statutory declaration/).check();
      await page.getByLabel(/I plan to apply for a Gender Recognition Certificate/).check();
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
      // Simulates opening a saved-to-disk copy of the page whose HTML was
      // captured while a plan was on screen (planView's "hidden" class
      // already removed in the saved markup), then using that saved file to
      // open someone else's shared plan link.
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
      await page.goto(clip);
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
      await page.goto(filePath + '?p=%%%notvalid%%%');
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
  });

  // --- Plan generation & content accuracy ---
  // Whether the right plan steps and wording appear for a given combination of region/goal/answers.
  test.describe('Plan generation & content accuracy', () => {
    test('46-52. PLAN_ITEMS rendering tests', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkRegion"][value="scot"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
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

    test('64. Credit reference agencies service item', async ({ page }) => {
      await openChecklist(page);
      await expect(page.locator('#chkSvcCRA')).toBeVisible();
      await page.locator('#chkSvcCRA').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByText('Credit reference agencies', { exact: true })).toBeVisible();
      await expect(page.locator('#planContent')).toContainText('Experian, Equifax, or TransUnion');
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
      await page.locator('#chkGRC').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('You must be 18 or over to apply for a UK GRC.');
    });

    test('72. Land title register service covers all three nations', async ({ page }) => {
      await openChecklist(page);
      await page.locator('#chkSvcLandReg').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.getByText('Land title register', { exact: true })).toBeVisible();
      await expect(page.locator('#planContent')).toContainText('HM Land Registry');
      await expect(page.locator('#planContent')).toContainText('Registers of Scotland');
      await expect(page.locator('#planContent')).toContainText('Land & Property Services');
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
      await expect(page.locator('#planContent')).toContainText('handled centrally by the DVLA');
    });

    test('79. NI-born users who decline a GRC get an Irish-passport-only final step', async ({ page }) => {
      await openChecklist(page);
      await page.locator('input[name="chkBirthRegion"][value="ni"]').check();
      await page.getByRole('button', { name: 'Show my action plan' }).click();
      await expect(page.locator('#planContent')).toContainText('The final legal step (Irish passport)');
      await expect(page.locator('#planContent')).not.toContainText('Irish passport and GRC');
      await expect(page.locator('#planContent')).toContainText('You have not included a UK Gender Recognition Certificate');
    });
  });

  // --- Accessibility & layout ---
  // Keyboard navigation, ARIA attributes, dialogs, and responsive/visual behaviour.
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
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/google\.(co\.uk|com)|chrome-error:/);
    });

    test('19b. Keyboard ? shortcut opens help modal', async ({ page }) => {
      const dlg = page.locator('#dlgUsage');
      await expect(dlg).toBeHidden();
      await page.keyboard.press('?');
      await expect(dlg).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
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

    test('60. Mobile toolbar layout: one row for wizard, two rows for plan view', async ({ page }) => {
      await page.setViewportSize({ width: 412, height: 915 });
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
  });

});
