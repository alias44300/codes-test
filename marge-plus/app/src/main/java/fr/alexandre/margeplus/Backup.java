package fr.alexandre.margeplus;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/** Portable full backup. Import never overwrites an existing article or photo. */
public final class Backup {
    private static final long MAX_BYTES=200L*1024*1024;
    private static final int MAX_ENTRIES=10000;
    private final Context context;
    private final PhotoStore photos;

    public Backup(Context context) { this.context=context.getApplicationContext(); photos=new PhotoStore(context); }

    public void exportZip(List<Item> items,OutputStream output) throws IOException {
        final byte[] manifest;
        Set<String> references=new LinkedHashSet<>();
        try {
            manifest=new JSONObject().put("format","marge-plus").put("schema",1).put("exportedAt",Instant.now().toString())
                    .put("items",LedgerStore.itemsJson(items)).toString().getBytes(StandardCharsets.UTF_8);
            for(Item item:items) references.addAll(item.photos);
        } catch(Exception e) { throw new IOException("Les comptes ne peuvent pas être sauvegardés.",e); }
        if(manifest.length>LedgerStore.MAX_JSON || references.size()+1>MAX_ENTRIES) throw new IOException("Sauvegarde trop volumineuse.");
        long length=manifest.length;
        for(String name:references) {
            File f=photos.file(name);
            if(!f.isFile()) throw new IOException("Une photo est manquante. La sauvegarde a été interrompue.");
            length+=f.length();
            if(length>MAX_BYTES) throw new IOException("Sauvegarde supérieure à 200 Mo.");
        }
        ZipOutputStream zip=new ZipOutputStream(output,StandardCharsets.UTF_8);
        zip.putNextEntry(new ZipEntry("ledger.json")); zip.write(manifest); zip.closeEntry();
        byte[] buffer=new byte[32768];
        for(String name:references) {
            zip.putNextEntry(new ZipEntry("photos/"+name));
            try(InputStream in=new FileInputStream(photos.file(name))) {
                int n; while((n=in.read(buffer))!=-1) zip.write(buffer,0,n);
            }
            zip.closeEntry();
        }
        zip.finish(); zip.flush();
    }

    /** Returns merged copies; caller saves the returned list atomically after success. */
    public List<Item> importZip(InputStream input,List<Item> current) throws IOException {
        File stage=new File(context.getCacheDir(),"restore-"+UUID.randomUUID());
        PhotoStore.ensureDirectory(stage);
        ArrayList<File> committed=new ArrayList<>();
        boolean success=false;
        try {
            LedgerStore.itemsJson(current); // Validate before doing any work.
            File archive=new File(stage,"source.zip");
            try(OutputStream copied=new FileOutputStream(archive)) {
                byte[] chunk=new byte[32768]; long compressed=0; int n;
                while((n=input.read(chunk))!=-1) {
                    compressed+=n;
                    if(compressed>MAX_BYTES+10L*1024*1024) throw new IOException("Archive ZIP trop volumineuse.");
                    copied.write(chunk,0,n);
                }
            }
            Set<String> directoryNames=new HashSet<>();
            // Require a complete central directory, not just a valid ZIP prefix.
            try(ZipFile central=new ZipFile(archive,StandardCharsets.UTF_8)) {
                if(central.size()>MAX_ENTRIES) throw new IOException("Trop de fichiers dans cette sauvegarde.");
                Enumeration<? extends ZipEntry> all=central.entries();
                while(all.hasMoreElements()) if(!directoryNames.add(all.nextElement().getName())) throw new IOException("Entrée ZIP dupliquée.");
            }
            byte[] manifest=null;
            HashSet<String> names=new HashSet<>();
            HashMap<String,File> stagedPhotos=new HashMap<>();
            byte[] buffer=new byte[32768]; long total=0; int entries=0;
            try(ZipInputStream zip=new ZipInputStream(new FileInputStream(archive),StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while((entry=zip.getNextEntry())!=null) {
                if(++entries>MAX_ENTRIES) throw new IOException("Trop de fichiers dans cette sauvegarde.");
                String name=entry.getName();
                if(entry.isDirectory() || !names.add(name)) throw new IOException("Entrée ZIP invalide ou dupliquée.");
                boolean isManifest=name.equals("ledger.json");
                String photoName=name.startsWith("photos/") ? name.substring(7) : "";
                if(!isManifest && !Item.validPhoto(photoName)) throw new IOException("Cette archive contient un chemin non autorisé.");
                if(entry.getSize()>MAX_BYTES) throw new IOException("Sauvegarde supérieure à 200 Mo.");
                ByteArrayOutputStream json=isManifest ? new ByteArrayOutputStream() : null;
                File stagedFile=isManifest ? null : new File(stage,photoName);
                long fileSize=0;
                try(OutputStream out=isManifest ? json : new FileOutputStream(stagedFile)) {
                    int n;
                    while((n=zip.read(buffer))!=-1) {
                        total+=n; fileSize+=n;
                        if(total>MAX_BYTES || (isManifest && fileSize>LedgerStore.MAX_JSON)) throw new IOException("Sauvegarde trop volumineuse.");
                        out.write(buffer,0,n);
                    }
                }
                zip.closeEntry();
                if(isManifest) manifest=json.toByteArray(); else stagedPhotos.put(photoName,stagedFile);
            }
            }
            if(!names.equals(directoryNames)) throw new IOException("Structure ZIP incohérente.");
            if(manifest==null) throw new IOException("Cette archive ne contient pas de comptes Marge +.");
            String json=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(manifest)).toString();
            JSONObject root=new JSONObject(json);
            if(!"marge-plus".equals(root.optString("format")) || !(root.opt("schema") instanceof Number) || !"1".equals(root.opt("schema").toString()))
                throw new IOException("Format de sauvegarde non pris en charge.");
            List<Item> imported=LedgerStore.parseItems(root.getJSONArray("items"));
            HashSet<String> references=new HashSet<>();
            for(Item item:imported) references.addAll(item.photos);
            if(!references.equals(stagedPhotos.keySet())) throw new IOException("La sauvegarde contient des photos manquantes ou non référencées.");
            for(File file:stagedPhotos.values()) validatePhoto(file);
            ArrayList<Item> result=new ArrayList<>();
            HashSet<String> existing=new HashSet<>();
            for(Item item:current) { result.add(item.copy()); existing.add(item.id); }
            List<Item> additions=new ArrayList<>();
            for(Item item:imported) if(!existing.contains(item.id)) additions.add(item.copy());
            if(result.size()+additions.size()>LedgerStore.MAX_ITEMS) throw new IOException("La limite de 10 000 articles serait dépassée.");
            // Every archive entry and item is validated before any permanent photo is added.
            Map<String,String> renamed=new HashMap<>();
            for(Item item:additions) {
                List<String> replacements=new ArrayList<>();
                for(String old:item.photos) {
                    String next=renamed.get(old);
                    if(next==null) {
                        next=UUID.randomUUID()+".jpg";
                        File destination=photos.file(next);
                        PhotoStore.ensureDirectory(destination.getParentFile());
                        if(destination.exists()) throw new IOException("Conflit inattendu lors de la restauration.");
                        File source=stagedPhotos.get(old);
                        if(!source.renameTo(destination)) throw new IOException("Espace disponible insuffisant pour restaurer les photos.");
                        committed.add(destination); renamed.put(old,next);
                    }
                    replacements.add(next);
                }
                item.photos=replacements;
                result.add(item);
            }
            success=true;
            return result;
        } catch(IOException e) { throw e; }
        catch(Exception e) { throw new IOException("Sauvegarde invalide. Vos comptes actuels sont conservés.",e); }
        finally {
            if(!success) for(File f:committed) f.delete();
            File[] temporary=stage.listFiles();
            if(temporary!=null) for(File f:temporary) f.delete();
            stage.delete();
        }
    }

