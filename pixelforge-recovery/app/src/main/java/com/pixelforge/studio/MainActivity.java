package com.pixelforge.studio;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int PICK_IMAGE = 1001;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private CompareView preview;
    private TextView status;
    private SeekBar target, palette, saturation, contrast;
    private Spinner dither, outline, exportScale;
    private Bitmap original, rendered;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(17, 19, 24));
        getWindow().setNavigationBarColor(Color.rgb(17, 19, 24));

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(17, 19, 24));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16), dp(16), dp(16), dp(24));
        scroll.addView(root);

        TextView title = text("PixelForge Studio", 28, Color.WHITE);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        root.addView(title);
        root.addView(text("Recovery build 0.9.1 · moteur local déterministe", 14, Color.rgb(170, 176, 190)));

        status = text("Prêt. Importez une photo.", 14, Color.rgb(124, 180, 255));
        status.setPadding(0, dp(8), 0, dp(10));
        root.addView(status);

        LinearLayout actions = row();
        Button importButton = button("Importer");
        Button renderButton = button("Pixeliser");
        Button exportButton = button("Exporter PNG");
        actions.addView(importButton, weight());
        actions.addView(renderButton, weight());
        actions.addView(exportButton, weight());
        root.addView(actions);

        preview = new CompareView(this);
        root.addView(preview, new LinearLayout.LayoutParams(-1, dp(360)));
        root.addView(text("Glissez la ligne verticale pour comparer avant / après.", 13, Color.LTGRAY));

        root.addView(section("Préréglages"));
        LinearLayout presets = row();
        Button fidelity = button("Fidélité");
        Button arcade = button("Arcade");
        Button mono = button("Mono");
        presets.addView(fidelity, weight());
        presets.addView(arcade, weight());
        presets.addView(mono, weight());
        root.addView(presets);

        root.addView(section("Réglages"));
        target = seek(root, "Résolution pixel", 32, 256, 128);
        palette = seek(root, "Palette cible", 4, 64, 24);
        saturation = seek(root, "Saturation", 50, 150, 105);
        contrast = seek(root, "Contraste", 50, 150, 105);
        dither = spinner(root, "Dithering", new String[]{"Aucun", "Bayer 4×4"}, 0);
        outline = spinner(root, "Contours", new String[]{"Aucun", "Doux", "Fort"}, 1);
        exportScale = spinner(root, "Échelle export", new String[]{"×1", "×2", "×4", "×8", "×16"}, 2);

        importButton.setOnClickListener(v -> pickImage());
        renderButton.setOnClickListener(v -> process(false));
        exportButton.setOnClickListener(v -> export());
        fidelity.setOnClickListener(v -> applyPreset(160, 32, 105, 105, 0, 1, false));
        arcade.setOnClickListener(v -> applyPreset(64, 16, 115, 115, 1, 2, false));
        mono.setOnClickListener(v -> applyPreset(96, 4, 100, 112, 1, 1, true));
        setContentView(scroll);
    }

    private void pickImage() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("image/*");
        startActivityForResult(i, PICK_IMAGE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_IMAGE || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        status.setText("Décodage de la photo…");
        worker.execute(() -> {
            try {
                Bitmap b = ImageStore.decode(this, uri);
                runOnUiThread(() -> {
                    original = b;
                    rendered = null;
                    preview.setImages(original, null);
                    status.setText("Photo chargée · " + b.getWidth() + "×" + b.getHeight());
                    process(false);
                });
            } catch (Exception e) {
                fail("Import impossible : " + e.getMessage());
            }
        });
    }

    private void process(boolean monoMode) {
        if (original == null) { Toast.makeText(this, "Importez d'abord une photo.", Toast.LENGTH_SHORT).show(); return; }
        PixelEngine.Settings s = new PixelEngine.Settings();
        s.target = target.getProgress();
        s.palette = palette.getProgress();
        s.saturation = saturation.getProgress() / 100f;
        s.contrast = contrast.getProgress() / 100f;
        s.bayer = dither.getSelectedItemPosition() == 1;
        s.outline = outline.getSelectedItemPosition();
        s.mono = monoMode;
        status.setText("Rendu pixel art…");
        worker.execute(() -> {
            try {
                Bitmap out = PixelEngine.render(original, s);
                runOnUiThread(() -> {
                    rendered = out;
                    preview.setImages(original, rendered);
                    status.setText("Rendu prêt · " + out.getWidth() + "×" + out.getHeight());
                });
            } catch (Exception e) { fail("Rendu impossible : " + e.getMessage()); }
        });
    }

    private void applyPreset(int res, int pal, int sat, int con, int dith, int out, boolean monoMode) {
        target.setProgress(res); palette.setProgress(pal); saturation.setProgress(sat); contrast.setProgress(con);
        dither.setSelection(dith); outline.setSelection(out); process(monoMode);
    }

    private void export() {
        if (rendered == null) { Toast.makeText(this, "Créez d'abord un rendu.", Toast.LENGTH_SHORT).show(); return; }
        int[] scales = {1, 2, 4, 8, 16};
        int scale = scales[exportScale.getSelectedItemPosition()];
        Bitmap source = rendered;
        status.setText("Export PNG…");
        worker.execute(() -> {
            try {
                Bitmap up = PixelEngine.upscale(source, scale);
                Uri uri = ImageStore.savePng(this, up);
                if (up != source) up.recycle();
                runOnUiThread(() -> status.setText("Export enregistré · Pictures/PixelForge · " + uri));
            } catch (Exception e) { fail("Export impossible : " + e.getMessage()); }
        });
    }

    private SeekBar seek(LinearLayout root, String label, int min, int max, int value) {
        TextView caption = text(label + " · " + value, 14, Color.WHITE); root.addView(caption);
        SeekBar bar = new SeekBar(this); bar.setMin(min); bar.setMax(max); bar.setProgress(value);
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar b, int p, boolean u) { caption.setText(label + " · " + p); }
            public void onStartTrackingTouch(SeekBar b) {} public void onStopTrackingTouch(SeekBar b) {}
        });
        root.addView(bar); return bar;
    }

    private Spinner spinner(LinearLayout root, String label, String[] values, int selected) {
        root.addView(text(label, 14, Color.WHITE)); Spinner s = new Spinner(this);
        ArrayAdapter<String> a = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, values);
        s.setAdapter(a); s.setSelection(selected); root.addView(s); return s;
    }

    private LinearLayout row() { LinearLayout r = new LinearLayout(this); r.setOrientation(LinearLayout.HORIZONTAL); return r; }
    private LinearLayout.LayoutParams weight() { return new LinearLayout.LayoutParams(0, dp(48), 1f); }
    private Button button(String label) { Button b = new Button(this); b.setText(label); b.setAllCaps(false); return b; }
    private TextView section(String s) { TextView t = text(s, 18, Color.WHITE); t.setPadding(0, dp(18), 0, dp(6)); t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD); return t; }
    private TextView text(String s, int sp, int color) { TextView t = new TextView(this); t.setText(s); t.setTextSize(sp); t.setTextColor(color); return t; }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
    private void fail(String m) { runOnUiThread(() -> { status.setText(m); Toast.makeText(this, m, Toast.LENGTH_LONG).show(); }); }

    @Override protected void onDestroy() { super.onDestroy(); worker.shutdownNow(); }
}
