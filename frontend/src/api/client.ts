import type { FeatureCollection } from 'geojson'
import type { DataKind, LayerMeta } from '../types'

/** Shape returned by the backend POST /api/convert/import endpoint. */
export interface ImportEnvelope {
  id: string
  layerName: string
  canonical: 'geojson' | 'glb'
  kind: DataKind
  crs: string | null
  bbox: [number, number, number, number] | null
  origin: [number, number, number] | null
  /** Present for vector results: inline GeoJSON. */
  geojson?: FeatureCollection
  /** Present for mesh/bim results: path to fetch the GLB (e.g. /api/files/<id>). */
  url?: string
}

const API_BASE = '/api'

/** Send a file to the backend converter and get a canonical envelope back. */
export async function importViaBackend(file: File): Promise<ImportEnvelope> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/convert/import`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`Backend import failed (${res.status}): ${detail}`)
  }
  return (await res.json()) as ImportEnvelope
}

export interface ExportRequest {
  layerId: string
  target: string
}

/** Request a format conversion of a previously imported layer; returns a Blob. */
export async function exportViaBackend(req: ExportRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE}/convert/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`Export failed (${res.status}): ${detail}`)
  }
  return await res.blob()
}

export function metaFromEnvelope(env: ImportEnvelope): LayerMeta {
  return {
    canonical: env.canonical,
    kind: env.kind,
    crs: env.crs,
    bbox: env.bbox,
    origin: env.origin,
  }
}
