package com.pixelforge.studio;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;

public final class PixelEngine {
    private PixelEngine() {}

    public static final class Settings {
        public int target = 128;
        public int palette = 24;
        public float saturation = 1.05f;
        public float contrast = 1.05f;
        public boolean bayer = false;
        public int outline = 1; // 0 off, 1 soft, 2 strong
        public boolean mono = false;
    }

    public static Bitmap render(Bitmap source, Settings s) {
        int sw = source.getWidth();
        int sh = source.getHeight();
        float k = Math.min(1f, s.target / (float) Math.max(sw, sh));
        int w = Math.max(1, Math.round(sw * k));
        int h = Math.max(1, Math.round(sh * k));

        Bitmap small = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(small);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        c.drawBitmap(source, null, new android.graphics.Rect(0, 0, w, h), p);

        int[] px = new int[w * h];
        small.getPixels(px, 0, w, 0, 0, w, h);
        int levels = Math.max(2, (int) Math.ceil(Math.cbrt(Math.max(2, s.palette))));
        int[][] bayer4 = {
                {0, 8, 2, 10}, {12, 4, 14, 6},
                {3, 11, 1, 9}, {15, 7, 13, 5}
        };

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int i = y * w + x;
                int a = Color.alpha(px[i]);
                int r = Color.red(px[i]);
                int g = Color.green(px[i]);
                int b = Color.blue(px[i]);
                float gray = 0.2126f * r + 0.7152f * g + 0.0722f * b;
                if (s.mono) {
                    r = g = b = clamp(Math.round(gray));
                } else {
                    r = clamp(Math.round(gray + (r - gray) * s.saturation));
                    g = clamp(Math.round(gray + (g - gray) * s.saturation));
                    b = clamp(Math.round(gray + (b - gray) * s.saturation));
                }
                r = contrast(r, s.contrast);
                g = contrast(g, s.contrast);
                b = contrast(b, s.contrast);
                if (s.bayer) {
                    int d = (bayer4[y & 3][x & 3] - 7) * 3;
                    r = clamp(r + d); g = clamp(g + d); b = clamp(b + d);
                }
                if (s.mono) {
                    int monoLevels = Math.max(2, Math.min(8, s.palette));
                    int q = quantize(r, monoLevels);
                    r = g = b = q;
                } else {
                    r = quantize(r, levels);
                    g = quantize(g, levels);
                    b = quantize(b, levels);
                }
                px[i] = Color.argb(a, r, g, b);
            }
        }

        if (s.outline > 0 && w > 2 && h > 2) {
            int[] src = px.clone();
            int threshold = s.outline == 2 ? 42 : 68;
            float darken = s.outline == 2 ? 0.52f : 0.72f;
            for (int y = 1; y < h - 1; y++) {
                for (int x = 1; x < w - 1; x++) {
                    int i = y * w + x;
                    int lum = luma(src[i]);
                    int diff = Math.max(
                            Math.max(Math.abs(lum - luma(src[i - 1])), Math.abs(lum - luma(src[i + 1]))),
                            Math.max(Math.abs(lum - luma(src[i - w])), Math.abs(lum - luma(src[i + w])))
                    );
                    if (diff > threshold && lum < 190) {
                        int col = src[i];
                        px[i] = Color.argb(Color.alpha(col),
                                clamp(Math.round(Color.red(col) * darken)),
                                clamp(Math.round(Color.green(col) * darken)),
                                clamp(Math.round(Color.blue(col) * darken)));
                    }
                }
            }
        }

        small.setPixels(px, 0, w, 0, 0, w, h);
        return small;
    }

    public static Bitmap upscale(Bitmap source, int scale) {
        int s = Math.max(1, Math.min(16, scale));
        Bitmap out = Bitmap.createBitmap(source.getWidth() * s, source.getHeight() * s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(out);
        Paint p = new Paint();
        p.setFilterBitmap(false);
        c.drawBitmap(source, null, new android.graphics.Rect(0, 0, out.getWidth(), out.getHeight()), p);
        return out;
    }

    private static int contrast(int v, float amount) {
        return clamp(Math.round((v - 128f) * amount + 128f));
    }

    private static int quantize(int v, int levels) {
        if (levels <= 1) return v < 128 ? 0 : 255;
        float step = 255f / (levels - 1);
        return clamp(Math.round(Math.round(v / step) * step));
    }

    private static int luma(int c) {
        return (Color.red(c) * 54 + Color.green(c) * 183 + Color.blue(c) * 19) >> 8;
    }

    private static int clamp(int v) { return Math.max(0, Math.min(255, v)); }
}
