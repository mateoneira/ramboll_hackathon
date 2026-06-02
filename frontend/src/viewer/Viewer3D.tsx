import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useLayers } from '../store/layers'
import type { Layer } from '../types'
import { syncGlbLayers } from './addGlb'

Cesium.Ion.defaultAccessToken = ''

function makeViewer(container: HTMLDivElement): Cesium.Viewer {
  const tiles = new Cesium.UrlTemplateImageryProvider({
    url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 19,
    credit: new Cesium.Credit('© CARTO © OpenStreetMap contributors', false),
  })
  return new Cesium.Viewer(container, {
    baseLayer: new Cesium.ImageryLayer(tiles),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
  })
}

export default function Viewer3D() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const cacheRef = useRef<Map<string, Cesium.Model>>(new Map())

  const layers = useLayers((s) => s.layers)
  const fitRequest = useLayers((s) => s.fitRequest)
  const clearFit = useLayers((s) => s.clearFit)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return
    const viewer = makeViewer(containerRef.current)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(12.5683, 55.6761, 500_000),
    })
    viewerRef.current = viewer
    // Sync any layers already in the store when the viewer first mounts.
    syncGlbLayers(viewer, useLayers.getState().layers, cacheRef.current)
    return () => {
      viewer.destroy()
      viewerRef.current = null
      cacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    syncGlbLayers(viewer, layers, cacheRef.current)
  }, [layers])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !fitRequest) return
    const layer = layers.find((l: Layer) => l.id === fitRequest)
    if (layer) {
      const [lon, lat, h] = layer.meta.origin ?? [12.5683, 55.6761, 0]
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, h + 500),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 1.5,
      })
    }
    clearFit()
  }, [fitRequest, layers, clearFit])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
