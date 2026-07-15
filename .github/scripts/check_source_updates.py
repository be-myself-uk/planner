#!/usr/bin/env python3
"""
Checks GOV.UK sources listed in SOURCES.md against the GOV.UK Content API,
using each entry's own "Last verified" date as the baseline. No separate
state file: SOURCES.md is the only source of truth, for both the list of
sources and the last-checked date.

Scope is deliberately GOV.UK only. Every gov.uk page exposes a reliable
public_updated_at timestamp for exactly what changed, with a plain JSON
API call, no scraping. Non-GOV.UK sources are not checked automatically:
several (NHS Inform, ireland.ie, Registers of Scotland) block scripted
requests inconsistently, and a whole-page content hash would flag on
sidebar links, image URLs, and other content that has nothing to do with
what the source is actually cited for. Those sources stay on manual
review, same as before this script existed.

An entry is only checked if its "Last verified" field already holds a
real ISO 8601 date; entries still marked "pending" are skipped, since
there is no baseline yet to compare against, not flagged.

This is a trigger for review, not a verdict: a flagged source may not
need any change to index.html, and the planner content should be checked
against what actually changed on the page, not assumed from the date
alone.
"""
import json
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCES_MD = REPO_ROOT / "SOURCES.md"
REPORT_FILE = REPO_ROOT / "source-watch-report.md"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
TIMEOUT = 20
SENTINEL = "\n__STATUS__:"


def parse_sources(text):
    """Return a list of dicts: name, url, section, status, last_verified."""
    entries = []
    section = ""
    current = {}

    def flush():
        if {"name", "url"} <= current.keys():
            entries.append({
                "name": current.get("name"),
                "url": current.get("url"),
                "section": section,
                "status": current.get("status", ""),
                "last_verified": current.get("last_verified", "pending"),
            })

    for line in text.splitlines():
        stripped = line.strip()
        heading = re.match(r"^(#{2,4})\s+(.*)$", stripped)
        if heading:
            section = heading.group(2).strip()
            continue
        name_match = re.match(r"^-\s+\*\*(.+?)\*\*$", stripped)
        if name_match:
            flush()
            current = {"name": name_match.group(1)}
            continue
        url_match = re.match(r"^-?\s*<(https?://[^>]+)>$", stripped)
        if url_match and current:
            current["url"] = url_match.group(1)
            continue
        status_match = re.match(r"^-?\s*Status:\s*(.+)$", stripped)
        if status_match and current:
            current["status"] = status_match.group(1).strip()
            continue
        lv_match = re.match(r"^-?\s*Last verified:\s*(\S+)$", stripped)
        if lv_match and current:
            current["last_verified"] = lv_match.group(1)
            flush()
            current = {}
            continue
    flush()
    return entries


