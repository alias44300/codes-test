package com.gloveforge.studio;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 911;
    private static final String APP_HOST = "appassets.androidplatform.net";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8, 9, 12));
        getWindow().setNavigationBarColor(Color.rgb(8, 9, 12));

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setBackgroundColor(Color.rgb(8, 9, 12));
        webView.addJavascriptInterface(new AndroidBridge(), "Android");

        webView.setWebViewClient(new LocalAssetClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Impossible d'ouvrir le sélecteur d'image", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        webView.loadUrl("https://" + APP_HOST + "/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        }
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private final class LocalAssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!APP_HOST.equals(uri.getHost())) return null;
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            path = path.substring(1);
            if (path.contains("..")) return null;
            try {
                InputStream input = getAssets().open(path);
                return new WebResourceResponse(mimeType(path), "UTF-8", input);
            } catch (Exception e) {
                return null;
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            injectDownloadBridge(view);
        }
    }

    private void injectDownloadBridge(WebView view) {
        String script = "(function(){" +
            "if(window.__gloveForgeAndroidBridge)return;window.__gloveForgeAndroidBridge=true;" +
            "const original=HTMLAnchorElement.prototype.click;" +
            "HTMLAnchorElement.prototype.click=function(){" +
            "if(this.download&&window.Android){const name=this.download||'gloveforge-export';const href=this.href||'';" +
            "if(href.startsWith('data:')){Android.saveDataUrl(name,href);return;}" +
            "if(href.startsWith('blob:')){fetch(href).then(r=>r.blob()).then(b=>{const fr=new FileReader();fr.onload=()=>Android.saveDataUrl(name,String(fr.result));fr.readAsDataURL(b);});return;}}" +
            "return original.apply(this,arguments);};})();";
        view.evaluateJavascript(script, null);
    }

    private static String mimeType(String path) {
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        String extension = MimeTypeMap.getFileExtensionFromUrl(path);
        String detected = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return detected != null ? detected : "application/octet-stream";
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public void saveDataUrl(String filename, String dataUrl) {
            try {
                int comma = dataUrl.indexOf(',');
                if (comma < 0) throw new IllegalArgumentException("Invalid data URL");
                String header = dataUrl.substring(0, comma);
                String payload = dataUrl.substring(comma + 1);
                String mime = "application/octet-stream";
                int colon = header.indexOf(':');
                int semi = header.indexOf(';');
                if (colon >= 0 && semi > colon) mime = header.substring(colon + 1, semi);
                byte[] bytes;
                if (header.contains(";base64")) {
                    bytes = Base64.getDecoder().decode(payload);
                } else {
                    bytes = Uri.decode(payload).getBytes(StandardCharsets.UTF_8);
                }
                saveBytes(filename, mime, bytes);
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Export impossible", Toast.LENGTH_SHORT).show());
            }
        }
    }

    private void saveBytes(String filename, String mime, byte[] bytes) throws Exception {
        String safeName = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GloveForge Studio");
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Cannot create download");
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("Cannot open download");
                out.write(bytes);
            }
        } else {
            File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "GloveForge Studio");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Cannot create directory");
            try (OutputStream out = new FileOutputStream(new File(dir, safeName))) {
                out.write(bytes);
            }
        }
        runOnUiThread(() -> Toast.makeText(MainActivity.this, safeName + " enregistré", Toast.LENGTH_SHORT).show());
    }
}