    private static void validatePhoto(File file) throws IOException {
        BitmapFactory.Options bounds=new BitmapFactory.Options(); bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeFile(file.getAbsolutePath(),bounds);
        if(bounds.outWidth<1 || bounds.outHeight<1 || bounds.outWidth>1600 || bounds.outHeight>1600 || !"image/jpeg".equals(bounds.outMimeType))
            throw new IOException("Une photo de la sauvegarde est invalide.");
        BitmapFactory.Options sampled=new BitmapFactory.Options(); sampled.inSampleSize=4;
        Bitmap bitmap=BitmapFactory.decodeFile(file.getAbsolutePath(),sampled);
        if(bitmap==null) throw new IOException("Une photo de la sauvegarde est endommagée.");
        bitmap.recycle();
    }

    public void exportCsv(List<Item> items,OutputStream output) throws IOException {
        LedgerStore.itemsJson(items);
        output.write(new byte[]{(byte)0xef,(byte)0xbb,(byte)0xbf});
        writeRow(output,new String[]{"Article","Catégorie","Plateforme achat","Plateforme vente","Date achat","Date vente","Statut","Achat","Port achat","Protection acheteur","Remise en état","Commission vente","Port vente","Autres frais","Total frais","Coût total","Vente","Bénéfice réalisé","Estimation revente","Photos","Notes"});
        for(Item i:items) writeRow(output,new String[]{i.name,i.category,i.platform,i.salePlatform,i.purchaseDate,i.saleDate,i.sold?"Vendu":"En stock",
                Money.input(i.purchase),Money.input(i.shipping),Money.input(i.buyer),Money.input(i.repair),Money.input(i.saleFees),Money.input(i.saleShipping),Money.input(i.other),
                Money.input(i.fees()),Money.input(i.cost()),i.sold?Money.input(i.sale):"",i.sold?Money.input(i.profit()):"",Money.input(i.estimate),String.valueOf(i.photos.size()),i.notes});
        output.flush();
    }

