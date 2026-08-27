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

const gradle = 'android/app/build.gradle';
if (fs.existsSync(gradle)) {
  let source = fs.readFileSync(gradle, 'utf8');
  source = source.replace(/versionCode\s+\d+/, 'versionCode 4');
  source = source.replace(/versionName\s+"[^"]+"/, 'versionName "4.0-audit"');
  fs.writeFileSync(gradle, source);
}

const mainActivity = 'android/app/src/main/java/com/horrivals/game/MainActivity.java';
if (fs.existsSync(mainActivity)) {
  fs.writeFileSync(mainActivity, `package com.horrivals.game;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersiveMode();
    }

    private void applyImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View decorView = getWindow().getDecorView();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), decorView);
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
}
