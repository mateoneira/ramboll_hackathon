import { useMemo } from 'react'
import Map2D from './viewer/Map2D'
import DropZone from './ui/DropZone'
import LayerList from './ui/LayerList'
import ContactPanel from './contact/ContactPanel'
import { getMode } from './app/mode'
import { useLayers } from './store/layers'

export default function App() {
  const mode = useMemo(() => getMode(), [])
  const layers = useLayers((s) => s.layers)

  const loading = layers.some((l) => l.status === 'loading')
  const lastError = [...layers].reverse().find((l) => l.status === 'error')

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">RAMBOLL</span>
        <span className="title">Data Viewer — import · view · export</span>
        <span className="mode-badge">{mode}</span>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="panel">
            <h2>Import</h2>
            <DropZone />
          </div>
          <div className="panel">
            <h2>Layers</h2>
            <LayerList />
          </div>
          <div className="panel">
            <h2>Contact</h2>
            <ContactPanel mode={mode} />
          </div>
        </aside>

        <div className="viewer-wrap">
          <Map2D />
          {loading && (
            <div className="toast">
              <span className="spinner" /> &nbsp;Loading data…
            </div>
          )}
          {!loading && lastError && (
            <div className="toast error">
              {lastError.name}: {lastError.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
