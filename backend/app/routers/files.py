"""GET /api/files/{id} — serve a dataset's canonical artifact (e.g. GLB)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..store import store

router = APIRouter()


@router.get("/files/{ds_id}")
def get_file(ds_id: str) -> FileResponse:
    ds = store.get(ds_id)
    if ds is None or ds.canonical_path is None or not ds.canonical_path.exists():
        raise HTTPException(404, "Artifact not found (it may have expired)")
    media = "model/gltf-binary" if ds.canonical == "glb" else "application/octet-stream"
    return FileResponse(ds.canonical_path, media_type=media, filename=ds.canonical_path.name)
