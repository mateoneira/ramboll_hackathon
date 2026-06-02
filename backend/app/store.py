"""In-memory registry of imported datasets, backed by files in TMP_DIR.

Each imported file gets an id. We cache the ORIGINAL upload bytes (for highest
fidelity export) plus the canonical artifact (geojson/glb) we sent to the viewer.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock

from .config import ARTIFACT_TTL, TMP_DIR


@dataclass
class Dataset:
    id: str
    name: str
    source_format: str
    kind: str  # vector | mesh | bim
    original_path: Path
    canonical_path: Path | None = None
    canonical: str | None = None  # geojson | glb
    created: float = field(default_factory=time.time)


class Store:
    def __init__(self) -> None:
        self._items: dict[str, Dataset] = {}
        self._lock = Lock()

    def new_id(self) -> str:
        return uuid.uuid4().hex[:12]

    def put(self, ds: Dataset) -> None:
        with self._lock:
            self._items[ds.id] = ds
            self._evict_expired()

    def get(self, ds_id: str) -> Dataset | None:
        with self._lock:
            return self._items.get(ds_id)

    def workdir(self, ds_id: str) -> Path:
        d = TMP_DIR / ds_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _evict_expired(self) -> None:
        now = time.time()
        expired = [k for k, v in self._items.items() if now - v.created > ARTIFACT_TTL]
        for k in expired:
            ds = self._items.pop(k, None)
            if ds:
                _rmtree(TMP_DIR / ds.id)


def _rmtree(path: Path) -> None:
    if not path.exists():
        return
    for child in path.glob("**/*"):
        if child.is_file():
            child.unlink(missing_ok=True)
    try:
        for child in sorted(path.glob("**/*"), reverse=True):
            if child.is_dir():
                child.rmdir()
        path.rmdir()
    except OSError:
        pass


store = Store()
