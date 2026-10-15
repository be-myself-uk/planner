"""
Checks the domains of the websites that index.html links to. If a linked
organisation lets its domain lapse, anyone can register it, and the planner
would keep sending people to whoever did.

Every http(s) link in index.html is reduced to its registrable domain: the
host without a leading "www.", cut to its last three labels when its last two
are one of THREE_LABEL_SUFFIXES (such as org.uk), and to its last two labels
otherwise. bemyself.uk itself, and names under SKIPPED_SUFFIXES (such as
gov.uk and nhs.uk), are skipped, because the public cannot register names
there.

Each remaining domain is looked up in its registry's RDAP service, found
through IANA's bootstrap file. A domain is reported when:
- the registry has no record of it (HTTP 404), so anyone can register it
- its expiration date has passed
- its status includes "redemption period" or "pending delete"
- it was registered in the last 365 days, which can mean it changed hands,
  unless the domain and that exact registration date are in ACKNOWLEDGED

A domain whose registry has no RDAP service (currently .ie) is checked through
DNS instead: if DNS has no record of it at all (NXDOMAIN), it is not
registered, so it is reported. Any other answer is fine.

Lookups wait about a second between requests. A timeout or other connection
failure, a 429 or a 5xx is retried once after a few seconds. A lookup that
still fails goes under "Could not check" in the report. It is not a finding,
so a flaky registry does not open an issue.

Fetches go through curl, as in check_source_updates.py, because some
registries' servers reject Python's default TLS settings.

Prints only changes_detected=true or changes_detected=false to stdout, for
GITHUB_OUTPUT, and everything else to stderr. Writes link-domain-report.md
at the repository root when there is anything to report.

This is a trigger for review, not a verdict: a reported domain may still
belong to the same organisation.

Run `python3 check_link_domains.py --selftest` to check the logic against
canned registry answers, with no network access. Test 227 in
tests/planner.spec.js runs it on every push.
"""
import json
import re
import subprocess
import sys
import tempfile
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# Domains checked by hand after being reported as newly registered, each with
# the registration date the report showed for it, for example
# "example.org.uk": "2026-03-01". If the domain is registered again later, its
# date no longer matches, so it is reported again.
ACKNOWLEDGED = {}

REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_HTML = REPO_ROOT / "index.html"
REPORT_FILE = REPO_ROOT / "link-domain-report.md"
BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json"
DNS_URL = "https://dns.google/resolve?name={name}&type=NS"
USER_AGENT = "bemyself.uk link domain check (https://github.com/be-myself-uk/planner)"
TIMEOUT = 20
REQUEST_GAP = 1
RETRY_WAIT = 5
RECENT_DAYS = 365
SENTINEL = "\n__STATUS__:"
OWN_DOMAIN = "bemyself.uk"
THREE_LABEL_SUFFIXES = {
    "co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk", "ac.uk",
    "gov.uk", "nhs.uk", "police.uk", "mod.uk", "sch.uk", "parliament.uk",
}
SKIPPED_SUFFIXES = ("gov.uk", "nhs.uk", "police.uk", "mod.uk", "sch.uk", "ac.uk", "parliament.uk")
DELETION_STATUSES = ("redemption period", "pending delete")
URL_PATTERN = re.compile(r"https?://[^\s\"'<>`)\\]+")


def linked_urls(html):
    """Return {host: [urls]} for every http(s) URL in the page, in order."""
    hosts = {}
    for url in URL_PATTERN.findall(html):
        host = (urlparse(url).hostname or "").rstrip(".").lower()
        if host and url not in hosts.setdefault(host, []):
            hosts[host].append(url)
    return hosts


def registrable_domain(host):
    host = host.rstrip(".").lower()
    if host.startswith("www."):
        host = host[4:]
    labels = host.split(".")
    if len(labels) >= 3 and ".".join(labels[-2:]) in THREE_LABEL_SUFFIXES:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def is_skipped(domain):
    return domain == OWN_DOMAIN or any(domain == s or domain.endswith("." + s) for s in SKIPPED_SUFFIXES)


