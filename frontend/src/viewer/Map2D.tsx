import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useLayers } from '../store/layers'
import type { Layer } from '../types'
import { syncGeoJsonLayers } from './addGeoJson'

// Free, no-token raster basemap (OpenStreetMap tiles via a simple style).
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

export default function Map2D() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const loadedRef = useRef(false)

  // Subscribe to the store; re-render syncs layers onto the map.
  const layers = useLayers((s) => s.layers)
  const fitRequest = useLayers((s) => s.fitRequest)
  const clearFit = useLayers((s) => s.clearFit)

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [12.5683, 55.6761], // Copenhagen — Ramboll HQ
      zoom: 3,
      preserveDrawingBuffer: true, // required for PDF canvas capture later
    })
    map.addControl(new maplibregl.NavigationControl({}), 'top-right')
    map.on('load', () => {
      loadedRef.current = true
      syncGeoJsonLayers(map, useLayers.getState().layers)
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  // Sync vector layers whenever the layer list changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    syncGeoJsonLayers(map, layers)
  }, [layers])

  // Fit the camera when a layer requests it.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitRequest) return
    const layer = layers.find((l: Layer) => l.id === fitRequest)
    if (layer?.meta.bbox) {
      const [minX, minY, maxX, maxY] = layer.meta.bbox
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: 60, maxZoom: 16, duration: 800 },
      )
    } else if (layer?.meta.origin) {
      const [lon, lat] = layer.meta.origin
      map.flyTo({ center: [lon, lat], zoom: 16 })
    }
    clearFit()
  }, [fitRequest, layers, clearFit])

  return <div ref={containerRef} className="map" />
}
