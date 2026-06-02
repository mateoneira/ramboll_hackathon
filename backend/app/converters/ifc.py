"""IFC (BIM) -> GLB via the IfcConvert CLI bundled with ifcopenshell.

We shell out to IfcConvert rather than the Python gltf serializer because the
CLI is more robust across element types. --center-model recenters local
coordinates so the viewer can anchor the model cleanly at a chosen origin.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

# IfcConvert can run for a long time on large models; cap it.
CONVERT_TIMEOUT = 600


def _ifcconvert_bin() -> str:
    exe = shutil.which("IfcConvert")
    if exe is None:
        raise RuntimeError(
            "IfcConvert not found on PATH. Install ifcopenshell into AI-env "
            "(see backend/environment.yml)."
        )
    return exe


def to_glb(path: Path, out_dir: Path, stem: str) -> Path:
    """Convert an .ifc file to a .glb. Returns the GLB path."""
    out = out_dir / f"{stem}.glb"
    cmd = [
        _ifcconvert_bin(),
        "--use-element-guids",
        "--center-model",
        str(path),
        str(out),
    ]
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=CONVERT_TIMEOUT,
    )
    if proc.returncode != 0 or not out.exists():
        raise RuntimeError(
            f"IfcConvert failed: {proc.stderr.strip() or proc.stdout.strip()}"
        )
    return out
