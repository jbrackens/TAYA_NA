package tech.argyll.gmx.datacollector.padatafeed.camel.data;

import static org.apache.camel.LoggingLevel.INFO;
import static org.apache.camel.LoggingLevel.WARN;

import lombok.extern.slf4j.Slf4j;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.builder.xml.Namespaces;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.padatafeed.camel.image.ExtractImagesRoute;

@Slf4j
@Component
public class ProcessDataRoute extends RouteBuilder {

  public static final String ROUTE_ID = "ProcessDataRoute";
  public static final String ENTRY_URI = "seda:ProcessDataRoute";

  @Override
  public void configure() throws Exception {
    // @formatter:off
    from(ENTRY_URI + "?concurrentConsumers=10")
        .routeId(ROUTE_ID)
        .log(INFO, log.getName(),"Processing file: '${headers.CustomFileName}' type: '${headers.CustomFileType}' date '${headers.CustomFileDate}'")
        .choice()

          .when(simple("${headers['CustomFileType']} == ${type:tech.argyll.gmx.datacollector.padatafeed.FileType.RACE_CARD}"))
            .split().xtokenize("//Race", 'w', new Namespaces("", ""))
                .streaming()
                .to(SendToKafkaRoute.ENTRY_URI)
                .endChoice()

          .when(simple("${headers['CustomFileType']} == ${type:tech.argyll.gmx.datacollector.padatafeed.FileType.BETTING}"))
            .to(SendToKafkaRoute.ENTRY_URI)
            .endChoice()

          .when(simple("${headers['CustomFileType']} == ${type:tech.argyll.gmx.datacollector.padatafeed.FileType.SILK}"))
            .to(ExtractImagesRoute.ENTRY_URI)
            .endChoice()

          .otherwise()
            .log(WARN, log.getName(),"Not processing message - unknown fileType:'${headers.CustomFileType}'")
        .end();
    // @formatter:on
  }
}
