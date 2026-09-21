package fr.alexandre.margeplus;

import android.content.Context;
import android.content.ContextWrapper;
import android.graphics.Bitmap;
import android.media.ExifInterface;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class StorageBackupTest {
    private Context context;
    private File root;
    @Before public void setup() throws IOException {
        Context real=InstrumentationRegistry.getInstrumentation().getTargetContext();
        root=new File(real.getCacheDir(),"tests-"+UUID.randomUUID());
        final File files=new File(root,"files"), cache=new File(root,"cache");
        assertTrue(files.mkdirs()); assertTrue(cache.mkdirs());
        context=new ContextWrapper(real) {
            @Override public File getFilesDir(){return files;}
            @Override public File getCacheDir(){return cache;}
            @Override public Context getApplicationContext(){return this;}
        };
    }
    @After public void cleanup(){ remove(root); }
    private void remove(File f){if(f==null)return;File[] children=f.listFiles();if(children!=null)for(File c:children)remove(c);f.delete();}
    private Item item(){Item i=new Item();i.name="Winning";i.purchase=25000;i.shipping=2000;return i;}
    private interface Io {void run() throws Exception;}
    private void refused(Io operation) throws Exception {try{operation.run();fail("Invalid backup accepted");}catch(IOException expected){}}
    private byte[] zip(String name,byte[] contents) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        try(ZipOutputStream z=new ZipOutputStream(out)){z.putNextEntry(new ZipEntry(name));z.write(contents);z.closeEntry();}
        return out.toByteArray();
    }

    @Test public void failedSaveAndCorruptLoadPreserveOriginal() throws Exception {
        LedgerStore store=new LedgerStore(context); Item good=item();
        store.save(Collections.singletonList(good));
        Item invalid=good.copy();invalid.purchase=-1;
        refused(()->store.save(Collections.singletonList(invalid)));
        assertEquals(25000,new LedgerStore(context).load().get(0).purchase);
        File file=new File(context.getFilesDir(),"ledger-v1.json");
        byte[] corrupt="not json".getBytes(StandardCharsets.UTF_8); Files.write(file.toPath(),corrupt);
        refused(store::load);
        assertArrayEquals(corrupt,Files.readAllBytes(file.toPath()));
    }

    @Test public void duplicateImportPreservesExistingAndNeverMutatesInput() throws Exception {
        Backup backup=new Backup(context); Item old=item();
        ByteArrayOutputStream out=new ByteArrayOutputStream();backup.exportZip(Collections.singletonList(old),out);
        Item current=old.copy();current.name="Nom modifié";current.purchase=30000;
        List<Item> before=Collections.singletonList(current);
        List<Item> imported=backup.importZip(new ByteArrayInputStream(out.toByteArray()),before);
        assertEquals(1,imported.size());assertEquals("Nom modifié",imported.get(0).name);assertEquals(30000,imported.get(0).purchase);
        imported.get(0).name="Autre";assertEquals("Nom modifié",before.get(0).name);
    }

    @Test public void invalidArchivesCannotModifyAccounts() throws Exception {
        Item current=item(); LedgerStore ledger=new LedgerStore(context);ledger.save(Collections.singletonList(current));
        Backup backup=new Backup(context);
        byte[] traversal=zip("../ledger-v1.json","bad".getBytes(StandardCharsets.UTF_8));
        refused(()->backup.importZip(new ByteArrayInputStream(traversal),Collections.singletonList(current)));
        Item missing=item();missing.photos.add(UUID.randomUUID()+".jpg");
        JSONObject manifest=new JSONObject().put("format","marge-plus").put("schema",1).put("items",new JSONArray().put(missing.toJson()));
        byte[] noPhoto=zip("ledger.json",manifest.toString().getBytes(StandardCharsets.UTF_8));
        refused(()->backup.importZip(new ByteArrayInputStream(noPhoto),Collections.singletonList(current)));
        ByteArrayOutputStream out=new ByteArrayOutputStream();backup.exportZip(Collections.singletonList(current),out);
        byte[] broken=Arrays.copyOf(out.toByteArray(),out.size()-12);
        refused(()->backup.importZip(new ByteArrayInputStream(broken),Collections.singletonList(current)));
        assertEquals(current.id,ledger.load().get(0).id);
        File photoDir=new File(context.getFilesDir(),"photos");assertTrue(!photoDir.exists()||photoDir.list().length==0);
    }

    @Test public void selectedPhotoIsPrivateOrientedResizedAndIncludedInBackup() throws Exception {
        File source=new File(context.getCacheDir(),"source.jpg");
        Bitmap bitmap=Bitmap.createBitmap(2400,1200,Bitmap.Config.ARGB_8888);
        bitmap.eraseColor(0xff11aa77);
        try(FileOutputStream out=new FileOutputStream(source)){assertTrue(bitmap.compress(Bitmap.CompressFormat.JPEG,90,out));}
        bitmap.recycle();
        ExifInterface exif=new ExifInterface(source.getAbsolutePath());
        exif.setAttribute(ExifInterface.TAG_ORIENTATION,String.valueOf(ExifInterface.ORIENTATION_ROTATE_90));exif.saveAttributes();
        PhotoStore photoStore=new PhotoStore(context);String name=photoStore.importPhoto(Uri.fromFile(source));
        source.delete();assertTrue(photoStore.file(name).isFile());
        Bitmap thumbnail=photoStore.thumbnail(name,1600);assertNotNull(thumbnail);
        assertEquals(800,thumbnail.getWidth());assertEquals(1600,thumbnail.getHeight());thumbnail.recycle();
        Item original=item();original.photos.add(name);
        Backup backup=new Backup(context);ByteArrayOutputStream out=new ByteArrayOutputStream();backup.exportZip(Collections.singletonList(original),out);
        List<Item> restored=backup.importZip(new ByteArrayInputStream(out.toByteArray()),Collections.emptyList());
        assertEquals(1,restored.size());String restoredName=restored.get(0).photos.get(0);
        assertNotEquals(name,restoredName);assertTrue(photoStore.file(restoredName).isFile());
        assertTrue(photoStore.file(name).isFile());
        try{photoStore.file("../escape.jpg");fail();}catch(IllegalArgumentException expected){}
    }

    @Test public void csvEscapesNamesAndNeutralizesSpreadsheetFormulas() throws Exception {
        Item i=item();i.name="=HYPERLINK(\"bad\")";i.notes="Texte; guillemet \" et\nnouvelle ligne";
        Backup backup=new Backup(context);ByteArrayOutputStream out=new ByteArrayOutputStream();backup.exportCsv(Collections.singletonList(i),out);
        String csv=new String(out.toByteArray(),StandardCharsets.UTF_8);
        assertTrue(csv.contains("\"'=HYPERLINK(\"\"bad\"\")\""));
        assertTrue(csv.contains("\"Texte; guillemet \"\" et\nnouvelle ligne\""));
        List<Item> legacy=backup.importLegacyCsv("Article;Achat;Frais;Vente;Bénéfice;Statut\nCasque;300,00;19,48;0,00;0,00;En stock\n");
        assertEquals(30000,legacy.get(0).purchase);assertEquals(1948,legacy.get(0).other);assertEquals(0,legacy.get(0).shipping);
        assertTrue(legacy.get(0).notes.contains("provisoirement"));
    }

    @Test public void legacyImportAcceptsOriginalStockAndRepairsDoubleRoundingNoise() throws Exception {
        String header="Article;Achat;Frais;Vente;Bénéfice;Statut\n";
        Backup backup=new Backup(context);
        List<Item> legacy=backup.importLegacyCsv(header
                +"Gants;250.0;20.0;0.0;;Stock\n"
                +"Casque;300.0;19.479999999999997;250.0;-69.47999999999999;Vendu\n"
                +"Autre;100.0;39.480000000000004;0.0;;En stock\n");
        assertEquals(3,legacy.size());
        assertFalse(legacy.get(0).sold);assertEquals(25000,legacy.get(0).purchase);assertEquals(2000,legacy.get(0).other);
        assertTrue(legacy.get(1).sold);assertEquals(1948,legacy.get(1).other);assertEquals(-6948,legacy.get(1).profit());
        assertFalse(legacy.get(2).sold);assertEquals(3948,legacy.get(2).other);
        for(String invalid:new String[]{"-1","NaN","Infinity","10000000","1e9999"}) {
            refused(()->backup.importLegacyCsv(header+"Casque;"+invalid+";0;0;;Stock\n"));
        }
        try {Money.parse("19.479999999999997",true);fail("Normal input must remain strict");} catch(IllegalArgumentException expected){}
    }
}
