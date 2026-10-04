const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const LABELS = ['UK specific', 'Free and private', 'No tracking', 'No sign-up'];
const WIDTH = 1200;
const HEIGHT = 630;
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const match = html.match(/<link rel="icon" href="data:image\/svg\+xml,([^"]+)">/);
if (!match) throw new Error('The favicon data URI was not found in index.html');
const flags = decodeURIComponent(match[1]).replace('<svg ', '<svg preserveAspectRatio="none" ');
const background = `url("data:image/svg+xml,${encodeURIComponent(flags)}")`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, colorScheme: 'dark' });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.evaluate(({ background, labels, width, height }) => {
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    document.documentElement.setAttribute('data-theme', 'dark');
    for (const el of document.body.children) {
      if (!el.matches('header.hero, #controlBar')) el.style.display = 'none';
    }
    const buttons = document.getElementById('controlBarButtons');
    if (!buttons) throw new Error('#controlBarButtons was not found in index.html');
    buttons.replaceChildren(...labels.map((label) => {
      const button = document.createElement('span');
      button.className = 'ub-icon-btn';
      button.textContent = label;
      return button;
    }));
    const style = document.createElement('style');
    style.textContent = `
      html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
      body { margin: 0; padding: 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 24px; background: ${background} 0 0 / 100% 100% no-repeat; }
      header.hero, #controlBar { zoom: 1.4; width: 680px; max-width: 680px; margin: 0 auto; padding: 0; position: static; box-sizing: border-box; }
      .hero .hero-tagline { max-width: none; }
      .hero-inner, #controlBarCard { box-shadow: 0 2px 8px rgba(0, 0, 0, .35); }
      #controlBarButtons { display: flex; flex-wrap: nowrap; justify-content: center; gap: 12px; width: 100%; }
      #controlBarButtons .ub-icon-btn { display: inline-flex; align-items: center; cursor: default; }
    `;
    document.head.appendChild(style);
  }, { background, labels: LABELS, width: WIDTH, height: HEIGHT });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'og-image.png'), clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  await browser.close();
  console.log('Wrote og-image.png');
})();
