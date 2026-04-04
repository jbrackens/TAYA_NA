package tech.argyll.gmx.datacollector.common.camel;

import lombok.AllArgsConstructor;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;

@AllArgsConstructor
public class SetHeaderProcessor implements Processor {

  final String headerName;

  final Object headerValue;

  @Override
  public void process(Exchange exchange) throws Exception {
    exchange.getOut().setHeader(headerName, headerValue);
  }
}