def linked_domains(html):
    """Return {registrable domain: [urls]} for every link in the page."""
    domains = {}
    for host, urls in linked_urls(html).items():
        for url in urls:
            domain_urls = domains.setdefault(registrable_domain(host), [])
            if url not in domain_urls:
                domain_urls.append(url)
    return domains


def curl(url):
    """Fetch a URL. Returns (HTTP status or None, body, error or None)."""
    try:
        result = subprocess.run(
            [
                "curl", "-sSL", "--max-time", str(TIMEOUT),
                "-A", USER_AGENT,
                "-H", "Accept: application/rdap+json, application/json",
                "-w", SENTINEL + "%{http_code}",
                url,
            ],
            capture_output=True,
            timeout=TIMEOUT + 5,
        )
    except subprocess.TimeoutExpired:
        return None, b"", "timed out"
    if result.returncode != 0:
        return None, b"", "timed out" if result.returncode == 28 else f"curl exit code {result.returncode}"
    body, _, status = result.stdout.rpartition(SENTINEL.encode())
    try:
        return int(status.decode()), body, None
    except ValueError:
        return None, b"", "no HTTP status in curl output"


def fetch_with_retry(fetch, sleep, url):
    status, body, error = fetch(url)
    if status is None or status == 429 or status >= 500:
        sleep(RETRY_WAIT)
        status, body, error = fetch(url)
    return status, body, error


def failure(status, error):
    return error or f"HTTP {status}"


def parse_bootstrap(body):
    """Return {tld: RDAP base URL} from IANA's bootstrap file."""
    servers = {}
    for tlds, urls in json.loads(body).get("services", []):
        preferred = [u for u in urls if u.startswith("https://")] or urls
        for tld in tlds:
            servers[tld.lower()] = preferred[0]
    return servers


def event_date(data, action):
    for event in data.get("events", []):
        if isinstance(event, dict) and event.get("eventAction") == action:
            match = re.match(r"(\d{4}-\d{2}-\d{2})", str(event.get("eventDate", "")))
            if match:
                return date.fromisoformat(match.group(1))
    return None


def registrar_name(data):
    for entity in data.get("entities", []):
        if not isinstance(entity, dict) or "registrar" not in entity.get("roles", []):
            continue
        vcard = entity.get("vcardArray", [None, []])
        for field in (vcard[1] if len(vcard) > 1 else []):
            if field and field[0] == "fn" and len(field) > 3 and field[3]:
                return str(field[3])
        return str(entity.get("handle") or "not given")
    return None


def new_result(domain):
    return {"domain": domain, "reasons": [], "error": None, "record": True,
            "registered": None, "expires": None, "registrar": None, "rdap": True}


def check_rdap(domain, base, fetch, sleep, today, acknowledged):
    result = new_result(domain)
    status, body, error = fetch_with_retry(fetch, sleep, base.rstrip("/") + "/domain/" + domain)
    if status == 404:
        result["record"] = False
        result["reasons"].append("the registry has no record of it, so anyone can register it")
        return result
    if status != 200:
        result["error"] = failure(status, error)
        return result
    try:
        data = json.loads(body)
    except ValueError:
        data = None
    if not isinstance(data, dict):
        result["error"] = "the registry's answer was not an RDAP record"
        return result
    registered = event_date(data, "registration")
    expires = event_date(data, "expiration")
    result["registered"], result["expires"], result["registrar"] = registered, expires, registrar_name(data)
    if expires and expires < today:
        result["reasons"].append(f"its registration expired on {expires.isoformat()}")
    statuses = [str(s).lower() for s in data.get("status", [])]
    for deletion in DELETION_STATUSES:
        if any(deletion in s for s in statuses):
            result["reasons"].append(f'its status is "{deletion}", so the registry is about to delete it')
    if registered and (today - registered).days < RECENT_DAYS and acknowledged.get(domain) != registered.isoformat():
        result["reasons"].append(
            f"it was registered on {registered.isoformat()}, in the last year, so it may have changed hands"
        )
    return result


