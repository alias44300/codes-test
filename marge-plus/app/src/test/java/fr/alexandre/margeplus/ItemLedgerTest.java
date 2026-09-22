package fr.alexandre.margeplus;

import org.json.JSONObject;
import org.junit.Test;
import java.util.Arrays;
import java.util.Collections;
import static org.junit.Assert.*;

public class ItemLedgerTest {
    private Item article(String name,long purchase) {
        Item i=new Item(); i.name=name; i.purchase=purchase; i.purchaseDate="2026-09-01"; return i;
    }
    @Test public void stockAndRealizedProfitAreSeparated() {
        Item stock=article("Stock",25000); stock.shipping=2000; stock.estimate=32000;
        Item sold=article("Vendu",30000); sold.buyer=1948; sold.saleFees=1000; sold.saleShipping=500;
        sold.sold=true; sold.saleDate="2026-09-20"; sold.sale=42000;
        Ledger.Totals t=Ledger.summarize(Arrays.asList(stock,sold));
        assertEquals(55000,t.purchases); assertEquals(5448,t.fees);
        assertEquals(42000,t.revenue); assertEquals(8552,t.profit);
        assertEquals(27000,t.stockCost); assertEquals(32000,t.stockEstimate);
        assertEquals(27000,t.stockEstimatedCost); assertEquals(5000,t.stockPotentialProfit);
        assertEquals(74000,t.possibleCash); assertEquals(13552,t.possibleProfit);
        assertEquals(1,t.stock); assertEquals(1,t.sold); assertEquals(1,t.estimatedStock);
        assertEquals(0,stock.profit()); assertEquals(5000,stock.potentialProfit());
        assertEquals(20.3619047619,t.margin,0.000001);
        assertEquals(25.568045921,t.roi,0.000001);
    }
    @Test public void unpricedStockDoesNotReducePotentialProfit() {
        Item priced=article("Avec estimation",10000); priced.shipping=1000; priced.estimate=18000;
        Item unpriced=article("Sans estimation",25000); unpriced.shipping=2000;
        Ledger.Totals t=Ledger.summarize(Arrays.asList(priced,unpriced));
        assertEquals(1,t.estimatedStock); assertEquals(18000,t.stockEstimate);
        assertEquals(11000,t.stockEstimatedCost); assertEquals(7000,t.stockPotentialProfit);
        assertEquals(18000,t.possibleCash); assertEquals(7000,t.possibleProfit);
        assertEquals(38000,t.stockCost);
    }
    @Test public void noSalesAndGiftsNeverDivideByZero() {
        Ledger.Totals empty=Ledger.summarize(Collections.emptyList());
        assertEquals(0,empty.margin,0); assertEquals(0,empty.roi,0);
        Item gift=article("Don",1500); gift.sold=true; gift.saleDate="2026-09-02";
        gift.validate();
        assertEquals(-1500,gift.profit());
        assertEquals(-100,Ledger.summarize(Collections.singletonList(gift)).roi,0);
    }
    @Test public void jsonRoundTripPreservesAllFieldsAndCopyIsIndependent() {
        Item i=article("Gants; \"Winning\"",30000); i.notes="Ligne 1\nLigne 2";
        i.photos.add("11111111-2222-3333-4444-555555555555.jpg"); i.saleShipping=275; i.estimate=42000;
        Item restored=Item.fromJson(i.toJson());
        assertEquals(i.id,restored.id); assertEquals(i.name,restored.name); assertEquals(i.notes,restored.notes);
        assertEquals(275,restored.saleShipping); assertEquals(42000,restored.estimate); assertEquals(i.photos,restored.photos);
        restored.photos.clear(); assertEquals(1,i.photos.size());
        Item copy=i.copy(); copy.photos.clear(); assertEquals(1,i.photos.size());
    }
    @Test public void validationRejectsTraversalDatesAndFractionalCents() throws Exception {
        Item i=article("Casque",20000); i.photos.add("../../ledger-v1.json");
        try { i.validate(); fail(); } catch(IllegalArgumentException expected) { }
        i.photos.clear(); i.sold=true; i.saleDate="2026-08-31";
        try { i.validate(); fail(); } catch(IllegalArgumentException expected) { }
        i.sold=false; i.saleDate=""; i.purchaseDate="2026-02-30";
        try { i.validate(); fail(); } catch(IllegalArgumentException expected) { }
        i.purchaseDate="2026-09-01";
        JSONObject bad=i.toJson().put("purchase",1.5);
        try { Item.fromJson(bad); fail(); } catch(IllegalArgumentException expected) { }
        bad=i.toJson().put("purchase",-10);
        try { Item.fromJson(bad); fail(); } catch(IllegalArgumentException expected) { }
    }
}
