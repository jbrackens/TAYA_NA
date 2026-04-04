package tech.argyll.prices.domain;

import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

public class Participants {
    
    @XStreamImplicit
    public Set<Participant> participants;

    @XStreamAlias("Participant1")
    public Participant participant1;
    
    @XStreamAlias("Participant2")
    public Participant participant2;
}
