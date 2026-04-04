package com.argyll.sbtech.domain;

import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("TennisScore")
public class TennisScore {

    @XStreamAsAttribute
    @XStreamAlias("TennisGameType")
    public String tennisGameType;
    
    @XStreamImplicit
    public Set<TennisSet> sets;
}
