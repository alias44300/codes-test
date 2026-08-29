from pathlib import Path
import base64, json, re, shutil, zipfile

root = Path('naim-book-android')
chunks = sorted((root / 'source_zip').glob('chunk_*.b64'))
if not chunks:
    raise SystemExit('No source chunks found')
raw = ''.join(p.read_text(encoding='utf-8') for p in chunks)
data = base64.b64decode(re.sub(r'[^A-Za-z0-9+/=]', '', raw), validate=False)
incoming = root / 'incoming-source-v11.zip'
incoming.write_bytes(data)
buildsrc = root / 'buildsrc-v11'
if buildsrc.exists(): shutil.rmtree(buildsrc)
buildsrc.mkdir(parents=True)
skipped=[]
with zipfile.ZipFile(incoming) as zf:
    for info in zf.infolist():
        if info.filename.endswith('/app/src/main/assets/book-data.js'):
            skipped.append(info.filename); continue
        zf.extract(info, buildsrc)
if len(skipped)!=1:
    raise SystemExit(f'Expected one generated book-data.js entry, got {skipped}')
project = buildsrc / 'Naim_Mondes_Impossibles_Android'
assets = project / 'app/src/main/assets'
book = json.loads((assets/'book.json').read_text(encoding='utf-8'))
(assets/'book-data.js').write_text('window.NAIM_BOOK_DATA = ' + json.dumps(book, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

html=(assets/'index.html').read_text(encoding='utf-8')
html=html.replace('      <p class="eyebrow">LIVRE À CHOIX · 6 ANS</p>\n','')
html=html.replace('      <div class="cover-badges">\n        <span>240 pages</span><span>60 choix</span><span>10 chapitres</span>\n      </div>\n','')
html=html.replace('        <div class="page-meta"><span id="pageNumber">Page 1 / 240</span><span id="worldLabel">MAISON</span></div>','        <div class="page-meta"><span id="pageNumber">Page 1 / 240</span></div>')
html=html.replace('        <div class="scene-count" id="sceneCount">Scène 1 / 60</div>\n','')
html=html.replace('        <div id="memoryRibbon" class="memory hidden"></div>\n','')
html=html.replace('''      <section class="mini-status" aria-label="Progression de Naïm">\n        <div><span>Courage</span><strong id="courageVal">0</strong></div>\n        <div><span>Gentillesse</span><strong id="kindVal">0</strong></div>\n        <div><span>Imagination</span><strong id="imaginationVal">0</strong></div>\n      </section>\n\n''','')
html=html.replace('      <p class="muted">Les objets trouvés reviennent plus tard dans l’histoire.</p>\n','      <p class="muted">Voici les objets trouvés par Naïm.</p>\n')
html=html.replace('''      <div class="score-card">\n        <h3>Ta façon de jouer</h3>\n        <div class="score-row"><span>Courage</span><strong id="bagCourage">0</strong></div>\n        <div class="score-row"><span>Gentillesse</span><strong id="bagKind">0</strong></div>\n        <div class="score-row"><span>Imagination</span><strong id="bagImagination">0</strong></div>\n      </div>\n''','')
html=html.replace('''      <div class="info-card"><strong>1. Lis une page</strong><p>Les phrases sont courtes. Tu peux aussi appuyer sur 🔊 pour écouter.</p></div>\n      <div class="info-card"><strong>2. Fais tes choix</strong><p>Toutes les 4 pages, Naïm doit choisir quoi faire.</p></div>\n      <div class="info-card"><strong>3. Il n’y a pas de mauvais bouton</strong><p>Un choix peut être courageux, gentil ou très rigolo.</p></div>\n      <div class="info-card"><strong>4. Rejoue</strong><p>Les choix changent le sac, les points et la fin de l’histoire.</p></div>\n''','''      <div class="info-card"><strong>Lis ou écoute</strong><p>Appuie sur 🔊 si tu veux entendre la page.</p></div>\n      <div class="info-card"><strong>Choisis pour Naïm</strong><p>Quand plusieurs boutons apparaissent, choisis ce que Naïm doit faire.</p></div>\n      <div class="info-card"><strong>Amuse-toi</strong><p>Tu peux recommencer l’aventure et essayer d’autres idées.</p></div>\n''')
html=html.replace('      <div id="endingStats" class="ending-stats"></div>\n','')
(assets/'index.html').write_text(html, encoding='utf-8')

js=(assets/'app.js').read_text(encoding='utf-8')
js=js.replace('    const stats = getStats();\n','')
js=js.replace("    $('chapterNum').textContent = `Chapitre ${scene.ci+1} / ${BOOK.chapters.length}`;","    $('chapterNum').textContent = `Chapitre ${scene.ci+1}`;")
js=js.replace("    $('worldLabel').textContent = chapter.world;\n",'')
js=js.replace("    $('sceneCount').textContent = `Scène ${sceneIndex+1} / ${BOOK.sceneCount}`;\n",'')
js=js.replace("    $('courageVal').textContent = stats.courage;\n    $('kindVal').textContent = stats.kind;\n    $('imaginationVal').textContent = stats.imagination;\n",'')
js=js.replace("    $('memoryRibbon').classList.toggle('hidden', !state.lastResult || pageInScene===3);\n    if(state.lastResult && pageInScene!==3) $('memoryRibbon').textContent = `Juste avant : ${state.lastResult}`;\n",'')
js=js.replace("      const tags = ['Choix courageux','Choix gentil','Choix rigolo'];\n",'')
js=js.replace('        b.innerHTML = `<span class="choice-tag">${tags[i]}</span>${label}`;','        b.textContent = label;')
js=js.replace('    const stats = getStats(); const items = getInventory();','    const items = getInventory();')
js=js.replace("    $('bagCourage').textContent=stats.courage; $('bagKind').textContent=stats.kind; $('bagImagination').textContent=stats.imagination;\n",'')
js=js.replace("    $('endingStats').innerHTML=`<span>Courage ${s.courage}</span><span>Gentillesse ${s.kind}</span><span>Imagination ${s.imagination}</span>`;\n",'')
(assets/'app.js').write_text(js, encoding='utf-8')

css=(assets/'styles.css').read_text(encoding='utf-8')
css=css.replace('.cover-badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:22px}.cover-badges span{background:var(--panel);border:1px solid var(--border);padding:7px 10px;border-radius:999px;font-size:12px}','')
css=css.replace('.page-meta{display:flex;justify-content:space-between;color:var(--muted);font-size:11px;font-weight:700;margin-top:6px}', '.page-meta{display:flex;justify-content:flex-start;color:var(--muted);font-size:11px;font-weight:700;margin-top:6px}')
(assets/'styles.css').write_text(css, encoding='utf-8')

gradle=project/'app/build.gradle'
g=gradle.read_text(encoding='utf-8').replace('versionCode 1','versionCode 2').replace("versionName '1.0.0'","versionName '1.1.0'")
gradle.write_text(g,encoding='utf-8')

assert book['pageCount']==240 and book['sceneCount']==60
assert len(book['chapters'])==10
assert sum(len(s['choices']) for c in book['chapters'] for s in c['scenes'])==180
ui=(assets/'index.html').read_text(encoding='utf-8')+(assets/'app.js').read_text(encoding='utf-8')
forbidden=['LIVRE À CHOIX · 6 ANS','60 choix','10 chapitres','sceneCount','worldLabel','courageVal','kindVal','imaginationVal','Juste avant :','Choix courageux','Choix gentil','Choix rigolo','bagCourage','bagKind','bagImagination','endingStats']
left=[x for x in forbidden if x in ui]
assert not left, left

out=root/'Naim_Mondes_Impossibles_Android_v1.1_Source.zip'
if out.exists(): out.unlink()
base=root/'Naim_Mondes_Impossibles_Android_v1.1_Source'
shutil.make_archive(str(base), 'zip', root_dir=buildsrc, base_dir='Naim_Mondes_Impossibles_Android')
print('CLEAN UI OK / 240 pages / 180 options / source', out.stat().st_size)
