package fr.alexandre.margeplus;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/** Monetary inputs are always stored and calculated in integer cents. */
public final class Money {
    public static final long MAX = 999_999_999L;
    private Money() { }

    public static long parse(String raw, boolean required) {
        String value = raw == null ? "" : raw.replace('\u00a0', ' ').replace('\u202f', ' ').trim();
        if (value.isEmpty()) {
            if (required) throw new IllegalArgumentException("Saisissez un montant.");
            return 0;
        }
        if (!value.matches("(?:[0-9]+|[0-9]{1,3}(?: [0-9]{3})+)(?:[.,][0-9]{1,2})?")) {
            throw new IllegalArgumentException("Montant invalide : utilisez au maximum deux décimales.");
        }
        try {
            long cents = new BigDecimal(value.replace(" ", "").replace(',', '.')).movePointRight(2).longValueExact();
            check(cents);
            return cents;
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException("Montant trop élevé.", e);
        }
    }

    public static void check(long value) {
        if (value < 0 || value > MAX) throw new IllegalArgumentException("Le montant doit être compris entre 0 et 9 999 999,99 €.");
    }

    public static String format(long cents) {
        return NumberFormat.getCurrencyInstance(Locale.FRANCE).format(BigDecimal.valueOf(cents, 2));
    }

    public static String input(long cents) {
        return BigDecimal.valueOf(cents, 2).toPlainString().replace('.', ',');
    }
}
