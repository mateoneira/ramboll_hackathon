import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { jsPDF } from 'jspdf'
import { useLayers } from '../store/layers'
import type { Layer } from '../types'
import { syncGlbLayers } from './addGlb'
import { syncGeoJsonCesiumLayers } from './addGeoJsonCesium'

Cesium.Ion.defaultAccessToken = ''

interface BBox { west: number; south: number; east: number; north: number }

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
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
  })
}

export default function Viewer3D() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const glbCacheRef = useRef<Map<string, Cesium.Model>>(new Map())
  const geoJsonCacheRef = useRef<Map<string, Cesium.GeoJsonDataSource>>(new Map())
  const previewEntityRef = useRef<Cesium.Entity | null>(null)
  const corner1Ref = useRef<{ lon: number; lat: number } | null>(null)

  const [exportStep, setExportStep] = useState<'idle' | 'corner1' | 'corner2'>('idle')

  const layers = useLayers((s) => s.layers)
  const fitRequest = useLayers((s) => s.fitRequest)
  const clearFit = useLayers((s) => s.clearFit)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return
    const viewer = makeViewer(containerRef.current)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(12.5683, 55.6761, 500_000),
    })
    viewer.scene.light = new Cesium.DirectionalLight({
      direction: Cesium.Cartesian3.normalize(
        new Cesium.Cartesian3(-0.9, 0.31, -0.30),
        new Cesium.Cartesian3(),
      ),
      intensity: 2.0,
    })
    viewerRef.current = viewer
    const initialLayers = useLayers.getState().layers
    syncGlbLayers(viewer, initialLayers, glbCacheRef.current)
    syncGeoJsonCesiumLayers(viewer, initialLayers, geoJsonCacheRef.current)
    return () => {
      viewer.destroy()
      viewerRef.current = null
      glbCacheRef.current.clear()
      geoJsonCacheRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    syncGlbLayers(viewer, layers, glbCacheRef.current)
    syncGeoJsonCesiumLayers(viewer, layers, geoJsonCacheRef.current)
  }, [layers])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !fitRequest) return
    const layer = layers.find((l: Layer) => l.id === fitRequest)
    if (layer) {
      if (layer.meta.canonical === 'geojson' && layer.meta.bbox) {
        const [minX, minY, maxX, maxY] = layer.meta.bbox
        viewer.camera.flyTo({
          destination: Cesium.Rectangle.fromDegrees(minX, minY, maxX, maxY),
          duration: 1.5,
        })
      } else {
        const [lon, lat, h] = layer.meta.origin ?? [12.5683, 55.6761, 0]
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, h + 500),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
          duration: 1.5,
        })
      }
    }
    clearFit()
  }, [fitRequest, layers, clearFit])

  // Bounding box drawing → PDF export
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || exportStep === 'idle') return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pos = viewer.camera.pickEllipsoid(e.position, viewer.scene.globe.ellipsoid)
      if (!pos) return
      const carto = Cesium.Cartographic.fromCartesian(pos)
      const lon = Cesium.Math.toDegrees(carto.longitude)
      const lat = Cesium.Math.toDegrees(carto.latitude)

      if (!corner1Ref.current) {
        corner1Ref.current = { lon, lat }
        setExportStep('corner2')
      } else {
        const c1 = corner1Ref.current
        const bbox: BBox = {
          west: Math.min(c1.lon, lon),
          east: Math.max(c1.lon, lon),
          south: Math.min(c1.lat, lat),
          north: Math.max(c1.lat, lat),
        }
        // Clean up preview
        if (previewEntityRef.current) {
          viewer.entities.remove(previewEntityRef.current)
          previewEntityRef.current = null
        }
        // Fly to area, then export after Cesium renders the final frame
        viewer.camera.flyTo({
          destination: Cesium.Rectangle.fromDegrees(bbox.west, bbox.south, bbox.east, bbox.north),
          duration: 1.0,
          complete: () => {
            requestAnimationFrame(() => doExport(viewer, bbox))
          },
        })
        setExportStep('idle')
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (!corner1Ref.current) return
      const pos = viewer.camera.pickEllipsoid(e.endPosition, viewer.scene.globe.ellipsoid)
      if (!pos) return
      const carto = Cesium.Cartographic.fromCartesian(pos)
      const lon = Cesium.Math.toDegrees(carto.longitude)
      const lat = Cesium.Math.toDegrees(carto.latitude)
      const c1 = corner1Ref.current
      const pRect = Cesium.Rectangle.fromDegrees(
        Math.min(c1.lon, lon), Math.min(c1.lat, lat),
        Math.max(c1.lon, lon), Math.max(c1.lat, lat),
      )
      if (previewEntityRef.current) viewer.entities.remove(previewEntityRef.current)
      previewEntityRef.current = viewer.entities.add({
        rectangle: {
          coordinates: pRect,
          material: Cesium.Color.fromCssColorString('#009df0').withAlpha(0.1),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#009df0').withAlpha(0.6),
          outlineWidth: 2,
          height: 0,
        },
      })
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    return () => {
      handler.destroy()
      const v = viewerRef.current
      if (v && previewEntityRef.current) {
        v.entities.remove(previewEntityRef.current)
        previewEntityRef.current = null
      }
      // Don't reset corner1Ref here — it must survive the corner1→corner2 transition
    }
  }, [exportStep])

  function doExport(viewer: Cesium.Viewer, bbox: BBox) {
    const dataUrl = viewer.canvas.toDataURL('image/jpeg', 0.92)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = 297, pageH = 210, margin = 12, footerH = 12
    doc.addImage(dataUrl, 'JPEG', margin, margin, pageW - 2 * margin, pageH - 2 * margin - footerH)
    doc.setDrawColor(210, 210, 210)
    doc.line(margin, pageH - margin - footerH + 1, pageW - margin, pageH - margin - footerH + 1)
    doc.setFontSize(8.5)
    doc.setTextColor(100, 100, 100)
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    doc.text('Ramboll Data Viewer', margin, pageH - margin)
    doc.text(date, pageW - margin, pageH - margin, { align: 'right' })
    const coords = `${bbox.west.toFixed(4)}°E  ${bbox.south.toFixed(4)}°N  —  ${bbox.east.toFixed(4)}°E  ${bbox.north.toFixed(4)}°N`
    doc.text(coords, pageW / 2, pageH - margin, { align: 'center' })
    doc.save(`ramboll-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const cursor = exportStep !== 'idle' ? 'crosshair' : 'default'

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      <div className="viewer-toolbar">
        <button
          className={`vtb-btn vtb-primary${exportStep !== 'idle' ? ' vtb-active' : ''}`}
          onClick={() => {
            if (exportStep !== 'idle') {
              setExportStep('idle')
            } else {
              corner1Ref.current = null
              setExportStep('corner1')
            }
          }}
          title="Export area to PDF"
        >
          {exportStep === 'idle' ? '↓ Export PDF' : '✕ Cancel'}
        </button>
      </div>

      {exportStep !== 'idle' && (
        <div className="viewer-hint">
          {exportStep === 'corner1' ? 'Click to set first corner of the export area' : 'Click to set second corner'}
        </div>
      )}
    </div>
  )
}
