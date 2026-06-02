import { useLayers } from '../store/layers'
import type { Layer } from '../types'

export default function LayerList() {
  const layers = useLayers((s) => s.layers)
  const toggleVisible = useLayers((s) => s.toggleVisible)
  const removeLayer = useLayers((s) => s.removeLayer)
  const requestFit = useLayers((s) => s.requestFit)

  if (layers.length === 0) {
    return <p className="empty-hint">No data loaded yet. Drop a file to begin.</p>
  }

  return (
    <div>
      {layers.map((layer: Layer) => (
        <div className="layer" key={layer.id}>
          <span className="swatch" style={{ background: layer.color }} />
          <span
            className="name"
            title={layer.name}
            onClick={() => requestFit(layer.id)}
            style={{ cursor: 'pointer' }}
          >
            {layer.name}
          </span>
          <span className="kind">{statusLabel(layer)}</span>
          <button
            className="icon-btn"
            title={layer.visible ? 'Hide' : 'Show'}
            onClick={() => toggleVisible(layer.id)}
          >
            {layer.visible ? '👁' : '🚫'}
          </button>
          <button title="Remove" onClick={() => removeLayer(layer.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

function statusLabel(layer: Layer): string {
  if (layer.status === 'loading') return '…'
  if (layer.status === 'error') return 'error'
  return layer.format
}
