# Ramboll Data Viewer

A simple web app to drag-drop GIS / CAD / BIM files, auto-detect the type, view
them in a 2D/3D basemap, and export to another format (incl. a branded PDF of a
marked area). See [`plan.md`](./plan.md) for the full design and milestones.

## Layout

```
frontend/   Vite + React + TS viewer (MapLibre 2D today; Cesium 3D next)
backend/    FastAPI conversion service (geopandas / IfcConvert / trimesh / assimp)
samples/    Test files for manual verification
```

## Run the frontend (M1 — works standalone, no backend needed)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Drop `samples/copenhagen-points.geojson` onto the dropzone — it renders instantly
on the map and the camera fits to it. GeoJSON and GLB are handled fully in the
browser; everything else routes to the backend.

Switch product framing with `?mode=internal` or `?mode=external` (default external).

## Run the backend (needed for shp / gpkg / ifc / obj / fbx / dxf and export)

Install the native stack into the managed `AI-env` (conda-forge, **not pip**, for GDAL):

```bash
micromamba install -n AI-env -c conda-forge --file backend/environment.yml
```

Then:

```bash
cd backend
uvicorn app.main:app --reload --port 8000     # http://localhost:8000/api/health
```

The Vite dev server proxies `/api/*` to `:8000`, so the frontend "just works"
once the backend is up.

## Status / milestones

- [x] **M1** — 2D MapLibre viewer + drag-drop GeoJSON/GLB + Ramboll branding + contact panel
- [x] Backend scaffold — import/export/files/contacts endpoints + converters (vector/ifc/mesh/fbx)
- [ ] **M2** — wire backend vector import end-to-end (verify shp/gpkg)
- [ ] **M3** — Cesium 3D viewer + GLB placement + 2D/3D toggle
- [ ] **M4** — IFC import
- [ ] **M5** — OBJ/FBX/DXF meshes
- [ ] **M6** — Export UI (capability matrix)
- [ ] **M7** — contacts scraper refresh + polish
- [ ] **M8** — PDF export of a marked area

## Note on this environment

The Bash tool is currently non-functional in this sandbox (bubblewrap can't write
to a read-only `node/bin` mount), so the project was scaffolded by hand and **not**
run/installed by the assistant. Run the `npm install` / `micromamba install` steps
above yourself to build and verify.