def check_dns(domain, fetch, sleep):
    result = new_result(domain)
    result["rdap"] = False
    status, body, error = fetch_with_retry(fetch, sleep, DNS_URL.format(name=domain))
    if status != 200:
        result["error"] = failure(status, error)
        return result
    try:
        data = json.loads(body)
    except ValueError:
        data = None
    if not isinstance(data, dict):
        result["error"] = "the DNS answer was not a JSON object"
        return result
    if data.get("Status") == 3:
        result["reasons"].append(
            "its registry has no RDAP service, and DNS has no record of it (NXDOMAIN), so it is not registered"
        )
    return result


def check_domain(domain, servers, fetch, sleep, today, acknowledged):
    base = servers.get(domain.rsplit(".", 1)[-1])
    if base:
        return check_rdap(domain, base, fetch, sleep, today, acknowledged)
    return check_dns(domain, fetch, sleep)


def code(text):
    return "`" + str(text).replace("`", "'") + "`"


def write_report(path, findings, failures, links, skipped):
    lines = ["# Linked website domains to check\n"]
    lines.append(
        "Automated check of the domains of the websites that `index.html` links to, using each "
        "domain registry's RDAP service, or DNS where the registry has none. A listing here means "
        "a domain has lapsed, is about to be deleted, or was registered in the last year, which can "
        "mean it has changed hands. If an organisation loses its domain, anyone can register it, "
        "and the planner would keep sending people there.\n"
    )
    lines.append(
        "For each domain, open its links and check the site still belongs to the same organisation. "
        "If it does not, remove or replace the link in `index.html`. If it does, and the domain was "
        "only reported as newly registered, add it with the registration date shown here to "
        "`ACKNOWLEDGED` in `.github/scripts/check_link_domains.py`, so it is not reported again.\n"
    )
    lines.append(
        f"_{skipped} linked domain(s) were skipped: bemyself.uk itself, and names under gov.uk, "
        "nhs.uk and similar, which the public cannot register._\n"
    )
    if findings:
        lines.append("## Needs checking\n")
        for r in findings:
            if not r["rdap"]:
                details = "Registered, expires and registrar: not available, because the registry has no RDAP service"
            elif not r["record"]:
                details = "Registered, expires and registrar: none, because the registry has no record of it"
            else:
                details = (
                    f"Registered: {code(r['registered'] or 'not given')} | "
                    f"Expires: {code(r['expires'] or 'not given')} | "
                    f"Registrar: {code(r['registrar'] or 'not given')}"
                )
            entry = [f"- **{r['domain']}**", f"  Reason: {'; '.join(r['reasons'])}.", f"  {details}", "  Linked from:"]
            entry += [f"  - <{url}>" for url in links[r["domain"]]]
            lines.append("\n".join(entry) + "\n")
    if failures:
        lines.append("## Could not check\n")
        for r in failures:
            lines.append(f"- **{r['domain']}**: {code(r['error'])}\n")
    Path(path).write_text("\n".join(lines) + "\n")


def main():
    if not INDEX_HTML.exists():
        print("index.html not found", file=sys.stderr)
        sys.exit(1)
    links = linked_domains(INDEX_HTML.read_text(encoding="utf-8"))
    to_check = sorted(d for d in links if not is_skipped(d))
    skipped = len(links) - len(to_check)

    status, body, error = fetch_with_retry(curl, time.sleep, BOOTSTRAP_URL)
    try:
        if status != 200:
            raise ValueError(failure(status, error))
        servers = parse_bootstrap(body)
    except ValueError as exc:
        print(f"Could not load IANA's RDAP bootstrap file: {exc}", file=sys.stderr)
        sys.exit(1)

    today = datetime.now(timezone.utc).date()
    findings, failures = [], []
    for i, domain in enumerate(to_check):
        if i:
            time.sleep(REQUEST_GAP)
        try:
            result = check_domain(domain, servers, curl, time.sleep, today, ACKNOWLEDGED)
        except Exception as exc:
            result = new_result(domain)
            result["error"] = f"unexpected answer: {exc}"
        if result["error"]:
            failures.append(result)
            outcome = f"could not check: {result['error']}"
        elif result["reasons"]:
            findings.append(result)
            outcome = "NEEDS CHECKING: " + "; ".join(result["reasons"])
        else:
            outcome = "ok"
        print(f"[{i + 1}/{len(to_check)}] {domain} ... {outcome}", file=sys.stderr)

    print(f"checked={len(to_check)} skipped={skipped}", file=sys.stderr)
    print(f"findings={len(findings)} could_not_check={len(failures)}", file=sys.stderr)
    if findings or failures:
        write_report(REPORT_FILE, findings, failures, links, skipped)
    print("changes_detected=true" if findings else "changes_detected=false")


