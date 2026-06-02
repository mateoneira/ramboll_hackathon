import type { FeatureCollection } from 'geojson'

/** Canonical web formats the viewer knows how to render. */
export type Canonical = 'geojson' | 'glb'

/** High-level data category, used to pick a Ramboll contact. */
export type DataKind = 'vector' | 'mesh' | 'bim'

/** Source formats we can detect/import. */
export type SourceFormat =
  | 'geojson'
  | 'shp'
  | 'gpkg'
  | 'dxf'
  | 'obj'
  | 'fbx'
  | 'ifc'
  | 'glb'
  | 'unknown'

export type ImportRoute = 'client' | 'backend'

/** Metadata envelope every importer produces alongside the canonical data. */
export interface LayerMeta {
  canonical: Canonical
  kind: DataKind
  crs: string | null
  /** [minx, miny, maxx, maxy] in source units (lon/lat for vector). */
  bbox: [number, number, number, number] | null
  /** Anchor [lon, lat, height] for local-coordinate meshes; null if georeferenced. */
  origin: [number, number, number] | null
}

export interface Layer {
  id: string
  name: string
  format: SourceFormat
  meta: LayerMeta
  color: string
  visible: boolean
  status: 'loading' | 'ready' | 'error'
  error?: string
  /** Inline GeoJSON for vector layers (client or backend path). */
  geojson?: FeatureCollection
  /** URL or object URL to a GLB for mesh/bim layers. */
  glbUrl?: string
  /** Server-side store ID (present for backend-imported layers; enables export). */
  backendId?: string
}
