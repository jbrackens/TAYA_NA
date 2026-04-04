package com.argyll.sbtech.domain;

import static org.fest.assertions.Assertions.assertThat;

import com.argyll.domain.Price;
import com.argyll.domain.Prices;
import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.converters.basic.DateConverter;
import com.thoughtworks.xstream.io.naming.NoNameCoder;
import com.thoughtworks.xstream.io.xml.DomDriver;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testng.annotations.Test;

public class EventsTest {
    
    final static Logger log = LoggerFactory.getLogger(EventsTest.class);
    
    @Test
    public void f() throws Exception {
        String input = IOUtils.toString(EventsTest.class.getResourceAsStream("/odds-example.xml"), "utf-8");
        
        XStream xstream = new XStream(new DomDriver("UTF-8", new NoNameCoder()));
        xstream.registerConverter(new DateConverter("yyyy-MM-dd'T'HH:mm:ss", null));
        xstream.registerConverter(new PriceConverter(Price.Type.AMERICAN));
        xstream.processAnnotations(Events.class);
        xstream.alias("Sets", TennisSet.class);
        xstream.alias("Set1", TennisSet.class);
        xstream.alias("Set2", TennisSet.class);
        xstream.alias("Set3", TennisSet.class);
        
        Events events = (Events) xstream.fromXML(input);
        
        assertThat(events.sports).hasSize(8);
        assertThat(events.leagues).hasSize(41);
        assertThat(events.events).hasSize(80);
        
        for (Event event : events.events) {
            if (event.branchId == 1) {
                log.info("event -> {} vs {}", event.home, event.away);
                
                for (Market market : event.markets) {
                    if (market.moneyline != null) {
                        log.info("moneyline -> 1 = {} x = {} 2 = {}", market.moneyline.home, market.moneyline.draw, market.moneyline.away); 
                    }
                }
            }
        }
    }
}
