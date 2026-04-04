package tech.argyll.gmx.datacollector.padatafeed.camel;

import lombok.AllArgsConstructor;
import org.apache.camel.builder.RouteBuilder;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.common.camel.LogRequestHeaderProcessor;
import tech.argyll.gmx.datacollector.padatafeed.camel.data.ProcessDataRoute;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.DecodeFilenameHeaderProcessor;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.StoreIntakeRoute;

@AllArgsConstructor
@Component
public class MainRoute extends RouteBuilder {

  public static final String ROUTE_ID = "MainRoute";

  private final DecodeFilenameHeaderProcessor decodeFilenameHeaderProcessor;
  private final LogRequestHeaderProcessor logRequestHeaderProcessor;

  public void configure() {
    // @formatter:off
    from("servlet:///?httpMethodRestrict=POST&matchOnUriPrefix=true")
        .routeId(ROUTE_ID)
        .choice()
          .when(simple("${in.body.length()} > 0"))
            .process(decodeFilenameHeaderProcessor)
            .process(logRequestHeaderProcessor)
            .wireTap(StoreIntakeRoute.ENTRY_URI)
            .wireTap(ProcessDataRoute.ENTRY_URI)
            .transform(constant("message received,thank you!"))
            .endChoice()
          .otherwise()
            .transform(constant("(-(-_(-_-)_-)-)"));
    // @formatter:on
  }
}