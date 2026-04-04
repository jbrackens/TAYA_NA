package tech.argyll.gmx.datacollector.common.camel;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;

@Slf4j
@AllArgsConstructor
public class S3ContentLengthProcessor implements Processor {

  final String headerName;

  @Override
  public void process(Exchange exchange) throws Exception {
    int length = exchange.getIn().getBody(String.class).length();

    exchange.getOut().setHeader(headerName, length);
  }
}
