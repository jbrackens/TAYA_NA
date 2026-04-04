package tech.argyll.gmx.datacollector.common.camel;

import static org.mockito.Mockito.mock;

import org.apache.camel.CamelContext;
import org.apache.camel.Endpoint;
import org.apache.camel.Processor;
import org.apache.camel.builder.AdviceWithRouteBuilder;
import org.apache.camel.model.RouteDefinition;

public interface MockHelper {

  CamelContext getCamelContext();

  default RouteDefinition replaceEndpointWith(String routeId, String stepId, Endpoint replacement) throws Exception {
    return getCamelContext().getRouteDefinition(routeId)
        .adviceWith(getCamelContext(), new AdviceWithRouteBuilder() {
          @Override
          public void configure() throws Exception {
            weaveById(stepId).replace().to(replacement);
          }
        });
  }


  default Processor mockProcessor(String routeId, String stepId) throws Exception {
    Processor processorMock = mock(Processor.class);

    getCamelContext().getRouteDefinition(routeId)
        .adviceWith(getCamelContext(), new AdviceWithRouteBuilder() {
          @Override
          public void configure() throws Exception {
            weaveById(stepId).replace().process(processorMock);
          }
        });

    return processorMock;
  }


  default Processor addMockAfter(String routeId, String stepId) throws Exception {
    Processor processorMock = mock(Processor.class);

    getCamelContext().getRouteDefinition(routeId)
        .adviceWith(getCamelContext(),
            new AdviceWithRouteBuilder() {
              @Override
              public void configure() throws Exception {
                weaveById(stepId).after().transform(constant("")).process(processorMock);
              }
            });
    return processorMock;
  }

}
