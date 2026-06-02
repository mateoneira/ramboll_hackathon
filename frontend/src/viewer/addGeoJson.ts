import maplibregl from 'maplibre-gl'
import type { Layer } from '../types'

/**
 * Reconcile the map's GeoJSON sources/layers with the current store layers.
 * Adds new vector layers, updates visibility/colour, and removes deleted ones.
 * Each layer gets fill, line, and circle sub-layers so any geometry type shows.
 */
export function syncGeoJsonLayers(map: maplibregl.Map, layers: Layer[]): void {
  const vectorLayers = layers.filter(
    (l) => l.status === 'ready' && l.meta.canonical === 'geojson' && l.geojson,
  )
  const wanted = new Set(vectorLayers.map((l) => l.id))

  // Remove map layers/sources no longer present in the store.
  for (const style of map.getStyle().layers ?? []) {
    const match = /^ramboll:(.+):(fill|line|circle)$/.exec(style.id)
    if (match && !wanted.has(match[1])) {
      map.removeLayer(style.id)
    }
  }
  for (const srcId of Object.keys(map.getStyle().sources ?? {})) {
    const m = /^ramboll:(.+)$/.exec(srcId)
    if (m && !wanted.has(m[1])) {
      map.removeSource(srcId)
    }
  }

  for (const layer of vectorLayers) {
    const srcId = `ramboll:${layer.id}`
    const existing = map.getSource(srcId) as maplibregl.GeoJSONSource | undefined
    if (existing) {
      existing.setData(layer.geojson!)
    } else {
      map.addSource(srcId, { type: 'geojson', data: layer.geojson! })
      addSubLayers(map, layer.id, layer.color)
    }
    const vis = layer.visible ? 'visible' : 'none'
    for (const kind of ['fill', 'line', 'circle'] as const) {
      const id = `ramboll:${layer.id}:${kind}`
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis)
        map.setPaintProperty(
          id,
          kind === 'line' ? 'line-color' : kind === 'fill' ? 'fill-color' : 'circle-color',
          layer.color,
        )
      }
    }
  }
}

function addSubLayers(map: maplibregl.Map, layerId: string, color: string): void {
  const src = `ramboll:${layerId}`
  map.addLayer({
    id: `ramboll:${layerId}:fill`,
    type: 'fill',
    source: src,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': color, 'fill-opacity': 0.3 },
  })
  map.addLayer({
    id: `ramboll:${layerId}:line`,
    type: 'line',
    source: src,
    filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
    paint: { 'line-color': color, 'line-width': 2 },
  })
  map.addLayer({
    id: `ramboll:${layerId}:circle`,
    type: 'circle',
    source: src,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-color': color,
      'circle-radius': 5,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
    },
  })
}
