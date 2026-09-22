package fr.alexandre.margeplus;

import android.app.*;
import android.content.*;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.net.Uri;
import android.os.*;
import android.text.*;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import static fr.alexandre.margeplus.Ui.*;

public class MainActivity extends Activity {
    private static final int PICK_PHOTOS=41, SAVE_ZIP=42, OPEN_ZIP=43, SAVE_CSV=44;
    private static final DateTimeFormatter DATE=DateTimeFormatter.ofPattern("dd/MM/yyyy",Locale.FRANCE);
    private Ui ui;
    private LedgerStore store;
    private PhotoStore photos;
    private List<Item> items=new ArrayList<>();
    private final ExecutorService work=Executors.newSingleThreadExecutor();
    private final ExecutorService thumbnails=Executors.newFixedThreadPool(2);
    private final android.util.LruCache<String,Bitmap> imageCache=new android.util.LruCache<String,Bitmap>(12*1024*1024){@Override protected int sizeOf(String k,Bitmap b){return b.getByteCount();}};
    private final Handler main=new Handler(Looper.getMainLooper());
    private LinearLayout root,body,results,photoStrip;
    private TextView formTotal,formHint;
    private String route="home",previous="articles",selectedId="",filter="all",query="",sort="recent";
    private boolean loadFailed=false,importing=false;
    private Editor editor;
    private final Map<String,EditText> fields=new LinkedHashMap<>();
    private Switch soldSwitch;
    private JobState<?> activeJob;
    private AlertDialog jobDialog;
    private boolean foreground;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);ui=new Ui(this);store=new LedgerStore(this);photos=new PhotoStore(this);
        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
        if(Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
        if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);getWindow().getDecorView();if(getWindow().getInsetsController()!=null)getWindow().getInsetsController().setSystemBarsAppearance(0,android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);}
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        try{items=store.load();}catch(IOException e){loadFailed=true;}
        if(state!=null){route=state.getString("route","home");selectedId=state.getString("selected","");previous=state.getString("previous","articles");filter=state.getString("filter","all");query=state.getString("query","");sort=state.getString("sort","recent");}
        String draft=getSharedPreferences("ui",MODE_PRIVATE).getString("draft",null);
        if(draft!=null&&!loadFailed){try{editor=Editor.fromJson(new JSONObject(draft));route="editor";}catch(Exception e){noticeLater("Le brouillon n’a pas pu être relu. Les articles enregistrés sont conservés.");}}
        render();
        Object retained=getLastNonConfigurationInstance();
        if(retained instanceof JobState)activeJob=(JobState<?>)retained;
    }
    @Override protected void onSaveInstanceState(Bundle out){captureDraft();out.putString("route",route);out.putString("selected",selectedId);out.putString("previous",previous);out.putString("filter",filter);out.putString("query",query);out.putString("sort",sort);super.onSaveInstanceState(out);}
    @Override protected void onResume(){super.onResume();foreground=true;if(activeJob!=null)attachJob();}
    @Override protected void onPause(){captureDraft();foreground=false;if(activeJob!=null&&activeJob.owner==this)activeJob.owner=null;super.onPause();}
    @Override public Object onRetainNonConfigurationInstance(){return activeJob;}
    @Override protected void onDestroy(){if(activeJob!=null&&activeJob.owner==this)activeJob.owner=null;if(jobDialog!=null)jobDialog.dismiss();work.shutdown();thumbnails.shutdown();super.onDestroy();}
    private void noticeLater(String s){main.post(()->notice(s));}
    private void notice(String s){if(!isFinishing()&&!isDestroyed())new AlertDialog.Builder(this).setTitle("Marge +").setMessage(s).setPositiveButton("Compris",null).show();}
    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    private void navigate(String target){hideKeyboard();route=target;render();}
    private void hideKeyboard(){View v=getCurrentFocus();if(v!=null)((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(v.getWindowToken(),0);}
    private Item selected(){for(Item i:items)if(i.id.equals(selectedId))return i;return null;}

    private void render(){
        fields.clear();soldSwitch=null;formTotal=null;formHint=null;
        root=ui.column();root.setBackgroundColor(BG);root.setTag("app_root");
        root.setFocusableInTouchMode(true);
        root.setOnApplyWindowInsetsListener((v,insets)->{
            int l,t,r,b;
            if(Build.VERSION.SDK_INT>=30){Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());Insets ime=insets.getInsets(WindowInsets.Type.ime());l=safe.left;t=safe.top;r=safe.right;b=Math.max(safe.bottom,ime.bottom);}
            else{l=insets.getSystemWindowInsetLeft();t=insets.getSystemWindowInsetTop();r=insets.getSystemWindowInsetRight();b=insets.getSystemWindowInsetBottom();}
            v.setPadding(l,t,r,b);return insets;
        });
        if(loadFailed){renderReadFailure();setContentView(root);root.requestApplyInsets();return;}
        boolean topLevel=route.equals("home")||route.equals("articles")||route.equals("bilan");
        header(topLevel);
        ScrollView sc=new ScrollView(this);sc.setFillViewport(false);sc.setClipToPadding(false);sc.setVerticalScrollBarEnabled(false);sc.setTag("page_scroll");
        body=ui.column();ui.pad(body,20,10);ui.gap(body,2);sc.addView(body,new ScrollView.LayoutParams(-1,-2));root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        switch(route){
            case "articles":renderArticles();break;
            case "bilan":renderBilan();break;
            case "detail":renderDetail();break;
            case "editor":renderEditor();break;
            case "tools":renderTools();break;
            case "analyse":renderAnalysis();break;
            default:route="home";renderHome();
        }
        ui.gap(body,22);
        if(topLevel)bottomNav();
        setContentView(root);root.requestApplyInsets();root.requestFocus();
    }
    private void header(boolean topLevel){
        LinearLayout bar=ui.row();ui.pad(bar,20,12);bar.setTag("page_header");
        if(!topLevel){ImageView back=ui.iconButton("back","Retour",this::goBack);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(ui.dp(44),ui.dp(44));lp.rightMargin=ui.dp(12);bar.addView(back,lp);}
        LinearLayout titles=ui.column();String title;
        switch(route){case "articles":title="Mes articles";break;case "bilan":title="Mon bilan";break;case "detail":title="Fiche article";break;case "editor":title=editor!=null&&editor.existing?"Modifier l’article":"Nouvel achat";break;case "tools":title="Mes données";break;case "analyse":title="Analyser un achat";break;default:title="Marge +";}
        titles.addView(ui.text(title,topLevel?27:21,INK,true));
        if(topLevel){ui.gap(titles,4);titles.addView(ui.text(route.equals("home")?"ACHATS · REVENTES":route.equals("articles")?items.size()+" article"+(items.size()>1?"s":"")+" enregistré"+(items.size()>1?"s":""):"Vos résultats, tous frais déduits",11,MUTED,false));}
        bar.addView(titles,new LinearLayout.LayoutParams(0,-2,1));
        if(topLevel){String icon=route.equals("articles")?"plus":"more";String label=route.equals("articles")?"Ajouter un article":"Sauvegarde et export";bar.addView(ui.iconButton(icon,label,()->{if(route.equals("articles"))openEditor(null);else navigate("tools");}),new LinearLayout.LayoutParams(ui.dp(44),ui.dp(44)));}
        root.addView(bar,new LinearLayout.LayoutParams(-1,-2));
    }
    private void bottomNav(){
        View line=new View(this);line.setBackgroundColor(LINE);root.addView(line,new LinearLayout.LayoutParams(-1,ui.dp(1)));
        LinearLayout nav=ui.row();ui.pad(nav,10,0);nav.setTag("bottom_navigation");
        String[] keys={"home","articles","bilan"},labels={"Accueil","Articles","Bilan"},icons={"home","box","chart"};
        for(int i=0;i<keys.length;i++){
            String k=keys[i];boolean active=route.equals(k);LinearLayout tab=ui.column();tab.setGravity(Gravity.CENTER);ui.pad(tab,8,10);tab.setMinimumHeight(ui.dp(66));
            ImageView icon=ui.icon(icons[i],active?MINT:MUTED);tab.addView(icon,new LinearLayout.LayoutParams(ui.dp(22),ui.dp(22)));ui.gap(tab,5);tab.addView(ui.text(labels[i],12,active?MINT:MUTED,active));
            tab.setContentDescription(labels[i]);tab.setTag("nav_"+k);ui.click(tab,()->navigate(k));nav.addView(tab,new LinearLayout.LayoutParams(0,-2,1));
        }
        root.addView(nav,new LinearLayout.LayoutParams(-1,-2));
    }
    private void section(String title,String action,Runnable click){
        LinearLayout row=ui.row();TextView t=ui.text(title,18,INK,true);row.addView(t,new LinearLayout.LayoutParams(0,-2,1));
        if(action!=null){TextView a=ui.text(action,12,MINT,true);ui.pad(a,8,14);a.setMinHeight(ui.dp(48));a.setGravity(Gravity.CENTER);a.setOnClickListener(v->click.run());a.setContentDescription(action);row.addView(a);}
        ui.add(body,row,12);
    }
    private void renderHome(){
        Ledger.Totals totals=Ledger.summarize(items);
        LinearLayout hero=ui.card();hero.setBackground(ui.shape(MINT_DARK,22,Color.rgb(40,93,75)));
        LinearLayout r=ui.row();r.addView(ui.text("BÉNÉFICE RÉALISÉ",11,Color.rgb(176,210,196),true),new LinearLayout.LayoutParams(0,-2,1));r.addView(ui.icon("trend",MINT),new LinearLayout.LayoutParams(ui.dp(22),ui.dp(22)));hero.addView(r);ui.gap(hero,8);
        TextView amount=ui.amount(Money.format(totals.profit),34,totals.profit>=0?MINT:RED);amount.setTag("home_profit");hero.addView(amount,new LinearLayout.LayoutParams(-1,ui.dp(43)));ui.gap(hero,6);
        hero.addView(ui.text(totals.sold+" vente"+(totals.sold>1?"s":"")+" · achat et frais déduits",12,Color.rgb(176,210,196),false));ui.add(body,hero,12);
        LinearLayout pair=ui.row();ui.weight(pair,mini("VENTES",Money.format(totals.revenue),"Total encaissé saisi",INK),10);ui.weight(pair,mini("FRAIS PAYÉS",Money.format(totals.fees),"Stock + articles vendus",GOLD),0);ui.add(body,pair,10);
        LinearLayout possible=ui.card();possible.setBackground(ui.shape(CARD2,18,LINE));LinearLayout possibleTop=ui.row();possibleTop.addView(ui.text("ARGENT POSSIBLE",11,MUTED,true),new LinearLayout.LayoutParams(0,-2,1));possibleTop.addView(ui.icon("trend",totals.stockPotentialProfit>=0?MINT:RED),new LinearLayout.LayoutParams(ui.dp(22),ui.dp(22)));possible.addView(possibleTop);ui.gap(possible,8);TextView possibleAmount=ui.amount(Money.format(totals.stockEstimate),29,totals.stockPotentialProfit>=0?MINT:RED);possibleAmount.setTag("home_possible_money");possible.addView(possibleAmount,new LinearLayout.LayoutParams(-1,ui.dp(38)));ui.gap(possible,5);String possibleText=totals.estimatedStock==0?"Ajoutez un prix de revente estimé dans vos fiches":totals.estimatedStock+" article"+(totals.estimatedStock>1?"s":"")+" estimé"+(totals.estimatedStock>1?"s":"")+" · bénéfice potentiel "+Money.format(totals.stockPotentialProfit);TextView possibleHint=ui.text(possibleText,11,MUTED,false);possibleHint.setTag("home_possible_hint");possible.addView(possibleHint);ui.add(body,possible,10);
        LinearLayout stock=ui.row();stock.setBackground(ui.shape(CARD,14,LINE));ui.pad(stock,14,12);stock.addView(ui.text(totals.stock+" en stock",13,MUTED,false),new LinearLayout.LayoutParams(0,-2,1));stock.addView(ui.amount(Money.format(totals.stockCost)+" engagés",14,INK));ui.add(body,stock,18);
        renderDecisionCenter(totals);
        TextView add=ui.button("+  Nouvel achat",true,()->openEditor(null));add.setTag("new_article");ui.add(body,add,18);
        section("Derniers articles",items.isEmpty()?null:"Tout voir",()->navigate("articles"));
        if(items.isEmpty())empty(body,"Votre premier achat commence ici","Ajoutez un article, ses frais et ses photos. Le bénéfice sera calculé à la vente.","box");
        else{List<Item> recent=new ArrayList<>(items);Collections.reverse(recent);for(int i=0;i<Math.min(3,recent.size());i++)ui.add(body,itemCard(recent.get(i)),10);}
        ui.gap(body,10);LinearLayout analyse=ui.card();LinearLayout a=ui.row();a.addView(ui.icon("trend",MINT),new LinearLayout.LayoutParams(ui.dp(28),ui.dp(28)));LinearLayout txt=ui.column();txt.setPadding(ui.dp(12),0,ui.dp(8),0);txt.addView(ui.text("Une bonne affaire ?",16,INK,true));ui.gap(txt,4);txt.addView(ui.text("Estimez la marge avant d’acheter",12,MUTED,false));a.addView(txt,new LinearLayout.LayoutParams(0,-2,1));a.addView(ui.icon("chevron",MUTED),new LinearLayout.LayoutParams(ui.dp(18),ui.dp(18)));analyse.addView(a);ui.click(analyse,()->navigate("analyse"));body.addView(analyse);
    }
    private LinearLayout mini(String label,String value,String sub,int color){LinearLayout c=ui.card();ui.pad(c,13,14);c.addView(ui.text(label,10,MUTED,true));ui.gap(c,8);c.addView(ui.amount(value,21,color),new LinearLayout.LayoutParams(-1,ui.dp(28)));ui.gap(c,5);c.addView(ui.text(sub,10,MUTED,false));return c;}
    private void renderDecisionCenter(Ledger.Totals t){
        section("Centre de décision",null,null);LinearLayout c=ui.card();c.setTag("decision_center");c.addView(ui.text("À surveiller",17,INK,true));ui.gap(c,14);
        if(t.dormantStock==0&&t.missingEstimate==0&&t.lossRisk==0)c.addView(ui.text("Aucune alerte sur votre stock.",13,MINT,true));
        else{kv(c,"Stock depuis 60 jours ou +",Integer.toString(t.dormantStock),t.dormantStock>0?GOLD:MUTED);kv(c,"Sans prix de revente estimé",Integer.toString(t.missingEstimate),t.missingEstimate>0?GOLD:MUTED);kv(c,"Estimation actuellement en perte",Integer.toString(t.lossRisk),t.lossRisk>0?RED:MUTED);}
        ui.gap(c,8);String label=t.dormantStock>0?"Voir le stock dormant":t.missingEstimate>0?"Compléter les estimations":"Voir le stock";TextView action=ui.button(label,false,()->{query="";filter=t.dormantStock>0?"dormant":t.missingEstimate>0?"unpriced":"stock";navigate("articles");});action.setTag("decision_stock");c.addView(action);ui.add(body,c,18);
    }
    private void empty(LinearLayout into,String title,String detail,String icon){LinearLayout c=ui.card();c.setGravity(Gravity.CENTER);ui.pad(c,20,25);ImageView im=ui.icon(icon,MUTED);c.addView(im,new LinearLayout.LayoutParams(ui.dp(35),ui.dp(35)));ui.gap(c,12);TextView t=ui.text(title,16,INK,true);t.setGravity(Gravity.CENTER);c.addView(t);ui.gap(c,7);TextView d=ui.text(detail,13,MUTED,false);d.setGravity(Gravity.CENTER);c.addView(d);into.addView(c,new LinearLayout.LayoutParams(-1,-2));}
    private LinearLayout itemCard(Item item){
        LinearLayout c=ui.card();ui.pad(c,13,13);LinearLayout r=ui.row();
        ImageView im=photo(item.photos.isEmpty()?null:item.photos.get(0),68);LinearLayout.LayoutParams ip=new LinearLayout.LayoutParams(ui.dp(68),ui.dp(76));ip.rightMargin=ui.dp(13);r.addView(im,ip);
        LinearLayout desc=ui.column();TextView name=ui.text(item.name,16,INK,true);name.setMaxLines(2);name.setEllipsize(TextUtils.TruncateAt.END);desc.addView(name);ui.gap(desc,5);TextView meta=ui.text(join(item.category,item.platform),11,MUTED,false);meta.setMaxLines(1);meta.setEllipsize(TextUtils.TruncateAt.END);desc.addView(meta);ui.gap(desc,7);
        LinearLayout bottom=ui.row();bottom.addView(ui.chip(item.sold?"Vendu":"En stock",item.sold?MINT:Color.rgb(163,201,240),item.sold?MINT_DARK:Color.rgb(28,50,72)));if(Ledger.dormant(item,LocalDate.now()))bottom.addView(ui.chip(" 60 j +",GOLD,CARD2));if(!item.photos.isEmpty()){TextView count=ui.text("  "+item.photos.size()+" photo"+(item.photos.size()>1?"s":""),10,MUTED,false);bottom.addView(count);}desc.addView(bottom);r.addView(desc,new LinearLayout.LayoutParams(0,-2,1));c.addView(r);ui.gap(c,12);
        LinearLayout nums=ui.row();LinearLayout cost=ui.column();cost.addView(ui.text(item.sold?"Achat + frais":"Coût total",10,MUTED,false));ui.gap(cost,4);cost.addView(ui.amount(Money.format(item.cost()),16,INK));ui.weight(nums,cost,8);
        LinearLayout result=ui.column();result.setGravity(Gravity.END);String label=item.sold?"Bénéfice net":item.estimate>0?"Bénéfice estimé":"Dont frais";long value=item.sold?item.profit():item.estimate>0?item.potentialProfit():item.fees();result.addView(ui.text(label,10,MUTED,false));ui.gap(result,4);TextView amount=ui.amount(Money.format(value),17,item.sold||item.estimate>0?(value>=0?MINT:RED):GOLD);result.addView(amount);ui.weight(nums,result,0);c.addView(nums);
        c.setContentDescription(item.name+", "+(item.sold?"vendu":"en stock")+", coût "+Money.format(item.cost()));c.setTag("item_"+item.id);ui.click(c,()->{selectedId=item.id;previous=route;navigate("detail");});return c;
    }
    private String join(String a,String b){return a.isEmpty()?b:b.isEmpty()?a:a+" · "+b;}
    private ImageView photo(String file,int size){
        ImageView v=ui.icon("photo",MUTED);v.setScaleType(ImageView.ScaleType.CENTER_CROP);v.setBackground(ui.shape(CARD2,14,0));v.setClipToOutline(true);v.setContentDescription(file==null?"Aucune photo":"Photo de l’article");
        if(file==null){ui.pad(v,18,18);return v;}
        String key=file+":"+size;v.setTag(key);Bitmap cached=imageCache.get(key);if(cached!=null){v.setImageBitmap(cached);return v;}
        if(!thumbnails.isShutdown())thumbnails.execute(()->{try{Bitmap b=photos.thumbnail(file,ui.dp(size));if(b!=null){imageCache.put(key,b);main.post(()->{if(!isDestroyed()&&key.equals(v.getTag()))v.setImageBitmap(b);});}}catch(Exception ignored){/* A missing preview does not discard an item or its other photos. */}});
        return v;
    }

    private void renderArticles(){
        EditText search=editBox("Rechercher un article…",query,false);search.setTag("search");search.setCompoundDrawablePadding(ui.dp(10));Ui.Symbol icon=new Ui.Symbol("search",MUTED);icon.setBounds(0,0,ui.dp(20),ui.dp(20));search.setCompoundDrawables(icon,null,null,null);ui.add(body,search,12);
        HorizontalScrollView scroll=new HorizontalScrollView(this);scroll.setHorizontalScrollBarEnabled(false);LinearLayout chips=ui.row();String[] keys={"all","stock","dormant","unpriced","sold"},names={"Tous","En stock","Dormant 60 j+","Sans estimation","Vendus"};
        for(int i=0;i<keys.length;i++){String f=keys[i];TextView chip=ui.button(names[i],filter.equals(f),()->{query=search.getText().toString();filter=f;render();});chip.setTag("filter_"+f);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-2,-2);lp.rightMargin=ui.dp(8);chips.addView(chip,lp);}scroll.addView(chips);ui.add(body,scroll,12);
        LinearLayout sortrow=ui.row();sortrow.addView(ui.text("VOTRE INVENTAIRE",10,MUTED,true),new LinearLayout.LayoutParams(0,-2,1));TextView sortButton=ui.text(sort.equals("profit")?"Tri : bénéfice ↓":sort.equals("cost")?"Tri : coût ↓":"Tri : récents ↓",12,MINT,true);ui.pad(sortButton,6,12);sortButton.setMinHeight(ui.dp(48));sortButton.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Trier les articles").setItems(new String[]{"Achats les plus récents","Coût total décroissant","Bénéfice réalisé décroissant"},(d,w)->{sort=new String[]{"recent","cost","profit"}[w];refreshResults();sortButton.setText(sort.equals("profit")?"Tri : bénéfice ↓":sort.equals("cost")?"Tri : coût ↓":"Tri : récents ↓");}).show());sortrow.addView(sortButton);ui.add(body,sortrow,4);
        results=ui.column();body.addView(results);refreshResults();search.addTextChangedListener(watcher(()->{query=search.getText().toString();refreshResults();}));
    }
    private boolean matchesFilter(Item i){switch(filter){case "stock":return !i.sold;case "dormant":return Ledger.dormant(i,LocalDate.now());case "unpriced":return !i.sold&&i.estimate==0;case "sold":return i.sold;default:return true;}}
    private void refreshResults(){
        if(results==null)return;results.removeAllViews();List<Item> shown=new ArrayList<>();String q=query.toLowerCase(Locale.FRANCE).trim();
        for(Item i:items)if(matchesFilter(i)&&(i.name+" "+i.category+" "+i.platform+" "+i.salePlatform).toLowerCase(Locale.FRANCE).contains(q))shown.add(i);
        shown.sort(sort.equals("cost")?Comparator.comparingLong(Item::cost).reversed():sort.equals("profit")?Comparator.comparingLong(Item::profit).reversed():Comparator.comparing((Item i)->i.purchaseDate).reversed());
        if(shown.isEmpty())empty(results,"Aucun article ici",items.isEmpty()?"Touchez + pour ajouter votre premier achat.":"Essayez un autre filtre ou une autre recherche.","search");else for(Item i:shown)ui.add(results,itemCard(i),12);
    }
    private void renderDetail(){
        Item i=selected();if(i==null){empty(body,"Article introuvable","Retournez à vos articles.","box");return;}
        if(!i.photos.isEmpty()){ImageView hero=photo(i.photos.get(0),900);hero.setScaleType(ImageView.ScaleType.FIT_CENTER);ui.add(body,hero,10);hero.getLayoutParams().height=ui.dp(230);hero.setOnClickListener(v->showFullPhoto(i.photos.get(0)));
            HorizontalScrollView hs=new HorizontalScrollView(this);hs.setHorizontalScrollBarEnabled(false);LinearLayout row=ui.row();for(String file:i.photos){ImageView thumb=photo(file,96);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(ui.dp(64),ui.dp(64));p.rightMargin=ui.dp(8);row.addView(thumb,p);thumb.setOnClickListener(v->{hero.setImageDrawable(null);loadIntoHero(hero,file);hero.setOnClickListener(vv->showFullPhoto(file));});}hs.addView(row);ui.add(body,hs,16);}
        else{LinearLayout placeholder=ui.row();ui.pad(placeholder,14,14);placeholder.setBackground(ui.shape(CARD,14,LINE));placeholder.addView(ui.icon("photo",MUTED),new LinearLayout.LayoutParams(ui.dp(26),ui.dp(26)));TextView msg=ui.text("  Ajoutez des photos à cet article",13,MUTED,false);placeholder.addView(msg);ui.click(placeholder,()->openEditor(i));ui.add(body,placeholder,16);}
        ui.add(body,ui.text(i.name,25,INK,true),7);ui.add(body,ui.text(join(i.category,i.platform),13,MUTED,false),12);ui.add(body,ui.chip(i.sold?"Vendu le "+displayDate(i.saleDate):"En stock depuis le "+displayDate(i.purchaseDate),i.sold?MINT:MUTED,i.sold?MINT_DARK:CARD2),8);if(!i.sold){long age=Ledger.stockAgeDays(i,LocalDate.now());TextView ageView=ui.text(age+" jour"+(age>1?"s":"")+" en stock"+(age>=60?" · stock dormant":""),12,age>=60?GOLD:MUTED,age>=60);ageView.setTag("detail_stock_age");ui.add(body,ageView,18);}else ui.gap(body,10);
        LinearLayout hero=ui.card();hero.addView(ui.text(i.sold?"BÉNÉFICE NET":"COÛT TOTAL ENGAGÉ",11,MUTED,true));ui.gap(hero,8);long val=i.sold?i.profit():i.cost();hero.addView(ui.amount(Money.format(val),32,i.sold?(val>=0?MINT:RED):INK),new LinearLayout.LayoutParams(-1,ui.dp(42)));ui.gap(hero,6);hero.addView(ui.text(i.sold?"Vente − achat − tous les frais":"Achat et tous les frais saisis",12,MUTED,false));if(!i.sold){ui.line(hero);kvTagged(hero,"Prix minimum sans perte",Money.format(i.breakEvenSale()),INK,"detail_break_even");kv(hero,"Prix pour +10 %",Money.format(i.saleForRoi(10)),MUTED);kv(hero,"Prix pour +20 %",Money.format(i.saleForRoi(20)),MUTED);kv(hero,"Prix pour +30 %",Money.format(i.saleForRoi(30)),MUTED);if(i.estimate>0){ui.line(hero);kv(hero,"Revente envisagée",Money.format(i.estimate),INK);kv(hero,"Bénéfice estimé",Money.format(i.potentialProfit()),i.potentialProfit()>=0?MINT:RED);}}ui.add(body,hero,16);
        LinearLayout cost=ui.card();cost.addView(ui.text("Le détail, euro par euro",17,INK,true));ui.gap(cost,14);kv(cost,"Prix d’achat",Money.format(i.purchase),INK);kv(cost,"Livraison à l’achat",Money.format(i.shipping),MUTED);kv(cost,"Protection / service",Money.format(i.buyer),MUTED);kv(cost,"Remise en état",Money.format(i.repair),MUTED);kv(cost,"Commission de vente",Money.format(i.saleFees),MUTED);kv(cost,"Envoi à votre charge",Money.format(i.saleShipping),MUTED);kv(cost,"Autres frais",Money.format(i.other),MUTED);ui.line(cost);kv(cost,"Total des frais",Money.format(i.fees()),GOLD);kv(cost,"Coût total",Money.format(i.cost()),INK);if(i.sold){kv(cost,"Prix de vente",Money.format(i.sale),INK);kv(cost,"Bénéfice net",Money.format(i.profit()),i.profit()>=0?MINT:RED);}ui.add(body,cost,16);
        if(!i.notes.isEmpty()){LinearLayout notes=ui.card();notes.addView(ui.text("Notes",14,INK,true));ui.gap(notes,8);notes.addView(ui.text(i.notes,14,MUTED,false));ui.add(body,notes,14);}
        if(i.sold&&!i.salePlatform.isEmpty())ui.add(body,ui.text("Vendu sur "+i.salePlatform,13,MUTED,false),14);
        if(!i.sold)ui.add(body,ui.button("Enregistrer la vente",true,()->{openEditor(i);editor.sold=true;editor.raw.put("saleDate",LocalDate.now().toString());render();}),10);
        ui.add(body,ui.button("Modifier l’article et ses photos",i.sold,()->openEditor(i)),10);
        TextView del=ui.button("Supprimer l’article",false,()->confirmDelete(i));del.setTextColor(RED);ui.add(body,del,0);
    }
    private void loadIntoHero(ImageView v,String file){String tag=UUID.randomUUID().toString();v.setTag(tag);thumbnails.execute(()->{try{Bitmap b=photos.thumbnail(file,1600);main.post(()->{if(!isDestroyed()&&tag.equals(v.getTag()))v.setImageBitmap(b);});}catch(Exception e){main.post(()->toast("Cette photo ne peut pas être affichée."));}});}
    private void showFullPhoto(String file){ImageView image=new ImageView(this);image.setBackgroundColor(BG);image.setScaleType(ImageView.ScaleType.FIT_CENTER);AlertDialog d=new AlertDialog.Builder(this).setTitle("Photo de l’article").setView(image).setPositiveButton("Fermer",null).create();d.show();image.getLayoutParams().height=ui.dp(380);loadIntoHero(image,file);}
    private void kv(LinearLayout p,String key,String value,int color){kvTagged(p,key,value,color,null);}
    private void kvTagged(LinearLayout p,String key,String value,int color,String tag){LinearLayout r=ui.row();TextView k=ui.text(key,13,MUTED,false);r.addView(k,new LinearLayout.LayoutParams(0,-2,1));TextView v=ui.amount(value,14,color);if(tag!=null)v.setTag(tag);v.setGravity(Gravity.END);LinearLayout.LayoutParams vp=new LinearLayout.LayoutParams(-2,-2);vp.leftMargin=ui.dp(12);r.addView(v,vp);ui.add(p,r,9);}
    private String displayDate(String value){try{return LocalDate.parse(value).format(DATE);}catch(Exception e){return value;}}
    private void confirmDelete(Item i){new AlertDialog.Builder(this).setTitle("Supprimer cet article ?").setMessage("« "+i.name+" » sera retiré de vos comptes. Cette action est définitive.").setNegativeButton("Annuler",null).setPositiveButton("Supprimer",(d,w)->{List<Item> next=new ArrayList<>(items);next.removeIf(x->x.id.equals(i.id));saveItems(next,a->{a.navigate("articles");a.toast("Article supprimé");});}).show();}

    private void openEditor(Item item){previous=route;editor=new Editor(item);route="editor";render();captureDraft();}
    private void renderEditor(){
        if(editor==null)editor=new Editor(null);
        LinearLayout info=ui.row();info.addView(ui.text("PHOTOS DE L’ARTICLE",11,MUTED,true),new LinearLayout.LayoutParams(0,-2,1));info.addView(ui.text(editor.item.photos.size()+" / 6",12,MINT,true));ui.add(body,info,12);
        HorizontalScrollView hs=new HorizontalScrollView(this);hs.setHorizontalScrollBarEnabled(false);photoStrip=ui.row();hs.addView(photoStrip);ui.add(body,hs,8);renderPhotoStrip();
        ui.add(body,ui.text("Les photos restent avec l’article après la vente.",11,MUTED,false),22);
        section("L’article",null,null);field("name","Nom de l’article *","Ex. Gants de boxe",false,false);field("category","Catégorie","Ex. Gants, casque, jeux…",false,false);field("platform","Plateforme d’achat","Ex. Vinted, eBay, Leboncoin",false,false);dateField("purchaseDate","Date d’achat *");
        section("Achat & frais payés",null,null);field("purchase","Prix d’achat *","0,00 €",true,false);
        field("shipping","Livraison à l’achat","0,00 €",true,false);field("buyer","Protection acheteur / service","0,00 €",true,false);field("repair","Nettoyage / remise en état","0,00 €",true,false);
        field("saleFees","Commission prélevée à la vente","0,00 €",true,false);field("saleShipping","Envoi payé par vous à la vente","0,00 €",true,false);field("other","Autres frais payés","0,00 €",true,false);
        ui.add(body,ui.text("Saisissez uniquement les frais réellement payés. Un port payé directement par l’acheteur n’est pas votre dépense.",12,MUTED,false),20);
        section("Revente",null,null);
        soldSwitch=new Switch(this);soldSwitch.setText("Article vendu");soldSwitch.setTextColor(INK);soldSwitch.setTextSize(16);soldSwitch.setChecked(editor.sold);soldSwitch.setTag("sold_switch");soldSwitch.setMinHeight(ui.dp(52));soldSwitch.setThumbTintList(ColorStateList.valueOf(MINT));ui.add(body,soldSwitch,14);
        LinearLayout saleFields=ui.column();LinearLayout target=body;body=saleFields;
        field("sale","Prix de vente *","0,00 €",true,false);field("salePlatform","Plateforme de vente","Ex. Vinted, eBay, main propre",false,false);dateField("saleDate","Date de vente *");body=target;ui.add(body,saleFields,0);saleFields.setVisibility(editor.sold?View.VISIBLE:View.GONE);
        LinearLayout estimateFields=ui.column();body=estimateFields;field("estimate","Prix de revente envisagé","Facultatif",true,false);body=target;ui.add(body,estimateFields,0);estimateFields.setVisibility(editor.sold?View.GONE:View.VISIBLE);
        soldSwitch.setOnCheckedChangeListener((b,on)->{editor.sold=on;saleFields.setVisibility(on?View.VISIBLE:View.GONE);estimateFields.setVisibility(on?View.GONE:View.VISIBLE);if(on&&fields.get("saleDate").getText().toString().isEmpty()){editor.raw.put("saleDate",LocalDate.now().toString());fields.get("saleDate").setText(displayDate(LocalDate.now().toString()));}updateFormTotal();});
        field("notes","Notes","État, taille, référence, acheteur…",false,true);
        LinearLayout footer=ui.column();ui.pad(footer,20,12);footer.setBackgroundColor(CARD);LinearLayout total=ui.row();formHint=ui.text("Coût total",12,MUTED,false);total.addView(formHint,new LinearLayout.LayoutParams(0,-2,1));formTotal=ui.amount("",20,MINT);total.addView(formTotal);ui.add(footer,total,10);TextView save=ui.button("Enregistrer l’article",true,this::saveEditor);save.setTag("save_article");footer.addView(save);root.addView(footer,new LinearLayout.LayoutParams(-1,-2));
        updateFormTotal();
    }
    private void renderPhotoStrip(){
        photoStrip.removeAllViews();
        for(String file:editor.item.photos){LinearLayout tile=ui.column();ImageView im=photo(file,140);tile.addView(im,new LinearLayout.LayoutParams(ui.dp(94),ui.dp(94)));im.setOnClickListener(v->showFullPhoto(file));TextView remove=ui.text("Retirer",12,RED,true);remove.setGravity(Gravity.CENTER);remove.setMinHeight(ui.dp(44));remove.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Retirer cette photo ?").setMessage("Elle sera retirée de la fiche à l’enregistrement. L’original dans votre galerie reste intact.").setNegativeButton("Garder",null).setPositiveButton("Retirer",(d,w)->{captureInputs();editor.item.photos.remove(file);render();captureDraft();}).show());tile.addView(remove);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,-2);p.rightMargin=ui.dp(10);photoStrip.addView(tile,p);}
        if(editor.item.photos.size()<6){LinearLayout add=ui.column();add.setGravity(Gravity.CENTER);add.setBackground(ui.shape(CARD,14,LINE));ImageView icon=ui.icon("plus",MINT);add.addView(icon,new LinearLayout.LayoutParams(ui.dp(26),ui.dp(26)));ui.gap(add,8);add.addView(ui.text("Photos",12,MINT,true));add.setContentDescription("Ajouter des photos");add.setTag("add_photos");ui.click(add,this::pickPhotos);photoStrip.addView(add,new LinearLayout.LayoutParams(ui.dp(94),ui.dp(94)));}
    }
    private EditText editBox(String hint,String value,boolean money){EditText e=new EditText(this);e.setTextSize(16);e.setTextColor(INK);e.setHintTextColor(MUTED);e.setHint(hint);e.setText(value);e.setSelectAllOnFocus(false);e.setSingleLine(true);e.setMinHeight(ui.dp(52));ui.pad(e,14,13);e.setBackground(ui.shape(CARD,12,LINE));e.setInputType(money?InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL:InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);return e;}
    private void field(String key,String label,String hint,boolean money,boolean multi){
        TextView title=ui.text(label,12,MUTED,true);ui.add(body,title,7);String value=editor!=null?editor.raw.getOrDefault(key,""):"";EditText e=editBox(hint,value,money);e.setTag("field_"+key);e.setContentDescription(label);fields.put(key,e);
        if(multi){e.setSingleLine(false);e.setMinLines(3);e.setGravity(Gravity.TOP);e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);}
        e.setFilters(new InputFilter[]{new InputFilter.LengthFilter(multi?10000:money?20:key.equals("name")?200:100)});ui.add(body,e,16);if(money)e.addTextChangedListener(watcher(this::updateFormTotal));
    }
    private void dateField(String key,String label){
        ui.add(body,ui.text(label,12,MUTED,true),7);String iso=editor.raw.getOrDefault(key,"");EditText date=editBox("Choisir une date",iso.isEmpty()?"":displayDate(iso),false);date.setFocusable(false);date.setInputType(InputType.TYPE_NULL);date.setTag("field_"+key);date.setContentDescription(label);fields.put(key,date);
        date.setOnClickListener(v->{LocalDate current;try{current=LocalDate.parse(editor.raw.getOrDefault(key,""));}catch(Exception e){current=LocalDate.now();}new DatePickerDialog(this,(picker,y,m,d)->{String value=LocalDate.of(y,m+1,d).toString();editor.raw.put(key,value);date.setText(displayDate(value));},current.getYear(),current.getMonthValue()-1,current.getDayOfMonth()).show();});ui.add(body,date,16);
    }
    private TextWatcher watcher(Runnable callback){return new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int count,int after){}public void onTextChanged(CharSequence s,int st,int before,int count){callback.run();}public void afterTextChanged(Editable e){}};}
    private long amount(String key,boolean required){EditText e=fields.get(key);String s=e==null?"":e.getText().toString();try{return Money.parse(s,required);}catch(IllegalArgumentException x){if(e!=null){e.setError("Montant positif, avec 2 décimales maximum");e.requestFocus();}throw new IllegalArgumentException("Vérifiez le montant : "+key);}}
    private void updateFormTotal(){if(formTotal==null)return;try{long cost=0;for(String k:new String[]{"purchase","shipping","buyer","repair","saleFees","saleShipping","other"})cost+=Money.parse(fields.get(k).getText().toString(),false);boolean sold=soldSwitch!=null&&soldSwitch.isChecked();long value=sold?Money.parse(fields.get("sale").getText().toString(),false)-cost:cost;formHint.setText(sold?"Bénéfice net":"Coût total engagé");formTotal.setText(Money.format(value));formTotal.setTextColor(sold&&value<0?RED:MINT);}catch(Exception e){formHint.setText("Vérifiez les montants");formTotal.setText("—");formTotal.setTextColor(MUTED);}}
    private void captureInputs(){if(editor==null||!route.equals("editor"))return;for(Map.Entry<String,EditText> f:fields.entrySet())if(!f.getKey().endsWith("Date"))editor.raw.put(f.getKey(),f.getValue().getText().toString());if(soldSwitch!=null)editor.sold=soldSwitch.isChecked();}
    private void captureDraft(){if(editor==null||!route.equals("editor"))return;captureInputs();try{getSharedPreferences("ui",MODE_PRIVATE).edit().putString("draft",editor.json().toString()).commit();}catch(Exception e){/* Ledger writes are independent of optional draft recovery. */}}
    private void clearDraft(){getSharedPreferences("ui",MODE_PRIVATE).edit().remove("draft").commit();editor=null;}
    private void saveEditor(){
        if(importing){toast("Les photos sont en cours d’ajout.");return;}captureInputs();Item i=editor.item.copy();
        if(editor.raw.getOrDefault("name","").trim().isEmpty()){fields.get("name").setError("Donnez un nom à cet article");fields.get("name").requestFocus();return;}
        try{
            i.name=editor.raw.get("name").trim();i.category=editor.raw.getOrDefault("category","").trim();i.platform=editor.raw.getOrDefault("platform","").trim();i.salePlatform=editor.raw.getOrDefault("salePlatform","").trim();i.notes=editor.raw.getOrDefault("notes","").trim();i.purchaseDate=editor.raw.get("purchaseDate");i.sold=editor.sold;i.saleDate=i.sold?editor.raw.getOrDefault("saleDate",""):"";
            i.purchase=amount("purchase",true);i.shipping=amount("shipping",false);i.buyer=amount("buyer",false);i.repair=amount("repair",false);i.saleFees=amount("saleFees",false);i.saleShipping=amount("saleShipping",false);i.other=amount("other",false);i.sale=i.sold?amount("sale",true):0;i.estimate=amount("estimate",false);i.validate();
            List<Item> next=new ArrayList<>(items);boolean replaced=false;for(int n=0;n<next.size();n++)if(next.get(n).id.equals(i.id)){next.set(n,i);replaced=true;break;}if(!replaced)next.add(i);
            saveItems(next,a->{a.clearDraft();a.selectedId=i.id;a.route="detail";a.previous="articles";a.hideKeyboard();a.render();a.toast("Article enregistré");});
        }catch(IllegalArgumentException e){notice("Vérifiez les montants et les dates. La date de vente doit être égale ou postérieure à la date d’achat.");}
    }
    private interface AfterSave{void run(MainActivity activity);}
    private void saveItems(List<Item> next,AfterSave success){runJob("Enregistrement…",()->{store.save(next);return next;},(a,saved)->{a.items=saved;success.run(a);});}
    private void pickPhotos(){captureDraft();Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);try{startActivityForResult(intent,PICK_PHOTOS);}catch(ActivityNotFoundException e){notice("Aucun sélecteur de fichiers disponible sur cet appareil.");}}
    @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);if(result!=RESULT_OK||data==null)return;
        if(code==PICK_PHOTOS&&editor!=null){List<Uri> uris=new ArrayList<>();if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)uris.add(data.getData());int available=6-editor.item.photos.size();if(uris.size()>available){notice("Vous pouvez ajouter "+available+" photo(s) de plus, avec un maximum de 6 par article.");return;}importing=true;runJob("Ajout des photos…",()->{List<String> names=new ArrayList<>();for(Uri u:uris)names.add(photos.importPhoto(u));return names;},(a,names)->{a.importing=false;a.editor.item.photos.addAll(names);a.captureDraft();a.render();});}
        else if(data.getData()!=null){Uri uri=data.getData();if(code==SAVE_ZIP)runJob("Sauvegarde des articles et photos…",()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException();new Backup(this).exportZip(items,out);}return true;},(a,ok)->a.toast("Sauvegarde créée avec vos photos"));
            else if(code==SAVE_CSV)runJob("Export des comptes…",()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException();new Backup(this).exportCsv(items,out);}return true;},(a,ok)->a.toast("Export CSV créé"));
            else if(code==OPEN_ZIP)runJob("Vérification de la sauvegarde…",()->{try(InputStream in=getContentResolver().openInputStream(uri)){if(in==null)throw new IOException();List<Item> merged=new Backup(this).importZip(in,items);store.save(merged);return merged;}},(a,loaded)->{int added=loaded.size()-a.items.size();a.items=loaded;a.render();a.notice(added+" article(s) ajouté(s). Les articles déjà présents sont conservés.");});}
    }
    private interface Job<T>{T run()throws Exception;}
    private interface Done<T>{void run(MainActivity activity,T value);}
    private static class JobState<T>{String message;Done<T> done;T value;Exception error;boolean completed,delivered;MainActivity owner;}
    private void attachJob(){
        if(activeJob==null)return;activeJob.owner=this;
        if(jobDialog==null){jobDialog=new AlertDialog.Builder(this).setMessage(activeJob.message).setCancelable(false).create();jobDialog.show();}
        deliverJob(activeJob);
    }
    private <T> void deliverJob(JobState<T> state){
        if(!state.completed||state.delivered||state.owner==null)return;
        MainActivity a=state.owner;if(a.isDestroyed()||a.isFinishing())return;
        state.delivered=true;state.owner=null;a.activeJob=null;a.importing=false;if(a.jobDialog!=null){a.jobDialog.dismiss();a.jobDialog=null;}
        if(state.error!=null)a.notice("L’opération n’a pas abouti. Vos articles enregistrés sont conservés. "+(state.error.getMessage()==null?"Vérifiez le fichier et l’espace disponible.":state.error.getMessage()));
        else state.done.run(a,state.value);
    }
    private <T> void runJob(String message,Job<T> job,Done<T> done){
        if(activeJob!=null){toast("Une opération est déjà en cours.");return;}
        JobState<T> state=new JobState<>();state.message=message;state.done=done;activeJob=state;if(foreground)attachJob();
        work.execute(()->{try{T value=job.run();main.post(()->{state.value=value;state.completed=true;deliverJob(state);});}catch(Exception error){main.post(()->{state.error=error;state.completed=true;deliverJob(state);});}});
    }

    private void renderBilan(){
        Ledger.Totals t=Ledger.summarize(items);LinearLayout hero=ui.card();hero.addView(ui.text("BÉNÉFICE NET · TOUTE LA PÉRIODE",11,MUTED,true));ui.gap(hero,8);hero.addView(ui.amount(Money.format(t.profit),34,t.profit>=0?MINT:RED),new LinearLayout.LayoutParams(-1,ui.dp(43)));ui.gap(hero,8);hero.addView(ui.text("Uniquement les articles vendus",12,MUTED,false));ui.add(body,hero,16);
        LinearLayout capital=ui.card();capital.addView(ui.text("Capital réel",17,INK,true));ui.gap(capital,14);kv(capital,"Argent encaissé sur ventes",Money.format(t.revenue),INK);kv(capital,"Argent immobilisé en stock",Money.format(t.stockCost),GOLD);kv(capital,"Bénéfice réellement réalisé",Money.format(t.profit),t.profit>=0?MINT:RED);ui.add(body,capital,14);
        YearMonth now=YearMonth.now();Ledger.MonthTotals month=Ledger.summarizeMonth(items,now),before=Ledger.summarizeMonth(items,now.minusMonths(1));LinearLayout monthly=ui.card();monthly.setTag("monthly_stats");monthly.addView(ui.text("Ce mois-ci",17,INK,true));ui.gap(monthly,14);kv(monthly,"Chiffre d’affaires",Money.format(month.revenue),INK);kvTagged(monthly,"Bénéfice du mois",Money.format(month.profit),month.profit>=0?MINT:RED,"bilan_month_profit");kv(monthly,"Ventes",Integer.toString(month.sold),INK);kv(monthly,"Bénéfice moyen / vente",month.sold>0?Money.format(month.averageProfit):"—",INK);long monthlyDelta=month.profit-before.profit;kv(monthly,"Écart vs mois précédent",Money.format(monthlyDelta),monthlyDelta>=0?MINT:RED);ui.add(body,monthly,14);
        section("6 derniers mois",null,null);LinearLayout chart=ui.card();chart.addView(new ProfitChart(items),new LinearLayout.LayoutParams(-1,ui.dp(180)));ui.add(body,chart,18);
        LinearLayout result=ui.card();result.addView(ui.text("Vos résultats",17,INK,true));ui.gap(result,16);kv(result,"Chiffre d’affaires",Money.format(t.revenue),INK);kv(result,"Coût des articles vendus",Money.format(t.revenue-t.profit),INK);kv(result,"Bénéfice réalisé",Money.format(t.profit),t.profit>=0?MINT:RED);ui.line(result);kv(result,"Marge sur les ventes",t.revenue>0?String.format(Locale.FRANCE,"%.1f %%",t.margin):"—",MINT);kv(result,"Retour sur coût",t.revenue-t.profit>0?String.format(Locale.FRANCE,"%.1f %%",t.roi):"—",INK);ui.add(body,result,14);
        LinearLayout inventory=ui.card();inventory.addView(ui.text("Achats & stock",17,INK,true));ui.gap(inventory,16);kv(inventory,"Total des achats",Money.format(t.purchases),INK);kv(inventory,"Total des frais payés",Money.format(t.fees),GOLD);kv(inventory,"Argent engagé en stock",Money.format(t.stockCost),INK);kv(inventory,"Articles en stock",Integer.toString(t.stock),INK);kv(inventory,"Articles vendus",Integer.toString(t.sold),MINT);ui.line(inventory);kv(inventory,"Valeur de revente estimée",Money.format(t.stockEstimate),MINT);kv(inventory,"Bénéfice potentiel du stock",t.estimatedStock>0?Money.format(t.stockPotentialProfit):"—",t.stockPotentialProfit>=0?MINT:RED);kv(inventory,"Encaissements totaux possibles",Money.format(t.possibleCash),INK);kv(inventory,"Résultat potentiel total",Money.format(t.possibleProfit),t.possibleProfit>=0?MINT:RED);kv(inventory,"Articles avec estimation",Integer.toString(t.estimatedStock),MUTED);ui.add(body,inventory,18);
        ui.add(body,ui.text("Marge = bénéfice ÷ prix de vente. Retour sur coût = bénéfice ÷ (achat + frais). Les estimations de revente ne sont pas comptées comme des ventes. « Encaissements totaux possibles » additionne les ventes déjà encaissées et les estimations renseignées pour le stock.",12,MUTED,false),18);
        ui.add(body,ui.button("Exporter mes comptes en CSV",false,()->createDocument(SAVE_CSV,"text/csv","Marge-comptes-"+LocalDate.now()+".csv")),0);
    }
    private class ProfitChart extends View {
        final long[] values=new long[6];final String[] labels=new String[6];final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        ProfitChart(List<Item> list){super(MainActivity.this);YearMonth end=YearMonth.now();for(int n=0;n<6;n++){YearMonth m=end.minusMonths(5-n);labels[n]=m.atDay(1).format(DateTimeFormatter.ofPattern("MMM",Locale.FRANCE));for(Item i:list)if(i.sold&&i.saleDate.startsWith(m.toString()))values[n]+=i.profit();}setContentDescription("Bénéfices réalisés sur les six derniers mois");}
        @Override protected void onDraw(Canvas c){super.onDraw(c);float top=ui.dp(24),bottom=getHeight()-ui.dp(28),usable=bottom-top,max=1,min=0;for(long v:values){max=Math.max(max,v);min=Math.min(min,v);}float zero=top+usable*max/(max-min),step=getWidth()/6f;paint.setStrokeWidth(ui.dp(1));paint.setColor(LINE);c.drawLine(0,zero,getWidth(),zero,paint);
            for(int i=0;i<6;i++){float x=i*step+step/2,y=top+usable*(max-values[i])/(max-min);paint.setColor(values[i]>=0?MINT:RED);if(values[i]!=0)c.drawRoundRect(x-step*.24f,Math.min(y,zero),x+step*.24f,Math.max(y,zero),ui.dp(4),ui.dp(4),paint);else{paint.setColor(LINE);c.drawRoundRect(x-step*.24f,zero-ui.dp(2),x+step*.24f,zero,ui.dp(1),ui.dp(1),paint);}paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));paint.setTextAlign(Paint.Align.CENTER);paint.setTextSize(ui.dp(10));paint.setColor(MUTED);c.drawText(labels[i],x,getHeight()-ui.dp(6),paint);if(values[i]!=0){paint.setColor(values[i]>=0?MINT:RED);c.drawText(String.format(Locale.FRANCE,"%.0f €",values[i]/100.0),x,values[i]>=0?y-ui.dp(7):y+ui.dp(12),paint);}}
        }
    }
    private void renderTools(){
        LinearLayout intro=ui.card();intro.addView(ui.text("Vos articles vous appartiennent",19,INK,true));ui.gap(intro,8);intro.addView(ui.text("Les articles et les photos sont conservés dans cette application, sur votre téléphone. Créez une sauvegarde pour les retrouver sur un autre appareil.",13,MUTED,false));ui.add(body,intro,20);
        tool("download","Sauvegarder articles + photos","Un fichier ZIP complet à garder en lieu sûr.",()->createDocument(SAVE_ZIP,"application/zip","Marge-sauvegarde-"+LocalDate.now()+".zip"));
        tool("upload","Importer une sauvegarde Marge +","Ajoute les articles absents. Ne remplace pas les articles déjà présents.",()->{Intent it=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);try{startActivityForResult(it,OPEN_ZIP);}catch(ActivityNotFoundException e){notice("Sélecteur de fichiers indisponible.");}});
        tool("chart","Exporter les comptes en CSV","Montants et détail des frais, sans les photos.",()->createDocument(SAVE_CSV,"text/csv","Marge-comptes-"+LocalDate.now()+".csv"));
        tool("box","Reprendre l’ancienne application","Coller le texte envoyé par son bouton EXPORTER.",this::legacyImport);
        ui.gap(body,14);ui.add(body,ui.text("MARGE +  ·  VERSION 2.2.0",11,MUTED,true),8);ui.add(body,ui.text("Cette application est distincte de Marge. L’ancienne application et ses données restent intactes. L’import de son export reprend le total des frais, car cet export ne contient pas leur détail.",12,MUTED,false),0);
    }
    private void tool(String icon,String title,String subtitle,Runnable action){LinearLayout c=ui.card();LinearLayout r=ui.row();r.addView(ui.icon(icon,MINT),new LinearLayout.LayoutParams(ui.dp(26),ui.dp(26)));LinearLayout names=ui.column();names.setPadding(ui.dp(14),0,ui.dp(10),0);names.addView(ui.text(title,16,INK,true));ui.gap(names,6);names.addView(ui.text(subtitle,12,MUTED,false));r.addView(names,new LinearLayout.LayoutParams(0,-2,1));r.addView(ui.icon("chevron",MUTED),new LinearLayout.LayoutParams(ui.dp(18),ui.dp(18)));c.addView(r);ui.click(c,action);ui.add(body,c,12);}
    private void createDocument(int request,String mime,String title){try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,title),request);}catch(ActivityNotFoundException e){notice("Aucun sélecteur de fichiers disponible sur cet appareil.");}}
    private void legacyImport(){
        LinearLayout content=ui.column();ui.pad(content,20,10);ui.add(content,ui.text("Dans l’ancienne Marge, touchez EXPORTER, copiez le texte puis collez-le ici. Les frais seront regroupés et les dates pourront être complétées dans les fiches.",14,MUTED,false),12);EditText text=editBox("Article;Achat;Frais;Vente;Bénéfice;Statut", "",false);text.setSingleLine(false);text.setMinLines(5);text.setMaxLines(10);text.setGravity(Gravity.TOP);text.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE);content.addView(text);AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Importer depuis Marge").setView(content).setNegativeButton("Annuler",null).setPositiveButton("Vérifier",null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{List<Item> imported=new Backup(this).importLegacyCsv(text.getText().toString());new AlertDialog.Builder(this).setTitle("Ajouter "+imported.size()+" article(s) ?").setMessage("Les articles actuels seront conservés. Les frais importés seront classés dans « Autres frais ». Vérifiez les dates après import. Ne réimportez pas le même export plusieurs fois.").setNegativeButton("Annuler",null).setPositiveButton("Ajouter",(dd,w)->{List<Item> next=new ArrayList<>(items);next.addAll(imported);dialog.dismiss();saveItems(next,a->a.navigate("articles"));}).show();}catch(Exception e){text.setError("Export non reconnu. Copiez le texte complet, avec son en-tête.");}}));dialog.show();
    }
    private void renderAnalysis(){
        ui.add(body,ui.text("Avant d’acheter, vérifiez ce qu’il pourrait vous rester après tous les frais.",14,MUTED,false),20);
        String[] keys={"analysis_purchase","analysis_fees","analysis_sale"},labels={"Prix d’achat envisagé","Tous les frais estimés","Prix de revente envisagé"};Map<String,EditText> input=new HashMap<>();for(int n=0;n<keys.length;n++){ui.add(body,ui.text(labels[n],12,MUTED,true),7);EditText e=editBox("0,00 €","",true);input.put(keys[n],e);ui.add(body,e,16);}
        LinearLayout result=ui.card();result.addView(ui.text("BÉNÉFICE POTENTIEL",11,MUTED,true));ui.gap(result,9);TextView profit=ui.amount("—",34,MINT);result.addView(profit,new LinearLayout.LayoutParams(-1,ui.dp(43)));ui.gap(result,8);TextView margin=ui.text("Remplissez les montants",13,MUTED,false);result.addView(margin);ui.add(body,result,16);
        Runnable calculate=()->{try{long p=Money.parse(input.get(keys[0]).getText().toString(),true),f=Money.parse(input.get(keys[1]).getText().toString(),false),s=Money.parse(input.get(keys[2]).getText().toString(),true);long net=s-p-f;profit.setText(Money.format(net));profit.setTextColor(net>=0?MINT:RED);margin.setText("Seuil de rentabilité : "+Money.format(p+f)+(s>0?String.format(Locale.FRANCE,"\nMarge estimée : %.1f %%",100.0*net/s):""));}catch(Exception e){profit.setText("—");margin.setText("Saisissez des montants valides (2 décimales maximum).");}};for(EditText e:input.values())e.addTextChangedListener(watcher(calculate));
        ui.add(body,ui.text("Simulation uniquement. Aucun montant n’est ajouté à vos comptes et le prix de revente n’est pas garanti.",12,MUTED,false),0);
    }
    private void renderReadFailure(){LinearLayout panel=ui.column();ui.pad(panel,24,40);panel.addView(ui.text("Vos données n’ont pas pu être lues",23,INK,true));ui.gap(panel,16);panel.addView(ui.text("L’application bloque les nouvelles écritures pour préserver les fichiers existants. Fermez puis rouvrez l’application. Ne la désinstallez pas.",15,MUTED,false));root.addView(panel);}
    @Override public void onBackPressed(){goBack();}
    private void goBack(){
        if(route.equals("editor")){new AlertDialog.Builder(this).setTitle("Quitter cette fiche ?").setMessage("Les modifications non enregistrées seront abandonnées.").setNegativeButton("Continuer",null).setPositiveButton("Abandonner",(d,w)->{clearDraft();navigate(previous.equals("editor")?"articles":previous);}).show();}
        else if(route.equals("detail"))navigate(previous.equals("home")?"home":"articles");else if(!route.equals("home"))navigate("home");else super.onBackPressed();
    }
    private static class Editor {
        Item item;boolean existing,sold;Map<String,String> raw=new LinkedHashMap<>();
        Editor(Item old){existing=old!=null;item=old==null?new Item():old.copy();sold=item.sold;raw.put("name",item.name);raw.put("category",item.category);raw.put("platform",item.platform);raw.put("salePlatform",item.salePlatform);raw.put("notes",item.notes);raw.put("purchaseDate",item.purchaseDate);raw.put("saleDate",item.saleDate);String[] names={"purchase","shipping","buyer","repair","saleFees","saleShipping","other","sale","estimate"};long[] values={item.purchase,item.shipping,item.buyer,item.repair,item.saleFees,item.saleShipping,item.other,item.sale,item.estimate};for(int n=0;n<names.length;n++)raw.put(names[n],values[n]==0?(existing&&(names[n].equals("purchase")||names[n].equals("sale")&&sold)?"0,00":""):Money.input(values[n]));}
        JSONObject json()throws JSONException{JSONObject o=new JSONObject();o.put("item",new JSONObject().put("id",item.id).put("photos",new JSONArray(item.photos)));o.put("existing",existing);o.put("sold",sold);o.put("raw",new JSONObject(raw));return o;}
        static Editor fromJson(JSONObject o)throws JSONException{JSONObject j=o.getJSONObject("item");/* A new unsaved item's name can be empty: keep the draft separate from ledger validation. */Item base=new Item();base.id=j.optString("id",base.id);JSONArray ph=j.optJSONArray("photos");if(ph!=null)for(int n=0;n<ph.length();n++){String p=ph.getString(n);if(p.matches("[A-Za-z0-9_-]+\\.jpg"))base.photos.add(p);}Editor e=new Editor(null);e.item=base;e.existing=o.optBoolean("existing");e.sold=o.optBoolean("sold");JSONObject values=o.getJSONObject("raw");Iterator<String> keys=values.keys();while(keys.hasNext()){String k=keys.next();e.raw.put(k,values.getString(k));}return e;}
    }
}
