package fr.alexandre.margeplus;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;

final class Ui {
    static final int BG=Color.rgb(9,21,29), CARD=Color.rgb(18,35,45), CARD2=Color.rgb(23,43,52),
        LINE=Color.rgb(39,59,68), INK=Color.rgb(241,247,249), MUTED=Color.rgb(160,180,190),
        MINT=Color.rgb(82,237,180), MINT_DARK=Color.rgb(21,59,49), RED=Color.rgb(255,151,144), GOLD=Color.rgb(246,199,124);
    final Context c;
    Ui(Context c){this.c=c;}
    int dp(float n){return Math.round(n*c.getResources().getDisplayMetrics().density);}
    LinearLayout column(){LinearLayout v=new LinearLayout(c);v.setOrientation(LinearLayout.VERTICAL);return v;}
    LinearLayout row(){LinearLayout v=new LinearLayout(c);v.setGravity(Gravity.CENTER_VERTICAL);return v;}
    TextView text(String value,int size,int color,boolean bold){
        TextView t=new TextView(c);t.setText(value);t.setTextSize(size);t.setTextColor(color);
        t.setTypeface(Typeface.create(bold?"sans-serif-medium":"sans-serif",Typeface.NORMAL));
        t.setIncludeFontPadding(false);t.setLineSpacing(dp(2),1f);return t;
    }
    TextView amount(String value,int size,int color){TextView t=text(value,size,color,true);t.setMaxLines(1);t.setAutoSizeTextTypeUniformWithConfiguration(12,size,1,android.util.TypedValue.COMPLEX_UNIT_SP);return t;}
    GradientDrawable shape(int fill,int radius,int stroke){GradientDrawable d=new GradientDrawable();d.setColor(fill);d.setCornerRadius(dp(radius));if(stroke!=0)d.setStroke(dp(1),stroke);return d;}
    void pad(View v,int h,int y){v.setPadding(dp(h),dp(y),dp(h),dp(y));}
    LinearLayout card(){LinearLayout v=column();pad(v,16,16);v.setBackground(shape(CARD,20,LINE));return v;}
    void click(View v,Runnable action){v.setClickable(true);v.setFocusable(true);v.setOnClickListener(x->action.run());if(v instanceof android.widget.FrameLayout || v instanceof LinearLayout){v.setForeground(new RippleDrawable(ColorStateList.valueOf(0x2652edb4),null,shape(Color.WHITE,18,0)));}}
    TextView button(String title,boolean primary,Runnable action){
        TextView b=text(title,15,primary?BG:INK,true);b.setGravity(Gravity.CENTER);pad(b,16,13);b.setMinHeight(dp(50));
        b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x334fceb0),shape(primary?MINT:CARD2,14,primary?0:LINE),null));
        b.setClickable(true);b.setFocusable(true);b.setOnClickListener(v->action.run());b.setContentDescription(title);return b;
    }
    ImageView icon(String name,int color){ImageView v=new ImageView(c);v.setImageDrawable(new Symbol(name,color));return v;}
    ImageView iconButton(String name,String label,Runnable action){ImageView v=icon(name,INK);pad(v,12,12);v.setBackground(new RippleDrawable(ColorStateList.valueOf(0x3352edb4),shape(CARD2,14,LINE),null));v.setContentDescription(label);v.setFocusable(true);v.setOnClickListener(x->action.run());return v;}
    TextView chip(String title,int color,int fill){TextView v=text(title,11,color,true);pad(v,9,6);v.setBackground(shape(fill,9,0));return v;}
    void gap(LinearLayout parent,int height){parent.addView(new View(c),new LinearLayout.LayoutParams(1,dp(height)));}
    void add(LinearLayout p,View v,int bottom){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.bottomMargin=dp(bottom);p.addView(v,lp);}
    void weight(LinearLayout p,View v,int right){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.rightMargin=dp(right);p.addView(v,lp);}
    void line(LinearLayout p){View v=new View(c);v.setBackgroundColor(LINE);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(1));lp.topMargin=dp(14);lp.bottomMargin=dp(14);p.addView(v,lp);}

    static class Symbol extends Drawable {
        private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);private final String name;private final int color;
        Symbol(String name,int color){this.name=name;this.color=color;}
        @Override public void draw(Canvas canvas){
            canvas.save();canvas.translate(getBounds().left,getBounds().top);canvas.scale(getBounds().width()/24f,getBounds().height()/24f);
            p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.8f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
            switch(name){
                case "home": path(canvas,3,10,12,3,21,10);path(canvas,5,9,5,21,10,21,10,15,14,15,14,21,19,21,19,9);break;
                case "box":path(canvas,3,7,12,3,21,7,21,17,12,22,3,17,3,7,12,12,21,7);path(canvas,12,12,12,22);path(canvas,8,5,17,9);break;
                case "chart":path(canvas,4,3,4,21,22,21);path(canvas,8,16,8,12);path(canvas,13,16,13,8);path(canvas,18,16,18,4);break;
                case "plus":path(canvas,12,5,12,19);path(canvas,5,12,19,12);break;
                case "back":path(canvas,14,5,7,12,14,19);path(canvas,7,12,21,12);break;
                case "chevron":path(canvas,9,5,16,12,9,19);break;
                case "close":path(canvas,6,6,18,18);path(canvas,6,18,18,6);break;
                case "check":path(canvas,4,12,9,17,20,6);break;
                case "search":canvas.drawCircle(10,10,6,p);path(canvas,15,15,21,21);break;
                case "photo":canvas.drawRoundRect(3,4,21,20,3,3,p);canvas.drawCircle(8,9,1.6f,p);path(canvas,4,17,9,12,13,16,16,12,21,17);break;
                case "download":path(canvas,12,3,12,16);path(canvas,7,11,12,16,17,11);path(canvas,4,17,4,21,20,21,20,17);break;
                case "upload":path(canvas,12,17,12,4);path(canvas,7,9,12,4,17,9);path(canvas,4,17,4,21,20,21,20,17);break;
                case "trash":path(canvas,4,6,20,6);path(canvas,8,6,8,3,16,3,16,6);path(canvas,6,6,7,21,17,21,18,6);path(canvas,10,10,10,17);path(canvas,14,10,14,17);break;
                case "trend":path(canvas,3,17,9,11,13,14,21,5);path(canvas,15,5,21,5,21,11);break;
                case "edit":path(canvas,4,16,4,21,9,21,21,9,16,4,4,16);path(canvas,13,7,18,12);break;
                default: p.setStyle(Paint.Style.FILL);canvas.drawCircle(5,12,1.7f,p);canvas.drawCircle(12,12,1.7f,p);canvas.drawCircle(19,12,1.7f,p);
            }
            canvas.restore();
        }
        private void path(Canvas c,float... xy){Path path=new Path();path.moveTo(xy[0],xy[1]);for(int i=2;i<xy.length;i+=2)path.lineTo(xy[i],xy[i+1]);c.drawPath(path,p);}
        @Override public void setAlpha(int alpha){p.setAlpha(alpha);}
        @Override public void setColorFilter(ColorFilter f){p.setColorFilter(f);}
        @Override public int getOpacity(){return PixelFormat.TRANSLUCENT;}
    }
}
