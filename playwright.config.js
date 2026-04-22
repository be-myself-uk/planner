import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  /* Maximum time one test can run for. 10 seconds is plenty for a local HTML file. */
  timeout: 10 * 1000,
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only to handle flaky runners, 0 retries locally for faster dev loops */
  retries: process.env.CI ? 1 : 0,
  
  /* Cap workers on CI to prevent out-of-memory errors on free runners */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter to use. Generates the HTML report. */
  reporter: 'html',
  
  use: {
    /* Collect trace only on the first retry to save time/space on passing tests. */
    trace: 'on-first-retry',
    /* Automatically capture a screenshot if a test fails. */
    screenshot: 'only-on-failure',
  },

  /* Configure projects. We only use Chromium to save CI minutes for this free personal project. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
