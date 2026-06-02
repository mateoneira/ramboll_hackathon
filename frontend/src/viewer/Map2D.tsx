import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useLayers } from '../store/layers'
import type { Layer } from '../types'
import { syncGeoJsonLayers } from './addGeoJson'

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'basemap',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-saturation': -1,
        'raster-contrast': 0.1,
      },
    },
  ],
}

export default function Map2D() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const loadedRef = useRef(false)
  const [mapError, setMapError] = useState<string | null>(null)

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
      preserveDrawingBuffer: true,
    })
    map.addControl(new maplibregl.NavigationControl({}), 'top-right')
    map.on('load', () => {
      map.resize()
      loadedRef.current = true
      syncGeoJsonLayers(map, useLayers.getState().layers)
    })
    map.on('error', (e) => {
      console.error('MapLibre error:', e)
      setMapError(e.error?.message ?? String(e))
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

  return (
    <>
      <div
        ref={containerRef}
        className="map"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {mapError && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: '#b00020', color: '#fff', padding: '6px 14px',
          borderRadius: 6, fontSize: 12, zIndex: 30, maxWidth: '80%',
        }}>
          Map error: {mapError}
        </div>
      )}
    </>
  )
}
