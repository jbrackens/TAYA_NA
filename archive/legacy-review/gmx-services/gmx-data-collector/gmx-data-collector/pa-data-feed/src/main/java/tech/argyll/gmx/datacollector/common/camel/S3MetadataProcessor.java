package tech.argyll.gmx.datacollector.common.camel;

import java.util.HashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.commons.lang3.StringUtils;

@Slf4j
@AllArgsConstructor
public class S3MetadataProcessor implements Processor {

  final String metadataHeaderName;

  @Override
  public void process(Exchange exchange) throws Exception {
    exchange.getOut().setHeader(metadataHeaderName, metadata(exchange.getIn().getHeaders()));
  }

  protected Map<String, String> metadata(Map<String, Object> headers) {
    Map<String, String> metadata = new HashMap<>();

    headers.forEach(
        (k, v) -> {
          if (StringUtils.startsWithIgnoreCase(k, "x-meta-")) {
            metadata.put(StringUtils.substringAfter(k.toLowerCase(), "x-meta-"), String.valueOf(v));
          }
        });

    return metadata;
  }
}
