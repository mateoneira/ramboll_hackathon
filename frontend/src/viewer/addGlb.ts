import * as Cesium from 'cesium'
import type { Layer } from '../types'

// Default anchor: Ramboll Copenhagen HQ — used when the mesh has no georef.
const DEFAULT_ORIGIN: [number, number, number] = [12.5683, 55.6761, 0]

async function loadModel(viewer: Cesium.Viewer, layer: Layer): Promise<Cesium.Model> {
  const [lon, lat, height] = layer.meta.origin ?? DEFAULT_ORIGIN
  const position = Cesium.Cartesian3.fromDegrees(lon, lat, height)
  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)

  const model = await Cesium.Model.fromGltfAsync({
    url: layer.glbUrl!,
    modelMatrix,
    scale: 1.0,
    // Thin dark silhouette to make edges readable at any lighting angle.
    silhouetteColor: Cesium.Color.fromCssColorString('#333333'),
    silhouetteSize: 1.5,
  })
  // Guard against the viewer being destroyed while the model was loading.
  if (viewer.isDestroyed()) return model
  viewer.scene.primitives.add(model)
  return model
}

/**
 * Reconcile the Cesium scene's GLB primitives with the current store layers.
 * Mirrors the same pattern as syncGeoJsonLayers for MapLibre.
 */
export function syncGlbLayers(
  viewer: Cesium.Viewer,
  layers: Layer[],
  cache: Map<string, Cesium.Model>,
): void {
  const glbLayers = layers.filter(
    (l) => l.status === 'ready' && l.meta.canonical === 'glb' && l.glbUrl,
  )
  const wanted = new Set(glbLayers.map((l) => l.id))

  for (const [id, model] of cache) {
    if (!wanted.has(id)) {
      viewer.scene.primitives.remove(model)
      cache.delete(id)
    }
  }

  for (const layer of glbLayers) {
    if (cache.has(layer.id)) {
      cache.get(layer.id)!.show = layer.visible
    } else {
      loadModel(viewer, layer).then((model) => {
        cache.set(layer.id, model)
        model.show = layer.visible
      })
    }
  }
}
