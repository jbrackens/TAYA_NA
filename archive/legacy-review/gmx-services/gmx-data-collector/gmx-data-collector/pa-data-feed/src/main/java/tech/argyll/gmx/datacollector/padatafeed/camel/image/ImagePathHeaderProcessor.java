package tech.argyll.gmx.datacollector.padatafeed.camel.image;

import java.time.LocalDate;
import java.time.ZoneId;
import lombok.AllArgsConstructor;
import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.springframework.stereotype.Component;
import tech.argyll.gmx.datacollector.common.assets.AssetsURLBuilder;
import tech.argyll.gmx.datacollector.common.camel.AbstractHeaderProcessor;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;

@AllArgsConstructor
@Component
public class ImagePathHeaderProcessor extends AbstractHeaderProcessor {

  private final HeaderHelper headers;
  private final AssetsURLBuilder urlBuilder;

  @Override
  protected void doProcess(Exchange exchange) throws Exception {
    Message in = exchange.getIn();

    LocalDate fileDate = headers.getFileDate(in);

    headers.setImageStoragePath(exchange.getOut(), buildPath(fileDate));
  }

  protected String buildPath(LocalDate fileDate) {
    return urlBuilder.buildHorseRacingSilkPath(fileDate.atStartOfDay(ZoneId.of("GMT")));
  }
}
