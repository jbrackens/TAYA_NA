package tech.argyll.prices.domain;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

public class Participant {
    
    @XStreamAsAttribute
    @XStreamAlias("Name")
    public String name;
    
    @XStreamAsAttribute
    @XStreamAlias("Home_Visiting")
    public String homeVisiting;

    @XStreamAlias("Odds")
    public Odds odds;
}
