package com.argyll.sbtech.domain;

import java.util.Date;
import java.util.Set;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

@XStreamAlias("Game")
public class Event {

    @XStreamAsAttribute
    @XStreamAlias("ID")
    public long id;
    
    @XStreamAsAttribute
    @XStreamAlias("ShortID")
    public long shortId;
    
    @XStreamAsAttribute
    @XStreamAlias("Home")
    public String home;
    
    @XStreamAsAttribute
    @XStreamAlias("Away")
    public String away;
    
    @XStreamAsAttribute
    @XStreamAlias("BranchID")
    public long branchId;
    
    @XStreamAsAttribute
    @XStreamAlias("LeagueID")
    public long leagueId;
    
    @XStreamAsAttribute
    @XStreamAlias("Date")
    public Date date;
    
    @XStreamAsAttribute
    @XStreamAlias("Suspended")
    public int suspended;
    
    @XStreamAsAttribute
    @XStreamAlias("Status")
    public int status;
    
    @XStreamAsAttribute
    @XStreamAlias("Seconds")
    public int seconds;
    
    @XStreamAsAttribute
    @XStreamAlias("SecondsUpdated")
    public Date secondsUpdated;
    
    @XStreamAsAttribute
    @XStreamAlias("TimeInGame")
    public String timeInGame;
    
    @XStreamAsAttribute
    @XStreamAlias("ScoreHome")
    public int scoreHome;
    
    @XStreamAsAttribute
    @XStreamAlias("ScoreAway")
    public int scoreAway;

    @XStreamAsAttribute
    @XStreamAlias("ScoreHomeHT")
    public int scoreHomeHt;
    
    @XStreamAsAttribute
    @XStreamAlias("ScoreAwayHT")
    public int scoreAwayHt;
    
    @XStreamAlias("Markets")
    public Set<Market> markets;
    
    @XStreamAlias("TennisScore")
    public TennisScore tennisScore;
}
