package com.argyll.sbtech.domain;

import java.math.BigDecimal;

import com.argyll.domain.Price;
import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("Total")
public class Total {

    @XStreamAsAttribute
    @XStreamAlias("Points")
    public BigDecimal points;
    
    @XStreamAsAttribute
    @XStreamAlias("Over")
    public Price over;
    
    @XStreamAsAttribute
    @XStreamAlias("Under")
    public Price under;
    
    @XStreamAsAttribute
    @XStreamAlias("Over_LineID")
    public String overLineId;
    
    @XStreamAsAttribute
    @XStreamAlias("Under_LineID")
    public String underLineId;
}
