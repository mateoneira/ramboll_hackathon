"""CAD mesh conversions via trimesh (obj, dxf-3D, glb) with assimp for fbx.

Import: obj/dxf/glb -> GLB recentered to local origin, optionally georeferenced.
Export: a cached mesh source -> glb / obj.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh
from pyproj import Transformer

from . import fbx

# WGS84 bounding box for Denmark + near neighbours (used to validate reprojection).
_DK_LAT = (54.0, 58.5)
_DK_LON = (7.5, 16.0)

# Building/terrain heights in Denmark are well within ±500 m.
_MAX_HEIGHT = 500.0

# Transformers for UTM zone 32N and 33N (both used in Danish projects).
_T32 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
_T33 = Transformer.from_crs("EPSG:25833", "EPSG:4326", always_xy=True)


def _centroid_origin(centre: np.ndarray) -> list[float] | None:
    """Return [lon, lat, height] if the centroid looks like Danish UTM, else None.

    CityEngine (and most GIS-aware CAD tools) export OBJ with Y-up, meaning:
      X = Easting,  Y = Elevation (metres),  Z = −Northing
    We detect this by checking height (Y) and trying both UTM 32N and 33N.
    """
    x, y, z = float(centre[0]), float(centre[1]), float(centre[2])
    easting, northing, height = x, -z, y  # Y-up: negate Z to recover northing

    if abs(height) > _MAX_HEIGHT:
        return None  # Y is not elevation — not a Y-up UTM file

    for transformer in (_T32, _T33):
        try:
            lon, lat = transformer.transform(easting, northing)
            if _DK_LAT[0] <= lat <= _DK_LAT[1] and _DK_LON[0] <= lon <= _DK_LON[1]:
                return [lon, lat, height]
        except Exception:  # noqa: BLE001
            pass
    return None


def _compute_vertex_normals(scene: trimesh.Scene) -> None:
    """Ensure every Trimesh in the scene has vertex normals for smooth shading."""
    for geom in scene.geometry.values():
        if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 0:
            # Accessing .vertex_normals triggers computation and caches the result.
            _ = geom.vertex_normals


def _load(path: Path) -> trimesh.Scene:
    suffix = path.suffix.lower()
    if suffix == ".fbx":
        glb = fbx.fbx_to_glb(path, path.parent, path.stem)
        loaded = trimesh.load(glb, force="scene")
    else:
        loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        return trimesh.Scene(loaded)
    return loaded


def to_glb(path: Path, out_dir: Path, stem: str) -> tuple[Path, list[float] | None]:
    """Convert an obj/dxf/glb/fbx to a centered GLB.

    Returns (glb_path, origin) where origin is [lon, lat, height] in WGS84 if
    the source coordinates look like UTM 32N (Denmark), otherwise None.
    """
    scene = _load(path)
    origin: list[float] | None = None
    if scene.bounds is not None:
        centre = scene.bounds.mean(axis=0)
        origin = _centroid_origin(centre)
        scene.apply_translation(-centre)
    _compute_vertex_normals(scene)
    out = out_dir / f"{stem}.glb"
    scene.export(out, file_type="glb")
    return out, origin


def export(path: Path, target: str, out_dir: Path, stem: str) -> Path:
    scene = _load(path)
    if target == "glb":
        out = out_dir / f"{stem}.glb"
        scene.export(out, file_type="glb")
        return out
    if target == "obj":
        out = out_dir / f"{stem}.obj"
        scene.export(out, file_type="obj")
        return out
    if target == "fbx":
        glb = _ensure_glb(scene, out_dir, stem)
        return fbx.glb_to_fbx(glb, out_dir, stem)
    raise ValueError(f"Unsupported mesh export target: {target}")


def _ensure_glb(scene: trimesh.Scene, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.glb"
    scene.export(out, file_type="glb")
    return out
