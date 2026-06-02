"""FBX <-> GLB via pyassimp (wraps the libassimp shared library).

Python-native FBX support is poor; pyassimp is the most reliable open route.
Treated as best-effort: some FBX 2019+ variants may fail.
"""
from __future__ import annotations

from pathlib import Path

import pyassimp


def fbx_to_glb(path: Path, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.glb"
    with pyassimp.load(str(path)) as scene:
        pyassimp.export(scene, str(out), "glb2")
    if not out.exists():
        raise RuntimeError("pyassimp did not produce a GLB (unsupported FBX variant?)")
    return out


def glb_to_fbx(path: Path, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.fbx"
    with pyassimp.load(str(path)) as scene:
        pyassimp.export(scene, str(out), "fbx")
    if not out.exists():
        raise RuntimeError("pyassimp did not produce an FBX")
    return out
