import { create } from 'zustand'
import type { Layer } from '../types'

export type ViewerMode = '2d' | '3d'

interface LayerState {
  layers: Layer[]
  viewer: ViewerMode
  /** id of the layer to fit the camera to; consumed by the viewer. */
  fitRequest: string | null
  addLayer: (layer: Layer) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  toggleVisible: (id: string) => void
  setViewer: (v: ViewerMode) => void
  requestFit: (id: string) => void
  clearFit: () => void
}

export const useLayers = create<LayerState>((set) => ({
  layers: [],
  viewer: '2d',
  fitRequest: null,
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),
  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  toggleVisible: (id) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      ),
    })),
  setViewer: (viewer) => set({ viewer }),
  requestFit: (id) => set({ fitRequest: id }),
  clearFit: () => set({ fitRequest: null }),
}))

/** Deterministic-ish palette so each new layer gets a distinct colour. */
const PALETTE = [
  '#0033a0',
  '#00a9ce',
  '#e4002b',
  '#ffb81c',
  '#43b02a',
  '#a05eb5',
  '#ff6900',
  '#0085ad',
]

export function nextColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}
