from pathlib import Path
import shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 + v1.2 + v1.3 scripts first')

assets = project / 'app/src/main/assets'
index = assets / 'index.html'
appjs = assets / 'app.js'
css_path = assets / 'styles.css'

html = index.read_text(encoding='utf-8')

# Search-and-find overlay in the illustration.
needle = '<img id="pageArtImage" class="page-art-image hidden" alt="Illustration de la page">'
insert = '''<img id="pageArtImage" class="page-art-image hidden" alt="Illustration de la page">
        <button id="objectHotspot" class="object-hotspot hidden" type="button" aria-label="Objet caché"></button>
        <div id="searchMission" class="search-mission hidden"></div>'''
if 'id="searchMission"' not in html:
    if needle not in html:
        raise SystemExit('pageArtImage not found')
    html = html.replace(needle, insert)

# Visible adventure gauges, intentionally simple for a six-year-old.
gauge_block = '''
      <section class="adventure-gauges" aria-label="Jauges de l'aventure">
        <div class="gauge-card courage"><div class="gauge-label"><span>🦁 Courage</span><strong id="gaugeCourageVal">0/10</strong></div><div class="gauge-track"><span id="gaugeCourageBar"></span></div></div>
        <div class="gauge-card fear"><div class="gauge-label"><span>🌙 Peur</span><strong id="gaugeFearVal">0/10</strong></div><div class="gauge-track"><span id="gaugeFearBar"></span></div></div>
        <div class="gauge-card curiosity"><div class="gauge-label"><span>🔎 Curiosité</span><strong id="gaugeCuriosityVal">0/10</strong></div><div class="gauge-track"><span id="gaugeCuriosityBar"></span></div></div>
        <div class="gauge-card kindness"><div class="gauge-label"><span>💛 Gentillesse</span><strong id="gaugeKindnessVal">0/10</strong></div><div class="gauge-track"><span id="gaugeKindnessBar"></span></div></div>
      </section>
'''
if 'class="adventure-gauges"' not in html:
    nav_marker = '      <nav class="reader-nav">'
    if nav_marker not in html:
        raise SystemExit('reader nav marker missing')
    html = html.replace(nav_marker, gauge_block + '\n' + nav_marker)

# Adventure profile inside the bag.
if 'id="bagProfile"' not in html:
    marker = '      <div id="inventoryGrid" class="inventory-grid"></div>'
    html = html.replace(marker, marker + '''
      <div id="bagProfile" class="profile-card">
        <h3>⭐ Mon aventure</h3>
        <p id="bagProfileText">Tes choix font évoluer tes jauges.</p>
      </div>''')

# Adventure profile on ending screen.
if 'id="endingProfile"' not in html:
    marker = '      <p id="endingText" class="ending-text"></p>'
    html = html.replace(marker, marker + '''
      <div id="endingProfile" class="ending-profile"></div>''')

# Explain the two game systems in child language.
about_marker = '<div class="info-card"><strong>Amuse-toi</strong><p>Tu peux recommencer l’aventure et essayer d’autres idées.</p></div>'
if about_marker in html and 'Cherche dans les images' not in html:
    html = html.replace(about_marker, '''<div class="info-card"><strong>Regarde tes jauges</strong><p>Courage, Peur, Curiosité et Gentillesse changent selon tes choix.</p></div>
      <div class="info-card"><strong>🔎 Cherche dans les images</strong><p>Parfois, un objet est caché dans l’illustration. Touche-le quand tu le trouves.</p></div>
      ''' + about_marker)

index.write_text(html, encoding='utf-8')

js = appjs.read_text(encoding='utf-8')

# Hidden-object configuration. Page indexes are zero based. More pages can be added as their illustrations arrive.
page_illus = "  const PAGE_ILLUSTRATIONS = { 0: 'illustrations/page_001.webp' };"
object_config = '''  const HIDDEN_OBJECTS = {
    0: { id:'sock_yellow', label:'la chaussette jaune', emoji:'🧦', x:73.5, y:62.0, w:13.5, h:8.5, curiosity:2 }
  };
'''
if 'const HIDDEN_OBJECTS' not in js:
    if page_illus not in js:
        raise SystemExit('PAGE_ILLUSTRATIONS marker missing')
    js = js.replace(page_illus, page_illus + '\n\n' + object_config)

# Persist found objects.
js = js.replace("const defaultState = () => ({ page:0, choices:{}, started:false, lastResult:'', finished:false });",
                "const defaultState = () => ({ page:0, choices:{}, foundObjects:{}, started:false, lastResult:'', finished:false });")

# Replace the old always-present sock with a real found-object reward.
js = js.replace("    const items = ['🧦 Chaussette jaune'];", "    const items = [];\n    if(state.foundObjects && state.foundObjects.sock_yellow) items.push('🧦 Chaussette jaune');")

