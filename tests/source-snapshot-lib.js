const fs = require('fs');

const READABILITY_SOURCE = fs.readFileSync(require.resolve('@mozilla/readability/Readability.js'), 'utf8') + '\nwindow.Readability = Readability;';

const EXCLUDED_DOMAINS = new Set([
  'www.legislation.gov.uk',
  'www.irishstatutebook.ie',
  'www.whatdotheyknow.com',
  'questions-statements.parliament.uk',
]);

const KNOWN_BLOCKED_DOMAINS = new Set([
  'kb.ros.gov.uk',
  'www.electoralcommission.org.uk',
  'www.saas.gov.uk',
]);

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function parseSources(markdown) {
  const entries = [];
  let section = '';
  let current = null;

  const flush = () => {
    if (current && current.name && current.url) entries.push(current);
    current = null;
  };

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      section = heading[2].trim();
      continue;
    }
    const nameMatch = line.match(/^-\s+\*\*(.+?)\*\*$/);
    if (nameMatch) {
      flush();
      current = { name: nameMatch[1], section, url: null, status: '', lastVerified: 'pending' };
      continue;
    }
    if (!current) continue;
    const urlMatch = line.match(/^-?\s*<(https?:\/\/[^>]+)>$/);
    if (urlMatch) {
      current.url = urlMatch[1];
      continue;
    }
    const statusMatch = line.match(/^-?\s*Status:\s*(.+)$/);
    if (statusMatch) {
      current.status = statusMatch[1].trim();
      continue;
    }
    const lvMatch = line.match(/^-?\s*Last verified:\s*(\S+)$/);
    if (lvMatch) {
      current.lastVerified = lvMatch[1];
      flush();
      continue;
    }
  }
  flush();
  return entries;
}

function sourcesToCheck(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    if (!entry.url || entry.lastVerified === 'pending') continue;
    let url;
    try {
      url = new URL(entry.url);
    } catch {
      continue;
    }
    if (EXCLUDED_DOMAINS.has(url.host) || KNOWN_BLOCKED_DOMAINS.has(url.host)) continue;
    if (url.pathname === '/') continue;
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
  }
  return out;
}

const COOKIE_BANNERS = '#sliding-popup, #onetrust-consent-sdk, #CybotCookiebotDialog, #ccc, #usercentrics-root, .cc-window';
const POSSIBLE_COOKIE_BANNERS = '[id*="cookie" i], [class*="cookie" i], [aria-label*="cookie" i], [data-module*="cookie" i], [id*="consent" i], [class*="consent" i], [aria-label*="consent" i], [role="dialog"], dialog';
const BLOCK_ELEMENTS = 'address, article, aside, blockquote, caption, dd, details, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, li, ol, p, pre, section, summary, table, td, th, tr, ul';

async function preparePage(page) {
  await page.addInitScript({ content: READABILITY_SOURCE });
}

const BUSY_PAGE_PATTERNS = [/website is busy/i, /please try (again )?later/i, /too many requests/i, /rate limit/i];

function looksLikeBusyPage(textContent) {
  return BUSY_PAGE_PATTERNS.some((pattern) => pattern.test(textContent));
}

function normaliseText(text) {
  return text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

async function fingerprintPdf(page, url) {
  await page.goto(new URL(url).origin + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(async (pdfUrl) => {
    const response = await fetch(pdfUrl);
    if (!response.ok) return { error: `HTTP ${response.status}` };
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    return { hash: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('') };
  }, url);
  if (result.error) throw new Error(`Could not download the PDF (${result.error})`);
  return { title: decodeURIComponent(new URL(url).pathname.split('/').pop()), textContent: `PDF file, SHA-256 ${result.hash}` };
}

async function extractReadableText(page, url) {
  if (/\.pdf$/i.test(new URL(url).pathname)) return fingerprintPdf(page, url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const article = await page.evaluate(({ banners, possibleBanners, blocks }) => {
    const clone = document.cloneNode(true);
    const content = clone.querySelector('main, [role="main"], h1');
    clone.querySelectorAll(banners).forEach((el) => el.remove());
    clone.querySelectorAll(possibleBanners).forEach((el) => {
      if (!el.isConnected || el === clone.body || el === clone.documentElement) return;
      if (content && el.contains(content)) return;
      if (/cookie/i.test(el.textContent)) el.remove();
    });
    const parsed = new Readability(clone).parse();
    if (!parsed) return null;
    const body = new DOMParser().parseFromString(parsed.content, 'text/html').body;
    body.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    body.querySelectorAll(blocks).forEach((el) => {
      el.prepend('\n');
      el.append('\n');
    });
    return { title: parsed.title, text: body.textContent };
  }, { banners: COOKIE_BANNERS, possibleBanners: POSSIBLE_COOKIE_BANNERS, blocks: BLOCK_ELEMENTS });
  if (!article) return null;
  const textContent = normaliseText(article.text);
  if (!textContent) return null;
  if (looksLikeBusyPage(textContent)) {
    throw new Error('Extracted content looks like a rate-limit/busy interstitial, not the real page');
  }
  return { title: article.title, textContent };
}

module.exports = { parseSources, sourcesToCheck, preparePage, extractReadableText, normaliseText, USER_AGENT };