    private static void writeRow(OutputStream output,String[] fields) throws IOException {
        StringBuilder row=new StringBuilder();
        for(int i=0;i<fields.length;i++) {
            if(i>0) row.append(';');
            String value=fields[i]==null?"":fields[i];
            String trimmed=value.replaceFirst("^[\\s\\u00a0\\u202f]+","");
            // Neutralize spreadsheet formulas from untrusted article names and notes.
            if(!trimmed.isEmpty() && "=+@-".indexOf(trimmed.charAt(0))>=0 && !trimmed.matches("-?[0-9]+(?:[,.][0-9]+)?")) value="'"+value;
            row.append('"').append(value.replace("\"","\"\"")).append('"');
        }
        row.append("\r\n"); output.write(row.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Legacy exports lack fee detail and dates; provisional import dates are explicitly recorded. */
    public List<Item> importLegacyCsv(String text) throws IOException {
        if(text==null || text.length()>LedgerStore.MAX_JSON) throw new IOException("Fichier CSV trop volumineux.");
        List<List<String>> rows=parseCsv(text.startsWith("\ufeff") ? text.substring(1) : text);
        if(rows.isEmpty() || !String.join(";",rows.get(0)).equals("Article;Achat;Frais;Vente;Bénéfice;Statut")) throw new IOException("Ce fichier n’est pas un export de l’ancienne application.");
        ArrayList<Item> result=new ArrayList<>();
        try {
            for(int n=1;n<rows.size();n++) {
                List<String> row=rows.get(n);
                if(row.size()==1 && row.get(0).trim().isEmpty()) continue;
                if(row.size()!=6) throw new IllegalArgumentException("Ligne "+(n+1)+" incomplète.");
                Item item=new Item(); item.name=row.get(0);
                item.purchase=legacyAmount(row.get(1),true); item.other=legacyAmount(row.get(2),true);
                String status=row.get(5).trim();
                if(status.equalsIgnoreCase("Vendu")) item.sold=true;
                else if(!status.equalsIgnoreCase("Stock") && !status.equalsIgnoreCase("En stock")) throw new IllegalArgumentException("Statut inconnu à la ligne "+(n+1));
                item.sale=legacyAmount(row.get(3),false);
                item.saleDate=item.sold?item.purchaseDate:"";
                item.notes="Import de l’ancienne application. Détail des frais indisponible : total repris dans Autres frais. Dates d’achat et de vente non fournies : date d’import utilisée provisoirement, à corriger.";
                item.validate(); result.add(item);
                if(result.size()>LedgerStore.MAX_ITEMS) throw new IllegalArgumentException("Trop d’articles.");
            }
            return result;
        } catch(IllegalArgumentException e) { throw new IOException("Import CSV refusé : "+e.getMessage(),e); }
    }

    // Old releases exported Double.toString(), including binary rounding noise.
    // This tolerance is limited to migration; normal entry still uses strict Money.parse().
    private static long legacyAmount(String raw,boolean required) {
        String value=raw.replace("€","").replace('\u00a0',' ').replace('\u202f',' ').trim();
        if(value.isEmpty()) {
            if(required) throw new IllegalArgumentException("Montant manquant.");
            return 0;
        }
        if(value.length()>64 || !value.matches("(?:[0-9]+|[0-9]{1,3}(?: [0-9]{3})+)(?:[.,][0-9]+)?(?:[eE][+-]?[0-9]{1,3})?"))
            throw new IllegalArgumentException("Montant hérité invalide.");
        try {
            BigDecimal decimal=new BigDecimal(value.replace(" ","").replace(',','.'));
            long cents=decimal.setScale(2,RoundingMode.HALF_UP).movePointRight(2).longValueExact();
            Money.check(cents);
            return cents;
        } catch(ArithmeticException e) { throw new IllegalArgumentException("Montant hérité trop élevé.",e); }
    }

    private static List<List<String>> parseCsv(String text) throws IOException {
        List<List<String>> rows=new ArrayList<>(); List<String> row=new ArrayList<>();
        StringBuilder field=new StringBuilder(); boolean quoted=false,afterQuote=false;
        for(int i=0;i<text.length();i++) {
            char c=text.charAt(i);
            if(quoted) {
                if(c=='"') {
                    if(i+1<text.length() && text.charAt(i+1)=='"') { field.append('"'); i++; }
                    else { quoted=false; afterQuote=true; }
                } else field.append(c);
            } else if(c=='"' && field.length()==0 && !afterQuote) quoted=true;
            else if(c==';') { row.add(field.toString()); field.setLength(0); afterQuote=false; }
            else if(c=='\n' || c=='\r') {
                row.add(field.toString()); rows.add(row); row=new ArrayList<>(); field.setLength(0); afterQuote=false;
                if(c=='\r' && i+1<text.length() && text.charAt(i+1)=='\n') i++;
                if(rows.size()>LedgerStore.MAX_ITEMS+1) throw new IOException("Trop de lignes CSV.");
            } else {
                if(afterQuote || c=='"') throw new IOException("Guillemets CSV invalides.");
                field.append(c);
            }
        }
        if(quoted) throw new IOException("Champ CSV non terminé.");
        if(field.length()>0 || !row.isEmpty() || afterQuote) { row.add(field.toString()); rows.add(row); }
        return rows;
    }
}
