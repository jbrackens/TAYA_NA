package tech.argyll.prices.domain;

import java.util.Date;
import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("Events")
public class Events {

    @XStreamImplicit
    public Set<Event> events;
}
