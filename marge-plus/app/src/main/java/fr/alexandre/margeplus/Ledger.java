package fr.alexandre.margeplus;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class Ledger {
    private Ledger() { }
    public static final class Totals {
        public long purchases, fees, revenue, profit, stockCost, stockEstimate, stockEstimatedCost, stockPotentialProfit, possibleCash, possibleProfit;
        public int stock, sold, estimatedStock, dormantStock, missingEstimate, lossRisk;
        public double margin, roi;
    }
    public static final class MonthTotals {
        public long revenue, cost, profit, averageProfit;
        public int sold;
        public double margin;
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
                t.stock++; t.stockCost+=item.cost();
                if(dormant(item,LocalDate.now())) t.dormantStock++;
                if(item.estimate>0) {
                    t.estimatedStock++;
                    t.stockEstimate+=item.estimate;
                    t.stockEstimatedCost+=item.cost();
                    t.stockPotentialProfit+=item.potentialProfit();
                    if(item.potentialProfit()<0) t.lossRisk++;
                } else t.missingEstimate++;
            }
        }
        t.possibleCash=t.revenue+t.stockEstimate;
        t.possibleProfit=t.profit+t.stockPotentialProfit;
        t.margin=t.revenue>0 ? (double)t.profit/t.revenue*100 : 0;
        t.roi=soldCost>0 ? (double)t.profit/soldCost*100 : 0;
        return t;
    }
    public static MonthTotals summarizeMonth(List<Item> items, YearMonth month) {
        MonthTotals t=new MonthTotals();
        String prefix=month.toString();
        for(Item item:items) if(item.sold && item.saleDate.startsWith(prefix)) {
            t.sold++; t.revenue+=item.sale; t.cost+=item.cost(); t.profit+=item.profit();
        }
        t.averageProfit=t.sold>0 ? t.profit/t.sold : 0;
        t.margin=t.revenue>0 ? (double)t.profit/t.revenue*100 : 0;
        return t;
    }
    public static long stockAgeDays(Item item, LocalDate today) {
        if(item.sold) return 0;
        long days=ChronoUnit.DAYS.between(LocalDate.parse(item.purchaseDate),today);
        return Math.max(0,days);
    }
    public static boolean dormant(Item item, LocalDate today) { return !item.sold && stockAgeDays(item,today)>=60; }
}
