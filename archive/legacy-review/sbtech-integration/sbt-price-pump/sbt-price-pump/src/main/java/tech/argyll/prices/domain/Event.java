package tech.argyll.prices.domain;

import java.util.Date;
import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("Event")
public class Event {

    @XStreamAsAttribute
    @XStreamAlias("DateTimeGMT")
    public Date dateTime; 
    
    @XStreamAsAttribute
    @XStreamAlias("Branch")
    public String branch;
    
    @XStreamAsAttribute
    @XStreamAlias("Sport")
    public String sport; 
    
    @XStreamAsAttribute
    @XStreamAlias("BranchID")
    public int branchId;
    
    @XStreamAsAttribute
    @XStreamAlias("League")
    public String league;
    
    @XStreamAsAttribute
    @XStreamAlias("LeagueID")
    public long leagueId;
    
    @XStreamAsAttribute
    @XStreamAlias("ID")
    public long id;
    
    @XStreamAsAttribute
    @XStreamAlias("IsOption")
    public boolean isOption;
    
    @XStreamAsAttribute
    @XStreamAlias("EventType")
    public int eventType;
    
    @XStreamAsAttribute
    @XStreamAlias("MEID")
    public long meid;
    
    @XStreamImplicit
    public Set<Spread> spreads;
    
    @XStreamImplicit
    public Set<Total> totals;
    
    @XStreamImplicit
    public Set<MoneyLine> moneyLines;
    
    @XStreamAlias("Participants")
    public Participants participants;
}
