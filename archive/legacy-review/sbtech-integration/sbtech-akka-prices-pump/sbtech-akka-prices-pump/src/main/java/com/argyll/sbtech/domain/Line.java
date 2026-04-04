package com.argyll.sbtech.domain;

import com.argyll.domain.Price;
import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("Line")
public class Line {

    @XStreamAsAttribute
    @XStreamAlias("Name")
    public String name;
    
    @XStreamAsAttribute
    @XStreamAlias("Odds")
    public Price odds;
    
    @XStreamAsAttribute
    @XStreamAlias("LineID")
    public String lineId;
}
