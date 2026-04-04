package com.argyll.domain;

import static org.fest.assertions.Assertions.assertThat;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.testng.annotations.Test;

public class PricesTest {

    @Test
    public void testDecimalToFractionalGreaterThanZero() {
        assertThat(Prices.decimalToFractional(new BigDecimal("3.75"))).isEqualTo("11/4");
    }
    
    @Test
    public void testDecimalToFractionalLessThanZero() {
        assertThat(Prices.decimalToFractional(new BigDecimal("1.8"))).isEqualTo("4/5");
        assertThat(Prices.decimalToFractional(new BigDecimal("3.35"))).isEqualTo("47/20");
    }
    
    @Test
    public void testAmericanToDecimalGreaterThanZero() {
        assertThat(Prices.americanToDecimal(new BigDecimal("200")).setScale(2)).isEqualTo(new BigDecimal("3.00"));
        assertThat(Prices.americanToDecimal(new BigDecimal("600")).setScale(2)).isEqualTo(new BigDecimal("7.00"));
    }
    
    @Test
    public void testAmericanToDecimalLessThanZero() {
        assertThat(Prices.americanToDecimal(new BigDecimal("-130")).setScale(3, RoundingMode.HALF_UP)).isEqualTo(new BigDecimal("1.769"));
        assertThat(Prices.americanToDecimal(new BigDecimal("-900")).setScale(3, RoundingMode.HALF_UP)).isEqualTo(new BigDecimal("1.111"));
    }
}
