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

# UTM 32N (EPSG:25832) bounding box for Denmark + near neighbours.
# If the mesh centroid falls inside, we interpret coordinates as real-world
# UTM 32N and reproject to WGS84 for the Cesium anchor.
_E_MIN, _E_MAX = 400_000.0, 900_000.0
_N_MIN, _N_MAX = 5_900_000.0, 6_900_000.0
_TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)


def _centroid_origin(centre: np.ndarray) -> list[float] | None:
    """Return [lon, lat, height] if centre looks like UTM 32N, else None."""
    cx, cy, cz = float(centre[0]), float(centre[1]), float(centre[2])
    if _E_MIN <= cx <= _E_MAX and _N_MIN <= cy <= _N_MAX:
        lon, lat = _TO_WGS84.transform(cx, cy)
        return [lon, lat, cz]
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
