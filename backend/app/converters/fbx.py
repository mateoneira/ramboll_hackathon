"""FBX <-> GLB via the assimp CLI.

Python-native FBX support is poor, so we shell out to assimp, which is the most
reliable open route. Treated as best-effort: some FBX 2019+ variants may fail.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

CONVERT_TIMEOUT = 300


def _assimp_bin() -> str:
    exe = shutil.which("assimp")
    if exe is None:
        raise RuntimeError(
            "assimp not found on PATH. Install assimp into AI-env "
            "(see backend/environment.yml)."
        )
    return exe


def _run(args: list[str]) -> None:
    proc = subprocess.run(args, capture_output=True, text=True, timeout=CONVERT_TIMEOUT)
    if proc.returncode != 0:
        raise RuntimeError(
            f"assimp failed: {proc.stderr.strip() or proc.stdout.strip()}"
        )


def fbx_to_glb(path: Path, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.glb"
    _run([_assimp_bin(), "export", str(path), str(out)])
    if not out.exists():
        raise RuntimeError("assimp did not produce a GLB (unsupported FBX variant?)")
    return out


def glb_to_fbx(path: Path, out_dir: Path, stem: str) -> Path:
    out = out_dir / f"{stem}.fbx"
    _run([_assimp_bin(), "export", str(path), str(out)])
    if not out.exists():
        raise RuntimeError("assimp did not produce an FBX")
    return out
