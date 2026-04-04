package tech.argyll.video.datafeed.oddsfeed.markettypes;

import java.util.List;
import lombok.Data;
import tech.argyll.video.datafeed.oddsfeed.AbstractResponse;
import tech.argyll.video.datafeed.oddsfeed.markettypes.model.MarketTypeDict;

@Data
public class GetMarketTypesResponse extends AbstractResponse {
  private List<MarketTypeDict> marketTypes;
}
