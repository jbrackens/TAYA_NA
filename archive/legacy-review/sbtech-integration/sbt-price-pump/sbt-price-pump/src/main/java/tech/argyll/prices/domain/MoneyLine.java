package tech.argyll.prices.domain;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("MoneyLine")
public class MoneyLine {

    @XStreamAsAttribute
    @XStreamAlias("Home")
    public Price home;
    
    @XStreamAsAttribute
    @XStreamAlias("Draw")
    public Price draw;
    
    @XStreamAsAttribute
    @XStreamAlias("Away")
    public Price away;
    
    @XStreamAsAttribute
    @XStreamAlias("Home_LineID")
    public String homeLineId;
    
    @XStreamAsAttribute
    @XStreamAlias("Draw_LineID")
    public String drawLineId;
    
    @XStreamAsAttribute
    @XStreamAlias("Away_LineID")
    public String awayLineId;
}
