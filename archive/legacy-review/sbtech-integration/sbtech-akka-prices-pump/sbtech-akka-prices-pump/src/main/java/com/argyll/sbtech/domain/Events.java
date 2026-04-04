package com.argyll.sbtech.domain;

import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("Events")
public class Events {

    @XStreamImplicit
    public Set<Sport> sports;
    
    @XStreamImplicit
    public Set<League> leagues;
    
    @XStreamImplicit
    public Set<Event> events;
}
