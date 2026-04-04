package tech.argyll.gmx.datacollector.common.camel;

import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;

@Slf4j
public abstract class AbstractHeaderProcessor implements Processor {

  @Override
  public final void process(Exchange exchange) throws Exception {
    // We need to copy over the existing body and headers.
    exchange.getOut().setBody(exchange.getIn().getBody());
    exchange.getOut().setHeaders(exchange.getIn().getHeaders());

    // Now we can manipulate what's there in the 'out' message.
    doProcess(exchange);
  }

  protected abstract void doProcess(Exchange exchange) throws Exception;
}