def fetch(url):
    result = subprocess.run(
        [
            "curl", "-sL", "--max-time", str(TIMEOUT),
            "-A", USER_AGENT,
            "-w", SENTINEL + "%{http_code}",
            url,
        ],
        capture_output=True,
        timeout=TIMEOUT + 5,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl exit code {result.returncode}")
    body, _, status = result.stdout.rpartition(SENTINEL.encode())
    status_code = int(status.decode())
    if status_code != 200:
        raise RuntimeError(f"HTTP {status_code}")
    return body


def govuk_public_updated_at(url):
    parsed = urlparse(url)
    api_url = f"https://www.gov.uk/api/content{parsed.path}"
    try:
        body = fetch(api_url)
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None, "invalid JSON from Content API"
    value = data.get("public_updated_at")
    if not value:
        return None, "no public_updated_at in response"
    return value, None


def main():
    if not SOURCES_MD.exists():
        print("SOURCES.md not found", file=sys.stderr)
        sys.exit(1)

    entries = parse_sources(SOURCES_MD.read_text())
    stale = []
    errors = []
    skipped_pending = 0
    skipped_non_govuk = 0

    for entry in entries:
        parsed = urlparse(entry["url"])
        if parsed.netloc not in ("www.gov.uk", "gov.uk"):
            skipped_non_govuk += 1
            continue
        if entry["last_verified"] == "pending":
            skipped_pending += 1
            continue
        try:
            last_verified_date = date.fromisoformat(entry["last_verified"])
        except ValueError:
            errors.append({**entry, "error": f"unparseable Last verified date: {entry['last_verified']}"})
            continue

        api_value, err = govuk_public_updated_at(entry["url"])
        if err:
            errors.append({**entry, "error": err})
            continue

        try:
            api_date = datetime.fromisoformat(api_value).date()
        except ValueError:
            errors.append({**entry, "error": f"unparseable public_updated_at: {api_value}"})
            continue

        if api_date > last_verified_date:
            stale.append({**entry, "api_date": api_value})

    print(f"checked={len(entries) - skipped_pending - skipped_non_govuk}", file=sys.stderr)
    print(f"skipped_pending={skipped_pending} skipped_non_govuk={skipped_non_govuk}", file=sys.stderr)

    if stale or errors:
        write_report(stale, errors, skipped_pending, skipped_non_govuk)
        print("changes_detected=true")
    else:
        print("changes_detected=false")


def write_report(stale, errors, skipped_pending, skipped_non_govuk):
    lines = ["# Possible source changes (GOV.UK only)\n"]
    lines.append(
        "Automated check against the GOV.UK Content API. A listing here means the "
        "source's `public_updated_at` is newer than the `Last verified` date recorded "
        "for it in `SOURCES.md`. Review the source, then update `Last verified` in "
        "`SOURCES.md` regardless of outcome.\n"
    )
    lines.append(
        f"_{skipped_pending} GOV.UK source(s) skipped because they have no verified date "
        f"yet; {skipped_non_govuk} non-GOV.UK source(s) are out of scope for this check "
        "and remain manual review only._\n"
    )
    if stale:
        lines.append("## Possibly changed since last verified\n")
        for e in stale:
            lines.append(
                f"- **{e['name']}** ({e['section']})\n"
                f"  <{e['url']}>\n"
                f"  Status: {e['status']}\n"
                f"  Last verified: `{e['last_verified']}` | GOV.UK updated: `{e['api_date']}`\n"
            )
    if errors:
        lines.append("## Could not check\n")
        for e in errors:
            lines.append(f"- **{e['name']}** ({e['section']})\n  <{e['url']}>\n  Error: `{e['error']}`\n")
    REPORT_FILE.write_text("\n".join(lines) + "\n")


SELFTEST_FIXTURE = """\
## Section One

- **Old flat format entry**
  <https://www.gov.uk/old-flat-format>
  Status: Linked in the planner
  Last verified: pending

### Section One A

- **New nested format entry**
  - <https://www.gov.uk/new-nested-format>
  - Status: Consulted, not linked in the planner
  - Last verified: 2026-01-15

- **Duplicate URL, first occurrence**
  - <https://www.gov.uk/shared-url>
  - Status: Linked in the planner
  - Last verified: pending

## Section Two

- **Duplicate URL, second occurrence**
  <https://www.gov.uk/shared-url>
  Status: Consulted, not linked in the planner
  Last verified: 2025-06-01

- **Non-GOV.UK entry**
  - <https://www.nidirect.gov.uk/example>
  - Status: Linked in the planner
  - Last verified: pending
"""


def run_selftest():
    """Parses a small fixture covering both known SOURCES.md formats and
    asserts the parser handles each field correctly. Run by hand after
    changing SOURCES.md's structure: `python3 check_source_updates.py --selftest`.
    Not run automatically in CI, to keep the scheduled workflow fast; this
    exists so a format change can be checked before it reaches a scheduled run.
    """
    entries = parse_sources(SELFTEST_FIXTURE)
    assert len(entries) == 5, f"expected 5 entries, got {len(entries)}"

    by_name = {e["name"]: e for e in entries}

    e = by_name["Old flat format entry"]
    assert e["url"] == "https://www.gov.uk/old-flat-format"
    assert e["section"] == "Section One"
    assert e["status"] == "Linked in the planner"
    assert e["last_verified"] == "pending"

    e = by_name["New nested format entry"]
    assert e["url"] == "https://www.gov.uk/new-nested-format"
    assert e["section"] == "Section One A"
    assert e["status"] == "Consulted, not linked in the planner"
    assert e["last_verified"] == "2026-01-15"

    first = by_name["Duplicate URL, first occurrence"]
    second = by_name["Duplicate URL, second occurrence"]
    assert first["url"] == second["url"] == "https://www.gov.uk/shared-url"
    assert first["section"] == "Section One A" and second["section"] == "Section Two"
    assert first["last_verified"] == "pending" and second["last_verified"] == "2025-06-01"

    e = by_name["Non-GOV.UK entry"]
    parsed = urlparse(e["url"])
    assert parsed.netloc not in ("www.gov.uk", "gov.uk")

    print("selftest passed: 5/5 entries parsed correctly across both formats")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        run_selftest()
        sys.exit(0)
    main()
