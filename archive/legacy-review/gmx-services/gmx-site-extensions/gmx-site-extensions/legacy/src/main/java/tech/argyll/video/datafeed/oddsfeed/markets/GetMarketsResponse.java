package tech.argyll.video.datafeed.oddsfeed.markets;

import java.util.List;
import lombok.Data;
import tech.argyll.video.datafeed.oddsfeed.AbstractResponse;
import tech.argyll.video.datafeed.oddsfeed.markets.model.Sport;

@Data
public class GetMarketsResponse extends AbstractResponse {
  private List<Sport> sports;
}
