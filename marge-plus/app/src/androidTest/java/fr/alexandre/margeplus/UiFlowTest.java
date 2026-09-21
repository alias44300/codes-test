package fr.alexandre.margeplus;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.*;
import android.graphics.*;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.*;
import java.time.LocalDate;
import java.util.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class UiFlowTest {
    private Context context;
    private Instrumentation instrumentation;
    private ActivityScenario<MainActivity> scenario;
    @Before public void before() throws Exception {
        instrumentation=InstrumentationRegistry.getInstrumentation();context=instrumentation.getTargetContext();
        context.getSharedPreferences("ui",0).edit().clear().commit();new LedgerStore(context).save(new ArrayList<>());
        scenario=ActivityScenario.launch(MainActivity.class);
    }
    @After public void after() throws Exception {if(scenario!=null)scenario.close();context.getSharedPreferences("ui",0).edit().clear().commit();new LedgerStore(context).save(new ArrayList<>());}
    private View find(MainActivity a,String tag){return a.getWindow().getDecorView().findViewWithTag(tag);}
    private void click(String tag){scenario.onActivity(a->{View v=find(a,tag);assertNotNull("Missing control "+tag,v);assertTrue(v.performClick());});instrumentation.waitForIdleSync();}
    private void field(String key,String value){scenario.onActivity(a->((EditText)find(a,"field_"+key)).setText(value));}
    private void waitFor(java.util.function.BooleanSupplier condition) throws Exception {long end=System.currentTimeMillis()+10000;while(System.currentTimeMillis()<end){if(condition.getAsBoolean())return;Thread.sleep(100);}fail("Operation did not complete");}
    private List<Item> loaded(){try{return new LedgerStore(context).load();}catch(Exception e){throw new AssertionError(e);}}
    private boolean page(String tag){final boolean[] found={false};scenario.onActivity(a->found[0]=find(a,tag)!=null);return found[0];}
    private void screenshot(String name){File dir=new File(context.getExternalFilesDir(null),"qa");dir.mkdirs();assertTrue(UiDevice.getInstance(instrumentation).takeScreenshot(new File(dir,name+".png")));}

    @Test public void createWithPhotoRecreateSellAndRetainPhoto() throws Exception {
        click("new_article");field("name","Gants d’entraînement");field("category","Boxe");field("platform","Vinted");field("purchase","25.00");field("shipping","3.20");field("buyer","1.80");
        scenario.recreate();scenario.onActivity(a->assertEquals("Gants d’entraînement",((EditText)find(a,"field_name")).getText().toString()));
        ContentValues values=new ContentValues();values.put(MediaStore.Images.Media.DISPLAY_NAME,"marge-qa-fixture.jpg");values.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");values.put(MediaStore.Images.Media.RELATIVE_PATH,Environment.DIRECTORY_PICTURES+"/MargeQA");Uri source=context.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(source);
        Bitmap fixture=Bitmap.createBitmap(320,320,Bitmap.Config.ARGB_8888);fixture.eraseColor(0xff174636);Canvas canvas=new Canvas(fixture);Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);p.setColor(0xff52edb4);canvas.drawRoundRect(70,60,235,245,45,45,p);p.setColor(0xff0a211b);p.setTextSize(28);p.setTextAlign(Paint.Align.CENTER);canvas.drawText("TEST",160,165,p);try(OutputStream out=context.getContentResolver().openOutputStream(source)){assertTrue(fixture.compress(Bitmap.CompressFormat.JPEG,90,out));}fixture.recycle();
        // Stub only the external document-picker result. Real app callback, image decoding,
        // private copy, recreation, sale and persistence execute on the emulator.
        Intent result=new Intent().setData(source);Instrumentation.ActivityMonitor monitor=new Instrumentation.ActivityMonitor(new IntentFilter(Intent.ACTION_OPEN_DOCUMENT),new Instrumentation.ActivityResult(Activity.RESULT_OK,result),true);instrumentation.addMonitor(monitor);
        click("add_photos");waitFor(()->context.getFilesDir().toPath().resolve("photos").toFile().listFiles()!=null&&context.getFilesDir().toPath().resolve("photos").toFile().listFiles().length>0);
        instrumentation.waitForIdleSync();instrumentation.removeMonitor(monitor);Thread.sleep(400);
        screenshot("02-fiche-achat");click("save_article");waitFor(()->loaded().size()==1);Item stock=loaded().get(0);assertEquals(3000,stock.cost());assertEquals(0,stock.profit());assertEquals(1,stock.photos.size());String savedPhoto=stock.photos.get(0);assertTrue(new PhotoStore(context).file(savedPhoto).isFile());context.getContentResolver().delete(source,null,null);
        scenario.close();scenario=ActivityScenario.launch(MainActivity.class);click("nav_articles");click("item_"+stock.id);screenshot("03-article-photo");
        scenario.onActivity(a->{TextView sell=findText(a.getWindow().getDecorView(),"Enregistrer la vente");assertNotNull(sell);sell.performClick();});instrumentation.waitForIdleSync();field("sale","45.00");field("salePlatform","Main propre");click("save_article");waitFor(()->loaded().get(0).sold);Item sold=loaded().get(0);assertEquals(1500,sold.profit());assertEquals(savedPhoto,sold.photos.get(0));assertTrue(new PhotoStore(context).file(savedPhoto).isFile());
        scenario.close();scenario=ActivityScenario.launch(MainActivity.class);screenshot("01-accueil");click("nav_bilan");screenshot("04-bilan");
    }
    private TextView findText(View v,String text){if(v instanceof TextView&&text.contentEquals(((TextView)v).getText()))return (TextView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int n=0;n<g.getChildCount();n++){TextView found=findText(g.getChildAt(n),text);if(found!=null)return found;}}return null;}

    @Test public void statusBarsDoNotOverlapHeaderAndNavigation() {
        instrumentation.waitForIdleSync();scenario.onActivity(a->{View root=find(a,"app_root"),header=find(a,"page_header"),navigation=find(a,"bottom_navigation");assertNotNull(root);WindowInsets insets=root.getRootWindowInsets();assertNotNull(insets);android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());int[] location=new int[2];header.getLocationOnScreen(location);assertTrue("Header overlaps status bar",location[1]>=bars.top);navigation.getLocationOnScreen(location);assertTrue("Navigation overlaps system buttons",location[1]+navigation.getHeight()<=root.getHeight()-bars.bottom);});
    }

    @Test public void invalidAmountCannotSilentlyBecomeZeroAndStockHasNoProfit() throws Exception {
        click("new_article");field("name","Article invalide");field("purchase","12.345");click("save_article");assertEquals(0,loaded().size());
        scenario.onActivity(a->{TextView ok=findText(a.getWindow().getDecorView(),"Compris");});
        // Dismiss the validation dialog using Android Back, then correct the visible field.
        UiDevice.getInstance(instrumentation).pressBack();instrumentation.waitForIdleSync();field("purchase","12.34");click("save_article");waitFor(()->loaded().size()==1);assertEquals(1234,loaded().get(0).purchase);assertEquals(0,Ledger.summarize(loaded()).profit);
    }
}
