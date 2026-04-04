package tech.argyll.gmx.datacollector.padatafeed.camel.intake;

import static org.apache.camel.LoggingLevel.DEBUG;

import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Endpoint;
import org.apache.camel.Processor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

// TODO can be extracted as a reusable route for S3/local storage for other connectors
@Component
@Slf4j
public class StoreIntakeRoute extends RouteBuilder {

  public static final String ROUTE_ID = "StoreIntakeRoute";
  public static final String ENTRY_URI = "seda:StoreIntakeRoute";

  public static final String ENDPOINT_ID = "storeIntakeEndpoint";

  private final Processor intakeStorageProcessorGroup;
  private final Endpoint storeIntakeEndpoint;

  public StoreIntakeRoute(@Qualifier("intakeStorageProcessorGroup") Processor intakeStorageProcessorGroup,
      @Qualifier("storeIntakeEndpoint") Endpoint storeIntakeEndpoint) {
    this.intakeStorageProcessorGroup = intakeStorageProcessorGroup;
    this.storeIntakeEndpoint = storeIntakeEndpoint;
  }

  public void configure() {
    // @formatter:off
    from(ENTRY_URI)
        .routeId(ROUTE_ID)
        .to("dataformat:gzip:marshal")
        .process(intakeStorageProcessorGroup)
        .log(DEBUG, log.getName(), String.format("### Store file in: %s", storeIntakeEndpoint.getEndpointUri()))
        .to(storeIntakeEndpoint).id(ENDPOINT_ID)
        .end();
    // @formatter:on
  }
}
