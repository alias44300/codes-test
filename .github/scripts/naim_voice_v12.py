from pathlib import Path
import shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run naim_clean_ui_v11.py first')

main_activity = r'''package com.naim.mondesimpossibles;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private WebView webView;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private Voice preferredVoice;
    private Voice offlineFallbackVoice;
    private String lastNarration = "";
    private boolean retryingOffline = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new BookBridge(), "AndroidBook");

        tts = new TextToSpeech(this, this);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) return;

        int languageResult = tts.setLanguage(Locale.FRANCE);
        ttsReady = languageResult != TextToSpeech.LANG_MISSING_DATA
                && languageResult != TextToSpeech.LANG_NOT_SUPPORTED;
        if (!ttsReady) return;

        chooseNarratorVoices();
        if (preferredVoice != null) tts.setVoice(preferredVoice);

        tts.setSpeechRate(0.88f);
        tts.setPitch(1.04f);

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) { }
            @Override public void onDone(String utteranceId) { }
            @Override public void onError(String utteranceId) { handleNarrationError(); }
            @Override public void onError(String utteranceId, int errorCode) { handleNarrationError(); }
        });
    }

    private void chooseNarratorVoices() {
        Set<Voice> available = tts.getVoices();
        if (available == null || available.isEmpty()) return;

        List<Voice> french = new ArrayList<>();
        for (Voice voice : available) {
            if (voice.getLocale() == null || !"fr".equalsIgnoreCase(voice.getLocale().getLanguage())) continue;
            Set<String> features = voice.getFeatures();
            if (features != null && features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            french.add(voice);
        }
        if (french.isEmpty()) return;

        french.sort(Comparator.comparingInt(this::voiceScore).reversed());
        preferredVoice = french.get(0);
        for (Voice voice : french) {
            if (!voice.isNetworkConnectionRequired()) {
                offlineFallbackVoice = voice;
                break;
            }
        }
        if (offlineFallbackVoice == null) offlineFallbackVoice = preferredVoice;
    }

    private int voiceScore(Voice voice) {
        int score = voice.getQuality() * 5;
        Locale locale = voice.getLocale();
        if (locale != null) {
            if ("FR".equalsIgnoreCase(locale.getCountry())) score += 700;
            else if ("CA".equalsIgnoreCase(locale.getCountry()) || "BE".equalsIgnoreCase(locale.getCountry())) score += 250;
        }
        if (voice.isNetworkConnectionRequired()) score += 400;
        String name = voice.getName() == null ? "" : voice.getName().toLowerCase(Locale.ROOT);
        if (name.contains("neural")) score += 900;
        if (name.contains("wavenet")) score += 900;
        if (name.contains("natural")) score += 650;
        if (name.contains("network")) score += 250;
        if (name.contains("fr-fr")) score += 180;
        if (name.contains("female") || name.contains("femme")) score += 100;
        return score;
    }

    private void handleNarrationError() {
        if (!ttsReady || retryingOffline || offlineFallbackVoice == null || lastNarration.isEmpty()) return;
        if (preferredVoice != null && preferredVoice.equals(offlineFallbackVoice)) return;
        retryingOffline = true;
        final String retryText = lastNarration;
        runOnUiThread(() -> {
            tts.stop();
            tts.setVoice(offlineFallbackVoice);
            speakWithStoryPauses(retryText);
        });
    }

    private void speakWithStoryPauses(String text) {
        if (!ttsReady || text == null || text.trim().isEmpty()) return;
        lastNarration = text.trim();
        String prepared = lastNarration.replace("…", "...").replaceAll("\\s+", " ").trim();
        String[] parts = prepared.split("(?<=[.!?])\\s+");
        tts.stop();
        int index = 0;
        for (String rawPart : parts) {
            String part = rawPart.trim();
            if (part.isEmpty()) continue;
            String utteranceId = "naim-story-" + System.nanoTime() + "-" + index;
            tts.speak(part, TextToSpeech.QUEUE_ADD, null, utteranceId);
            long pause = 150;
            if (part.endsWith("?") || part.endsWith("!")) pause = 230;
            else if (part.endsWith("...")) pause = 320;
            tts.playSilentUtterance(pause, TextToSpeech.QUEUE_ADD, utteranceId + "-pause");
            index++;
        }
    }

    public class BookBridge {
        @JavascriptInterface
        public void speak(String text) {
            if (!ttsReady || text == null || text.trim().isEmpty()) return;
            retryingOffline = false;
            runOnUiThread(() -> {
                if (preferredVoice != null) tts.setVoice(preferredVoice);
                tts.setSpeechRate(0.88f);
                tts.setPitch(1.04f);
                speakWithStoryPauses(text);
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            if (!ttsReady) return;
            runOnUiThread(() -> tts.stop());
        }
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.NAIM_BOOK_BACK && window.NAIM_BOOK_BACK()", null);
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
'''

java_path = project / 'app/src/main/java/com/naim/mondesimpossibles/MainActivity.java'
java_path.write_text(main_activity, encoding='utf-8')

manifest = project / 'app/src/main/AndroidManifest.xml'
text = manifest.read_text(encoding='utf-8')
if 'android.permission.INTERNET' not in text:
    text = text.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">', '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />')
manifest.write_text(text, encoding='utf-8')

gradle = project / 'app/build.gradle'
text = gradle.read_text(encoding='utf-8').replace('versionCode 2', 'versionCode 3').replace("versionName '1.1.0'", "versionName '1.2.0'")
gradle.write_text(text, encoding='utf-8')

appjs = project / 'app/src/main/assets/app.js'
text = appjs.read_text(encoding='utf-8')
text = text.replace("u.lang='fr-FR'; u.rate=.92; speechSynthesis.speak(u);", "u.lang='fr-FR'; u.rate=.88; u.pitch=1.04; const voices=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('fr')); const natural=voices.find(v=>/neural|natural|premium|enhanced|google/i.test(v.name))||voices[0]; if(natural)u.voice=natural; speechSynthesis.speak(u);")
appjs.write_text(text, encoding='utf-8')

out = root / 'Naim_Mondes_Impossibles_Android_v1.2_Source.zip'
if out.exists():
    out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')
print('v1.2 natural narrator source:', out, out.stat().st_size)
