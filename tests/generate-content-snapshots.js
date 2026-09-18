const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { extractContentMap } = require('./content-snapshot-lib');

const localFilePath = `file://${path.resolve(__dirname, '..', 'index.html')}`;
const filePath = process.env.BEMYSELF_URL || localFilePath;
const outputPath = path.resolve(__dirname, 'content-snapshots.json');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(filePath);
  const contentMap = await page.evaluate(extractContentMap);
  await browser.close();

  const sorted = {};
  Object.keys(contentMap).sort().forEach((key) => { sorted[key] = contentMap[key]; });

  fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(sorted).length} content snapshots to ${path.relative(process.cwd(), outputPath)}`);
})();
