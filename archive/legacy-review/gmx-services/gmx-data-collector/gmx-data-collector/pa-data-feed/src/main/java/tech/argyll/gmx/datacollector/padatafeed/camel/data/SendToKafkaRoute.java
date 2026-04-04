package tech.argyll.gmx.datacollector.padatafeed.camel.data;

import static org.apache.camel.LoggingLevel.DEBUG;

import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Endpoint;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SendToKafkaRoute extends RouteBuilder {

  public static final String ROUTE_ID = "SendToKafkaRoute";
  public static final String ENTRY_URI = "direct:SendToKafkaRoute";

  public static final String ENDPOINT_ID = "pipelineKafkaEndpoint";

  private final Endpoint storeKafkaEndpoint;

  public SendToKafkaRoute(@Qualifier("pipelineKafkaEndpoint") Endpoint storeKafkaEndpoint) {
    this.storeKafkaEndpoint = storeKafkaEndpoint;
  }

  // TODO Work In Progress
  @Override
  public void configure() throws Exception {
    // @formatter:off
    from(ENTRY_URI)
        .routeId(ROUTE_ID)
        .to(storeKafkaEndpoint).id(ENDPOINT_ID)
        .log(DEBUG, log.getName(), "### Kafka headers: ${headers}");
    // @formatter:on
  }
}
