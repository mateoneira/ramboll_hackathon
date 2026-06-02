"""POST /api/convert/import — detect, convert to canonical, register, respond."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import MAX_UPLOAD_BYTES
from ..detection import FORMAT_INFO, detect_format
from ..store import Dataset, store
from ..converters import ifc, mesh, vector

router = APIRouter()


@router.post("/convert/import")
async def convert_import(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File exceeds the upload size limit")

    fmt = detect_format(file.filename or "upload", data[:64])
    if fmt not in FORMAT_INFO:
        raise HTTPException(415, f"Unsupported format: {fmt}")

    kind, canonical = FORMAT_INFO[fmt]
    ds_id = store.new_id()
    workdir = store.workdir(ds_id)
    stem = Path(file.filename or "upload").stem or "data"

    original = workdir / (file.filename or f"upload.{fmt}")
    original.write_bytes(data)

    ds = Dataset(
        id=ds_id,
        name=stem,
        source_format=fmt,
        kind=kind,
        original_path=original,
        canonical=canonical,
    )

    try:
        if canonical == "geojson":
            geojson, bbox = vector.to_geojson(original)
            store.put(ds)
            return {
                "id": ds_id,
                "layerName": stem,
                "canonical": "geojson",
                "kind": kind,
                "crs": "EPSG:4326",
                "bbox": bbox,
                "origin": None,
                "geojson": geojson,
            }

        # canonical == "glb"
        if fmt == "ifc":
            glb = ifc.to_glb(original, workdir, stem)
        else:
            glb = mesh.to_glb(original, workdir, stem)
        ds.canonical_path = glb
        store.put(ds)
        return {
            "id": ds_id,
            "layerName": stem,
            "canonical": "glb",
            "kind": kind,
            "crs": None,
            "bbox": None,
            "origin": None,
            "url": f"/api/files/{ds_id}",
        }
    except Exception as exc:  # noqa: BLE001 - surface conversion errors to client
        raise HTTPException(422, f"Conversion failed: {exc}") from exc
