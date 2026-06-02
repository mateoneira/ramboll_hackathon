"""Ramboll contact loader.

The curated contacts.json is the source of truth the API serves. The scraper is
a best-effort *refresh*: it tries to pull live department contact details from
ramboll.com and merge them in, but the panel never depends on it succeeding.

NOTE: the public Ramboll site may not expose a clean per-department contact
directory, and scraping personal data is ToS/GDPR-sensitive. Keep this as an
opt-in refresh (run_refresh) rather than an automatic call on every request.
"""
from __future__ import annotations

import json
from pathlib import Path

CONTACTS_PATH = Path(__file__).resolve().parent / "contacts.json"
RAMBOLL_BASE = "https://www.ramboll.com/da-dk"


def load_contacts() -> dict:
    """Load the curated/last-refreshed contacts file."""
    with CONTACTS_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def run_refresh() -> dict:
    """Best-effort live refresh. Returns the (possibly updated) contacts dict.

    Safe to fail: on any error we just return the curated data unchanged.
    """
    data = load_contacts()
    try:
        import httpx
        from bs4 import BeautifulSoup

        resp = httpx.get(RAMBOLL_BASE, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Heuristic: collect mailto: links as candidate contacts. The public
        # site rarely maps these to our department taxonomy, so we only fill
        # gaps where a contact has a placeholder email and never overwrite a
        # curated specialist. This is intentionally conservative.
        emails = [
            a.get("href", "").replace("mailto:", "").strip()
            for a in soup.select('a[href^="mailto:"]')
        ]
        emails = [e for e in emails if "@" in e]
        if emails:
            # Record that a live email exists; left for a curator to map.
            data.setdefault("_scraped_emails", emails[:20])
            _save(data)
    except Exception as exc:  # noqa: BLE001 - refresh is best-effort
        data.setdefault("_refresh_error", str(exc))

    return data


def _save(data: dict) -> None:
    with CONTACTS_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
