"""CAD mesh conversions via trimesh (obj, dxf-3D, glb) with assimp for fbx.

Import: obj/dxf/glb -> GLB grounded at origin, optionally georeferenced.
Export: a cached mesh source -> glb / obj / dxf.
"""
from __future__ import annotations

from pathlib import Path

import ezdxf
import numpy as np
import trimesh
import trimesh.visual.material
import trimesh.visual.texture
from ezdxf.math import Vec3
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

# Default PBR material: light architectural grey, no embedded texture.
# Using PBRMaterial without a baseColorTexture is critical — trimesh's
# default solid-colour-as-PNG visual suppresses vertex normals in the GLB
# export, causing flat/black rendering in Cesium.
_DEFAULT_MATERIAL = trimesh.visual.material.PBRMaterial(
    baseColorFactor=np.array([0.82, 0.82, 0.82, 1.0]),
    roughnessFactor=0.65,
    metallicFactor=0.05,
)


def _centroid_origin(centre: np.ndarray) -> list[float] | None:
    """Return [lon, lat, 0.0] if the centroid looks like Danish UTM, else None.

    CityEngine OBJ exports use Y-up: X = Easting, Y = Elevation, Z = −Northing.
    We check Y as height (must be ≤ 500 m) and try UTM 32N then 33N,
    validating the result falls within the Denmark bounding box.
    Height is always returned as 0.0 so the model sits on the Cesium ellipsoid.
    """
    x, y, z = float(centre[0]), float(centre[1]), float(centre[2])
    easting, northing, height = x, -z, y

    if abs(height) > _MAX_HEIGHT:
        return None

    for transformer in (_T32, _T33):
        try:
            lon, lat = transformer.transform(easting, northing)
            if _DK_LAT[0] <= lat <= _DK_LAT[1] and _DK_LON[0] <= lon <= _DK_LON[1]:
                return [lon, lat, 0.0]  # height=0: sit on ellipsoid (no terrain)
        except Exception:  # noqa: BLE001
            pass
    return None


def _prepare_geometry(scene: trimesh.Scene) -> None:
    """For every Trimesh: compute vertex normals and apply a plain PBR material.

    The plain PBR path (no baseColorTexture) is the only trimesh export path
    that writes NORMAL attributes into the GLB — the texture-based path drops
    them. This gives Cesium the data it needs for directional lighting.
    """
    for geom in scene.geometry.values():
        if not isinstance(geom, trimesh.Trimesh) or len(geom.vertices) == 0:
            continue
        _ = geom.vertex_normals  # trigger computation and cache
        geom.visual = trimesh.visual.texture.TextureVisuals(
            material=_DEFAULT_MATERIAL
        )


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
    """Convert an obj/dxf/glb/fbx to a grounded, lit GLB.

    Placement:
    - X and Z (horizontal) are centered at the bounds centroid.
    - Y (vertical) is translated so the model floor sits at Y=0, matching
      Cesium's ellipsoid surface when placed at height=0.

    Returns (glb_path, origin) where origin is [lon, lat, 0.0] in WGS84 if
    the source coordinates look like Danish UTM, otherwise None.
    """
    scene = _load(path)
    origin: list[float] | None = None
    if scene.bounds is not None:
        centre = scene.bounds.mean(axis=0)
        y_min = float(scene.bounds[0, 1])
        origin = _centroid_origin(centre)
        # Centre X/Z, ground Y so the floor is at Y=0.
        scene.apply_translation([-centre[0], -y_min, -centre[2]])
    _prepare_geometry(scene)
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
    if target == "dxf":
        return _export_dxf(scene, out_dir, stem)
    raise ValueError(f"Unsupported mesh export target: {target}")


def _export_dxf(scene: trimesh.Scene, out_dir: Path, stem: str) -> Path:
    """Write every triangle in the scene as a 3DFACE entity in a DXF file.

    3DFACE is a planar quadrilateral — for triangles the 3rd and 4th vertices
    are identical. This is the most universally compatible 3D mesh representation
    in DXF (supported by AutoCAD R12+ and all common CAD tools).
    """
    doc = ezdxf.new("R2010")
    msp = doc.modelspace()

    for geom in scene.geometry.values():
        if not isinstance(geom, trimesh.Trimesh) or len(geom.faces) == 0:
            continue
        verts = geom.vertices
        for face in geom.faces:
            v0 = Vec3(float(verts[face[0], 0]), float(verts[face[0], 1]), float(verts[face[0], 2]))
            v1 = Vec3(float(verts[face[1], 0]), float(verts[face[1], 1]), float(verts[face[1], 2]))
            v2 = Vec3(float(verts[face[2], 0]), float(verts[face[2], 1]), float(verts[face[2], 2]))
            msp.add_3dface([v0, v1, v2, v2])

    out = out_dir / f"{stem}.dxf"
    doc.saveas(str(out))
    return out


def _ensure_glb(scene: trimesh.Scene, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.glb"
    scene.export(out, file_type="glb")
    return out
