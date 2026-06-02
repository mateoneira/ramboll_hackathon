"""Runtime configuration and shared paths for the backend."""
from __future__ import annotations

import os
from pathlib import Path

# Working directory for converted/cached files (gitignored).
TMP_DIR = Path(os.environ.get("RAMBOLL_TMP", Path(__file__).resolve().parent.parent / "tmp"))
TMP_DIR.mkdir(parents=True, exist_ok=True)

# Upload size ceiling (bytes). IFC/CAD can be large; cap to protect the host.
MAX_UPLOAD_BYTES = int(os.environ.get("RAMBOLL_MAX_UPLOAD", 500 * 1024 * 1024))

# CORS origins allowed to call the API (Vite dev server by default).
CORS_ORIGINS = os.environ.get(
    "RAMBOLL_CORS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# How long cached artifacts live before cleanup (seconds).
ARTIFACT_TTL = int(os.environ.get("RAMBOLL_TTL", 3600))
