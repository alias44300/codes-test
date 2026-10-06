import { Box, Layers3, Sparkles } from 'lucide-react'
import { Controls, zoneLabels } from './components/Controls'
import { Viewer } from './components/Viewer'
import { useGloveStore } from './store'

export default function App() {
  const pairView = useGloveStore((s) => s.pairView)
  const setPairView = useGloveStore((s) => s.setPairView)
  const selected = useGloveStore((s) => s.selectedZone)
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Box size={20}/></div><div><strong>GLOVEFORGE</strong><span>ULTIMATE GLOVE LAB</span></div></div>
        <div className="badge"><Sparkles size={14}/> UV + matériaux PBR</div>
        <div className="view-toggle"><button className={pairView === 'single' ? 'active' : ''} onClick={() => setPairView('single')}>1 gant</button><button className={pairView === 'pair' ? 'active' : ''} onClick={() => setPairView('pair')}>Paire</button></div>
      </header>
      <main>
        <Controls />
        <section className="stage">
          <div className="stage-head"><div><span>ATELIER / CONFIGURATEUR</span><h1>BoxElite + Doogma, poussé plus loin.</h1></div><div className="selected-pill"><Layers3 size={15}/> {zoneLabels[selected]}</div></div>
          <Viewer />
          <div className="engineering-note"><b>Coque 3D intacte :</b> le vrai mesh du gant n’est plus découpé en triangles. Les zones utilisent des masques de matériau continus, et les images importées suivent les UV de la surface.</div>
        </section>
      </main>
    </div>
  )
}
