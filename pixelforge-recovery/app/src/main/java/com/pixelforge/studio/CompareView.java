package com.pixelforge.studio;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

public final class CompareView extends View {
    private final Paint imagePaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Paint pixelPaint = new Paint();
    private final Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private Bitmap before;
    private Bitmap after;
    private float split = 0.5f;

    public CompareView(Context context) {
        super(context);
        setBackgroundColor(Color.rgb(20, 22, 28));
        pixelPaint.setFilterBitmap(false);
        linePaint.setColor(Color.WHITE);
        linePaint.setStrokeWidth(3f * getResources().getDisplayMetrics().density);
    }

    public void setImages(Bitmap original, Bitmap rendered) {
        before = original;
        after = rendered;
        invalidate();
    }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        Bitmap anchor = before != null ? before : after;
        if (anchor == null) {
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setColor(Color.LTGRAY);
            p.setTextSize(18f * getResources().getDisplayMetrics().scaledDensity);
            p.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("Importez une photo", getWidth() / 2f, getHeight() / 2f, p);
            return;
        }

        RectF dst = fit(anchor.getWidth(), anchor.getHeight(), getWidth(), getHeight());
        float divider = getWidth() * split;
        int save = canvas.save();
        canvas.clipRect(0, 0, divider, getHeight());
        if (before != null) canvas.drawBitmap(before, null, dst, imagePaint);
        canvas.restoreToCount(save);

        save = canvas.save();
        canvas.clipRect(divider, 0, getWidth(), getHeight());
        if (after != null) canvas.drawBitmap(after, null, dst, pixelPaint);
        else if (before != null) canvas.drawBitmap(before, null, dst, imagePaint);
        canvas.restoreToCount(save);

        canvas.drawLine(divider, 0, divider, getHeight(), linePaint);
        canvas.drawCircle(divider, getHeight() / 2f, 11f * getResources().getDisplayMetrics().density, linePaint);
    }

    @Override public boolean onTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_DOWN || e.getAction() == MotionEvent.ACTION_MOVE) {
            split = Math.max(0.05f, Math.min(0.95f, e.getX() / Math.max(1f, getWidth())));
            invalidate();
            return true;
        }
        return e.getAction() == MotionEvent.ACTION_UP || super.onTouchEvent(e);
    }

    private static RectF fit(int iw, int ih, int vw, int vh) {
        float scale = Math.min(vw / (float) iw, vh / (float) ih);
        float w = iw * scale;
        float h = ih * scale;
        float l = (vw - w) / 2f;
        float t = (vh - h) / 2f;
        return new RectF(l, t, l + w, t + h);
    }
}
