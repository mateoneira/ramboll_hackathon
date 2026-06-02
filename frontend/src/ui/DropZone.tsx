import { useCallback, useRef, useState } from 'react'
import { importFiles } from '../ingest/importController'

const ACCEPT = '.geojson,.json,.zip,.shp,.gpkg,.dxf,.obj,.fbx,.ifc,.glb,.gltf'

export default function DropZone() {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) {
      void importFiles(e.dataTransfer.files)
    }
  }, [])

  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div>
        Drop a file here or <strong>browse</strong>
      </div>
      <div className="formats">
        GIS · CAD · BIM — geojson, shp(.zip), gpkg, dxf, obj, fbx, ifc, glb
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) void importFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
