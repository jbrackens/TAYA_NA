package tech.argyll.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;

public class Prices {
    
    final static BigDecimal ONE_HUNDRED = new BigDecimal("100");
    
    final static BigDecimal MINUS_ONE_HUNDRED = new BigDecimal("-100");
    
    final static BigDecimal TWO = new BigDecimal("2");

    public static BigDecimal americanToDecimal(BigDecimal american) {
        int compare = american.compareTo(BigDecimal.ZERO);
        
        if (compare == 0) {
            throw new IllegalArgumentException("American odds can't be 0");
        }
        
        if (compare < 0) {
            return ONE_HUNDRED.divide(american.abs(), 5, RoundingMode.HALF_UP).add(BigDecimal.ONE);
        }
        
        return american.divide(ONE_HUNDRED, RoundingMode.HALF_UP).add(BigDecimal.ONE);
    }
    
    public static String americanToFractional(BigDecimal american) {
        return decimalToFractional(americanToDecimal(american));
    }
    
    public static BigDecimal decimalToAmerican(BigDecimal decimal) {
        if (decimal.compareTo(TWO) < 0) {
            return MINUS_ONE_HUNDRED.divide(decimal.subtract(BigDecimal.ONE), RoundingMode.HALF_UP);
        }
        
        return ONE_HUNDRED.multiply(decimal.subtract(BigDecimal.ONE));
    }
    
    public static int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b); // Not bad for one line of code :)
    }
    
    public static int gcd(int... numbers) {
        return Arrays.stream(numbers).reduce(0, (x, y) -> gcd(x, y));
    }

    public static int lcm(int... numbers) {
        return Arrays.stream(numbers).reduce(1, (x, y) -> x * (y / gcd(x, y)));
    }
    
    public static boolean isIntegerValue(BigDecimal bd) {
        return bd.signum() == 0 || bd.scale() <= 0 || bd.stripTrailingZeros().scale() <= 0;
    }
    
    public static String decimalToFractional(BigDecimal decimal) {
        // First, remove 1 from the decimal value
        BigDecimal d1 = decimal.subtract(BigDecimal.ONE);
        
        int m = 1;
        
        // If it's less than 1, multiply both sides by 10 
        if (d1.compareTo(BigDecimal.ONE) < 0) {
            m = 10;
            d1 = d1.multiply(BigDecimal.TEN);
        }
        
        BigDecimal d2 = d1;

        // Add d1 to itself until we get a whole number
        while (!isIntegerValue(d2)) {
            d2 = d2.add(d1);
            m++;
        }
        
        int d = d2.intValue();
        
        // if the greatest common denominator is more than 1
        // we need to divide both sides so we get the lowest
        // fractional expression.
        int gcd = gcd(d, m);
        
        if (gcd > 1) {
            d /= gcd;
            m /= gcd;
        }
        
        return d + "/" + m;
    }
}
