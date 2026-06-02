import * as turf from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import type { LayerMeta } from '../types'

export interface ClientParseResult {
  meta: LayerMeta
  geojson?: FeatureCollection
  glbUrl?: string
}

/** Parse a GeoJSON file in-browser and compute its bbox for camera fit. */
export async function parseGeoJson(file: File): Promise<ClientParseResult> {
  const text = await file.text()
  const data = JSON.parse(text) as FeatureCollection
  if (!data || !data.type) throw new Error('Not a valid GeoJSON document')

  let bbox: LayerMeta['bbox'] = null
  try {
    const b = turf.bbox(data as turf.AllGeoJSON) // [minX, minY, maxX, maxY]
    if (b.every((n) => Number.isFinite(n))) {
      bbox = [b[0], b[1], b[2], b[3]]
    }
  } catch {
    /* empty or degenerate geometry — leave bbox null */
  }

  return {
    geojson: data,
    meta: { canonical: 'geojson', kind: 'vector', crs: 'EPSG:4326', bbox, origin: null },
  }
}

/**
 * GLB/glTF passthrough: hand the bytes to the 3D viewer as an object URL.
 * No georeference is known, so origin/bbox are null and the viewer anchors
 * the model at the current map center.
 */
export async function parseGlb(file: File): Promise<ClientParseResult> {
  const url = URL.createObjectURL(file)
  return {
    glbUrl: url,
    meta: { canonical: 'glb', kind: 'mesh', crs: null, bbox: null, origin: null },
  }
}
