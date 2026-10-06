import * as THREE from 'three'
import type { DesignLayer, DesignSettings, MaterialId, ZoneId } from '../types'

const materialNoise: Record<MaterialId, { amount: number; gloss: number }> = {
  cowhide: { amount: 12, gloss: 0.38 },
  pebbled: { amount: 26, gloss: 0.26 },
  matte: { amount: 8, gloss: 0.18 },
  patent: { amount: 2, gloss: 0.88 },
  metallic: { amount: 6, gloss: 0.72 },
  suede: { amount: 34, gloss: 0.06 },
  vintage: { amount: 22, gloss: 0.20 },
  microfiber: { amount: 16, gloss: 0.16 },
  python: { amount: 8, gloss: 0.34 },
  croc: { amount: 8, gloss: 0.36 },
}

export const materialProps = (material: MaterialId) => {
  const g = materialNoise[material]
  return {
    roughness: Math.max(0.06, 0.92 - g.gloss),
    metalness: material === 'metallic' ? 0.72 : 0.02,
    clearcoat: material === 'patent' ? 1 : material === 'metallic' ? 0.45 : 0.16,
    clearcoatRoughness: material === 'patent' ? 0.05 : material === 'metallic' ? 0.18 : 0.52,
  }
}

function seedNoise(ctx: CanvasRenderingContext2D, size: number, amount: number) {
  const image = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.floor((Math.random() - 0.5) * amount)
    image.data[i] = Math.max(0, Math.min(255, image.data[i] + n))
    image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + n))
    image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + n))
  }
  ctx.putImageData(image, 0, 0)
}

function drawMaterialPattern(ctx: CanvasRenderingContext2D, size: number, material: MaterialId) {
  if (material === 'pebbled') {
    ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#000'
    for (let y = 0; y < size; y += 20) for (let x = 0; x < size; x += 20) { const r = 2 + Math.random() * 2.8; ctx.beginPath(); ctx.ellipse(x + Math.random() * 6, y + Math.random() * 6, r, r * 0.68, Math.random(), 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  if (material === 'python') {
    ctx.save(); ctx.globalAlpha = 0.14; ctx.strokeStyle = '#050505'; ctx.lineWidth = 1.2
    for (let y = -40; y < size + 40; y += 34) for (let x = -40; x < size + 40; x += 30) { ctx.beginPath(); ctx.ellipse(x + ((y / 34) % 2 ? 15 : 0), y, 13, 9, 0, 0, Math.PI * 2); ctx.stroke() }
    ctx.restore()
  }
  if (material === 'croc') {
    ctx.save(); ctx.globalAlpha = 0.13; ctx.strokeStyle = '#020202'; ctx.lineWidth = 1.5
    for (let y = 0; y < size; y += 42) for (let x = 0; x < size; x += 54) { const w = 38 + Math.random() * 15; const h = 25 + Math.random() * 11; ctx.strokeRect(x + Math.random() * 7, y + Math.random() * 6, w, h) }
    ctx.restore()
  }
  if (material === 'microfiber') {
    ctx.save(); ctx.globalAlpha = 0.08; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.7
    for (let i = 0; i < 420; i++) { const x = Math.random() * size; const y = Math.random() * size; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.random() * 8, y + Math.random() * 3); ctx.stroke() }
    ctx.restore()
  }
  if (material === 'vintage') {
    ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = '#000'
    for (let i = 0; i < 28; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * size, Math.random() * size); ctx.bezierCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size); ctx.stroke() }
    ctx.restore()
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src })
}

function drawArtwork(target: CanvasRenderingContext2D, img: HTMLImageElement, layer: DesignLayer, size: number, alpha: number) {
  target.save(); target.translate(size / 2 + layer.offsetX * size * 0.35, size / 2 + layer.offsetY * size * 0.35); target.rotate((layer.rotation * Math.PI) / 180)
  const base = Math.min(size / img.width, size / img.height) * layer.scale
  const w = img.width * base; const h = img.height * base; target.globalAlpha = alpha
  const reps = layer.repeat ? [-2, -1, 0, 1, 2] : [0]
  for (const x of reps) for (const y of reps) target.drawImage(img, -w / 2 + x * w, -h / 2 + y * h, w, h)
  target.restore()
}

export async function createSurfaceTextures(baseColor: string, material: MaterialId, design: DesignSettings, zone: ZoneId) {
  const size = 768
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = baseColor; ctx.fillRect(0, 0, size, size); seedNoise(ctx, size, materialNoise[material].amount); drawMaterialPattern(ctx, size, material)
  const bumpCanvas = document.createElement('canvas'); bumpCanvas.width = size; bumpCanvas.height = size
  const bump = bumpCanvas.getContext('2d')!; bump.fillStyle = '#777'; bump.fillRect(0, 0, size, size)
  if (material === 'pebbled' || material === 'python' || material === 'croc') { bump.globalAlpha = material === 'pebbled' ? 0.22 : 0.32; bump.drawImage(canvas, 0, 0); bump.globalAlpha = 1 }

  const relevant = design.layers.filter((layer) => layer.visible && layer.scope.includes(zone))
  for (const layer of relevant) {
    try {
      const img = await loadImage(layer.imageDataUrl)
      if (layer.mode === 'print') { ctx.globalCompositeOperation = 'source-over'; drawArtwork(ctx, img, layer, size, layer.opacity) }
      else if (layer.mode === 'foil') { ctx.globalCompositeOperation = 'screen'; drawArtwork(ctx, img, layer, size, Math.min(1, layer.opacity * 0.9)); ctx.globalCompositeOperation = 'source-over' }
      else { ctx.globalCompositeOperation = 'multiply'; drawArtwork(ctx, img, layer, size, Math.min(0.42, layer.opacity * 0.42)); ctx.globalCompositeOperation = 'source-over'; drawArtwork(bump, img, layer, size, Math.max(0.55, layer.opacity)) }
    } catch { /* bad image layer never breaks the glove */ }
  }

  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8; map.needsUpdate = true
  const bumpMap = new THREE.CanvasTexture(bumpCanvas); bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping; bumpMap.needsUpdate = true
  return { map, bumpMap }
}
