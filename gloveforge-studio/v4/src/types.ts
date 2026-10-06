export type ZoneId =
  | 'gloveTop'
  | 'backhand'
  | 'palm'
  | 'thumbOutside'
  | 'thumbInside'
  | 'thumbBase'
  | 'wristTop'
  | 'wristBottom'
  | 'trim'
  | 'laces'
  | 'stitching'
  | 'gripBar'

export type MaterialId =
  | 'cowhide'
  | 'pebbled'
  | 'matte'
  | 'patent'
  | 'metallic'
  | 'suede'
  | 'vintage'
  | 'microfiber'
  | 'python'
  | 'croc'

export type ModelId = 'elite' | 'mexican' | 'japanese' | 'american' | 'sparring' | 'fight'
export type UsageId = 'training' | 'sparring' | 'fight'
export type ClosureId = 'lace' | 'velcro' | 'hybrid'
export type CuffLengthId = 'short' | 'standard' | 'long'
export type PaddingId = 'latex' | 'multilayer' | 'horsehairFoam' | 'protective' | 'fightHorsehair'
export type GripBarId = 'none' | 'standard' | 'thick'
export type DesignMode = 'print' | 'emboss' | 'foil'

export interface ZoneStyle {
  color: string
  material: MaterialId
}

export interface DesignLayer {
  id: string
  name: string
  imageDataUrl: string
  mode: DesignMode
  opacity: number
  scale: number
  rotation: number
  offsetX: number
  offsetY: number
  repeat: boolean
  visible: boolean
  scope: ZoneId[]
}

export interface DesignSettings {
  layers: DesignLayer[]
  activeLayerId: string | null
}

export interface GloveConfig {
  model: ModelId
  usage: UsageId
  weightOz: number
  closure: ClosureId
  cuffLength: CuffLengthId
  reinforcement: 0 | 1 | 2 | 3
  padding: PaddingId
  gripBar: GripBarId
  palmVent: boolean
  thumbVent: boolean
  laceColor: string
  stitchColor: string
  liningColor: string
  trimWidth: number
  selectedZone: ZoneId
  pairView: 'single' | 'pair'
  zones: Record<ZoneId, ZoneStyle>
  design: DesignSettings
}
