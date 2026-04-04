package tech.argyll.prices.domain;

import java.math.BigDecimal;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("Spread")
public class Spread {

    @XStreamAsAttribute
    @XStreamAlias("Home_Odds")
    public Price homeOdds;
    
    @XStreamAsAttribute
    @XStreamAlias("Away_Odds")
    public Price awayOdds;
    
    @XStreamAsAttribute
    @XStreamAlias("Home_Points")
    public BigDecimal homePoints;
    
    @XStreamAsAttribute
    @XStreamAlias("Away_Points")
    public BigDecimal awayPoints;
    
    @XStreamAsAttribute
    @XStreamAlias("Home_LineID")
    public String homeLineId;
    
    @XStreamAsAttribute
    @XStreamAlias("Away_LineID")
    public String awayLineId;
}
