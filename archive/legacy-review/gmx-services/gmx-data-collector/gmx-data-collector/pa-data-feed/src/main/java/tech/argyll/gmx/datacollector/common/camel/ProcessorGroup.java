package tech.argyll.gmx.datacollector.common.camel;

import java.util.Collection;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;

@Slf4j
@AllArgsConstructor
public class ProcessorGroup extends AbstractHeaderProcessor {

  final Collection<Processor> processors;

  @Override
  public void doProcess(Exchange exchange) throws Exception {
    // Now we can manipulate what's there in the 'out' message.
    for (Processor processor : processors) {
      processor.process(exchange);
    }
  }
}
