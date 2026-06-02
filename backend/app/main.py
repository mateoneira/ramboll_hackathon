"""Ramboll Data Viewer — FastAPI backend.

Run (inside AI-env):
    uvicorn app.main:app --reload --port 8000
from the backend/ directory.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routers import contacts, export, files, import_

app = FastAPI(title="Ramboll Data Viewer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
