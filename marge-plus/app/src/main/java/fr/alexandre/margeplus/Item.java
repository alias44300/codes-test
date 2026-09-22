package fr.alexandre.margeplus;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

public final class Item {
    public String id = UUID.randomUUID().toString();
    public String name = "", category = "", platform = "", salePlatform = "", notes = "";
    public String purchaseDate = LocalDate.now().toString(), saleDate = "";
    public boolean sold;
    public long purchase, shipping, buyer, repair, saleFees, saleShipping, other, sale, estimate;
    public List<String> photos = new ArrayList<>();

    public long fees() { return shipping + buyer + repair + saleFees + saleShipping + other; }
    public long cost() { return purchase + fees(); }
    public long profit() { return sold ? sale - cost() : 0; }
    public long potentialProfit() { return estimate - cost(); }
    public long breakEvenSale() { return cost(); }
    public long saleForRoi(int percent) {
        if (percent < 0 || percent > 1000) throw new IllegalArgumentException("Objectif de rentabilité invalide.");
        long factor = 100L + percent;
        return (cost() * factor + 99L) / 100L;
    }

    public Item copy() {
        Item n = new Item();
        n.id=id; n.name=name; n.category=category; n.platform=platform; n.salePlatform=salePlatform;
        n.notes=notes; n.purchaseDate=purchaseDate; n.saleDate=saleDate; n.sold=sold;
        n.purchase=purchase; n.shipping=shipping; n.buyer=buyer; n.repair=repair; n.saleFees=saleFees;
        n.saleShipping=saleShipping; n.other=other; n.sale=sale; n.estimate=estimate;
        n.photos=new ArrayList<>(photos);
        return n;
    }

    public void validate() {
        if (id == null || !id.matches("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"))
            throw new IllegalArgumentException("Identifiant d’article invalide.");
        if (name == null || name.trim().isEmpty() || name.length() > 200)
            throw new IllegalArgumentException("Indiquez le nom de l’article (200 caractères maximum).");
        for (String s : new String[]{category,platform,salePlatform}) {
            if (s == null || s.length() > 100) throw new IllegalArgumentException("Catégorie ou plateforme trop longue.");
        }
        if (notes == null || notes.length() > 10000) throw new IllegalArgumentException("Notes trop longues.");
        for (long value : new long[]{purchase,shipping,buyer,repair,saleFees,saleShipping,other,sale,estimate}) Money.check(value);
        LocalDate purchased = date(purchaseDate, "Date d’achat invalide.");
        if (saleDate == null) throw new IllegalArgumentException("Date de vente invalide.");
        if (sold || !saleDate.isEmpty()) {
            LocalDate soldOn = date(saleDate, "Indiquez une date de vente valide.");
            if (soldOn.isBefore(purchased)) throw new IllegalArgumentException("La vente ne peut pas précéder l’achat.");
        }
        if (photos == null || photos.size() > 6) throw new IllegalArgumentException("Six photos maximum par article.");
        HashSet<String> seen = new HashSet<>();
        for (String p : photos) {
            if (!validPhoto(p) || !seen.add(p)) throw new IllegalArgumentException("Référence de photo invalide.");
        }
    }

    public static boolean validPhoto(String name) {
        return name != null && name.matches("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\\.jpg");
    }

    private static LocalDate date(String value, String message) {
        try {
            if (value == null || !value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException(message);
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) { throw new IllegalArgumentException(message, e); }
    }

    public JSONObject toJson() {
        validate();
        try {
            JSONObject o = new JSONObject();
            o.put("id",id).put("name",name).put("category",category).put("platform",platform).put("salePlatform",salePlatform);
            o.put("notes",notes).put("purchaseDate",purchaseDate).put("saleDate",saleDate).put("sold",sold);
            o.put("purchase",purchase).put("shipping",shipping).put("buyer",buyer).put("repair",repair);
            o.put("saleFees",saleFees).put("saleShipping",saleShipping).put("other",other).put("sale",sale).put("estimate",estimate);
            o.put("photos",new JSONArray(photos));
            return o;
        } catch (JSONException e) { throw new IllegalArgumentException("Article impossible à enregistrer.",e); }
    }

    public static Item fromJson(JSONObject o) {
        if (o == null) throw new IllegalArgumentException("Article invalide.");
        Item n = new Item();
        n.id=text(o,"id",true); n.name=text(o,"name",true); n.category=text(o,"category",false);
        n.platform=text(o,"platform",false); n.salePlatform=text(o,"salePlatform",false); n.notes=text(o,"notes",false);
        n.purchaseDate=text(o,"purchaseDate",true); n.saleDate=text(o,"saleDate",false);
        Object soldValue = o.opt("sold");
        if (!(soldValue instanceof Boolean)) throw new IllegalArgumentException("Statut d’article invalide.");
        n.sold=(Boolean)soldValue;
        n.purchase=amount(o,"purchase"); n.shipping=amount(o,"shipping"); n.buyer=amount(o,"buyer");
        n.repair=amount(o,"repair"); n.saleFees=amount(o,"saleFees"); n.saleShipping=amount(o,"saleShipping");
        n.other=amount(o,"other"); n.sale=amount(o,"sale"); n.estimate=amount(o,"estimate");
        JSONArray array=o.optJSONArray("photos");
        if (array == null) throw new IllegalArgumentException("Liste de photos invalide.");
        for(int i=0;i<array.length();i++) {
            Object p=array.opt(i);
            if (!(p instanceof String)) throw new IllegalArgumentException("Photo invalide.");
            n.photos.add((String)p);
        }
        n.validate();
        return n;
    }

    private static String text(JSONObject o, String key, boolean required) {
        if (!o.has(key) && !required) return "";
        Object value=o.opt(key);
        if (!(value instanceof String)) throw new IllegalArgumentException("Champ invalide : "+key);
        return (String)value;
    }

    private static long amount(JSONObject o, String key) {
        Object value=o.opt(key);
        if (value == null || value == JSONObject.NULL || !(value instanceof Number) || !value.toString().matches("[0-9]+"))
            throw new IllegalArgumentException("Montant invalide : "+key);
        try { long n=Long.parseLong(value.toString()); Money.check(n); return n; }
        catch (NumberFormatException e) { throw new IllegalArgumentException("Montant trop élevé : "+key,e); }
    }
}
