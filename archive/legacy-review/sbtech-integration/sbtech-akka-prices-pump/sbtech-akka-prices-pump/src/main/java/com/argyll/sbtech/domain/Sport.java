package com.argyll.sbtech.domain;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("Branch")
public class Sport {

    @XStreamAsAttribute
    @XStreamAlias("ID")
    public int id; 
    
    @XStreamAsAttribute
    @XStreamAlias("Name")
    public String name;
}
