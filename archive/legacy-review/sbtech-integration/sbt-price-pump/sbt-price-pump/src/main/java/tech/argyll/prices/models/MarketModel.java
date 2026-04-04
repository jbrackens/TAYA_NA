package tech.argyll.prices.models;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

import io.ebean.Finder;
import io.ebean.Model;

@Entity
@Table(name = "markets")
public class MarketModel extends Model {
    
    public static Finder<Long, MarketModel> find = new Finder<>(MarketModel.class);

    @Id
    @GeneratedValue
    private long id;
    
    @ManyToOne
    private EventModel event;
    
    private int marketType;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public EventModel getEvent() {
        return event;
    }

    public void setEvent(EventModel event) {
        this.event = event;
    }

    public int getMarketType() {
        return marketType;
    }

    public void setMarketType(int marketType) {
        this.marketType = marketType;
    }
}
