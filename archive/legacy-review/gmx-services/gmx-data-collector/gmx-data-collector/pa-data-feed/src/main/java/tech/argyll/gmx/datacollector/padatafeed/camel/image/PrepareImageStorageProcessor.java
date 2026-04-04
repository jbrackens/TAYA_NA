package tech.argyll.gmx.datacollector.padatafeed.camel.image;

import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;

@Component
public class PrepareImageStorageProcessor implements Processor {

  private final HeaderHelper headers;
  private final String keyHeaderName;

  public PrepareImageStorageProcessor(
      HeaderHelper headers, @Value("${app.storage.headers.key}") String keyHeaderName) {
    this.headers = headers;
    this.keyHeaderName = keyHeaderName;
  }

  @Override
  public void process(Exchange exchange) throws Exception {
    Message in = exchange.getIn();

    String storagePath = headers.getImageStoragePath(in);
    String tarEntryName = headers.getTarEntryName(in);

    exchange.getOut().setHeader(keyHeaderName, buildPath(storagePath, tarEntryName));
  }

  protected String buildPath(String storagePath, String tarEntryName) {
    String fileName = tarEntryName;
    int fileNameStart = tarEntryName.lastIndexOf("/");
    if (fileNameStart > -1) {
      fileName = tarEntryName.substring(fileNameStart + 1);
    }

    return String.format("%s/%s", storagePath, fileName);
  }
}
