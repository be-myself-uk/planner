const fs = require('fs');

const READABILITY_SOURCE = fs.readFileSync(require.resolve('@mozilla/readability/Readability.js'), 'utf8') + '\nwindow.Readability = Readability;';

const EXCLUDED_DOMAINS = new Set([
  'www.gov.uk',
  'gov.uk',
  'www.legislation.gov.uk',
  'www.irishstatutebook.ie',
  'www.whatdotheyknow.com',
  'questions-statements.parliament.uk',
]);

const KNOWN_BLOCKED_DOMAINS = new Set([
  'kb.ros.gov.uk',
  'www.electoralcommission.org.uk',
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
    let host;
    try {
      host = new URL(entry.url).host;
    } catch {
      continue;
    }
    if (EXCLUDED_DOMAINS.has(host) || KNOWN_BLOCKED_DOMAINS.has(host)) continue;
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
  }
  return out;
}

const COOKIE_ACCEPT_PATTERN = /accept additional cookies|accept all cookies|^accept all$|^accept cookies$|^i accept$|^allow all cookies$|^allow all$/i;

async function dismissCookieBanner(page) {
  try {
    await page.getByRole('button', { name: COOKIE_ACCEPT_PATTERN }).first().click({ timeout: 4000 });
    await page.waitForTimeout(300);
  } catch {
  }
}

async function preparePage(page) {
  await page.addInitScript({ content: READABILITY_SOURCE });
}

const BUSY_PAGE_PATTERNS = [/website is busy/i, /please try (again )?later/i, /too many requests/i, /rate limit/i];

function looksLikeBusyPage(textContent) {
  return BUSY_PAGE_PATTERNS.some((pattern) => pattern.test(textContent));
}

async function extractReadableText(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await dismissCookieBanner(page);
  const article = await page.evaluate(() => {
    const clone = document.cloneNode(true);
    const parsed = new Readability(clone).parse();
    if (!parsed) return null;
    return { title: parsed.title, textContent: parsed.textContent.trim().replace(/\n{2,}/g, '\n') };
  });
  if (article && looksLikeBusyPage(article.textContent)) {
    throw new Error('Extracted content looks like a rate-limit/busy interstitial, not the real page');
  }
  return article;
}

module.exports = { parseSources, sourcesToCheck, preparePage, extractReadableText, USER_AGENT };