# Adventure profile is derived from choices, so going back and changing a choice recalculates cleanly.
profile_code = r'''
  function getAdventureProfile(){
    let courage=0, fear=0, curiosity=0, kindness=0;
    Object.entries(state.choices || {}).forEach(([sceneKey, choiceIndex]) => {
      const scene = flatScenes[Number(sceneKey)];
      if(!scene) return;
      const label = (scene.choices[choiceIndex] || '').toLowerCase();
      if(choiceIndex===0) courage += 1;
      if(choiceIndex===1) kindness += 1;
      if(choiceIndex===2) curiosity += 1;
      if(/ouvre|avance|entre|grimpe|saute|affronte|essaie|fonce|regarde/.test(label)) courage += 1;
      if(/cache|couette|fui|recule|attend|peur|appelle|crie|loin|ferme|n'ouvre|ne touche/.test(label)) fear += 2;
      if(/cherche|observe|inspecte|regarde|demande|lit|écoute|suit|indice/.test(label)) curiosity += 1;
      if(/aide|partage|rassure|donne|ami|pardon|merci|protège|sauve/.test(label)) kindness += 1;
    });
    Object.keys(state.foundObjects || {}).forEach(id => {
      if(state.foundObjects[id]){
        const cfg = Object.values(HIDDEN_OBJECTS).find(o => o.id===id);
        curiosity += cfg ? (cfg.curiosity || 1) : 1;
      }
    });
    const cap = n => Math.max(0, Math.min(10, n));
    return { courage:cap(courage), fear:cap(fear), curiosity:cap(curiosity), kindness:cap(kindness) };
  }

  function setGauge(name, value){
    const ids = {courage:'Courage',fear:'Fear',curiosity:'Curiosity',kindness:'Kindness'};
    const suffix = ids[name];
    const bar = $('gauge'+suffix+'Bar');
    const val = $('gauge'+suffix+'Val');
    if(bar) bar.style.width = `${value*10}%`;
    if(val) val.textContent = `${value}/10`;
  }

  function renderGauges(){
    const p=getAdventureProfile();
    setGauge('courage',p.courage); setGauge('fear',p.fear);
    setGauge('curiosity',p.curiosity); setGauge('kindness',p.kindness);
  }

  function renderSearchMission(){
    const mission=$('searchMission');
    const hotspot=$('objectHotspot');
    const cfg=HIDDEN_OBJECTS[state.page];
    if(!cfg || !PAGE_ILLUSTRATIONS[state.page]){
      mission.classList.add('hidden'); hotspot.classList.add('hidden');
      hotspot.removeAttribute('data-object-id'); return;
    }
    const found=!!(state.foundObjects && state.foundObjects[cfg.id]);
    mission.classList.remove('hidden');
    mission.textContent = found ? `✅ Trouvé : ${cfg.emoji} ${cfg.label}` : `🔎 Cherche dans l'image : ${cfg.emoji} ${cfg.label}`;
    if(found){ hotspot.classList.add('hidden'); return; }
    hotspot.dataset.objectId=cfg.id;
    hotspot.style.left=cfg.x+'%'; hotspot.style.top=cfg.y+'%';
    hotspot.style.width=cfg.w+'%'; hotspot.style.height=cfg.h+'%';
    hotspot.classList.remove('hidden');
  }

  function findHiddenObject(ev){
    ev.stopPropagation();
    const cfg=HIDDEN_OBJECTS[state.page];
    if(!cfg) return;
    state.foundObjects = state.foundObjects || {};
    state.foundObjects[cfg.id]=true;
    save(); renderSearchMission(); renderGauges();
    const mission=$('searchMission');
    mission.classList.add('found-pop');
    setTimeout(()=>mission.classList.remove('found-pop'),500);
  }
'''
if 'function getAdventureProfile()' not in js:
    marker = '  function current(){'
    if marker not in js:
        raise SystemExit('current() marker missing')
    js = js.replace(marker, profile_code + '\n' + marker)

# Render gauges and missions on every page.
if 'renderGauges();\n    renderSearchMission();' not in js:
    marker = "    $('prevBtn').disabled = state.page===0;"
    if marker not in js:
        raise SystemExit('renderReader marker missing')
    js = js.replace(marker, "    renderGauges();\n    renderSearchMission();\n" + marker)

# Bag profile summary.
old = "    show('bagScreen');\n  }"
new = "    const p=getAdventureProfile();\n    const bagText=$('bagProfileText');\n    if(bagText) bagText.textContent=`Courage ${p.courage}/10 · Peur ${p.fear}/10 · Curiosité ${p.curiosity}/10 · Gentillesse ${p.kindness}/10`;\n    show('bagScreen');\n  }"
if 'bagProfileText' not in js:
    js = js.replace(old, new, 1)

