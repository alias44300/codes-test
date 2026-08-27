import fs from 'node:fs';

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, 'utf8');
  if (!xml.includes('android:screenOrientation=')) {
    xml = xml.replace('<activity', '<activity android:screenOrientation="landscape"');
  }
  fs.writeFileSync(manifest, xml);
}

const strings = 'android/app/src/main/res/values/strings.xml';
if (fs.existsSync(strings)) {
  let xml = fs.readFileSync(strings, 'utf8');
  xml = xml.replace(/<string name="app_name">[\s\S]*?<\/string>/, '<string name="app_name">HORRIVALS</string>');
  xml = xml.replace(/<string name="title_activity_main">[\s\S]*?<\/string>/, '<string name="title_activity_main">HORRIVALS</string>');
  fs.writeFileSync(strings, xml);
}
