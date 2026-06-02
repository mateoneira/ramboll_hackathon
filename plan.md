# General web based import export

- very simply interface, anyone can use it
- 3D/2D basemap viewer
- user drops a file, platform automatically infers type, and loads it into the viewer
- export let's users choose the file format
- it should work fast

# Data that it should handle

## GIS

- Shapefiles
- geojson
- geopackage

## CAD
- dxf
- dwg
- dng
- fbx
- obj

## BIM
- ifc
- rvt (revit file)

---

# Implementation Plan

## Context

Build a dead-simple web app where anyone can drag-drop a geospatial, CAD, or BIM file,
have its type auto-detected, see it in a 2D/3D basemap viewer, and export it to a format
of their choice — and it must feel fast.

This is a **greenfield** project (only `CLAUDE.md`, an empty `package.json`, and git exist
today). We build from scratch.

**Confirmed scope decisions:**
- Architecture: **browser viewer + Python conversion backend** (FastAPI in the `AI-env`
  micromamba env). The backend exists so proprietary formats can be added later without
  re-architecting.
- **V1 must-have formats:** GIS (geojson, shapefile, geopackage), CAD meshes (obj, fbx,
  dxf), BIM (ifc) — the in-browser/open-source-tractable tier.
- **Phase 2 (deferred):** DGN (MicroStation, via GDAL), DWG (via ODA), RVT/Revit (needs
  Autodesk APS cloud). The "dng" above was confirmed to mean **DGN**.

## Core design

Everything reduces to **two canonical web formats** the viewer consumes:
- **Vector → GeoJSON** (always reprojected to EPSG:4326)
- **3D mesh / BIM → GLB** (glTF binary, recentered to local origin)

