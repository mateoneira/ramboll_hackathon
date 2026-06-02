import { useMemo } from 'react'
import Viewer3D from './viewer/Viewer3D'
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
        <img
          className="logo"
          src="https://assets-eu-01.kc-usercontent.com:443/7c3778f1-714a-0155-9be8-162f4c282b22/25674e69-0e10-410a-a637-6f7665ccb064/ramboll.svg"
          alt="Ramboll"
        />
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
          <Viewer3D />
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
