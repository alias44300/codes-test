from pathlib import Path
import re, shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 + v1.2 + v1.3 + v1.4 scripts first')

assets = project / 'app/src/main/assets'
index = assets / 'index.html'
appjs = assets / 'app.js'
cssp = assets / 'styles.css'

html = index.read_text(encoding='utf-8')
html = re.sub(r'\n\s*<section id="art" class="art-panel".*?</section>\n', '\n', html, count=1, flags=re.S)
html = re.sub(r'\n\s*<div class="info-card"><strong>🔎 Cherche dans les images</strong><p>.*?</p></div>', '', html, count=1, flags=re.S)
html = html.replace('Voici les objets trouvés par Naïm.', 'Voici les objets gardés par Naïm pendant son aventure.')
index.write_text(html, encoding='utf-8')

js = appjs.read_text(encoding='utf-8')
js = re.sub(r'\n\s*const PAGE_ILLUSTRATIONS\s*=\s*\{.*?\};\s*\n', '\n', js, count=1, flags=re.S)
js = re.sub(r'\n\s*const HIDDEN_OBJECTS\s*=\s*\{.*?\};\s*\n', '\n', js, count=1, flags=re.S)
js = js.replace("const defaultState = () => ({ page:0, choices:{}, foundObjects:{}, started:false, lastResult:'', finished:false });", "const defaultState = () => ({ page:0, choices:{}, started:false, lastResult:'', finished:false });")
js = js.replace("    if(state.foundObjects && state.foundObjects.sock_yellow) items.push('🧦 Chaussette jaune');\n", '')
js = re.sub(r'\n\s*Object\.keys\(state\.foundObjects \|\| \{\}\)\.forEach\(id => \{.*?\n\s*\}\);', '', js, count=1, flags=re.S)
js = re.sub(r'\n\s*function renderSearchMission\(\)\{.*?\n\s*function current\(\)\{', '\n\n  function current(){', js, count=1, flags=re.S)
js = re.sub(r"\n\s*\$\('artIcon'\).*?\n\s*renderGauges\(\);\n\s*renderSearchMission\(\);", "\n    renderGauges();", js, count=1, flags=re.S)
js = js.replace("  $('objectHotspot').addEventListener('click',findHiddenObject);\n", '')
appjs.write_text(js, encoding='utf-8')

illus = assets / 'illustrations'
if illus.exists():
    shutil.rmtree(illus)

css = cssp.read_text(encoding='utf-8')
css = re.sub(r'\n\.page-art-image\{.*?\.ending-screen \.ending-text\{margin-top:6px\}\n', '\n', css, flags=re.S)
css = re.sub(r'\n\.object-hotspot\{.*?@media\(max-width:430px\)\{\.adventure-gauges\{gap:6px\}\.gauge-card\{padding:8px\}\.gauge-label\{font-size:10px\}\}\n', '\n', css, flags=re.S)
if '.adventure-gauges{' not in css:
    css += '''\n.adventure-gauges{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}\n.gauge-card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:9px 10px}\n.gauge-label{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:900}.gauge-label strong{font-size:11px;color:var(--muted)}\n.gauge-track{height:8px;margin-top:7px;border-radius:999px;background:#34344c;overflow:hidden}.gauge-track span{display:block;height:100%;width:0;border-radius:999px;transition:width .3s ease}\n.gauge-card.courage .gauge-track span{background:#ff9f43}.gauge-card.fear .gauge-track span{background:#8e7dff}.gauge-card.curiosity .gauge-track span{background:#4dc9ff}.gauge-card.kindness .gauge-track span{background:#ff79b0}\n.profile-card,.ending-profile{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:15px;margin-top:14px}.profile-card h3,.ending-profile h3{margin:0 0 7px}.profile-card p,.ending-profile p{margin:0;color:var(--muted);line-height:1.45}\n.ending-profile-values{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:12px}.ending-profile-values span{background:#2a2a40;border:1px solid #3b3a54;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900}\n@media(max-width:430px){.adventure-gauges{gap:6px}.gauge-card{padding:8px}.gauge-label{font-size:10px}}\n'''
css += '\n.book-page{margin-top:14px}.story-text{font-size:21px;line-height:1.62}.reader-head{margin-bottom:8px}\n'
cssp.write_text(css, encoding='utf-8')

gradle = project / 'app/build.gradle'
g = gradle.read_text(encoding='utf-8')
g = g.replace("applicationId 'com.naim.mondesimpossibles.bookgame'", "applicationId 'com.naim.mondesimpossibles.reader'")
g = g.replace('versionCode 5', 'versionCode 6').replace("versionName '1.4.0'", "versionName '1.5.0'")
gradle.write_text(g, encoding='utf-8')

out = root / 'Naim_Mondes_Impossibles_Android_v1.5_TextOnly_Source.zip'
if out.exists(): out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')

ui = index.read_text(encoding='utf-8') + appjs.read_text(encoding='utf-8')
for token in ['pageArtImage','objectHotspot','searchMission','HIDDEN_OBJECTS','PAGE_ILLUSTRATIONS','Cherche dans les images']:
    assert token not in ui, token
assert not (assets/'illustrations').exists()
assert 'Courage' in ui and 'Peur' in ui and 'Curiosité' in ui and 'Gentillesse' in ui
assert "applicationId 'com.naim.mondesimpossibles.reader'" in g
assert "versionName '1.5.0'" in g
print('V1.5 TEXT-ONLY OK: no images, no search-and-find, gauges preserved')
