"""Static checks before build. Usage: python qa/check_project.py"""
import json
from pathlib import Path
from xml.etree import ElementTree as ET

root=Path(__file__).resolve().parents[1]
asset=(root/'app/src/main/assets/index.html').read_text(encoding='utf-8')
data_line=next(line for line in asset.splitlines() if line.startswith('const DATA='))
assert data_line.endswith(';')
data=json.loads(data_line.removeprefix('const DATA=').removesuffix(';'))
entries=data['entries'];flags=data['flags']
assert len(entries)==405,len(entries)
assert sum(e['type']=='brand' for e in entries)==367
assert sum(e['type']=='country' for e in entries)==38
assert len(set(e['id'] for e in entries))==405,'duplicate IDs'
assert all(e['title'].strip() for e in entries)
assert len(flags)>20
assert 'object-fit:cover' in asset
assert 'sliderZoom' in asset
assert 'hasquery' in asset
assert '.imagebox::after' in asset
assert all(s in asset for s in ['uploadPhoto','cropPanel','backupBtn','restoreBtn'])
manifest=ET.parse(root/'app/src/main/AndroidManifest.xml')
ns='{http://schemas.android.com/apk/res/android}'
app=manifest.getroot().find('application')
assert app is not None
assert app.attrib.get(ns+'allowBackup')=='false'
assert not manifest.getroot().findall('uses-permission'), 'Unexpected Android permissions'
assert (root/'app/src/main/java/fr/atlasgantiers/app/MainActivity.java').exists()
assert (root/'.github/workflows/build-android.yml').exists()
print('PASS static data: 367 marques + 38 pays = 405 entries; ids unique; flags present')
print('PASS gallery placeholder/crop/zoom/fade/backup controls, manifest no permissions, allowBackup=false')
