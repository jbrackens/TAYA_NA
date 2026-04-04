package tech.argyll.prices.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tech.argyll.util.Prices;

public abstract class Price {

    private final static Logger log = LoggerFactory.getLogger(Price.class);

    public enum Type {
        DECIMAL, AMERICAN
    }

    protected BigDecimal decimal;

    protected BigDecimal american;

    protected String fractional;

    public static Price from(BigDecimal value, Price.Type type) {

        switch (type) {
        case AMERICAN:
            return fromAmerican(value);
        case DECIMAL:
            return fromDecimal(value);
        default:
            throw new IllegalArgumentException("from(BigDecimal, Price.Type) requires Price.Type to be one of DECIMAL or AMERICAN");
        }
    }

    public static Price fromDecimal(BigDecimal decimal) {
        if (decimal.compareTo(BigDecimal.ZERO) == 0) {
            return NullPrice.instance();
        }

        return new DecimalPrice(decimal);
    }

    public static Price fromAmerican(BigDecimal american) {
        if (american.compareTo(BigDecimal.ZERO) == 0) {
            return NullPrice.instance();
        }

        return new AmericanPrice(american);
    }

    public abstract BigDecimal decimal();

    public abstract BigDecimal american();

    public abstract String fractional();

    private static class DecimalPrice extends Price {

        private DecimalPrice(BigDecimal decimal) {
            this.decimal = decimal;
        }

        public BigDecimal decimal() {
            return decimal;
        }

        public BigDecimal american() {
            if (american == null) {
                american = Prices.decimalToAmerican(decimal).setScale(0);
            }

            return american;
        }

        public String fractional() {
            if (fractional == null || fractional.equals("")) {
                fractional = Prices.decimalToFractional(decimal);
            }

            return fractional;
        }

        public String toString() {
            return toString(Price.Type.DECIMAL);
        }
    }

    private static class AmericanPrice extends Price {

        private AmericanPrice(BigDecimal american) {
            this.american = american;
        }

        @Override
        public BigDecimal decimal() {
            if (decimal == null) {
                decimal = Prices.americanToDecimal(american);
            }

            return decimal;
        }

        @Override
        public BigDecimal american() {
            return american;
        }

        @Override
        public String fractional() {
            if (fractional == null || fractional.equals("")) {
                fractional = Prices.americanToFractional(decimal);
            }

            return fractional;
        }

        public String toString() {
            return toString(Price.Type.AMERICAN);
        }
    }

    public String toString(Price.Type type) {
        String value = null;

        switch (type) {
        case AMERICAN:
            value = american().toString();
            break;
        case DECIMAL:
            value = decimal().setScale(3, RoundingMode.HALF_UP).toString();
            break;
        default:
            value = fractional();
        }

        return "Price[" + value + "]";
    }

    private static class NullPrice extends Price {

        private static Price instance;

        public static Price instance() {
            return instance = instance == null ? new NullPrice() : instance;
        }

        @Override
        public BigDecimal decimal() {
            return BigDecimal.ZERO;
        }

        @Override
        public BigDecimal american() {
            return BigDecimal.ZERO;
        }

        @Override
        public String fractional() {
            return "0/0";
        }
    }
}
