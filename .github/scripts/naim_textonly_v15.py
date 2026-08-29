from pathlib import Path
import re, shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 + v1.2 scripts first')

assets = project / 'app/src/main/assets'
index = assets / 'index.html'
appjs = assets / 'app.js'
cssp = assets / 'styles.css'

html = index.read_text(encoding='utf-8')
# Text-only reader: remove the entire visual panel.
html = re.sub(r'\n\s*<section id="art" class="art-panel".*?</section>\n', '\n', html, count=1, flags=re.S)

# Four simple adventure gauges.
gauge_block = '''
      <section class="adventure-gauges" aria-label="Jauges de l'aventure">
        <div class="gauge-card courage"><div class="gauge-label"><span>🦁 Courage</span><strong id="gaugeCourageVal">0/10</strong></div><div class="gauge-track"><span id="gaugeCourageBar"></span></div></div>
        <div class="gauge-card fear"><div class="gauge-label"><span>🌙 Peur</span><strong id="gaugeFearVal">0/10</strong></div><div class="gauge-track"><span id="gaugeFearBar"></span></div></div>
        <div class="gauge-card curiosity"><div class="gauge-label"><span>🔎 Curiosité</span><strong id="gaugeCuriosityVal">0/10</strong></div><div class="gauge-track"><span id="gaugeCuriosityBar"></span></div></div>
        <div class="gauge-card kindness"><div class="gauge-label"><span>💛 Gentillesse</span><strong id="gaugeKindnessVal">0/10</strong></div><div class="gauge-track"><span id="gaugeKindnessBar"></span></div></div>
      </section>
'''
if 'class="adventure-gauges"' not in html:
    html = html.replace('      <nav class="reader-nav">', gauge_block + '\n      <nav class="reader-nav">')

if 'id="bagProfile"' not in html:
    html = html.replace('      <div id="inventoryGrid" class="inventory-grid"></div>', '''      <div id="inventoryGrid" class="inventory-grid"></div>
      <div id="bagProfile" class="profile-card">
        <h3>⭐ Mon aventure</h3>
        <p id="bagProfileText">Tes choix font évoluer tes jauges.</p>
      </div>''')

if 'id="endingProfile"' not in html:
    html = html.replace('      <p id="endingText" class="ending-text"></p>', '''      <p id="endingText" class="ending-text"></p>
      <div id="endingProfile" class="ending-profile"></div>''')

about_marker = '<div class="info-card"><strong>Amuse-toi</strong><p>Tu peux recommencer l’aventure et essayer d’autres idées.</p></div>'
if about_marker in html and 'Regarde tes jauges' not in html:
    html = html.replace(about_marker, '''<div class="info-card"><strong>Regarde tes jauges</strong><p>Courage, Peur, Curiosité et Gentillesse changent selon tes choix.</p></div>
      ''' + about_marker)

html = html.replace('Voici les objets trouvés par Naïm.', 'Voici les objets gardés par Naïm pendant son aventure.')
index.write_text(html, encoding='utf-8')

js = appjs.read_text(encoding='utf-8')
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
    const cap = n => Math.max(0, Math.min(10, n));
    return { courage:cap(courage), fear:cap(fear), curiosity:cap(curiosity), kindness:cap(kindness) };
  }

  function setGauge(name, value){
    const ids={courage:'Courage',fear:'Fear',curiosity:'Curiosity',kindness:'Kindness'};
    const suffix=ids[name], bar=$('gauge'+suffix+'Bar'), val=$('gauge'+suffix+'Val');
    if(bar) bar.style.width=`${value*10}%`;
    if(val) val.textContent=`${value}/10`;
  }

  function renderGauges(){
    const p=getAdventureProfile();
    setGauge('courage',p.courage); setGauge('fear',p.fear);
    setGauge('curiosity',p.curiosity); setGauge('kindness',p.kindness);
  }
