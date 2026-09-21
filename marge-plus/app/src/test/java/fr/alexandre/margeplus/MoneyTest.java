package fr.alexandre.margeplus;

import org.junit.Test;
import static org.junit.Assert.*;

public class MoneyTest {
    @Test public void frenchInputsAreExactCents() {
        assertEquals(1948,Money.parse("19,48",true));
        assertEquals(20,Money.parse("0.20",true));
        assertEquals(123456,Money.parse("1 234,56",true));
        assertEquals(123456,Money.parse("1\u202f234,56",true));
        assertEquals(0,Money.parse("",false));
        assertEquals(Money.MAX,Money.parse("9 999 999,99",true));
        assertEquals(30,Money.parse("0,10",true)+Money.parse("0,20",true));
    }
    @Test public void invalidInputsAreNeverSilentlyZero() {
        for(String value:new String[]{"","-1","1e3","NaN","Infinity","1,234","1,2.3","12 34","1  234","10000000",".50","1€"}) {
            try { Money.parse(value,true); fail("Accepted: "+value); } catch(IllegalArgumentException expected) { }
        }
    }
    @Test public void inputFormattingRetainsTwoDecimalsAndLosses() {
        assertEquals("0,05",Money.input(5));
        assertEquals("-20,00",Money.input(-2000));
        assertTrue(Money.format(-1948).contains("19,48"));
        assertTrue(Money.format(100).contains("€"));
    }
}
