const path = require('path');
const { chromium } = require('@playwright/test');

const LABELS = ['UK specific', 'Free and private', 'No tracking', 'No sign-up'];
const WIDTH = 1200;
const HEIGHT = 630;
const ZOOM = 1.4;
const PAGE_SEED = 1122;
const BACKGROUND_SEED = 31;
const ROOT = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, colorScheme: 'dark' });
  await page.addInitScript((seed) => {
    let a = seed;
    Math.random = () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
    localStorage.setItem('disclaimerSeen', '1');
  }, PAGE_SEED);
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.evaluate(({ labels, width, height, zoom, seed }) => {
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
      body { margin: 0; padding: 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 24px; background: var(--bg-main); }
      header.hero, #controlBar { zoom: ${zoom}; width: 680px; max-width: 680px; margin: 0 auto; padding: 0; position: static; box-sizing: border-box; }
      .hero .hero-tagline { max-width: none; }
      #heroMotionBtn { display: none !important; }
      .hero-inner, #controlBarCard { box-shadow: 0 4px 18px rgba(0, 0, 0, .6); }
      #controlBarButtons { display: flex; flex-wrap: nowrap; justify-content: center; gap: 12px; width: 100%; }
      #controlBarButtons .ub-icon-btn { display: inline-flex; align-items: center; cursor: default; }
      #ogBackground { position: fixed; left: 0; top: 0; width: ${width}px; height: ${height}px; z-index: -1; }
    `;
    document.head.appendChild(style);

    const COLOURS = [[91, 206, 250], [245, 169, 184], [255, 255, 255], [252, 244, 52], [156, 89, 209], [44, 44, 44]];
    const COUNT = 18;
    const POINTS = 180;
    const TAU = Math.PI * 2;
    let s = seed;
    const rnd = () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let q = Math.imul(s ^ s >>> 15, 1 | s);
      q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
      return ((q ^ q >>> 14) >>> 0) / 4294967296;
    };
    const between = (a, b) => a + (b - a) * rnd();
    const shuffle = (list) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    };
    const rgb = (c, f) => `rgb(${c.map((x) => Math.round(x * f)).join(',')})`;
    const canvas = document.createElement('canvas');
    canvas.id = 'ogBackground';
    canvas.width = width * 2;
    canvas.height = height * 2;
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const colours = [];
    while (colours.length < COUNT) colours.push(...shuffle(COLOURS.slice()));
    const lanes = shuffle(colours.slice(0, COUNT).map((c, i) => ({ c, y0: height * ((i + between(.2, .8)) / COUNT) })));
    for (const lane of lanes) {
      const x0 = between(-260, 200), x1 = between(width - 200, width + 260);
      const a1 = between(40, 110), k1 = TAU * between(.6, 1.4) / width, p1 = between(0, TAU);
      const a2 = between(10, 35), k2 = TAU * between(2, 3.5) / width, p2 = between(0, TAU);
      const ribbon = between(16, 34), turns = between(.8, 2.2), phase = between(0, TAU);
      const X = new Float32Array(POINTS), Y = new Float32Array(POINTS), T = new Float32Array(POINTS);
      const NX = new Float32Array(POINTS), NY = new Float32Array(POINTS);
      for (let k = 0; k < POINTS; k++) {
        const x = x0 + (x1 - x0) * k / (POINTS - 1);
        X[k] = x;
        Y[k] = lane.y0 + a1 * Math.sin(k1 * x + p1) + a2 * Math.sin(k2 * x + p2);
        T[k] = Math.cos(turns * TAU * k / (POINTS - 1) + phase);
      }
      for (let k = 0; k < POINTS; k++) {
        const a = Math.max(0, k - 1), b = Math.min(POINTS - 1, k + 1);
        const tx = X[b] - X[a], ty = Y[b] - Y[a], l = Math.hypot(tx, ty) || 1;
        NX[k] = -ty / l;
        NY[k] = tx / l;
      }
      ctx.lineWidth = .7;
      for (let k = 0; k < POINTS - 1; k++) {
        const c0 = T[k] * ribbon / 2, c1 = T[k + 1] * ribbon / 2, mid = (T[k] + T[k + 1]) / 2;
        ctx.fillStyle = ctx.strokeStyle = rgb(lane.c, mid >= 0 ? .9 + .1 * Math.abs(mid) : .74 + .08 * Math.abs(mid));
        ctx.beginPath();
        ctx.moveTo(X[k] + NX[k] * c0, Y[k] + NY[k] * c0);
        ctx.lineTo(X[k + 1] + NX[k + 1] * c1, Y[k + 1] + NY[k + 1] * c1);
        ctx.lineTo(X[k + 1] - NX[k + 1] * c1, Y[k + 1] - NY[k + 1] * c1);
        ctx.lineTo(X[k] - NX[k] * c0, Y[k] - NY[k] * c0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      if (lane.c[0] + lane.c[1] + lane.c[2] < 200) {
        ctx.strokeStyle = 'rgba(255, 255, 255, .28)';
        ctx.lineWidth = 1;
        for (const side of [1, -1]) {
          ctx.beginPath();
          for (let k = 0; k < POINTS; k++) {
            const h = side * T[k] * ribbon / 2;
            const px = X[k] + NX[k] * h, py = Y[k] + NY[k] * h;
            if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
      }
    }
  }, { labels: LABELS, width: WIDTH, height: HEIGHT, zoom: ZOOM, seed: BACKGROUND_SEED });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ROOT, 'og-image.png'), clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  await browser.close();
  console.log('Wrote og-image.png');
})();
