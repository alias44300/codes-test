from pathlib import Path
import base64, shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 clean + v1.2 natural voice scripts first')

assets = project / 'app/src/main/assets'
illustrations = assets / 'illustrations'
illustrations.mkdir(parents=True, exist_ok=True)

# Page 1 illustration
encoded = Path('.github/assets/naim_page_001.b64').read_text(encoding='utf-8').strip()
image_bytes = base64.b64decode(encoded)
image_path = illustrations / 'page_001.webp'
image_path.write_bytes(image_bytes)
if image_path.stat().st_size < 50000:
    raise SystemExit('Page 1 illustration looks incomplete')

# Add a real illustration surface to the reader.
index = assets / 'index.html'
html = index.read_text(encoding='utf-8')
old = '<section id="art" class="art-panel" aria-label="Décor du chapitre">'
new = '<section id="art" class="art-panel" aria-label="Illustration de la page">\n        <img id="pageArtImage" class="page-art-image hidden" alt="Illustration de la page">'
if old not in html and 'id="pageArtImage"' not in html:
    raise SystemExit('Could not locate art panel in index.html')
html = html.replace(old, new)
index.write_text(html, encoding='utf-8')

# Display the illustration only on page 1 for now; later pages keep their existing chapter art.
appjs = assets / 'app.js'
js = appjs.read_text(encoding='utf-8')
marker = "  const defaultState = () => ({ page:0, choices:{}, started:false, lastResult:'', finished:false });"
if 'const PAGE_ILLUSTRATIONS' not in js:
    js = js.replace(marker, "  const PAGE_ILLUSTRATIONS = { 0: 'illustrations/page_001.webp' };\n\n" + marker)
art_marker = "    $('art').style.background = `linear-gradient(145deg, ${chapter.color}, #1b1b2c 78%)`;"
art_logic = """    $('art').style.background = `linear-gradient(145deg, ${chapter.color}, #1b1b2c 78%)`;
    const pageArtImage = $('pageArtImage');
    const pageArtPath = PAGE_ILLUSTRATIONS[state.page];
    if(pageArtPath){
      pageArtImage.src = pageArtPath;
      pageArtImage.classList.remove('hidden');
      $('art').classList.add('has-image');
    } else {
      pageArtImage.classList.add('hidden');
      pageArtImage.removeAttribute('src');
      $('art').classList.remove('has-image');
    }"""
if 'const pageArtImage' not in js:
    if art_marker not in js:
        raise SystemExit('Could not locate art rendering in app.js')
    js = js.replace(art_marker, art_logic)
appjs.write_text(js, encoding='utf-8')

css_path = assets / 'styles.css'
css = css_path.read_text(encoding='utf-8')
if '.page-art-image{' not in css:
    css += """
.page-art-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.art-panel.has-image{height:auto;aspect-ratio:2/3;background:#111}
.art-panel.has-image .planet,.art-panel.has-image .art-icon,.art-panel.has-image .art-caption{display:none}
"""
css_path.write_text(css, encoding='utf-8')

# New package ID avoids the lost temporary v1.2 signing key, so Android can install this build alongside v1.2.
gradle = project / 'app/build.gradle'
g = gradle.read_text(encoding='utf-8')
g = g.replace("applicationId 'com.naim.mondesimpossibles'", "applicationId 'com.naim.mondesimpossibles.illustrated'")
g = g.replace('versionCode 3', 'versionCode 4').replace("versionName '1.2.0'", "versionName '1.3.0'")
gradle.write_text(g, encoding='utf-8')

# Repackage source for audit/rebuild.
out = root / 'Naim_Mondes_Impossibles_Android_v1.3_Illustrated_Source.zip'
if out.exists():
    out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')
print('v1.3 illustrated source:', out, out.stat().st_size)
print('page 1 illustration bytes:', image_path.stat().st_size)
