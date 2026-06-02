"""Vector conversions via geopandas/pyogrio (GDAL).

Import: any OGR-readable vector -> GeoJSON in EPSG:4326 (what the viewer wants).
Export: a cached vector dataset -> geojson / gpkg / shp.
"""
from __future__ import annotations

import json
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd


def _read_any(path: Path) -> gpd.GeoDataFrame:
    """Read a vector file. Zipped shapefiles are read via GDAL's /vsizip/."""
    if path.suffix.lower() == ".zip":
        # Point GDAL at the .shp inside the zip.
        shp = _find_in_zip(path, ".shp")
        if shp is None:
            raise ValueError("Zip does not contain a .shp file")
        return gpd.read_file(f"zip://{path}!{shp}")
    return gpd.read_file(path)


def _find_in_zip(path: Path, suffix: str) -> str | None:
    with zipfile.ZipFile(path) as zf:
        for name in zf.namelist():
            if name.lower().endswith(suffix):
                return name
    return None


def to_geojson(path: Path) -> tuple[dict, list[float] | None]:
    """Convert a vector file to a GeoJSON dict reprojected to EPSG:4326.

    Returns (geojson, bbox) where bbox is [minx, miny, maxx, maxy] or None.
    """
    gdf = _read_any(path)
    if gdf.crs is None:
        # No .prj / CRS metadata -> assume WGS84 (documented assumption).
        gdf.set_crs(epsg=4326, inplace=True)
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    bbox = None
    if not gdf.empty:
        b = gdf.total_bounds  # [minx, miny, maxx, maxy]
        if all(map(_finite, b)):
            bbox = [float(b[0]), float(b[1]), float(b[2]), float(b[3])]

    geojson = json.loads(gdf.to_json())
    return geojson, bbox


def export(path: Path, target: str, out_dir: Path, stem: str) -> Path:
    """Export a cached vector source to the requested format. Returns the file
    (or a zip, for shapefile). Conversion goes through the original upload for
    maximum fidelity."""
    gdf = _read_any(path)
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)

    if target == "geojson":
        out = out_dir / f"{stem}.geojson"
        gdf.to_file(out, driver="GeoJSON")
        return out

    if target == "gpkg":
        out = out_dir / f"{stem}.gpkg"
        gdf.to_file(out, driver="GPKG", layer=stem)
        return out

    if target == "shp":
        # Shapefile is multi-file; write into a temp dir then zip it.
        with tempfile.TemporaryDirectory() as td:
            shp = Path(td) / f"{stem}.shp"
            gdf.to_file(shp, driver="ESRI Shapefile")
            out = out_dir / f"{stem}.zip"
            with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
                for f in Path(td).glob(f"{stem}.*"):
                    zf.write(f, f.name)
            return out

    raise ValueError(f"Unsupported vector export target: {target}")


def _finite(x: float) -> bool:
    return x == x and x not in (float("inf"), float("-inf"))
