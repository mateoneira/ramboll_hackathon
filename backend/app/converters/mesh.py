"""CAD mesh conversions via trimesh (obj, dxf-3D, glb) with assimp for fbx.

Import: obj/dxf/glb -> GLB (recentered to local origin).
Export: a cached mesh source -> glb / obj.
"""
from __future__ import annotations

from pathlib import Path

import trimesh

from . import fbx


def _load(path: Path) -> trimesh.Scene:
    """Load a mesh/scene. FBX is delegated to assimp (trimesh can't read it)."""
    suffix = path.suffix.lower()
    if suffix == ".fbx":
        glb = fbx.fbx_to_glb(path, path.parent, path.stem)
        loaded = trimesh.load(glb, force="scene")
    else:
        loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        return trimesh.Scene(loaded)
    return loaded


def _recenter(scene: trimesh.Scene) -> trimesh.Scene:
    """Translate the scene so its bounds centre sits at the origin."""
    if scene.bounds is None:
        return scene
    centre = scene.bounds.mean(axis=0)
    scene.apply_translation(-centre)
    return scene


def to_glb(path: Path, out_dir: Path, stem: str) -> Path:
    """Convert an obj/dxf/glb (or fbx) to a recentered GLB."""
    scene = _recenter(_load(path))
    out = out_dir / f"{stem}.glb"
    scene.export(out, file_type="glb")
    return out


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
