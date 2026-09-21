package fr.alexandre.margeplus;

import java.util.List;

public final class Ledger {
    private Ledger() { }
    public static final class Totals {
        public long purchases, fees, revenue, profit, stockCost, stockEstimate;
        public int stock, sold;
        public double margin, roi;
    }
    public static Totals summarize(List<Item> items) {
        Totals t=new Totals();
        long soldCost=0;
        for(Item item:items) {
            t.purchases+=item.purchase;
            t.fees+=item.fees();
            if(item.sold) {
                t.sold++; t.revenue+=item.sale; t.profit+=item.profit(); soldCost+=item.cost();
            } else {
                t.stock++; t.stockCost+=item.cost(); t.stockEstimate+=item.estimate;
            }
        }
        t.margin=t.revenue>0 ? (double)t.profit/t.revenue*100 : 0;
        t.roi=soldCost>0 ? (double)t.profit/soldCost*100 : 0;
        return t;
    }
}
