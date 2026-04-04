package tech.argyll.gmx.datacollector.padatafeed.camel.intake;

import java.time.LocalDate;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;
import tech.argyll.gmx.datacollector.padatafeed.S3NamingStrategy;

@Slf4j
@Component
public class PrepareIntakeStorageProcessor implements Processor {

  private final HeaderHelper headers;
  private final String keyHeaderName;
  private final S3NamingStrategy s3NamingStrategy;

  public PrepareIntakeStorageProcessor(HeaderHelper headers, @Value("${app.storage.headers.key}") String keyHeaderName,
      S3NamingStrategy s3NamingStrategy) {
    this.headers = headers;
    this.keyHeaderName = keyHeaderName;
    this.s3NamingStrategy = s3NamingStrategy;
  }

  @Override
  public void process(Exchange exchange) throws Exception {
    Message in = exchange.getIn();

    String fileName = headers.getFileName(in);
    LocalDate fileDate = headers.getFileDate(in);

    exchange.getOut().setHeader(keyHeaderName, s3NamingStrategy.buildStoragePath(fileDate, fileName));
  }
}
