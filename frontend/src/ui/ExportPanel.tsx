import { useState } from 'react'
import { exportViaBackend } from '../api/client'
import type { Layer } from '../types'

const VECTOR_TARGETS = ['geojson', 'gpkg', 'shp'] as const
const MESH_TARGETS = ['glb', 'obj', 'fbx', 'dxf'] as const

const TARGET_LABELS: Record<string, string> = {
  geojson: 'GeoJSON',
  gpkg: 'GeoPackage',
  shp: 'Shapefile',
  glb: 'GLB',
  obj: 'OBJ',
  fbx: 'FBX',
  dxf: 'DXF',
}

const TARGET_EXT: Record<string, string> = {
  geojson: 'geojson',
  gpkg: 'gpkg',
  shp: 'zip',
  glb: 'glb',
  obj: 'obj',
  fbx: 'fbx',
  dxf: 'dxf',
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  layer: Layer
}

export default function ExportPanel({ layer }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Determine available targets
  const isVector = layer.meta.kind === 'vector'
  const targets: readonly string[] = isVector ? VECTOR_TARGETS : MESH_TARGETS

  // Client-side GeoJSON download (no backend needed)
  const canClientExport = !layer.backendId && !!layer.geojson

  // Nothing to offer for loading/error layers
  if (layer.status !== 'ready') return null
  // Nothing to offer for client-parsed GLB (no geojson, no backendId)
  if (!layer.backendId && !canClientExport) return null

  async function handleExport(target: string) {
    setExporting(target)
    setExportError(null)
    try {
      if (!layer.backendId) {
        // Client-side GeoJSON only
        const blob = new Blob([JSON.stringify(layer.geojson, null, 2)], {
          type: 'application/geo+json',
        })
        triggerDownload(blob, `${layer.name}.geojson`)
        return
      }
      const blob = await exportViaBackend({ layerId: layer.backendId, target })
      triggerDownload(blob, `${layer.name}.${TARGET_EXT[target] ?? target}`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(null)
    }
  }

  const exportTargets = canClientExport ? (['geojson'] as const) : targets

  return (
    <div className="export-row">
      <span className="export-label">Export</span>
      <div className="export-targets">
        {exportTargets.map((t) => (
          <button
            key={t}
            className="export-btn"
            disabled={exporting !== null}
            onClick={() => handleExport(t)}
            title={`Download as ${TARGET_LABELS[t] ?? t}`}
          >
            {exporting === t ? (
              <span className="spinner-dark" />
            ) : (
              TARGET_LABELS[t] ?? t
            )}
          </button>
        ))}
      </div>
      {exportError && (
        <span className="export-error" title={exportError}>
          Export failed
        </span>
      )}
    </div>
  )
}
