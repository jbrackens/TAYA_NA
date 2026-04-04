package com.argyll.sbtech.domain;

import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("Event")
public class Market {
    
    @XStreamAsAttribute
    @XStreamAlias("ID")
    public long id;
    
    @XStreamAsAttribute
    @XStreamAlias("Type")
    public long type;

    @XStreamAlias("MoneyLine")
    public MoneyLine moneyline;
    
    @XStreamImplicit
    public Set<Spread> spreads;
    
    @XStreamImplicit
    public Set<Total> totals;
    
    @XStreamImplicit
    public Set<Line> lines;

    @Override
    public String toString() {
        return "Market [id=" + id + ", type=" + type + ", moneyline=" + moneyline + ", spreads=" + spreads
               + ", totals=" + totals + ", lines=" + lines + "]";
    }
}