EXPECTED_DOMAINS = {
    "adult.genderreferralservice.nhs.uk": None,
    "bemyself.uk": None,
    "bso.hscni.net": "hscni.net",
    "cavuhb.nhs.wales": "nhs.wales",
    "cliniq.org.uk": "cliniq.org.uk",
    "creativecommons.org": "creativecommons.org",
    "freedeedpoll.org.uk": "freedeedpoll.org.uk",
    "gender.wales": "gender.wales",
    "genderedintelligence.co.uk": "genderedintelligence.co.uk",
    "github.com": "github.com",
    "ico.org.uk": "ico.org.uk",
    "kb.ros.gov.uk": None,
    "lgbt.foundation": "lgbt.foundation",
    "mermaidsuk.org.uk": "mermaidsuk.org.uk",
    "pcse.england.nhs.uk": None,
    "schema.org": "schema.org",
    "switchboard.lgbt": "switchboard.lgbt",
    "teni.ie": "teni.ie",
    "transactual.org.uk": "transactual.org.uk",
    "transaid.cymru": "transaid.cymru",
    "www.communities-ni.gov.uk": None,
    "www.electoralcommission.org.uk": "electoralcommission.org.uk",
    "www.eoni.org.uk": "eoni.org.uk",
    "www.experian.co.uk": "experian.co.uk",
    "www.finance-ni.gov.uk": None,
    "www.gires.org.uk": "gires.org.uk",
    "www.google.co.uk": "google.co.uk",
    "www.gov.uk": None,
    "www.gov.wales": "gov.wales",
    "www.infrastructure-ni.gov.uk": None,
    "www.ireland.ie": "ireland.ie",
    "www.mygov.scot": "mygov.scot",
    "www.nhs.uk": None,
    "www.nhsinform.scot": "nhsinform.scot",
    "www.nidirect.gov.uk": None,
    "www.nrscotland.gov.uk": None,
    "www.publichealth.hscni.net": "hscni.net",
    "www.rainbowmigration.org.uk": "rainbowmigration.org.uk",
    "www.reddit.com": "reddit.com",
    "www.saas.gov.uk": None,
    "www.scottishtrans.org": "scottishtrans.org",
    "www.w3.org": "w3.org",
}


def rdap_body(registered, expires, statuses=("active",), registrar="Example Registrar Ltd"):
    return json.dumps({
        "objectClassName": "domain",
        "status": list(statuses),
        "events": [
            {"eventAction": "registration", "eventDate": registered + "T09:30:00Z"},
            {"eventAction": "expiration", "eventDate": expires + "T09:30:00.123456789Z"},
        ],
        "entities": [{
            "roles": ["registrar"],
            "handle": "EXAMPLE",
            "vcardArray": ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", registrar]]],
        }],
    }).encode()


