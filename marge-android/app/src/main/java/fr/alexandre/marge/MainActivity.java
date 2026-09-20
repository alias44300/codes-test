package fr.alexandre.marge;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.text.NumberFormat;
import java.util.*;

public class MainActivity extends Activity {
    private final int NAVY=Color.rgb(7,27,51), GREEN=Color.rgb(18,184,134), BG=Color.rgb(244,247,251), MUTED=Color.rgb(102,112,133);
    private LinearLayout list, stats; private JSONArray items; private final NumberFormat money=NumberFormat.getCurrencyInstance(Locale.FRANCE);

    @Override public void onCreate(Bundle b){super.onCreate(b);load();render();}

    private int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String s,int sp,int color,boolean bold){TextView v=new TextView(this);v.setText(s);v.setTextSize(sp);v.setTextColor(color);v.setTypeface(Typeface.DEFAULT,bold?Typeface.BOLD:Typeface.NORMAL);v.setLineSpacing(0,1.12f);return v;}
    private GradientDrawable bg(int color,float radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp((int)radius));return d;}
    private void pad(View v,int x,int y){v.setPadding(dp(x),dp(y),dp(x),dp(y));}

    private void render(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);header.setBackgroundColor(NAVY);pad(header,18,14);
        TextView logo=text("€",24,NAVY,true);logo.setGravity(Gravity.CENTER);logo.setBackground(bg(Color.rgb(25,211,162),13));header.addView(logo,new LinearLayout.LayoutParams(dp(44),dp(44)));
        LinearLayout titles=new LinearLayout(this);titles.setOrientation(LinearLayout.VERTICAL);titles.setPadding(dp(12),0,0,0);titles.addView(text("Marge",22,Color.WHITE,true));titles.addView(text("Achats & reventes",13,Color.rgb(190,203,218),false));header.addView(titles,new LinearLayout.LayoutParams(0,-2,1));
        TextView share=text("EXPORTER",12,Color.WHITE,true);share.setGravity(Gravity.CENTER);share.setOnClickListener(v->shareCsv());header.addView(share,new LinearLayout.LayoutParams(dp(84),dp(44)));root.addView(header);

        ScrollView sc=new ScrollView(this);LinearLayout body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);pad(body,16,18);
        TextView over=text("VUE D’ENSEMBLE",12,MUTED,true);body.addView(over);TextView title=text("Ton activité en un coup d’œil",25,NAVY,true);title.setPadding(0,dp(4),0,dp(14));body.addView(title);
        stats=new LinearLayout(this);stats.setOrientation(LinearLayout.VERTICAL);body.addView(stats);renderStats();
        LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER_VERTICAL);row.setPadding(0,dp(18),0,dp(10));TextView my=text("MES ARTICLES",18,NAVY,true);row.addView(my,new LinearLayout.LayoutParams(0,-2,1));Button add=new Button(this);add.setText("+  NOUVEL ARTICLE");add.setTextColor(Color.WHITE);add.setTextSize(13);add.setTypeface(Typeface.DEFAULT,Typeface.BOLD);add.setAllCaps(false);add.setBackground(bg(GREEN,12));add.setOnClickListener(v->editDialog(-1));row.addView(add);body.addView(row);
        list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);body.addView(list);renderList();sc.addView(body);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }

    private void renderStats(){
        stats.removeAllViews();double purchase=0,fees=0,revenue=0,profit=0;int stock=0,sold=0;
        for(int i=0;i<items.length();i++){JSONObject o=items.optJSONObject(i);purchase+=n(o,"purchase");fees+=allFees(o);if(o.optBoolean("sold")){sold++;revenue+=n(o,"sale");profit+=n(o,"sale")-n(o,"purchase")-allFees(o);}else stock++;}
        addStat("PRIX D’ACHAT",money.format(purchase),stock+" en stock",Color.rgb(49,91,185));
        addStat("FRAIS PAYÉS",money.format(fees),"Port, protection, remise en état…",Color.rgb(162,92,0));
        addStat("CHIFFRE D’AFFAIRES",money.format(revenue),sold+" vente"+(sold>1?"s":""),Color.rgb(116,71,189));
        addStat("BÉNÉFICE NET",money.format(profit),"Vente − achat − tous les frais",profit>=0?Color.rgb(8,122,93):Color.RED);
    }
    private void addStat(String label,String value,String sub,int accent){
        LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setBackground(bg(Color.WHITE,15));pad(c,16,14);
        TextView l=text(label,12,MUTED,true);c.addView(l);TextView v=text(value,25,NAVY,true);v.setPadding(0,dp(5),0,dp(3));c.addView(v);c.addView(text(sub,12,accent,false));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,0,0,dp(9));stats.addView(c,p);
    }
    private void renderList(){
        list.removeAllViews();if(items.length()==0){LinearLayout empty=new LinearLayout(this);empty.setOrientation(LinearLayout.VERTICAL);empty.setGravity(Gravity.CENTER);empty.setBackground(bg(Color.WHITE,15));pad(empty,20,35);empty.addView(text("Aucun article",18,NAVY,true));empty.addView(text("Ajoute ton premier achat avec tous les frais payés.",14,MUTED,false));list.addView(empty);return;}
        for(int i=items.length()-1;i>=0;i--){final int index=i;JSONObject o=items.optJSONObject(i);LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setBackground(bg(Color.WHITE,15));pad(card,16,15);
            LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);LinearLayout names=new LinearLayout(this);names.setOrientation(LinearLayout.VERTICAL);names.addView(text(o.optString("name"),17,NAVY,true));names.addView(text(o.optString("category")+" · "+o.optString("platform"),12,MUTED,false));top.addView(names,new LinearLayout.LayoutParams(0,-2,1));TextView status=text(o.optBoolean("sold")?"VENDU":"EN STOCK",11,o.optBoolean("sold")?Color.rgb(8,122,93):Color.rgb(49,91,185),true);pad(status,9,5);status.setBackground(bg(o.optBoolean("sold")?Color.rgb(233,255,248):Color.rgb(238,244,255),12));top.addView(status);card.addView(top);
            LinearLayout nums=new LinearLayout(this);nums.setPadding(0,dp(14),0,0);double f=allFees(o),cost=n(o,"purchase")+f,profit=n(o,"sale")-cost;nums.addView(metric("ACHAT",money.format(n(o,"purchase")),NAVY),new LinearLayout.LayoutParams(0,-2,1));nums.addView(metric("FRAIS",money.format(f),Color.rgb(162,92,0)),new LinearLayout.LayoutParams(0,-2,1));nums.addView(metric(o.optBoolean("sold")?"BÉNÉFICE":"COÛT TOTAL",o.optBoolean("sold")?money.format(profit):money.format(cost),o.optBoolean("sold")&&profit>=0?Color.rgb(8,122,93):NAVY),new LinearLayout.LayoutParams(0,-2,1));card.addView(nums);
            card.setOnClickListener(v->editDialog(index));card.setOnLongClickListener(v->{new AlertDialog.Builder(this).setTitle("Supprimer l’article ?").setMessage(o.optString("name")).setNegativeButton("Annuler",null).setPositiveButton("Supprimer",(d,w)->{items.remove(index);save();render();}).show();return true;});
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,0,0,dp(10));list.addView(card,p);
        }
    }
    private LinearLayout metric(String label,String value,int color){LinearLayout b=new LinearLayout(this);b.setOrientation(LinearLayout.VERTICAL);b.addView(text(label,10,MUTED,true));b.addView(text(value,15,color,true));return b;}

    private void editDialog(int index){
        JSONObject old=index>=0?items.optJSONObject(index):new JSONObject();LinearLayout form=new LinearLayout(this);form.setOrientation(LinearLayout.VERTICAL);pad(form,18,4);
        EditText name=input("Nom de l’article",old.optString("name"));form.addView(name);EditText category=input("Catégorie",old.optString("category","Gants de boxe"));form.addView(category);EditText platform=input("Plateforme d’achat",old.optString("platform","Vinted"));form.addView(platform);
        form.addView(section("MONTANTS PAYÉS"));
        EditText purchase=number("Prix de l’article (€)",n(old,"purchase"));form.addView(purchase);EditText shipping=number("Frais de port à l’achat (€)",n(old,"shipping"));form.addView(shipping);EditText buyer=number("Protection acheteur / service (€)",n(old,"buyer"));form.addView(buyer);EditText repair=number("Nettoyage / remise en état (€)",n(old,"repair"));form.addView(repair);EditText saleFees=number("Frais prélevés à la vente (€)",n(old,"saleFees"));form.addView(saleFees);EditText other=number("Autres frais (€)",n(old,"other"));form.addView(other);
        CheckBox sold=new CheckBox(this);sold.setText("Article vendu");sold.setTextSize(16);sold.setChecked(old.optBoolean("sold"));form.addView(sold);EditText sale=number("Prix de vente (€)",n(old,"sale"));form.addView(sale);
        ScrollView wrap=new ScrollView(this);wrap.addView(form);AlertDialog dialog=new AlertDialog.Builder(this).setTitle(index>=0?"Fiche de l’article":"Nouvel achat").setView(wrap).setNegativeButton("Annuler",null).setPositiveButton("Enregistrer",null).create();
        dialog.setOnShowListener(x->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{if(name.getText().toString().trim().isEmpty()||val(purchase)<0){Toast.makeText(this,"Nom et prix d’achat obligatoires",Toast.LENGTH_SHORT).show();return;}try{JSONObject o=new JSONObject();o.put("name",name.getText().toString().trim());o.put("category",category.getText().toString().trim());o.put("platform",platform.getText().toString().trim());o.put("purchase",val(purchase));o.put("shipping",val(shipping));o.put("buyer",val(buyer));o.put("repair",val(repair));o.put("saleFees",val(saleFees));o.put("other",val(other));o.put("sold",sold.isChecked());o.put("sale",sold.isChecked()?val(sale):0);if(index>=0)items.put(index,o);else items.put(o);save();dialog.dismiss();render();}catch(JSONException e){Toast.makeText(this,"Impossible d’enregistrer",Toast.LENGTH_SHORT).show();}}));dialog.show();
    }
    private TextView section(String s){TextView v=text(s,12,MUTED,true);v.setPadding(0,dp(18),0,dp(5));return v;}
    private EditText input(String hint,String value){EditText e=new EditText(this);e.setHint(hint);e.setText(value);e.setTextSize(16);e.setSingleLine(true);e.setPadding(0,dp(9),0,dp(9));return e;}
    private EditText number(String hint,double value){EditText e=input(hint,value==0?"":String.valueOf(value));e.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);return e;}
    private double val(EditText e){try{return Double.parseDouble(e.getText().toString().replace(',','.'));}catch(Exception x){return 0;}}
    private double n(JSONObject o,String k){return o==null?0:o.optDouble(k,0);}
    private double allFees(JSONObject o){return n(o,"shipping")+n(o,"buyer")+n(o,"repair")+n(o,"saleFees")+n(o,"other");}
    private void load(){try{items=new JSONArray(getSharedPreferences("marge",MODE_PRIVATE).getString("items","[]"));}catch(Exception e){items=new JSONArray();}}
    private void save(){getSharedPreferences("marge",MODE_PRIVATE).edit().putString("items",items.toString()).apply();}
    private void shareCsv(){StringBuilder s=new StringBuilder("Article;Achat;Frais;Vente;Bénéfice;Statut\n");for(int i=0;i<items.length();i++){JSONObject o=items.optJSONObject(i);double f=allFees(o);s.append(o.optString("name").replace(";"," ")).append(";").append(n(o,"purchase")).append(";").append(f).append(";").append(n(o,"sale")).append(";").append(o.optBoolean("sold")?n(o,"sale")-n(o,"purchase")-f:"").append(";").append(o.optBoolean("sold")?"Vendu":"Stock").append("\n");}Intent it=new Intent(Intent.ACTION_SEND);it.setType("text/plain");it.putExtra(Intent.EXTRA_SUBJECT,"Export Marge");it.putExtra(Intent.EXTRA_TEXT,s.toString());startActivity(Intent.createChooser(it,"Exporter les données"));}
}
