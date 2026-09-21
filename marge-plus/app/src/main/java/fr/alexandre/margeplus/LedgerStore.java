package fr.alexandre.margeplus;

import android.content.Context;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

public final class LedgerStore {
    public static final int MAX_ITEMS=10000;
    static final int MAX_JSON=16*1024*1024;
    private static final Object LOCK=new Object();
    private final AtomicFile file;

    public LedgerStore(Context context) { file=new AtomicFile(new File(context.getFilesDir(),"ledger-v1.json")); }

    public List<Item> load() throws IOException {
        synchronized(LOCK) {
            if(!file.getBaseFile().exists() && !new File(file.getBaseFile()+".bak").exists()) return new ArrayList<>();
            if(file.getBaseFile().length()>MAX_JSON) throw new IOException("Le fichier de comptes est trop volumineux.");
            try {
                byte[] bytes=file.readFully();
                if(bytes.length>MAX_JSON) throw new IOException("Le fichier de comptes est trop volumineux.");
                JSONObject root=new JSONObject(new String(bytes,StandardCharsets.UTF_8));
                if(!(root.opt("schema") instanceof Number) || !"1".equals(root.opt("schema").toString())) throw new IOException("Version de sauvegarde non reconnue.");
                return parseItems(root.getJSONArray("items"));
            } catch (IOException e) { throw e; }
            catch (Exception e) { throw new IOException("Les comptes sont illisibles. Le fichier original a été conservé.",e); }
        }
    }

    public void save(List<Item> items) throws IOException {
        synchronized(LOCK) {
            byte[] data;
            try { data=new JSONObject().put("schema",1).put("items",itemsJson(items)).toString().getBytes(StandardCharsets.UTF_8); }
            catch(Exception e) { throw new IOException("Comptes invalides : "+e.getMessage(),e); }
            if(data.length>MAX_JSON) throw new IOException("Le fichier de comptes est trop volumineux.");
            FileOutputStream output=null;
            try { output=file.startWrite(); output.write(data); file.finishWrite(output); }
            catch(IOException e) { if(output!=null) file.failWrite(output); throw e; }
        }
    }

    static JSONArray itemsJson(List<Item> items) {
        if(items==null || items.size()>MAX_ITEMS) throw new IllegalArgumentException("Trop d’articles.");
        JSONArray a=new JSONArray(); HashSet<String> ids=new HashSet<>();
        for(Item item:items) {
            if(item==null || !ids.add(item.id)) throw new IllegalArgumentException("Identifiant d’article dupliqué.");
            a.put(item.toJson());
        }
        return a;
    }

    static List<Item> parseItems(JSONArray array) {
        if(array==null || array.length()>MAX_ITEMS) throw new IllegalArgumentException("Trop d’articles.");
        ArrayList<Item> items=new ArrayList<>(); HashSet<String> ids=new HashSet<>();
        for(int i=0;i<array.length();i++) {
            Item item=Item.fromJson(array.optJSONObject(i));
            if(!ids.add(item.id)) throw new IllegalArgumentException("Identifiant d’article dupliqué.");
            items.add(item);
        }
        return items;
    }
}
