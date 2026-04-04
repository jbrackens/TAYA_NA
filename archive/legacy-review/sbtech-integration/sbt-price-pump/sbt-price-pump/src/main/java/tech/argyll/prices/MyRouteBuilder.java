package tech.argyll.prices;

import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.converters.basic.DateConverter;
import com.thoughtworks.xstream.io.naming.NoNameCoder;
import com.thoughtworks.xstream.io.xml.DomDriver;
import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.Processor;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.component.file.FileComponent;
import org.postgresql.translation.messages_bg;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tech.argyll.prices.domain.Event;
import tech.argyll.prices.domain.Events;
import tech.argyll.prices.domain.MoneyLine;
import tech.argyll.prices.domain.Odds;
import tech.argyll.prices.domain.Participant;
import tech.argyll.prices.domain.Participants;
import tech.argyll.prices.domain.Price;
import tech.argyll.prices.domain.Spread;
import tech.argyll.prices.domain.Total;
import tech.argyll.prices.models.EventModel;
import tech.argyll.prices.models.MarketModel;

/**
 * A Camel Java8 DSL Router
 */
public class MyRouteBuilder extends RouteBuilder {

    /**
     * Let's configure the Camel routing rules using Java code...
     */
    public void configure() {

        from("timer://foo?fixedRate=true&delay=0&period=60000")
        .log("ticking")
        .to("http4://redzonesportsxml.staging.sbtech.com/lines.aspx?BranchID=1&OddsStyle=DECIMAL&EventType=0&EventType=157&EventType=158&IncludeLinesIDs=true")
//        .setHeader("CamelFileName", () -> "message.html")
//        .to("file:target/google");
        .log("retrieved")
        .process(new FootballParser());
    }
    
    public static class FootballParser implements Processor {
        
        private static final Logger log = LoggerFactory.getLogger(FootballParser.class);
        
        private XStream x;
        
        private XStream x() {
            if (x == null) {
                x = new XStream(new DomDriver("UTF-8", new NoNameCoder()));
                x.registerConverter(new DateConverter("dd/MM/yyyy HH:mm:ss", new String[0]));
                x.processAnnotations(Events.class);
                x.alias("Participant", Participant.class);
                x.alias("Participant1", Participant.class);
                x.alias("Participant2", Participant.class);
                
                x.allowTypes(new Class[]{Events.class, Event.class, MoneyLine.class, Odds.class, Participant.class, Participants.class, Price.class, Spread.class, Total.class});
            }
            
            return x;
        }
        
        private EventModel eventForId(long id) {
            EventModel event = EventModel.find.byId(id);
            
            if (event == null && id > 0) {
                log.info("no event for id {} - creating a new one", id);
                event = new EventModel();
                event.setId(id);
                event.save();
            }
            
            return event;
        }

        @Override
        public void process(Exchange ex) throws Exception {
            String s = ex.getIn().getBody(String.class);
            
            Events events = (Events)x().fromXML(s);
            
            log.info("{} markets", events.events.size());
            
            Map<Long, List<Event>> marketsByEventId = events.events.stream().collect(Collectors.groupingBy(event -> event.meid));
            
            log.info("{} events", marketsByEventId.size());
            
            marketsByEventId.forEach((k, v) -> {
                EventModel event = eventForId(k);
                
                if (event != null) {
                    v.forEach(e -> {
                        MarketModel market = MarketModel.find.byId(e.id);
                        
                        if (market == null) {
                            market = new MarketModel();
                            market.setId(e.id);
                            market.save();
                            
                            event.getMarkets().add(market);
                            market.setEvent(event);
                            market.setMarketType(e.eventType);
                            
                            event.update();
                        }
                    });
                }               
            });
        }       
    }
}
