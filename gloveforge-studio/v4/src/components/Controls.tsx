import { Download, Eye, EyeOff, ImagePlus, Layers3, RotateCcw, Save, Upload, X } from 'lucide-react'
import { getConfigSnapshot, useGloveStore } from '../store'
import type { DesignMode, MaterialId, ModelId, PaddingId, ZoneId } from '../types'

export const zoneLabels: Record<ZoneId, string> = {
  gloveTop: 'Dessus du poing',
  backhand: 'Dos du gant',
  palm: 'Paume',
  thumbOutside: 'Pouce extérieur',
  thumbInside: 'Pouce intérieur',
  thumbBase: 'Base du pouce',
  wristTop: 'Poignet extérieur',
  wristBottom: 'Poignet intérieur',
  trim: 'Piping / bordure',
  laces: 'Lacets',
  stitching: 'Coutures',
  gripBar: 'Grip bar',
}

const zones = (Object.keys(zoneLabels) as ZoneId[]).map((id) => ({ id, label: zoneLabels[id] }))
const designZones = zones.filter((z) => !['laces', 'stitching', 'gripBar'].includes(z.id))

const materials: { id: MaterialId; label: string }[] = [
  { id: 'cowhide', label: 'Cuir lisse' },
  { id: 'pebbled', label: 'Cuir grainé' },
  { id: 'matte', label: 'Mat premium' },
  { id: 'patent', label: 'Verni' },
  { id: 'metallic', label: 'Métallisé' },
  { id: 'suede', label: 'Suédé' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'microfiber', label: 'Microfibre' },
  { id: 'python', label: 'Effet python' },
  { id: 'croc', label: 'Effet croco' },
]

const models: { id: ModelId; label: string; hint: string }[] = [
  { id: 'elite', label: 'Elite Mexican Premium', hint: 'profil compact premium' },
  { id: 'mexican', label: 'Mexican Compact', hint: 'profil puncher compact' },
  { id: 'japanese', label: 'Japanese Round', hint: 'forme arrondie' },
  { id: 'american', label: 'American Old School', hint: 'volume traditionnel' },
  { id: 'sparring', label: 'Heavy Sparring', hint: 'protection maximale' },
  { id: 'fight', label: 'Pro Fight Compact', hint: 'petit volume combat' },
]

const paddingOptions: { id: PaddingId; label: string }[] = [
  { id: 'latex', label: 'Latex compact' },
  { id: 'multilayer', label: 'Multicouche' },
  { id: 'horsehairFoam', label: 'Crin + mousse' },
  { id: 'protective', label: 'Sparring protectif' },
  { id: 'fightHorsehair', label: 'Fight crin compact' },
]

const palette = ['#111216', '#ffffff', '#d9b621', '#f2c94c', '#8a8d92', '#50545b', '#c11d27', '#0f4da8', '#154d2c', '#7b1f37', '#d77b22', '#c4a267', '#662d91', '#00a0a8']

function downloadBlob(name: string, type: string, content: BlobPart) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function saveJson() {
  downloadBlob('gloveforge-design-v4.json', 'application/json', JSON.stringify(getConfigSnapshot(), null, 2))
}

function exportPng() {
  const canvas = document.querySelector<HTMLCanvasElement>('#glove-viewer canvas')
  if (!canvas) return
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = 'gloveforge-render.png'
  a.click()
}

