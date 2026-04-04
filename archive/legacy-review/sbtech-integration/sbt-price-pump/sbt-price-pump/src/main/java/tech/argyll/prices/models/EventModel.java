package tech.argyll.prices.models;

import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;

import io.ebean.Finder;
import io.ebean.Model;

@Entity
@Table(name = "events")
public class EventModel extends Model {
    
    public static Finder<Long, EventModel> find = new Finder<>(EventModel.class);

    @Id
    @GeneratedValue
    private long id;
    
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL)
    private Set<MarketModel> markets;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Set<MarketModel> getMarkets() {
        return markets;
    }

    public void setMarkets(Set<MarketModel> markets) {
        this.markets = markets;
    }
}
