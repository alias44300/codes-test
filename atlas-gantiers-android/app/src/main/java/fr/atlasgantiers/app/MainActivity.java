package fr.atlasgantiers.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.content.Context;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Toast;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private static final int PICK_FILE=101;
    private static final int SAVE_BACKUP=102;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingBackup;
    private String pendingBackupName;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(18,16,15));
        getWindow().setNavigationBarColor(Color.rgb(18,16,15));
        webView=new WebView(this);
        webView.setBackgroundColor(Color.rgb(18,16,15));
        setContentView(webView);
        WebSettings w=webView.getSettings();
        w.setJavaScriptEnabled(true);
        w.setDomStorageEnabled(true);
        w.setDatabaseEnabled(true);
        w.setAllowFileAccess(false);
        w.setAllowContentAccess(true);
        w.setBuiltInZoomControls(false);
        w.setDisplayZoomControls(false);
        w.setSupportZoom(false);
        w.setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new AtlasAndroidBridge(), "AtlasAndroid");
        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request){
                Uri uri=request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost()) && "/assets/index.html".equals(uri.getPath())){
                    try {InputStream data=getAssets().open("index.html");return new WebResourceResponse("text/html","UTF-8",data);} catch(Exception ignored) {}
                }
                return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                // The editor is fully local; external navigations are refused.
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> callback, FileChooserParams params){
                if (fileCallback!=null) fileCallback.onReceiveValue(null);
                fileCallback=callback;
                String[] accepts=params.getAcceptTypes();
                boolean json=false;
                if(accepts!=null) for(String accept: accepts) if(accept.contains("json")) json=true;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(json?"*/*":"image/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {startActivityForResult(intent,PICK_FILE);} catch(ActivityNotFoundException e){fileCallback.onReceiveValue(null);fileCallback=null;Toast.makeText(MainActivity.this,"Galerie indisponible",Toast.LENGTH_SHORT).show();}
                return true;
            }
        });
        if (savedInstanceState==null) webView.loadUrl(ORIGIN+"/assets/index.html");
        else webView.restoreState(savedInstanceState);
    }

    private class AtlasAndroidBridge {
        @JavascriptInterface public void printPage(){runOnUiThread(()->{
            PrintManager manager=(PrintManager)getSystemService(Context.PRINT_SERVICE);
            if(manager!=null) {
                PrintAttributes print = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build();
                manager.print("Atlas des Gantiers",webView.createPrintDocumentAdapter("Atlas des Gantiers"),print);
            }
        });}
        @JavascriptInterface public void saveText(String filename,String content,String mime){runOnUiThread(()->{
            pendingBackup=content;
            pendingBackupName=(filename==null || filename.isEmpty())?"atlas-gantiers-sauvegarde.json":filename;
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE,pendingBackupName);
            startActivityForResult(intent,SAVE_BACKUP);
        });}
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==PICK_FILE){
            ValueCallback<Uri[]> callback=fileCallback;fileCallback=null;
            if(callback!=null)callback.onReceiveValue(resultCode==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);
        }else if(requestCode==SAVE_BACKUP){
            if(resultCode==RESULT_OK&&data!=null&&data.getData()!=null&&pendingBackup!=null){
                final Uri uri=data.getData();final String content=pendingBackup;
                new Thread(()->{
                    try(OutputStream out=getContentResolver().openOutputStream(uri)) {
                        if(out==null)throw new IllegalStateException("Pas de destination");
                        out.write(content.getBytes(StandardCharsets.UTF_8));
                        runOnUiThread(()->Toast.makeText(this,"Sauvegarde enregistrée",Toast.LENGTH_LONG).show());
                    }catch(Exception e){runOnUiThread(()->Toast.makeText(this,"Sauvegarde impossible : "+e.getMessage(),Toast.LENGTH_LONG).show());}
                }).start();
            }
            pendingBackup=null;pendingBackupName=null;
        }
    }
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack()){webView.goBack();}else{super.onBackPressed();}}
    @Override protected void onSaveInstanceState(Bundle state){webView.saveState(state);super.onSaveInstanceState(state);}
    @Override protected void onDestroy(){if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}
