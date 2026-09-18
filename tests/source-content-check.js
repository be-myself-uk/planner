#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { parseSources, sourcesToCheck, preparePage, extractReadableText, USER_AGENT } = require('./source-snapshot-lib');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCES_MD = path.join(REPO_ROOT, 'SOURCES.md');
const SNAPSHOT_FILE = path.join(__dirname, 'source-content-snapshots.json');
const REPORT_FILE = path.join(REPO_ROOT, 'source-content-report.md');
const RETRY_DELAY_MS = 3000;
const BETWEEN_REQUESTS_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(page, url) {
  try {
    return await extractReadableText(page, url);
  } catch {
    await sleep(RETRY_DELAY_MS);
    return extractReadableText(page, url);
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const markdown = fs.readFileSync(SOURCES_MD, 'utf8');
  const targets = sourcesToCheck(parseSources(markdown));

  if (!write && !fs.existsSync(SNAPSHOT_FILE)) {
    console.error(`${SNAPSHOT_FILE} is missing, so there is no baseline to compare against.`);
    console.error('Run `npm run generate-source-snapshots` (needs real network access; the');
    console.error('workflow_dispatch "write_source_snapshots" input can produce it in CI) and commit the result.');
    process.exit(1);
  }

  const previous = write ? {} : JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: USER_AGENT });
  await preparePage(page);

  const nextSnapshot = {};
  const changed = [];
  const errors = [];

  for (const [i, entry] of targets.entries()) {
    process.stderr.write(`[${i + 1}/${targets.length}] ${entry.url} ... `);
    let result;
    try {
      result = await fetchWithRetry(page, entry.url);
    } catch (e) {
      console.error('FAILED:', e.message.split('\n')[0]);
      errors.push({ ...entry, error: e.message.split('\n')[0] });
      await sleep(BETWEEN_REQUESTS_MS);
      continue;
    }
    if (!result) {
      console.error('FAILED: Readability could not parse this page');
      errors.push({ ...entry, error: 'Readability could not parse this page' });
      await sleep(BETWEEN_REQUESTS_MS);
      continue;
    }
    console.error('ok');

    nextSnapshot[entry.url] = { name: entry.name, section: entry.section, title: result.title, textContent: result.textContent };

    if (!write) {
      const before = previous[entry.url];
      if (before && before.textContent !== result.textContent) {
        changed.push({ ...entry, before: before.textContent, after: result.textContent });
      }
    }
    await sleep(BETWEEN_REQUESTS_MS);
  }

  await browser.close();

  if (write) {
    const sorted = {};
    Object.keys(nextSnapshot).sort().forEach((k) => { sorted[k] = nextSnapshot[k]; });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`Wrote ${Object.keys(sorted).length} source snapshots to ${path.relative(process.cwd(), SNAPSHOT_FILE)}`);
    return;
  }

  console.error(`checked=${targets.length}`);
  console.error(`changed=${changed.length} errors=${errors.length}`);

  if (changed.length || errors.length) {
    writeReport(changed, errors);
    console.log('changes_detected=true');
  } else {
    console.log('changes_detected=false');
  }
}

function diffLines(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const removed = beforeLines.filter((l) => !afterSet.has(l));
  const added = afterLines.filter((l) => !beforeSet.has(l));
  return { removed, added };
}

function writeReport(changed, errors) {
  const lines = ['# Possible source changes (non-GOV.UK)\n'];
  lines.push(
    'Automated check comparing each source\'s extracted article text (via Mozilla\'s ' +
    'Readability, the Firefox Reader View engine) against the last committed snapshot. ' +
    'A listing here means the extracted text differs. Review the source, then run ' +
    '`npm run generate-source-snapshots` in `tests/` to update the snapshot, whether or ' +
    'not the change affected the planner.\n'
  );
  if (changed.length) {
    lines.push('## Possibly changed since last snapshot\n');
    for (const c of changed) {
      const { removed, added } = diffLines(c.before, c.after);
      lines.push(`- **${c.name}** (${c.section})\n  <${c.url}>\n  Status: ${c.status}`);
      if (removed.length) lines.push('  Removed:\n' + removed.slice(0, 10).map((l) => `  - \`${l.slice(0, 200)}\``).join('\n'));
      if (added.length) lines.push('  Added:\n' + added.slice(0, 10).map((l) => `  + \`${l.slice(0, 200)}\``).join('\n'));
      lines.push('');
    }
  }
  if (errors.length) {
    lines.push('## Could not check\n');
    for (const e of errors) {
      lines.push(`- **${e.name}** (${e.section})\n  <${e.url}>\n  Error: \`${e.error}\`\n`);
    }
  }
  fs.writeFileSync(REPORT_FILE, lines.join('\n') + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
