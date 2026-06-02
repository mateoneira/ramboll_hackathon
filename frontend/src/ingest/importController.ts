import { detectType } from './detectType'
import { parseGeoJson, parseGlb } from './clientParsers'
import { importViaBackend, metaFromEnvelope } from '../api/client'
import { useLayers, nextColor } from '../store/layers'
import type { Layer } from '../types'

let counter = 0
function makeId(): string {
  counter += 1
  return `layer-${counter}-${counter * 2654435761 % 100000}`
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/**
 * Entry point for a dropped/selected file. Detects the format, routes to the
 * client fast path or the backend converter, and registers the resulting layer
 * in the store (with a loading → ready/error lifecycle).
 */
export async function importFile(file: File): Promise<void> {
  const store = useLayers.getState()
  const id = makeId()
  const color = nextColor(store.layers.length)

  const { format, route } = await detectType(file)

  if (format === 'unknown') {
    store.addLayer(errorLayer(id, file.name, color, 'Unrecognised file type'))
    return
  }

  // Register a loading placeholder immediately so the UI feels responsive.
  store.addLayer({
    id,
    name: baseName(file.name),
    format,
    color,
    visible: true,
    status: 'loading',
    meta: { canonical: format === 'glb' ? 'glb' : 'geojson', kind: 'vector', crs: null, bbox: null, origin: null },
  })

  try {
    if (route === 'client') {
      const result =
        format === 'geojson' ? await parseGeoJson(file) : await parseGlb(file)
      store.updateLayer(id, {
        status: 'ready',
        meta: result.meta,
        geojson: result.geojson,
        glbUrl: result.glbUrl,
      })
    } else {
      const env = await importViaBackend(file)
      store.updateLayer(id, {
        status: 'ready',
        name: env.layerName || baseName(file.name),
        meta: metaFromEnvelope(env),
        geojson: env.geojson,
        glbUrl: env.url,
      })
    }

    // Ask the viewer to fit the camera to the freshly loaded layer.
    useLayers.getState().requestFit(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    store.updateLayer(id, { status: 'error', error: message })
  }
}

function errorLayer(
  id: string,
  fileName: string,
  color: string,
  message: string,
): Layer {
  return {
    id,
    name: baseName(fileName),
    format: 'unknown',
    color,
    visible: false,
    status: 'error',
    error: message,
    meta: { canonical: 'geojson', kind: 'vector', crs: null, bbox: null, origin: null },
  }
}

/** Import several files (e.g. a multi-file drop) sequentially. */
export async function importFiles(files: FileList | File[]): Promise<void> {
  for (const file of Array.from(files)) {
    await importFile(file)
  }
}
