import * as Cesium from 'cesium'
import type { Layer } from '../types'

async function loadDataSource(
  viewer: Cesium.Viewer,
  layer: Layer,
): Promise<Cesium.GeoJsonDataSource> {
  const fill = Cesium.Color.fromCssColorString(layer.color).withAlpha(0.4)
  const stroke = Cesium.Color.fromCssColorString(layer.color)
  const ds = await Cesium.GeoJsonDataSource.load(layer.geojson!, {
    fill,
    stroke,
    strokeWidth: 2,
    markerColor: stroke,
    clampToGround: true,
  })
  if (viewer.isDestroyed()) return ds
  viewer.dataSources.add(ds)
  return ds
}

export function syncGeoJsonCesiumLayers(
  viewer: Cesium.Viewer,
  layers: Layer[],
  cache: Map<string, Cesium.GeoJsonDataSource>,
): void {
  const vectorLayers = layers.filter(
    (l) => l.status === 'ready' && l.meta.canonical === 'geojson' && l.geojson,
  )
  const wanted = new Set(vectorLayers.map((l) => l.id))

  for (const [id, ds] of cache) {
    if (!wanted.has(id)) {
      viewer.dataSources.remove(ds, true)
      cache.delete(id)
    }
  }

  for (const layer of vectorLayers) {
    if (cache.has(layer.id)) {
      cache.get(layer.id)!.show = layer.visible
    } else {
      loadDataSource(viewer, layer).then((ds) => {
        cache.set(layer.id, ds)
        ds.show = layer.visible
      })
    }
  }
}
