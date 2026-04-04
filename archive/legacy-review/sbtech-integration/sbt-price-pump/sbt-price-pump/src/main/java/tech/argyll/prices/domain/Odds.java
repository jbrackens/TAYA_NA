package tech.argyll.prices.domain;

import java.math.BigDecimal;

import com.thoughtworks.xstream.annotations.XStreamAlias;

@XStreamAlias("Odds")
public class Odds {

    @XStreamAlias("TypeName")
    public String typeName;
    
    @XStreamAlias("OddsValue")
    public BigDecimal oddsValue;
    
    @XStreamAlias("LineID")
    public String lineId; 
}