export function Controls() {
  const s = useGloveStore()
  const selected = s.zones[s.selectedZone]
  const activeLayer = s.design.layers.find((l) => l.id === s.design.activeLayerId) ?? null

  const importImage = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => s.addDesignLayer(String(reader.result), file.name.replace(/\.[^.]+$/, ''))
    reader.readAsDataURL(file)
  }

  const importPreset = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { s.loadPreset(JSON.parse(String(reader.result))) } catch { /* invalid preset ignored */ }
    }
    reader.readAsText(file)
  }

  return (
    <aside className="control-panel">
      <section>
        <div className="section-title">Architecture du gant</div>
        <div className="model-grid model-grid-wide">
          {models.map((m) => (
            <button className={s.model === m.id ? 'active card-button model-card' : 'card-button model-card'} onClick={() => s.setModel(m.id)} key={m.id}>
              <b>{m.label}</b><small>{m.hint}</small>
            </button>
          ))}
        </div>
        <div className="section-subtitle">Usage</div>
        <div className="segmented">
          {(['training', 'sparring', 'fight'] as const).map((v) => <button key={v} className={s.usage === v ? 'active' : ''} onClick={() => s.setUsage(v)}>{v === 'training' ? 'Training' : v === 'sparring' ? 'Sparring' : 'Fight'}</button>)}
        </div>
        <div className="row control-row"><label>Poids</label><select value={s.weightOz} onChange={(e) => s.setWeight(Number(e.target.value))}>{[8,10,12,14,16,18].map((v) => <option key={v} value={v}>{v} oz</option>)}</select></div>
      </section>

      <section>
        <div className="section-title">Fermeture & protection</div>
        <div className="section-subtitle">Fermeture</div>
        <div className="segmented">{(['lace','velcro','hybrid'] as const).map((v) => <button key={v} className={s.closure === v ? 'active' : ''} onClick={() => s.setClosure(v)}>{v === 'lace' ? 'Lacets' : v === 'velcro' ? 'Velcro' : 'Hybride'}</button>)}</div>
        <div className="section-subtitle">Longueur de manchette</div>
        <div className="segmented">{(['short','standard','long'] as const).map((v) => <button key={v} className={s.cuffLength === v ? 'active' : ''} onClick={() => s.setCuffLength(v)}>{v === 'short' ? 'Courte' : v === 'standard' ? 'Standard' : 'Longue'}</button>)}</div>
        <div className="section-subtitle">Renforts poignet</div>
        <div className="segmented">{([0,1,2,3] as const).map((v) => <button key={v} className={s.reinforcement === v ? 'active' : ''} onClick={() => s.setReinforcement(v)}>{v === 0 ? 'Aucun' : `${v} boudin${v > 1 ? 's' : ''}`}</button>)}</div>
        <div className="section-subtitle">Rembourrage</div>
        <div className="material-grid">{paddingOptions.map((p) => <button key={p.id} className={s.padding === p.id ? 'active card-button' : 'card-button'} onClick={() => s.setPadding(p.id)}>{p.label}</button>)}</div>
      </section>

      <section>
        <div className="section-title">Détails techniques</div>
        <div className="section-subtitle">Grip bar</div>
        <div className="segmented">{(['none','standard','thick'] as const).map((v) => <button key={v} className={s.gripBar === v ? 'active' : ''} onClick={() => s.setGripBar(v)}>{v === 'none' ? 'Aucun' : v === 'standard' ? 'Standard' : 'Épais'}</button>)}</div>
        <label className="toggle"><input type="checkbox" checked={s.palmVent} onChange={(e) => s.setPalmVent(e.target.checked)}/><span>Perforations paume</span></label>
        <label className="toggle"><input type="checkbox" checked={s.thumbVent} onChange={(e) => s.setThumbVent(e.target.checked)}/><span>Perforations pouce</span></label>
        <Range label="Épaisseur piping" value={s.trimWidth} min={0.5} max={2.5} step={0.1} onChange={s.setTrimWidth}/>
        <div className="section-subtitle">Doublure intérieure</div>
        <div className="color-line"><input type="color" value={s.liningColor} onChange={(e) => s.setLiningColor(e.target.value)} /><input value={s.liningColor} onChange={(e) => s.setLiningColor(e.target.value)} /></div>
      </section>

      <section>
        <div className="section-title">Panneaux & couleurs</div>
        <div className="zone-grid">{zones.map((z) => <button key={z.id} className={s.selectedZone === z.id ? 'zone active' : 'zone'} onClick={() => s.setSelectedZone(z.id)}>{z.label}</button>)}</div>
        <div className="section-subtitle">Couleur · {zoneLabels[s.selectedZone]}</div>
        <div className="palette">{palette.map((c) => <button key={c} aria-label={c} className="swatch" style={{ background: c }} onClick={() => s.setZoneColor(s.selectedZone, c)} />)}</div>
        <div className="color-line"><input type="color" value={selected.color} onChange={(e) => s.setZoneColor(s.selectedZone, e.target.value)} /><input value={selected.color} onChange={(e) => s.setZoneColor(s.selectedZone, e.target.value)} /></div>
        <div className="section-subtitle">Matière / finition</div>
        <div className="material-grid">{materials.map((m) => <button key={m.id} className={selected.material === m.id ? 'active card-button' : 'card-button'} onClick={() => s.setZoneMaterial(s.selectedZone, m.id)}>{m.label}</button>)}</div>
      </section>

      <section>
        <div className="section-title design-heading"><span>Design intégré aux UV</span><label className="mini-add"><ImagePlus size={15}/> Ajouter<input hidden type="file" accept="image/*" onChange={(e) => importImage(e.target.files?.[0])}/></label></div>
        {s.design.layers.length === 0 ? (
          <label className="drop-zone"><ImagePlus size={22}/><b>Importer un logo, motif ou illustration</b><span>PNG, JPG ou WEBP. Le visuel est mappé sur la surface 3D, pas posé devant le gant.</span><input hidden type="file" accept="image/*" onChange={(e) => importImage(e.target.files?.[0])}/></label>
        ) : (
          <div className="layer-stack">
            {s.design.layers.map((layer, index) => (
              <button key={layer.id} className={layer.id === s.design.activeLayerId ? 'layer-row active' : 'layer-row'} onClick={() => s.setActiveDesignLayer(layer.id)}>
                <img src={layer.imageDataUrl} alt=""/><span><b>{layer.name}</b><small>Calque {index + 1} · {layer.mode}</small></span>
                <i onClick={(e) => { e.stopPropagation(); s.toggleLayerVisibility(layer.id) }}>{layer.visible ? <Eye size={15}/> : <EyeOff size={15}/>}</i>
                <i className="remove" onClick={(e) => { e.stopPropagation(); s.removeDesignLayer(layer.id) }}><X size={15}/></i>
              </button>
            ))}
          </div>
        )}

        {activeLayer && <>
          <div className="active-layer-label"><Layers3 size={14}/>{activeLayer.name}</div>
          <div className="segmented">{(['print','emboss','foil'] as DesignMode[]).map((m) => <button key={m} className={activeLayer.mode === m ? 'active' : ''} onClick={() => s.patchActiveDesignLayer({ mode: m })}>{m === 'print' ? 'Imprimé' : m === 'emboss' ? 'Embossé' : 'Métallisé'}</button>)}</div>
          <div className="section-subtitle">Zones du calque</div>
          <div className="zone-grid compact">{designZones.map((z) => <button key={z.id} className={activeLayer.scope.includes(z.id) ? 'zone active' : 'zone'} onClick={() => s.toggleActiveDesignScope(z.id)}>{z.label}</button>)}</div>
          <Range label="Échelle" value={activeLayer.scale} min={0.2} max={3} step={0.05} onChange={(v) => s.patchActiveDesignLayer({ scale: v })}/>
          <Range label="Rotation" value={activeLayer.rotation} min={-180} max={180} step={1} suffix="°" onChange={(v) => s.patchActiveDesignLayer({ rotation: v })}/>
          <Range label="Décalage X" value={activeLayer.offsetX} min={-1} max={1} step={0.01} onChange={(v) => s.patchActiveDesignLayer({ offsetX: v })}/>
          <Range label="Décalage Y" value={activeLayer.offsetY} min={-1} max={1} step={0.01} onChange={(v) => s.patchActiveDesignLayer({ offsetY: v })}/>
          <Range label="Opacité" value={activeLayer.opacity} min={0.05} max={1} step={0.01} onChange={(v) => s.patchActiveDesignLayer({ opacity: v })}/>
          <label className="toggle"><input type="checkbox" checked={activeLayer.repeat} onChange={(e) => s.patchActiveDesignLayer({ repeat: e.target.checked })}/><span>Répéter le motif</span></label>
        </>}
      </section>

      <section className="actions">
        <button onClick={exportPng}><Download size={17}/> PNG</button>
        <button onClick={saveJson}><Save size={17}/> Projet</button>
        <label className="buttonlike"><Upload size={17}/> Charger<input hidden type="file" accept="application/json" onChange={(e) => importPreset(e.target.files?.[0])}/></label>
        <button className="danger" onClick={s.reset}><RotateCcw size={17}/> Reset</button>
      </section>
    </aside>
  )
}

function Range({ label, value, min, max, step, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step: number; onChange: (v:number)=>void; suffix?: string }) {
  return <div className="range"><div><span>{label}</span><b>{value.toFixed(step < 0.1 ? 2 : 1)}{suffix}</b></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}/></div>
}
