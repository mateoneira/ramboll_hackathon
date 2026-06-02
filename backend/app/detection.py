"""Server-side format detection (defence in depth; mirrors the client logic)."""
from __future__ import annotations

from pathlib import Path

# format -> (data kind, canonical output)
FORMAT_INFO: dict[str, tuple[str, str]] = {
    "geojson": ("vector", "geojson"),
    "shp": ("vector", "geojson"),
    "gpkg": ("vector", "geojson"),
    "dxf": ("mesh", "glb"),  # treated as CAD; 2D variants still render as mesh lines
    "obj": ("mesh", "glb"),
    "fbx": ("mesh", "glb"),
    "ifc": ("bim", "glb"),
    "glb": ("mesh", "glb"),
}

_EXT = {
    ".geojson": "geojson",
    ".json": "geojson",
    ".shp": "shp",
    ".zip": "shp",
    ".gpkg": "gpkg",
    ".dxf": "dxf",
    ".obj": "obj",
    ".fbx": "fbx",
    ".ifc": "ifc",
    ".glb": "glb",
    ".gltf": "glb",
}


def detect_format(filename: str, head: bytes) -> str:
    """Return a source format string from extension + magic bytes."""
    fmt = _EXT.get(Path(filename).suffix.lower(), "unknown")

    if head[:15] == b"SQLite format 3":
        return "gpkg"
    if head[:4] == b"glTF":
        return "glb"
    if head[:12] == b"ISO-10303-21":
        return "ifc"
    if head[:4] == b"PK\x03\x04" and fmt == "unknown":
        return "shp"  # zipped shapefile
    return fmt