'''
if 'function getAdventureProfile()' not in js:
    js = js.replace('  function current(){', profile_code + '\n  function current(){')

# Remove all visual rendering from reader.
js = js.replace("    $('artIcon').textContent = scene.icon || chapter.icon;\n", '')
js = js.replace("    $('artCaption').textContent = chapter.caption;\n", '')
js = js.replace("    $('art').style.background = `linear-gradient(145deg, ${chapter.color}, #1b1b2c 78%)`;\n", '')
if '    renderGauges();\n' not in js:
    js = js.replace("    $('prevBtn').disabled = state.page===0;", "    renderGauges();\n    $('prevBtn').disabled = state.page===0;")

# Bag profile.
if "const bagText=$('bagProfileText');" not in js:
    js = js.replace("    show('bagScreen');\n  }\n\n  function finish(){", "    const p=getAdventureProfile();\n    const bagText=$('bagProfileText');\n    if(bagText) bagText.textContent=`Courage ${p.courage}/10 · Peur ${p.fear}/10 · Curiosité ${p.curiosity}/10 · Gentillesse ${p.kindness}/10`;\n    show('bagScreen');\n  }\n\n  function finish(){")

# Ending profile.
ending_marker = "    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;"
if 'ending-profile-values' not in js:
    ending_logic = """    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;
    const profile=getAdventureProfile();
    const profileBox=$('endingProfile');
    if(profileBox){
      let note='Chaque aventure est différente.';
      if(profile.fear>=7 && profile.courage>=5) note='Tu as parfois eu très peur, mais tu as quand même continué. Ça aussi, c’est du courage.';
      else if(profile.curiosity>=7) note='Tu as beaucoup observé, cherché et exploré.';
      else if(profile.kindness>=7) note='Tu as souvent pensé aux autres personnages.';
      else if(profile.courage>=7) note='Tu as souvent choisi d’avancer et d’essayer.';
      profileBox.innerHTML=`<h3>⭐ Ton aventure</h3><p>${note}</p><div class=\"ending-profile-values\"><span>🦁 ${profile.courage}/10</span><span>🌙 ${profile.fear}/10</span><span>🔎 ${profile.curiosity}/10</span><span>💛 ${profile.kindness}/10</span></div>`;
    }"""
    js = js.replace(ending_marker, ending_logic)
appjs.write_text(js, encoding='utf-8')

# There must be no illustration assets in this edition.
illus = assets / 'illustrations'
if illus.exists(): shutil.rmtree(illus)

css = cssp.read_text(encoding='utf-8')
css += '''
.adventure-gauges{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.gauge-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:9px 10px}
.gauge-label{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:900}.gauge-label strong{font-size:11px;color:var(--muted)}
.gauge-track{height:8px;margin-top:7px;border-radius:999px;background:#34344c;overflow:hidden}.gauge-track span{display:block;height:100%;width:0;border-radius:999px;transition:width .3s ease}
.gauge-card.courage .gauge-track span{background:#ff9f43}.gauge-card.fear .gauge-track span{background:#8e7dff}.gauge-card.curiosity .gauge-track span{background:#4dc9ff}.gauge-card.kindness .gauge-track span{background:#ff79b0}
.profile-card,.ending-profile{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:15px;margin-top:14px}.profile-card h3,.ending-profile h3{margin:0 0 7px}.profile-card p,.ending-profile p{margin:0;color:var(--muted);line-height:1.45}
.ending-profile-values{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:12px}.ending-profile-values span{background:#2a2a40;border:1px solid #3b3a54;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}
.book-page{margin-top:16px}.story-text{font-size:21px;line-height:1.62}.reader-head{margin-bottom:8px}
@media(max-width:430px){.adventure-gauges{gap:6px}.gauge-card{padding:8px}.gauge-label{font-size:10px}}
'''
cssp.write_text(css, encoding='utf-8')

gradle = project / 'app/build.gradle'
g = gradle.read_text(encoding='utf-8')
g = g.replace("applicationId 'com.naim.mondesimpossibles'", "applicationId 'com.naim.mondesimpossibles.reader'")
g = g.replace('versionCode 3', 'versionCode 6').replace("versionName '1.2.0'", "versionName '1.5.0'")
gradle.write_text(g, encoding='utf-8')

out = root / 'Naim_Mondes_Impossibles_Android_v1.5_TextOnly_Source.zip'
if out.exists(): out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')

ui = index.read_text(encoding='utf-8') + appjs.read_text(encoding='utf-8')
for token in ['pageArtImage','objectHotspot','searchMission','HIDDEN_OBJECTS','PAGE_ILLUSTRATIONS','Cherche dans les images','id="art"']:
    assert token not in ui, token
assert not (assets/'illustrations').exists()
assert all(x in ui for x in ['Courage','Peur','Curiosité','Gentillesse'])
assert "applicationId 'com.naim.mondesimpossibles.reader'" in g
assert "versionName '1.5.0'" in g
print('V1.5 TEXT-ONLY OK: no images, no search-and-find, gauges preserved')
