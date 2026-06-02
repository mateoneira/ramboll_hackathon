# General web based import export

- very simply interface, anyone can use it
- 3D/2D basemap viewer
- user drops a file, platform automatically infers type, and loads it into the viewer
- export let's users choose the file format
- it should work fast
- This is a Ramboll product, as part of the interface it will show who to contact from Ramboll. - "Contact ... "(scrape contact details per department.) (https://www.ramboll.com/da-dk)
- App can export to PDF as well. user should be able to mark the area they can to export a PDF of.,

## Internal product

- Very easy data interop
- connecting departments internally. - contact x person will refer to internal specialist

## External product

- very easy way for non-experts to view various data formats and see what they contain
- points external users to Ramboll to get value out of the data. Acts as a sales funnel. 

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
of their choice (including a PDF of a marked area) — and it must feel fast.

This is a **Ramboll product** with two audiences served by one app:
- **Internal** — frictionless data interop that connects departments; the contact panel
  surfaces the relevant **internal specialist** for the data at hand.
- **External** — a no-expertise-needed way for outsiders to view data and see what it
  contains, which **acts as a sales funnel**: it points users to the right Ramboll
  department to get value out of the data.

Either way the UI carries Ramboll branding and a contextual **"Contact …"** panel whose
details are sourced from Ramboll (https://www.ramboll.com/da-dk).

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
- **Single app, two modes** via a `mode=internal|external` config/URL flag — same viewer
  and pipelines, different framing of the contact panel (internal specialist vs sales CTA).
- **PDF export of a user-marked area** in addition to format conversion, branded with the
  Ramboll logo and the relevant contact.

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
`dxf-parser` (client 2D DXF fast path), `shpjs` (optional client shp), **`terra-draw`**
(draw the PDF export rectangle/polygon on MapLibre), **`jspdf`** (compose the branded PDF
client-side from the map canvas + legend + contact block).

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
- Contact scraper: **httpx** + **selectolax** (or **beautifulsoup4**) to fetch/parse
  Ramboll department contacts into a cached `contacts.json` (see "Branding & contacts").

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

**PDF export (marked area):** in 2D, the user draws a rectangle/polygon with `terra-draw`;
the app captures the MapLibre canvas clipped to that extent and composes a branded PDF with
`jspdf` — Ramboll logo, title, scale/north arrow, a legend of visible layers, and the
contextual contact block. Done client-side for V1 (requires the map created with
`preserveDrawingBuffer: true`). A higher-fidelity server-side headless render is a possible
later upgrade.

## Branding & contextual contacts

- **Branding:** Ramboll logo + brand colors in the app header and on exported PDFs.
- **Contact panel:** always visible; resolves a contact from the **loaded data category**
  (GIS / CAD / BIM → a mapped Ramboll department) and the active **mode**:
  - *internal* → shows the internal specialist for that department ("Contact <name>").
  - *external* → shows a sales-funnel CTA ("Contact Ramboll's <department> team to get
    value out of this data").
- **Data source:** a backend job scrapes department/contact details from
  https://www.ramboll.com/da-dk into a cached `contacts.json`; the UI reads it via
  `GET /contacts`. **Risk/assumption:** the public site may not expose a clean
  per-department contact directory and scraping is brittle + ToS-sensitive — so the scraper
  writes into a **hand-curated `contacts.json` fallback** that always works even if the
  scrape returns nothing. The category→department→contact mapping lives in that file.

## Internal vs external modes

One build, switched by a `mode=internal|external` flag (env default + `?mode=` URL override;
no auth in V1). The viewer, import, export, and PDF features are identical across modes —
only the contact panel's framing/CTA and a few labels change. Keeps a single codebase while
serving both the interop and sales-funnel goals.

## Project structure

```
frontend/  (Vite+React+TS)
  src/ingest/{detectType,clientParsers,importController}.ts   # detection + routing
  src/viewer/{Map2D,Viewer3D}.tsx + {addGeoJson,addGlb}.ts    # MapLibre + Cesium
  src/export/{ExportPanel.tsx,exportClient.ts}                # capability-matrix picker
  src/export/{AreaDraw.ts,pdfExport.ts}                       # terra-draw area + jspdf PDF
  src/contact/{ContactPanel.tsx,useContacts.ts}              # branded, mode-aware contacts
  src/app/{mode.ts,branding.ts}                              # mode flag + Ramboll theme/logo
  src/store/layers.ts  src/api/client.ts  src/ui/{DropZone,LayerList,Spinner}.tsx
backend/   (FastAPI, AI-env)
  app/main.py                                                 # app, CORS, routers
  app/routers/{import_,export,files,contacts}.py             # +contacts endpoint
  app/converters/{vector,ifc,mesh,fbx}.py                     # the conversion logic
  app/contacts/{scraper.py,contacts.json}                    # Ramboll scrape + curated data
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
- **M7 — Ramboll branding + contact panel:** theme/logo; `GET /contacts` from curated
  `contacts.json`; mode-aware contact panel (internal specialist vs sales CTA); scraper to
  populate/refresh the contacts file.
- **M8 — PDF export:** `terra-draw` area marking → branded `jspdf` PDF (map extent + legend
  + logo + contact).
- **M9 — Polish:** progress/error states, large-file handling, DXF-2D client path, styling.

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
- **Contact scraping is brittle/ToS-sensitive:** Ramboll's site may lack a clean per-dept
  contact directory. Always back the scraper with a hand-curated `contacts.json` so the
  panel works regardless; treat live scraping as a refresh, not a hard dependency. Confirm
  use of scraped personal contact data is acceptable for the external (sales) audience.
- **PDF canvas capture:** map must be created with `preserveDrawingBuffer: true` or the
  canvas reads back blank; clip to the drawn extent and embed at sufficient DPI for legibility.

## Verification

- **M1:** `npm run dev` in `frontend/`; drop a sample `.geojson` → renders instantly, camera fits.
- **Backend:** `uvicorn app.main:app --reload` in `AI-env`; `curl /health`; `curl -F file=@sample.zip /convert/import` returns a GeoJSON envelope.
- **Per format:** drop one known-good sample of each (shp.zip, gpkg, glb, ifc, obj, dxf) and
  confirm it lands in the correct viewer (2D for vector, 3D for mesh/BIM).
- **Export round-trip:** import shapefile → export gpkg → re-import and confirm match; import
  ifc → export glb → re-import.
- **PDF export:** load a layer, draw an area, export → PDF opens showing that extent with
  legend, Ramboll logo, and the contact block.
- **Contacts/modes:** `curl /contacts` returns the curated JSON; load a GIS vs a BIM file and
  confirm the panel shows the mapped department; switch `?mode=internal` vs `?mode=external`
  and confirm the framing/CTA changes.
- Provide a small `samples/` folder of test files for repeatable manual verification.