Every importer emits one of those plus a small metadata envelope
(`{canonical, kind, crs, bbox, origin, layerName, url}`) so the viewer can place and fit
the data. Cross-category export is blocked by design (a mesh can't become a shapefile);
the export picker is driven by a capability matrix.

**Viewer:** MapLibre GL JS for 2D (open, no token) + **CesiumJS** for 3D, toggled. Cesium
is chosen over three.js because it natively handles *both* georeferenced GIS data
(globe/WGS84) *and* local-coordinate CAD/BIM meshes in one scene — local meshes are placed
via `Transforms.eastNorthUpToFixedFrame(origin)` + `modelMatrix`, defaulting to map center
with a manual lat/lon/height/scale nudge control.

## Tech stack

**Frontend:** Vite + React + TypeScript. State via a small `zustand` layer store (no Redux).
Packages: `maplibre-gl`, `cesium` + `vite-plugin-cesium`, `@turf/turf` (bbox / camera fit),
`dxf-parser` (client 2D DXF fast path), `shpjs` (optional client shp).

**Backend (FastAPI in `AI-env`):** install via conda-forge, **not pip**, for a consistent
native GDAL/PROJ stack:
```
micromamba install -n AI-env -c conda-forge geopandas pyogrio shapely pyproj gdal \
  ifcopenshell assimp trimesh pygltflib fastapi uvicorn python-multipart orjson
```
- Vector (shp/gpkg/geojson read+write+reproject): **geopandas** (pyogrio engine).
- BIM (ifc → glb): **IfcConvert** CLI (`IfcConvert in.ifc out.glb --center-model`).
- Mesh (obj, dxf-3D → glb / glb → obj): **trimesh** + **pygltflib**.
- FBX (weakest link): **assimp** (`assimp export in.fbx out.glb`); best-effort.

## Import pipeline

`drop → detectType(ext + magic bytes) → route → produce canonical → add layer → fit camera`

- **Client fast path (no round trip):** geojson (JSON.parse), glb/gltf (passthrough to
  Cesium), 2D dxf (`dxf-parser` → GeoJSON).
- **Backend robust path:** shapefile (.zip), geopackage (.gpkg), ifc, obj, fbx, 3D dxf.
  `POST /convert/import` (multipart) → writes canonical to a temp store keyed by id →
  returns metadata envelope; viewer fetches `url` or reads inline GeoJSON.

## Export pipeline

`loaded layer → pick target format → POST /convert/export {layerId, target} → download`.
Backend converts from the **cached original upload** (highest fidelity) where possible.
- Vector → geojson, gpkg, shp (geopandas).
- Mesh/BIM → glb, obj (trimesh); fbx optional. (Writing IFC is out of scope.)

## Project structure

```
frontend/  (Vite+React+TS)
  src/ingest/{detectType,clientParsers,importController}.ts   # detection + routing
  src/viewer/{Map2D,Viewer3D}.tsx + {addGeoJson,addGlb}.ts    # MapLibre + Cesium
  src/export/{ExportPanel.tsx,exportClient.ts}                # capability-matrix picker
  src/store/layers.ts  src/api/client.ts  src/ui/{DropZone,LayerList,Spinner}.tsx
backend/   (FastAPI, AI-env)
  app/main.py                                                 # app, CORS, routers
  app/routers/{import_,export,files}.py
  app/converters/{vector,ifc,mesh,fbx}.py                     # the conversion logic
  app/{detection,store,config}.py                             # sniff, temp cache, limits
  environment.yml                                             # conda-forge env spec
```

**Critical files:**
- `frontend/src/ingest/importController.ts` — detection, routing, canonical envelope.
- `frontend/src/viewer/addGlb.ts` — Cesium `modelMatrix` placement of local-coord meshes (highest-risk viewer logic).
- `backend/app/converters/vector.py` — geopandas read/write/reproject (most import + all vector export).
- `backend/app/converters/ifc.py` — IfcConvert → GLB (biggest wow + biggest perf risk).
- `backend/app/main.py` — FastAPI app, routers, CORS, temp store.

## Milestones (each independently demoable)

- **M0 — Skeleton:** Vite app boots; FastAPI `/health`; CORS; root dev scripts run both.
- **M1 — 2D viewer + GeoJSON drop (hero moment):** MapLibre basemap + DropZone + client
  geojson parse → instant render + fit bounds. No backend. Nails "feels fast."
- **M2 — Backend vector import:** geopandas; shp(.zip) + gpkg → GeoJSON; layer list.
- **M3 — 3D viewer + GLB:** Cesium + 2D/3D toggle; drop .glb → place at map center.
- **M4 — IFC:** IfcConvert → GLB → Cesium. Strong MVP stops here.
- **M5 — OBJ/FBX/DXF meshes:** trimesh (obj, dxf-3D) + assimp (fbx).
- **M6 — Export:** capability-matrix picker; vector→geojson/gpkg/shp, mesh→glb/obj.
- **M7 — Polish:** progress/error states, large-file handling, DXF-2D client path, styling.

## Key risks & mitigations

- **GDAL install:** conda-forge only (never `pip install gdal`); keep `environment.yml`.
- **FBX:** Python-native support is poor → assimp, best-effort, validate on known-good sample.
- **IFC size/perf:** files can be 100s of MB and produce huge meshes → run in threadpool with
  timeout, `--center-model`, cap upload size, moderate demo file; optional draco/meshopt.
- **Georef + local coords (core risk):** vectors always → EPSG:4326; meshes placed via
  `eastNorthUpToFixedFrame(origin)`, origin = map center + manual nudge. Cesium auto Y-up→Z-up
  — don't double-correct.
- **Large GeoJSON on client:** parse in a web worker / lean on MapLibre tiling; simplify
  server-side for huge vectors; `orjson` for fast serialization.
- **Shapefile:** require `.zip` (multi-file dependency); missing `.prj` → assume 4326.
- **Cesium in Vite:** use `vite-plugin-cesium` so workers/WASM/assets resolve.

## Verification

- **M1:** `npm run dev` in `frontend/`; drop a sample `.geojson` → renders instantly, camera fits.
- **Backend:** `uvicorn app.main:app --reload` in `AI-env`; `curl /health`; `curl -F file=@sample.zip /convert/import` returns a GeoJSON envelope.
- **Per format:** drop one known-good sample of each (shp.zip, gpkg, glb, ifc, obj, dxf) and
  confirm it lands in the correct viewer (2D for vector, 3D for mesh/BIM).
- **Export round-trip:** import shapefile → export gpkg → re-import and confirm match; import
  ifc → export glb → re-import.
- Provide a small `samples/` folder of test files for repeatable manual verification.