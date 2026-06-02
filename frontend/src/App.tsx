import { useMemo } from 'react'
import Map2D from './viewer/Map2D'
import Viewer3D from './viewer/Viewer3D'
import DropZone from './ui/DropZone'
import LayerList from './ui/LayerList'
import ContactPanel from './contact/ContactPanel'
import { getMode } from './app/mode'
import { useLayers } from './store/layers'

export default function App() {
  const mode = useMemo(() => getMode(), [])
  const layers = useLayers((s) => s.layers)
  const viewer = useLayers((s) => s.viewer)
  const setViewer = useLayers((s) => s.setViewer)

  const loading = layers.some((l) => l.status === 'loading')
  const lastError = [...layers].reverse().find((l) => l.status === 'error')

  return (
    <div className="app">
      <header className="app-header">
        <img
          className="logo"
          src="https://assets-eu-01.kc-usercontent.com:443/7c3778f1-714a-0155-9be8-162f4c282b22/25674e69-0e10-410a-a637-6f7665ccb064/ramboll.svg"
          alt="Ramboll"
        />
        <span className="title">Data Viewer — import · view · export</span>
        <div className="viewer-toggle">
          <button
            className={viewer === '2d' ? 'active' : ''}
            onClick={() => setViewer('2d')}
          >
            2D
          </button>
          <button
            className={viewer === '3d' ? 'active' : ''}
            onClick={() => setViewer('3d')}
          >
            3D
          </button>
        </div>
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
          {viewer === '2d' ? <Map2D /> : <Viewer3D />}
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
