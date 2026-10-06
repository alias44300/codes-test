import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CuffLengthId,
  ClosureId,
  DesignLayer,
  GloveConfig,
  GripBarId,
  MaterialId,
  ModelId,
  PaddingId,
  UsageId,
  ZoneId,
} from './types'

const defaults: GloveConfig = {
  model: 'elite',
  usage: 'training',
  weightOz: 16,
  closure: 'lace',
  cuffLength: 'standard',
  reinforcement: 1,
  padding: 'multilayer',
  gripBar: 'standard',
  palmVent: true,
  thumbVent: true,
  laceColor: '#f5f5f2',
  stitchColor: '#ecebe6',
  liningColor: '#111216',
  trimWidth: 1,
  selectedZone: 'gloveTop',
  pairView: 'single',
  zones: {
    gloveTop: { color: '#111216', material: 'cowhide' },
    backhand: { color: '#111216', material: 'cowhide' },
    palm: { color: '#f3f3ef', material: 'matte' },
    thumbOutside: { color: '#d9b621', material: 'cowhide' },
    thumbInside: { color: '#f3f3ef', material: 'matte' },
    thumbBase: { color: '#111216', material: 'cowhide' },
    wristTop: { color: '#111216', material: 'cowhide' },
    wristBottom: { color: '#111216', material: 'cowhide' },
    trim: { color: '#d9b621', material: 'patent' },
    laces: { color: '#f5f5f2', material: 'matte' },
    stitching: { color: '#ecebe6', material: 'matte' },
    gripBar: { color: '#111216', material: 'cowhide' },
  },
  design: { layers: [], activeLayerId: null },
}

type DesignLayerPatch = Partial<Omit<DesignLayer, 'id' | 'imageDataUrl'>>

type Store = GloveConfig & {
  setSelectedZone: (zone: ZoneId) => void
  setZoneColor: (zone: ZoneId, color: string) => void
  setZoneMaterial: (zone: ZoneId, material: MaterialId) => void
  setModel: (model: ModelId) => void
  setUsage: (usage: UsageId) => void
  setWeight: (weightOz: number) => void
  setClosure: (closure: ClosureId) => void
  setCuffLength: (cuffLength: CuffLengthId) => void
  setReinforcement: (reinforcement: 0 | 1 | 2 | 3) => void
  setPadding: (padding: PaddingId) => void
  setGripBar: (gripBar: GripBarId) => void
  setPalmVent: (palmVent: boolean) => void
  setThumbVent: (thumbVent: boolean) => void
  setLaceColor: (laceColor: string) => void
  setStitchColor: (stitchColor: string) => void
  setLiningColor: (liningColor: string) => void
  setTrimWidth: (trimWidth: number) => void
  setPairView: (pairView: 'single' | 'pair') => void
  addDesignLayer: (imageDataUrl: string, name: string) => void
  removeDesignLayer: (id: string) => void
  setActiveDesignLayer: (id: string) => void
  patchActiveDesignLayer: (patch: DesignLayerPatch) => void
  toggleActiveDesignScope: (zone: ZoneId) => void
  toggleLayerVisibility: (id: string) => void
  reset: () => void
  loadPreset: (preset: GloveConfig) => void
}

export const useGloveStore = create<Store>()(
  persist(
    (set) => ({
      ...defaults,
      setSelectedZone: (selectedZone) => set({ selectedZone }),
      setZoneColor: (zone, color) => set((s) => ({ zones: { ...s.zones, [zone]: { ...s.zones[zone], color } } })),
      setZoneMaterial: (zone, material) => set((s) => ({ zones: { ...s.zones, [zone]: { ...s.zones[zone], material } } })),
      setModel: (model) => set({ model }),
      setUsage: (usage) => set({ usage }),
      setWeight: (weightOz) => set({ weightOz }),
      setClosure: (closure) => set({ closure }),
      setCuffLength: (cuffLength) => set({ cuffLength }),
      setReinforcement: (reinforcement) => set({ reinforcement }),
      setPadding: (padding) => set({ padding }),
      setGripBar: (gripBar) => set({ gripBar }),
      setPalmVent: (palmVent) => set({ palmVent }),
      setThumbVent: (thumbVent) => set({ thumbVent }),
      setLaceColor: (laceColor) => set({ laceColor, zones: { ...useGloveStore.getState().zones, laces: { ...useGloveStore.getState().zones.laces, color: laceColor } } }),
      setStitchColor: (stitchColor) => set({ stitchColor, zones: { ...useGloveStore.getState().zones, stitching: { ...useGloveStore.getState().zones.stitching, color: stitchColor } } }),
      setLiningColor: (liningColor) => set({ liningColor }),
      setTrimWidth: (trimWidth) => set({ trimWidth }),
      setPairView: (pairView) => set({ pairView }),
      addDesignLayer: (imageDataUrl, name) => set((s) => {
        const id = globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random()}`
        const layer: DesignLayer = {
          id,
          name: name || `Visuel ${s.design.layers.length + 1}`,
          imageDataUrl,
          mode: 'print',
          opacity: 0.95,
          scale: 0.85,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
          repeat: false,
          visible: true,
          scope: ['gloveTop', 'backhand'],
        }
        return { design: { layers: [...s.design.layers, layer], activeLayerId: id } }
      }),
      removeDesignLayer: (id) => set((s) => {
        const layers = s.design.layers.filter((l) => l.id !== id)
        return { design: { layers, activeLayerId: s.design.activeLayerId === id ? (layers.at(-1)?.id ?? null) : s.design.activeLayerId } }
      }),
      setActiveDesignLayer: (activeLayerId) => set((s) => ({ design: { ...s.design, activeLayerId } })),
      patchActiveDesignLayer: (patch) => set((s) => ({
        design: {
          ...s.design,
          layers: s.design.layers.map((l) => l.id === s.design.activeLayerId ? { ...l, ...patch } : l),
        },
      })),
      toggleActiveDesignScope: (zone) => set((s) => ({
        design: {
          ...s.design,
          layers: s.design.layers.map((l) => {
            if (l.id !== s.design.activeLayerId) return l
            const has = l.scope.includes(zone)
            return { ...l, scope: has ? l.scope.filter((z) => z !== zone) : [...l.scope, zone] }
          }),
        },
      })),
      toggleLayerVisibility: (id) => set((s) => ({
        design: { ...s.design, layers: s.design.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l) },
      })),
      reset: () => set(defaults),
      loadPreset: (preset) => set(preset),
    }),
    { name: 'gloveforge-config-v4' },
  ),
)

export const getConfigSnapshot = (): GloveConfig => {
  const s = useGloveStore.getState()
  return {
    model: s.model,
    usage: s.usage,
    weightOz: s.weightOz,
    closure: s.closure,
    cuffLength: s.cuffLength,
    reinforcement: s.reinforcement,
    padding: s.padding,
    gripBar: s.gripBar,
    palmVent: s.palmVent,
    thumbVent: s.thumbVent,
    laceColor: s.laceColor,
    stitchColor: s.stitchColor,
    liningColor: s.liningColor,
    trimWidth: s.trimWidth,
    selectedZone: s.selectedZone,
    pairView: s.pairView,
    zones: s.zones,
    design: s.design,
  }
}