def run_selftest():
    """Checks every rule against canned registry answers, with no network
    access, and the registrable-domain rule against every host linked from
    index.html. Exits non-zero, through a failed assert, if anything is wrong.
    """
    today = date(2026, 10, 14)

    servers = parse_bootstrap(json.dumps({"services": [
        [["uk", "wales"], ["https://rdap.example/uk/"]],
        [["org"], ["http://rdap.example/org/", "https://rdap.example/org/"]],
    ]}).encode())
    assert servers == {"uk": "https://rdap.example/uk/", "wales": "https://rdap.example/uk/",
                       "org": "https://rdap.example/org/"}, servers

    rdap = "https://rdap.example/uk/domain/"
    dns = "https://dns.google/resolve?type=NS&name="
    answers = {
        rdap + "old.org.uk": [(200, rdap_body("2004-05-01", "2027-05-01", ["client transfer prohibited"]), None)],
        rdap + "gone.org.uk": [(404, b'{"errorCode":404}', None)],
        rdap + "expired.org.uk": [(200, rdap_body("2010-01-01", "2026-09-30"), None)],
        rdap + "redemption.org.uk": [(200, rdap_body("2010-01-01", "2027-01-01", ["redemption period"]), None)],
        rdap + "deleting.org.uk": [(200, rdap_body("2010-01-01", "2027-01-01", ["pending delete"]), None)],
        rdap + "new.org.uk": [(200, rdap_body("2026-06-01", "2027-06-01"), None)],
        rdap + "flaky.org.uk": [(503, b"", None), (503, b"", None)],
        rdap + "busy.org.uk": [(429, b"error code: 1015", None), (200, rdap_body("2004-05-01", "2027-05-01"), None)],
        rdap + "slow.org.uk": [(None, b"", "timed out"), (200, rdap_body("2004-05-01", "2027-05-01"), None)],
        dns + "missing.ie": [(200, json.dumps({"Status": 3}).encode(), None)],
        dns + "present.ie": [(200, json.dumps({"Status": 0, "Answer": [{"type": 2, "data": "ns1.example.ie."}]}).encode(), None)],
    }
    calls = []
    waits = []

    def fetch(url):
        parsed = urlparse(url)
        if parsed.hostname == "dns.google":
            query = dict(p.split("=", 1) for p in parsed.query.split("&"))
            url = dns + query["name"]
        calls.append(url)
        assert answers.get(url), f"unexpected or repeated request: {url}"
        return answers[url].pop(0)

    def check(domain, acknowledged=None):
        return check_domain(domain, {"uk": "https://rdap.example/uk/"}, fetch, waits.append, today, acknowledged or {})

    r = check("old.org.uk")
    assert r["reasons"] == [] and r["error"] is None, r
    assert r["registered"] == date(2004, 5, 1) and r["expires"] == date(2027, 5, 1), r
    assert r["registrar"] == "Example Registrar Ltd", r

    r = check("gone.org.uk")
    assert r["record"] is False and r["reasons"] and "anyone can register it" in r["reasons"][0], r

    r = check("expired.org.uk")
    assert r["reasons"] == ["its registration expired on 2026-09-30"], r

    r = check("redemption.org.uk")
    assert len(r["reasons"]) == 1 and '"redemption period"' in r["reasons"][0], r

    r = check("deleting.org.uk")
    assert len(r["reasons"]) == 1 and '"pending delete"' in r["reasons"][0], r

    r = check("new.org.uk")
    assert len(r["reasons"]) == 1 and "registered on 2026-06-01" in r["reasons"][0], r
    answers[rdap + "new.org.uk"] = [(200, rdap_body("2026-06-01", "2027-06-01"), None)]
    r = check("new.org.uk", {"new.org.uk": "2026-06-01"})
    assert r["reasons"] == [], f"an acknowledged registration must not be reported: {r}"
    answers[rdap + "new.org.uk"] = [(200, rdap_body("2026-06-01", "2027-06-01"), None)]
    r = check("new.org.uk", {"new.org.uk": "2025-01-01"})
    assert len(r["reasons"]) == 1, f"an acknowledgement for another date must not hide a new registration: {r}"

    r = check("missing.ie")
    assert r["rdap"] is False and r["reasons"] and "NXDOMAIN" in r["reasons"][0], r
    r = check("present.ie")
    assert r["rdap"] is False and r["reasons"] == [] and r["error"] is None, r

    waits.clear()
    r = check("flaky.org.uk")
    assert r["error"] == "HTTP 503" and r["reasons"] == [], f"a failed lookup is not a finding: {r}"
    assert waits == [RETRY_WAIT], f"a 5xx is retried once after a wait: {waits}"
    waits.clear()
    r = check("busy.org.uk")
    assert r["error"] is None and r["reasons"] == [] and waits == [RETRY_WAIT], f"a 429 is retried: {r} {waits}"
    waits.clear()
    r = check("slow.org.uk")
    assert r["error"] is None and r["reasons"] == [] and waits == [RETRY_WAIT], f"a timeout is retried: {r} {waits}"
    assert all(not queue for queue in answers.values()), "every canned answer was used exactly once"
    r = check_rdap("odd.org.uk", "https://rdap.example/uk/", lambda url: (200, b"[1, 2]", None), waits.append, today, {})
    assert r["error"] and r["reasons"] == [], f"an answer that is not an RDAP record cannot be checked: {r}"

    with tempfile.TemporaryDirectory() as tmp:
        report = Path(tmp) / "report.md"
        found = check_rdap("expired.org.uk", "https://rdap.example/uk/",
                           lambda url: (200, rdap_body("2010-01-01", "2026-09-30", registrar="A `Registrar`"), None),
                           waits.append, today, {})
        gone = check_rdap("gone.org.uk", "https://rdap.example/uk/", lambda url: (404, b"", None), waits.append, today, {})
        missing = check_dns("missing.ie", lambda url: (200, b'{"Status": 3}', None), waits.append)
        write_report(report, [found, gone, missing], [{"domain": "flaky.org.uk", "error": "HTTP 503"}],
                     {"expired.org.uk": ["https://expired.org.uk/help"], "gone.org.uk": ["https://gone.org.uk/"],
                      "missing.ie": ["https://www.missing.ie/"]}, 3)
        text = report.read_text()
        for expected in ("**expired.org.uk**", "Reason: its registration expired on 2026-09-30.",
                         "**gone.org.uk**", "none, because the registry has no record of it",
                         "**missing.ie**", "not available, because the registry has no RDAP service",
                         "Registered: `2010-01-01`", "Expires: `2026-09-30`", "Registrar: `A 'Registrar'`",
                         "  - <https://expired.org.uk/help>", "## Could not check", "**flaky.org.uk**: `HTTP 503`",
                         "same organisation", "remove or replace the link", "ACKNOWLEDGED", "_3 linked domain(s)"):
            assert expected in text, f"report is missing {expected!r}:\n{text}"

    for host, expected in {"bso.hscni.net": "hscni.net", "cavuhb.nhs.wales": "nhs.wales",
                           "www.example.co.uk": "example.co.uk", "a.b.example.org": "example.org",
                           "gov.uk": "gov.uk", "www.gov.uk": "gov.uk", "www.nhs.uk": "nhs.uk"}.items():
        assert registrable_domain(host) == expected, (host, registrable_domain(host))
    assert is_skipped(registrable_domain("adult.genderreferralservice.nhs.uk"))
    assert is_skipped("bemyself.uk") and is_skipped("gov.uk") and is_skipped("ros.gov.uk")
    assert not is_skipped("foogov.uk"), "only names under gov.uk are skipped, not every name ending in those letters"

    for host, expected in EXPECTED_DOMAINS.items():
        domain = registrable_domain(host)
        if expected is None:
            assert is_skipped(domain), f"{host} should be skipped, but gives {domain}"
        else:
            assert domain == expected and not is_skipped(domain), f"{host} gives {domain}, expected {expected}"

    hosts = linked_urls(INDEX_HTML.read_text(encoding="utf-8"))
    for host in hosts:
        domain = registrable_domain(host)
        assert host == domain or host.endswith("." + domain), f"{host} gives {domain}, which is not part of it"
        assert len(domain.split(".")) in (2, 3), f"{host} gives {domain}"
        if host in EXPECTED_DOMAINS:
            expected = EXPECTED_DOMAINS[host]
            assert (is_skipped(domain) if expected is None else domain == expected), (host, domain, expected)

    print(f"selftest passed: every rule, and the domains of all {len(hosts)} hosts linked from index.html",
          file=sys.stderr)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        run_selftest()
        sys.exit(0)
    main()
