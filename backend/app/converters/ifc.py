"""IFC (BIM) -> GLB via the IfcConvert CLI bundled with ifcopenshell.

We shell out to IfcConvert rather than the Python gltf serializer because the
CLI is more robust across element types. --center-model recenters local
coordinates so the viewer can anchor the model at the WGS84 origin extracted
from IfcSite.
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

CONVERT_TIMEOUT = 600


def _ifcconvert_bin() -> str:
    exe = shutil.which("IfcConvert")
    if exe is None:
        raise RuntimeError(
            "IfcConvert not found on PATH. Install ifcopenshell into the env "
            "(see backend/environment.yml)."
        )
    return exe


def _dms_to_dd(dms: tuple) -> float:
    """IfcCompoundPlaneAngleMeasure (degrees, minutes, seconds[, millionths]) → decimal degrees."""
    d, m, s = int(dms[0]), int(dms[1]), int(dms[2])
    us = int(dms[3]) if len(dms) > 3 else 0
    dd = abs(d) + m / 60.0 + (s + us / 1_000_000.0) / 3600.0
    return dd if d >= 0 else -dd


def _extract_site_origin(ifc_path: Path) -> list[float] | None:
    """Read IfcSite.RefLatitude/RefLongitude/RefElevation → [lon, lat, height]."""
    try:
        import ifcopenshell  # type: ignore[import]

        f = ifcopenshell.open(str(ifc_path))
        sites = f.by_type("IfcSite")
        if not sites:
            return None
        site = sites[0]
        if site.RefLatitude is None or site.RefLongitude is None:
            return None
        lat = _dms_to_dd(site.RefLatitude)
        lon = _dms_to_dd(site.RefLongitude)
        elev = float(site.RefElevation) if site.RefElevation is not None else 0.0
        return [lon, lat, elev]
    except Exception:  # noqa: BLE001
        return None


def to_glb(path: Path, out_dir: Path, stem: str) -> tuple[Path, list[float] | None]:
    """Convert an .ifc file to a centered GLB. Returns (glb_path, origin)."""
    origin = _extract_site_origin(path)
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
    return out, origin
