const fs = require('fs');

// Readability.js only declares a top-level `class Readability`, relying on a
// classic <script> tag's global scope to expose it as window.Readability; it
// has no browser-global export path of its own (only `module.exports`, for
// Node). addInitScript evaluates its content inside its own scope rather
// than the page's true global scope, so that implicit global never appears
// on window there the way it does with addScriptTag. Appending an explicit
// assignment makes the export work the same way regardless of which
// injection method is used.
const READABILITY_SOURCE = fs.readFileSync(require.resolve('@mozilla/readability/Readability.js'), 'utf8') + '\nwindow.Readability = Readability;';

// GOV.UK sources are already covered by .github/scripts/check_source_updates.py
// via the GOV.UK Content API (a reliable public_updated_at field, no scraping).
// These domains host only static, point-in-time records (legislation, FOI
// responses, a Parliament written question) that don't change after
// publication, so re-checking their rendered content adds nothing.
const EXCLUDED_DOMAINS = new Set([
  'www.gov.uk',
  'gov.uk',
  'www.legislation.gov.uk',
  'www.irishstatutebook.ie',
  'www.whatdotheyknow.com',
  'questions-statements.parliament.uk',
]);

// Sites confirmed to block automated/proxied fetches outright (plain HTTP
// 403, not a rendering issue Playwright can work around), independently of
// the request path used to reach them. Kept out of the checked set instead
// of failing every run; revisit periodically in case that changes.
const KNOWN_BLOCKED_DOMAINS = new Set([
  'kb.ros.gov.uk',
  'www.electoralcommission.org.uk',
]);

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Parses SOURCES.md into entries ({name, section, url, status, lastVerified}),
 * handling both the flat and nested bullet formats that appear in the file.
 */
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

/**
 * Returns the subset of parsed SOURCES.md entries this tool is responsible
 * for: not GOV.UK (covered separately), not a known-static record, not a
 * site that outright blocks automated fetches, and not "pending" (no
 * baseline yet). Deduplicated by URL, since a few sources are cited from
 * more than one section.
 */
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

// A live cookie-consent banner (only injected once its own JS runs, so it
// never shows up when testing against a plain saved-HTML copy of a page) can
// out-score a page's real content under Readability's heuristics, especially
// on short "hub" pages where the actual content is mostly link fragments.
// Confirmed on communities-ni.gov.uk and infrastructure-ni.gov.uk, which
// share the same GOV.UK-style cookie banner text. Best-effort dismissal
// before parsing; silently does nothing if no matching control appears.
//
// A single locator combining every pattern, clicked once with a generous
// timeout, rather than trying each pattern in turn with its own short
// timeout: some banners render asynchronously a moment after networkidle
// fires, and re-checking each of several patterns for only a few hundred
// milliseconds each isn't a reliable wait for that (confirmed in practice:
// infrastructure-ni.gov.uk's banner was missed intermittently under the
// original per-pattern short-timeout version, on a run only seconds after
// one that caught it fine). One combined locator lets Playwright's normal
// actionability auto-waiting cover the whole timeout window regardless of
// which pattern ends up matching.
const COOKIE_ACCEPT_PATTERN = /accept additional cookies|accept all cookies|^accept all$|^accept cookies$|^i accept$|^allow all cookies$|^allow all$/i;

async function dismissCookieBanner(page) {
  try {
    await page.getByRole('button', { name: COOKIE_ACCEPT_PATTERN }).first().click({ timeout: 4000 });
    await page.waitForTimeout(300);
  } catch {
    // No matching control appeared in time; nothing to dismiss.
  }
}

/**
 * Renders a URL and runs Mozilla's Readability (the engine behind Firefox's
 * Reader View) against the live DOM, returning its extracted article text.
 * Works whether the page is server-rendered or a JS SPA, since it runs
 * after the page has finished loading. Readability's own heuristics strip
 * static nav/footer chrome without per-site configuration, but a live
 * cookie banner needs dismissing first (see dismissCookieBanner).
 *
 * Readability is injected once per page via addInitScript, not
 * addScriptTag: a real <script> element is subject to the page's own
 * Content-Security-Policy, and mygov.scot's nonce-based script-src blocks
 * it outright. addInitScript runs before the page's own scripts do, via
 * the browser's automation protocol rather than the page's script-loading
 * path, so it isn't subject to that CSP.
 */
async function preparePage(page) {
  await page.addInitScript({ content: READABILITY_SOURCE });
}

async function extractReadableText(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await dismissCookieBanner(page);
  return page.evaluate(() => {
    const clone = document.cloneNode(true);
    const article = new Readability(clone).parse();
    if (!article) return null;
    return { title: article.title, textContent: article.textContent.trim().replace(/\n{2,}/g, '\n') };
  });
}

module.exports = { parseSources, sourcesToCheck, preparePage, extractReadableText, USER_AGENT, EXCLUDED_DOMAINS, KNOWN_BLOCKED_DOMAINS };
