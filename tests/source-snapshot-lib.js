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

const MAX_ITEMS = 15;
const CONTEXT_CHARS = 60;
const MAX_LINE_CHARS = 320;

function tokens(line) {
  return [...line.matchAll(/\S+/g)].map((m) => ({ word: m[0], start: m.index, end: m.index + m[0].length }));
}

function simplify(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function wordOverlap(a, b) {
  const wa = simplify(a).split(' ').filter(Boolean);
  const wb = simplify(b).split(' ').filter(Boolean);
  if (!wa.length || !wb.length) return 0;
  const counts = new Map();
  for (const w of wa) counts.set(w, (counts.get(w) || 0) + 1);
  let common = 0;
  for (const w of wb) {
    if (counts.get(w) > 0) {
      common++;
      counts.set(w, counts.get(w) - 1);
    }
  }
  return (2 * common) / (wa.length + wb.length);
}

function pairChanges(removed, added) {
  const candidates = [];
  removed.forEach((r, i) => added.forEach((a, j) => {
    const score = Math.max(wordOverlap(r, a), isTrivialChange(r, a) ? 1 : 0);
    if (score >= 0.5) candidates.push({ i, j, score });
  }));
  candidates.sort((x, y) => y.score - x.score || x.i - y.i || x.j - y.j);
  const usedR = new Set();
  const usedA = new Set();
  const pairs = [];
  for (const c of candidates) {
    if (usedR.has(c.i) || usedA.has(c.j)) continue;
    usedR.add(c.i);
    usedA.add(c.j);
    pairs.push({ before: removed[c.i], after: added[c.j], order: c.i });
  }
  pairs.sort((x, y) => x.order - y.order);
  return {
    pairs: pairs.map(({ before, after }) => ({ before, after })),
    removed: removed.filter((_, i) => !usedR.has(i)),
    added: added.filter((_, j) => !usedA.has(j)),
  };
}

function wordDiff(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  const lcs = Array.from({ length: ta.length + 1 }, () => new Array(tb.length + 1).fill(0));
  for (let i = ta.length - 1; i >= 0; i--) {
    for (let j = tb.length - 1; j >= 0; j--) {
      lcs[i][j] = ta[i].word === tb[j].word ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hunks = [];
  let hunk = null;
  let i = 0;
  let j = 0;
  const open = () => hunk || (hunk = { removed: [], added: [] });
  const close = () => { if (hunk) hunks.push(hunk); hunk = null; };
  while (i < ta.length || j < tb.length) {
    if (i < ta.length && j < tb.length && ta[i].word === tb[j].word) {
      close();
      i++;
      j++;
    } else if (j < tb.length && (i === ta.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      open().added.push(tb[j++]);
    } else {
      open().removed.push(ta[i++]);
    }
  }
  close();
  return hunks;
}

function safe(text) {
  return text.replace(/`/g, "'");
}

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function summariseHunks(hunks) {
  const words = (list) => '`' + clip(safe(list.map((t) => t.word).join(' ')), 80) + '`';
  const parts = hunks.slice(0, 3).map((h) => {
    if (h.removed.length && h.added.length) return `${words(h.removed)} → ${words(h.added)}`;
    if (h.added.length) return `added ${words(h.added)}`;
    return `removed ${words(h.removed)}`;
  });
  if (hunks.length > 3) parts.push(`and ${hunks.length - 3} more`);
  return parts.join('; ');
}

function isTrivialChange(a, b) {
  return simplify(a) === simplify(b);
}

function windowAround(line, changed) {
  let start = 0;
  let end = line.length;
  if (changed.length) {
    start = Math.max(0, Math.min(...changed.map((t) => t.start)) - CONTEXT_CHARS);
    end = Math.min(line.length, Math.max(...changed.map((t) => t.end)) + CONTEXT_CHARS);
  }
  end = Math.min(end, start + MAX_LINE_CHARS);
  return (start > 0 ? '…' : '') + safe(line.slice(start, end)) + (end < line.length ? '…' : '');
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function diffBlock(indent, lines) {
  return [`${indent}\`\`\`diff`, ...lines.map((l) => `${indent}${l}`), `${indent}\`\`\``];
}

function pairItems(pairs, indent) {
  const out = [];
  pairs.slice(0, MAX_ITEMS).forEach((p, n) => {
    const marker = `${n + 1}. `;
    const inner = indent + ' '.repeat(marker.length);
    const hunks = wordDiff(p.before, p.after);
    const changedBefore = hunks.flatMap((h) => h.removed);
    const changedAfter = hunks.flatMap((h) => h.added);
    const anchorBefore = changedBefore.length ? changedBefore : changedAfter.map((t) => ({ start: Math.min(t.start, p.before.length), end: Math.min(t.start, p.before.length) }));
    const anchorAfter = changedAfter.length ? changedAfter : changedBefore.map((t) => ({ start: Math.min(t.start, p.after.length), end: Math.min(t.start, p.after.length) }));
    out.push(`${indent}${marker}${summariseHunks(hunks) || 'spacing only'}`);
    out.push(...diffBlock(inner, [`- ${windowAround(p.before, anchorBefore)}`, `+ ${windowAround(p.after, anchorAfter)}`]));
  });
  if (pairs.length > MAX_ITEMS) out.push(`${indent}And ${pairs.length - MAX_ITEMS} more.`);
  return out;
}

function lineItems(lines, sign, indent) {
  const out = diffBlock(indent, lines.slice(0, MAX_ITEMS).map((l) => `${sign} ${windowAround(l, [])}`));
  if (lines.length > MAX_ITEMS) out.push(`${indent}And ${lines.length - MAX_ITEMS} more.`);
  return out;
}

function formatSourceChanges(before, after, indent = '  ') {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const { pairs, removed, added } = pairChanges(
    beforeLines.filter((l) => !afterSet.has(l)),
    afterLines.filter((l) => !beforeSet.has(l)),
  );
  const trivial = pairs.filter((p) => isTrivialChange(p.before, p.after));
  const wording = pairs.filter((p) => !isTrivialChange(p.before, p.after));
  const counts = [];
  if (pairs.length) counts.push(`${plural(pairs.length, 'changed line', 'changed lines')}: ${wording.length} with wording changes, ${trivial.length} with punctuation, spacing or capitals only.`);
  if (removed.length || added.length) counts.push(`${plural(removed.length, 'line', 'lines')} removed, ${plural(added.length, 'line', 'lines')} added.`);
  const out = [`${indent}${counts.join(' ')}`];
  if (wording.length) out.push('', `${indent}**Wording changes**`, '', ...pairItems(wording, indent));
  if (trivial.length) {
    out.push('', `${indent}<details><summary>${plural(trivial.length, 'line', 'lines')} with punctuation, spacing or capitals only</summary>`, '');
    out.push(...pairItems(trivial, indent), '', `${indent}</details>`);
  }
  if (removed.length) out.push('', `${indent}**Removed lines**`, '', ...lineItems(removed, '-', indent));
  if (added.length) out.push('', `${indent}**Added lines**`, '', ...lineItems(added, '+', indent));
  return out.join('\n');
}

module.exports = { parseSources, sourcesToCheck, preparePage, extractReadableText, normaliseText, formatSourceChanges, pairChanges, wordDiff, isTrivialChange, USER_AGENT };