# Ending profile. Fear is not treated as a failure.
ending_marker = "    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;"
ending_logic = """    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;
    const profile=getAdventureProfile();
    const profileBox=$('endingProfile');
    if(profileBox){
      let note='Chaque aventure est différente.';
      if(profile.fear>=7 && profile.courage>=5) note='Tu as parfois eu très peur, mais tu as quand même continué. Ça aussi, c’est du courage.';
      else if(profile.curiosity>=7) note='Tu as beaucoup observé, cherché et exploré.';
      else if(profile.kindness>=7) note='Tu as souvent pensé aux autres personnages.';
      else if(profile.courage>=7) note='Tu as souvent choisi d’avancer et d’essayer.';
      profileBox.innerHTML=`<h3>⭐ Ton aventure</h3><p>${note}</p><div class="ending-profile-values"><span>🦁 ${profile.courage}/10</span><span>🌙 ${profile.fear}/10</span><span>🔎 ${profile.curiosity}/10</span><span>💛 ${profile.kindness}/10</span></div>`;
    }"""
if 'ending-profile-values' not in js:
    if ending_marker not in js:
        raise SystemExit('ending marker missing')
    js = js.replace(ending_marker, ending_logic)

# Search interaction.
if "$('objectHotspot').addEventListener('click',findHiddenObject);" not in js:
    marker = "  $('speakBtn').addEventListener('click',speakPage);"
    js = js.replace(marker, marker + "\n  $('objectHotspot').addEventListener('click',findHiddenObject);")

appjs.write_text(js, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
extra_css = r'''
.object-hotspot{position:absolute;z-index:5;border:0;background:rgba(255,255,255,.01);border-radius:50%;padding:0;min-height:0}
.object-hotspot:active{background:rgba(255,209,102,.22)}
.search-mission{position:absolute;z-index:6;left:10px;right:10px;bottom:10px;background:rgba(21,21,33,.92);color:#fffaf0;border:2px solid #ffd166;border-radius:15px;padding:10px 12px;font-weight:900;font-size:14px;text-align:center;box-shadow:0 5px 18px rgba(0,0,0,.28)}
.search-mission.found-pop{animation:foundPop .5s ease}
@keyframes foundPop{0%{transform:scale(.96)}45%{transform:scale(1.045)}100%{transform:scale(1)}}
.adventure-gauges{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.gauge-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:9px 10px}
.gauge-label{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:900}.gauge-label strong{font-size:11px;color:var(--muted)}
.gauge-track{height:8px;margin-top:7px;border-radius:999px;background:#34344c;overflow:hidden}.gauge-track span{display:block;height:100%;width:0;border-radius:999px;transition:width .3s ease}
.gauge-card.courage .gauge-track span{background:#ff9f43}.gauge-card.fear .gauge-track span{background:#8e7dff}.gauge-card.curiosity .gauge-track span{background:#4dc9ff}.gauge-card.kindness .gauge-track span{background:#ff79b0}
.profile-card,.ending-profile{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:15px;margin-top:14px}.profile-card h3,.ending-profile h3{margin:0 0 7px}.profile-card p,.ending-profile p{margin:0;color:var(--muted);line-height:1.45}
.ending-profile-values{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:12px}.ending-profile-values span{background:#2a2a40;border:1px solid #3b3a54;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}
@media(max-width:430px){.adventure-gauges{gap:6px}.gauge-card{padding:8px}.gauge-label{font-size:10px}}
'''
if '.object-hotspot{' not in css:
    css += '\n' + extra_css
css_path.write_text(css, encoding='utf-8')

# Stable book-game package for this generation, distinct from the illustrated v1.3 temporary package.
gradle = project / 'app/build.gradle'
g = gradle.read_text(encoding='utf-8')
g = g.replace("applicationId 'com.naim.mondesimpossibles.illustrated'", "applicationId 'com.naim.mondesimpossibles.bookgame'")
g = g.replace('versionCode 4', 'versionCode 5').replace("versionName '1.3.0'", "versionName '1.4.0'")
gradle.write_text(g, encoding='utf-8')

# Source package.
out = root / 'Naim_Mondes_Impossibles_Android_v1.4_BookGame_Source.zip'
if out.exists(): out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')

# Audit.
assert (assets/'illustrations/page_001.webp').stat().st_size > 100000
ui = index.read_text(encoding='utf-8') + appjs.read_text(encoding='utf-8') + css_path.read_text(encoding='utf-8')
for token in ['Courage','Peur','Curiosité','Gentillesse','HIDDEN_OBJECTS','sock_yellow','objectHotspot','searchMission']:
    assert token in ui, token
print('V1.4 BOOK-GAME OK: 4 gauges + hidden object engine + page 1 sock search')
