package com.argyll.sbtech;

import java.util.concurrent.CompletionStage;

import akka.NotUsed;
import akka.actor.AbstractActor;
import akka.actor.ActorSystem;
import akka.actor.Props;
import akka.http.javadsl.ConnectHttp;
import akka.http.javadsl.Http;
import akka.http.javadsl.ServerBinding;
import akka.http.javadsl.model.HttpRequest;
import akka.http.javadsl.model.HttpResponse;
import akka.http.javadsl.server.AllDirectives;
import akka.http.javadsl.server.Route;
import akka.http.javadsl.unmarshalling.Unmarshaller;
import akka.japi.pf.ReceiveBuilder;
import akka.stream.ActorMaterializer;
import akka.stream.javadsl.Flow;
import com.argyll.sbtech.domain.Event;
import com.argyll.sbtech.domain.Events;
import com.argyll.sbtech.domain.Market;
import com.argyll.sbtech.domain.Parser;
import com.argyll.sbtech.domain.SBTechXmlParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PricesServer extends AllDirectives {

    public static void main(String[] args) throws Exception {
        // boot up server using the route as defined below
        ActorSystem system = ActorSystem.create("routes");

        final Http http = Http.get(system);
        final ActorMaterializer materializer = ActorMaterializer.create(system);

        // In order to access all directives we need an instance where the
        // routes are define.
        PricesServer app = new PricesServer(system);

        final Flow<HttpRequest, HttpResponse, NotUsed> routeFlow = app.createRoute().flow(system, materializer);
        final CompletionStage<ServerBinding> binding = http.bindAndHandle(routeFlow, ConnectHttp.toHost("localhost", 8080), materializer);

        System.out.println("Server online at http://localhost:8080/\nPress RETURN to stop...");
        System.in.read(); // let it run until user presses return

        binding.thenCompose(ServerBinding::unbind)         // trigger unbinding from the port
               .thenAccept(unbound -> system.terminate()); // and shutdown when done
    }
    
    final ActorSystem system;
    
    public PricesServer(ActorSystem system) {
        this.system = system;
    }

    private Route createRoute() {
        
        return route(
          post(() ->
            path("", () ->
              entity(Unmarshaller.entityToString(), str -> {
                  system.actorOf(PricesParsingActor.props(), "parser").tell(new PricesParsingActor.Parse(str), null);
                  return complete("OK");
              }))));
    }
    
    public static class PricesParsingActor extends AbstractActor {
        
        final static Logger log = LoggerFactory.getLogger(PricesParsingActor.class);
        
        public static class Parse {
            
            final String data;
            
            public Parse(String data) {
                this.data = data;
            }
            
            public String getData() {
                return data;
            }
        }
        
        public static Props props() {
            return Props.create(PricesParsingActor.class, () -> new PricesParsingActor());
        }
        
        final Parser parser;
        
        public PricesParsingActor() {
            parser = new SBTechXmlParser();
            
            receive(ReceiveBuilder.match(Parse.class, m -> parse(m.getData())).matchAny(o -> log.info("received unknown message -> {}", o)).build());
        }
        
        public void parse(String data) {
            Events events = parser.parse(data);
            
            log.info("events => {}", events);
            
            events.events.forEach(event -> context().actorOf(EventMonitoringActor.props(), event.branchId + "-" + event.leagueId + "-" + event.id).tell(new EventMonitoringActor.MonitorEvent(event), self()));
        }
    }
    
    public static class EventMonitoringActor extends AbstractActor {
        
        public static class MonitorEvent {
            
            final Event event;
            
            public MonitorEvent(Event event) {
                this.event = event;
            }
            
            public Event getEvent() {
                return event;
            }
        }
        
        final static Logger log = LoggerFactory.getLogger(EventMonitoringActor.class);
        
        public static Props props() {
            return Props.create(EventMonitoringActor.class, () -> new EventMonitoringActor());
        }
        
        public EventMonitoringActor() {
            receive(ReceiveBuilder.match(MonitorEvent.class, m -> monitor(m.getEvent())).matchAny(o -> log.info("received unknown message {}", o)).build());
        }
        
        public void monitor(Event event) {
            event.markets.forEach(market -> context().actorOf(MarketMonitoringActor.props(), String.valueOf(market.id)).tell(new MarketMonitoringActor.MonitorMarket(market), self()));
        }
    }
    
    public static class MarketMonitoringActor extends AbstractActor {
        
        public static class MonitorMarket {
            
            final Market market;
            
            public MonitorMarket(Market market) {
                this.market = market;
            }
            
            public Market getMarket() {
                return market;
            }
        }
        
        final static Logger log = LoggerFactory.getLogger(MarketMonitoringActor.class);
        
        public static Props props() {
            return Props.create(MarketMonitoringActor.class, () -> new MarketMonitoringActor());
        }
        
        public MarketMonitoringActor() {
            receive(ReceiveBuilder.match(MonitorMarket.class, m -> monitor(m.getMarket())).matchAny(o -> log.info("received unknown message {}", o)).build());
        }
        
        public void monitor(Market market) {
            log.info("monitoring {}", market);
        }
    }
}
