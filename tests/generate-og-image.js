const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/<link rel="icon" href="data:image\/svg\+xml,([^"]+)">/);
if (!match) throw new Error('The favicon data URI was not found in index.html');
const svg = decodeURIComponent(match[1]).replace('<svg ', '<svg width="1200" height="1200" ');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: path.resolve(__dirname, '..', 'og-image.png'), clip: { x: 0, y: 0, width: 1200, height: 1200 } });
  await browser.close();
  console.log('Wrote og-image.png');
})();
