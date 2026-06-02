"""GET /api/contacts — serve Ramboll department contacts for the UI panel.

POST /api/contacts/refresh triggers a best-effort live scrape (opt-in).
"""
from __future__ import annotations

from fastapi import APIRouter

from ..contacts import scraper

router = APIRouter()


@router.get("/contacts")
def get_contacts() -> dict:
    return scraper.load_contacts()


@router.post("/contacts/refresh")
def refresh_contacts() -> dict:
    return scraper.run_refresh()
