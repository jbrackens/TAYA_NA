package tech.argyll.gmx.datacollector.common.camel;

import javax.servlet.ServletRequest;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Message;

@Slf4j
@AllArgsConstructor
public class LogRequestHeaderProcessor extends AbstractHeaderProcessor {

  final HeaderHelper headers;

  @Override
  protected void doProcess(Exchange exchange) throws Exception {
    Message in = exchange.getIn();

    String remoteAddress = headers.getForwardedFor(in);
    if (remoteAddress == null) {
      ServletRequest request = headers.getRequest(in);
      remoteAddress = request.getRemoteAddr();
    }

    String fileName = headers.getFileName(in);

    log.info("Received call from IP '{}', with file '{}'", remoteAddress, fileName);
  }
}
