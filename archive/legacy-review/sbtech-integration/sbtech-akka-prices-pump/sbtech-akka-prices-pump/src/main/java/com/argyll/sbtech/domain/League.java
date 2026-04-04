package com.argyll.sbtech.domain;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("League")
public class League {

    @XStreamAsAttribute
    @XStreamAlias("ID")
    public int id; 
    
    @XStreamAsAttribute
    @XStreamAlias("Name")
    public String name;
}
