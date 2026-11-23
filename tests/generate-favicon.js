const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const SIZES = [16, 32, 48];
const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'data:image/svg+xml,';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const match = html.match(/<link rel="icon" href="data:image\/svg\+xml,([^"]+)">/);
if (!match) throw new Error('The favicon data URI was not found in index.html');
const svg = PREFIX + encodeURIComponent(decodeURIComponent(match[1]));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pngs = await page.evaluate(async ({ svg, sizes }) => {
    const img = new Image();
    img.src = svg;
    await img.decode();
    return sizes.map(n => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = n;
      canvas.getContext('2d').drawImage(img, 0, 0, n, n);
      return canvas.toDataURL('image/png').split(',')[1];
    });
  }, { svg, sizes: SIZES });
  await browser.close();

  const images = pngs.map(b64 => Buffer.from(b64, 'base64'));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map((png, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(SIZES[i], 0);
    entry.writeUInt8(SIZES[i], 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  const out = path.join(ROOT, 'favicon.ico');
  fs.writeFileSync(out, Buffer.concat([header, ...entries, ...images]));
  console.log(`Wrote ${out} with ${SIZES.join(', ')} pixel images, ${offset} bytes.`);
})();
