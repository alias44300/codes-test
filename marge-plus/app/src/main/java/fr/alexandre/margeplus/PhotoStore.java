package fr.alexandre.margeplus;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

/** Copies user-selected pictures into private app storage; no broad media permission. */
public final class PhotoStore {
    private static final long MAX_SOURCE=40L*1024*1024;
    private final Context context;
    private final File directory;

    public PhotoStore(Context context) {
        this.context=context.getApplicationContext();
        directory=new File(context.getFilesDir(),"photos");
    }

    public File file(String name) {
        if(!Item.validPhoto(name)) throw new IllegalArgumentException("Nom de photo invalide.");
        return new File(directory,name);
    }

    public String importPhoto(Uri uri) throws IOException {
        if(uri==null) throw new IOException("Aucune photo sélectionnée.");
        ensureDirectory(directory);
        File raw=File.createTempFile("photo-source-",".tmp",context.getCacheDir());
        File encoded=null;
        Bitmap decoded=null, oriented=null, resized=null;
        try {
            try(InputStream input=context.getContentResolver().openInputStream(uri); FileOutputStream out=new FileOutputStream(raw)) {
                if(input==null) throw new IOException("Cette photo n’est pas accessible.");
                byte[] buffer=new byte[32768]; long length=0; int n;
                while((n=input.read(buffer))!=-1) {
                    length+=n;
                    if(length>MAX_SOURCE) throw new IOException("Photo trop volumineuse (40 Mo maximum).");
                    out.write(buffer,0,n);
                }
            }
            BitmapFactory.Options bounds=new BitmapFactory.Options(); bounds.inJustDecodeBounds=true;
            BitmapFactory.decodeFile(raw.getAbsolutePath(),bounds);
            if(bounds.outWidth<=0 || bounds.outHeight<=0 || bounds.outWidth>40000 || bounds.outHeight>40000)
                throw new IOException("Format de photo non reconnu.");
            BitmapFactory.Options options=new BitmapFactory.Options(); options.inSampleSize=1;
            while(Math.max(bounds.outWidth,bounds.outHeight)/options.inSampleSize>3200) options.inSampleSize*=2;
            decoded=BitmapFactory.decodeFile(raw.getAbsolutePath(),options);
            if(decoded==null) throw new IOException("Cette photo ne peut pas être ouverte.");
            int orientation=ExifInterface.ORIENTATION_NORMAL;
            try(InputStream exifInput=new FileInputStream(raw)) {
                orientation=new ExifInterface(exifInput).getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
            } catch(IOException ignored) { /* Formats without EXIF have their natural orientation. */ }
            Matrix matrix=orientationMatrix(orientation);
            oriented=matrix.isIdentity() ? decoded : Bitmap.createBitmap(decoded,0,0,decoded.getWidth(),decoded.getHeight(),matrix,true);
            float scale=Math.min(1f,1600f/Math.max(oriented.getWidth(),oriented.getHeight()));
            resized=scale<1f ? Bitmap.createScaledBitmap(oriented,Math.max(1,Math.round(oriented.getWidth()*scale)),Math.max(1,Math.round(oriented.getHeight()*scale)),true) : oriented;
            String name=UUID.randomUUID()+".jpg";
            encoded=File.createTempFile("photo-",".tmp",directory);
            try(FileOutputStream output=new FileOutputStream(encoded)) {
                if(!resized.compress(Bitmap.CompressFormat.JPEG,88,output)) throw new IOException("La photo n’a pas pu être enregistrée.");
                output.getFD().sync();
            }
            if(!encoded.renameTo(file(name))) throw new IOException("La photo n’a pas pu être conservée.");
            return name;
        } catch(OutOfMemoryError e) {
            throw new IOException("Photo trop grande pour être ouverte. Choisissez une image plus petite.",e);
        } finally {
            raw.delete(); if(encoded!=null) encoded.delete();
            if(resized!=null && resized!=oriented && resized!=decoded) resized.recycle();
            if(oriented!=null && oriented!=decoded) oriented.recycle();
            if(decoded!=null) decoded.recycle();
        }
    }

    public Bitmap thumbnail(String name,int max) {
        File f=file(name);
        if(!f.isFile()) return null;
        int limit=Math.max(32,Math.min(max,1600));
        BitmapFactory.Options bounds=new BitmapFactory.Options(); bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeFile(f.getAbsolutePath(),bounds);
        if(bounds.outWidth<1 || bounds.outHeight<1) return null;
        BitmapFactory.Options options=new BitmapFactory.Options(); options.inSampleSize=1;
        while(Math.max(bounds.outWidth,bounds.outHeight)/options.inSampleSize>limit*2) options.inSampleSize*=2;
        try {
            Bitmap decoded=BitmapFactory.decodeFile(f.getAbsolutePath(),options);
            if(decoded==null) return null;
            int size=Math.max(decoded.getWidth(),decoded.getHeight());
            if(size<=limit) return decoded;
            float ratio=(float)limit/size;
            Bitmap scaled=Bitmap.createScaledBitmap(decoded,Math.max(1,Math.round(decoded.getWidth()*ratio)),Math.max(1,Math.round(decoded.getHeight()*ratio)),true);
            if(scaled!=decoded) decoded.recycle();
            return scaled;
        } catch(OutOfMemoryError e) { return null; }
    }

    static void ensureDirectory(File directory) throws IOException {
        if(!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Le dossier de photos n’est pas accessible.");
    }

    private static Matrix orientationMatrix(int orientation) {
        Matrix m=new Matrix();
        switch(orientation) {
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: m.setScale(-1,1); break;
            case ExifInterface.ORIENTATION_ROTATE_180: m.setRotate(180); break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL: m.setScale(1,-1); break;
            case ExifInterface.ORIENTATION_TRANSPOSE: m.setRotate(90); m.postScale(-1,1); break;
            case ExifInterface.ORIENTATION_ROTATE_90: m.setRotate(90); break;
            case ExifInterface.ORIENTATION_TRANSVERSE: m.setRotate(-90); m.postScale(-1,1); break;
            case ExifInterface.ORIENTATION_ROTATE_270: m.setRotate(-90); break;
            default: break;
        }
        return m;
    }
}
