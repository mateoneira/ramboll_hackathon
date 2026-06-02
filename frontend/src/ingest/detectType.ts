import type { SourceFormat, ImportRoute } from '../types'

export interface Detection {
  format: SourceFormat
  route: ImportRoute
}

const EXT_MAP: Record<string, SourceFormat> = {
  geojson: 'geojson',
  json: 'geojson',
  shp: 'shp',
  zip: 'shp', // zipped shapefile (assumption; refined by magic bytes)
  gpkg: 'gpkg',
  dxf: 'dxf',
  obj: 'obj',
  fbx: 'fbx',
  ifc: 'ifc',
  glb: 'glb',
  gltf: 'glb',
}

/**
 * Which formats we fully handle in the browser (no backend round trip).
 * GeoJSON is already lon/lat; GLB is a self-contained mesh. Everything else
 * (shp/gpkg/ifc/obj/fbx/dxf) needs the backend converter — DXF in particular
 * carries local CAD coordinates that must be anchored, not dropped on lon/lat.
 */
const CLIENT_FORMATS = new Set<SourceFormat>(['geojson', 'glb'])

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** Read the first N bytes for magic-byte sniffing. */
async function head(file: File, n = 64): Promise<Uint8Array> {
  const buf = await file.slice(0, n).arrayBuffer()
  return new Uint8Array(buf)
}

function startsWithAscii(bytes: Uint8Array, text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (bytes[i] !== text.charCodeAt(i)) return false
  }
  return true
}

/**
 * Detect a file's format using extension first, then confirm/correct with
 * magic bytes where the extension is ambiguous (e.g. .zip, .json).
 */
export async function detectType(file: File): Promise<Detection> {
  const ext = extOf(file.name)
  let format: SourceFormat = EXT_MAP[ext] ?? 'unknown'

  const bytes = await head(file)

  // SQLite header → GeoPackage, regardless of extension.
  if (startsWithAscii(bytes, 'SQLite format 3')) format = 'gpkg'
  // glTF binary magic 'glTF'.
  else if (startsWithAscii(bytes, 'glTF')) format = 'glb'
  // IFC STEP files begin with the ISO-10303-21 header.
  else if (startsWithAscii(bytes, 'ISO-10303-21')) format = 'ifc'
  // Zip magic 'PK\x03\x04' — most likely a zipped shapefile here.
  else if (bytes[0] === 0x50 && bytes[1] === 0x4b && ext !== 'gpkg') {
    if (format === 'unknown') format = 'shp'
  }
  // GeoJSON: a JSON object — sniff for a leading '{' when extension was json.
  else if ((ext === 'json' || ext === 'geojson') && bytes[0] === 0x7b) {
    format = 'geojson'
  }

  const route: ImportRoute = CLIENT_FORMATS.has(format) ? 'client' : 'backend'
  return { format, route }
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP)
