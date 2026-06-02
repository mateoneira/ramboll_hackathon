"""POST /api/convert/export — convert a cached dataset to a chosen format."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..store import store
from ..converters import mesh, vector

router = APIRouter()

# Same-category capability matrix (enforced server-side too).
VECTOR_TARGETS = {"geojson", "gpkg", "shp"}
MESH_TARGETS = {"glb", "obj", "fbx", "dxf"}


class ExportRequest(BaseModel):
    layerId: str
    target: str


@router.post("/convert/export")
def convert_export(req: ExportRequest) -> FileResponse:
    ds = store.get(req.layerId)
    if ds is None:
        raise HTTPException(404, "Unknown layer id (it may have expired)")

    out_dir = store.workdir(ds.id)
    target = req.target.lower()

    try:
        if ds.kind == "vector":
            if target not in VECTOR_TARGETS:
                raise HTTPException(400, f"Vector cannot export to '{target}'")
            out = vector.export(ds.original_path, target, out_dir, ds.name)
        else:  # mesh | bim
            if target not in MESH_TARGETS:
                raise HTTPException(400, f"Mesh/BIM cannot export to '{target}'")
            # Export from the canonical GLB (BIM has no original mesh to re-read).
            source = ds.canonical_path or ds.original_path
            out = mesh.export(source, target, out_dir, ds.name)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, f"Export failed: {exc}") from exc

    return FileResponse(out, filename=out.name)
