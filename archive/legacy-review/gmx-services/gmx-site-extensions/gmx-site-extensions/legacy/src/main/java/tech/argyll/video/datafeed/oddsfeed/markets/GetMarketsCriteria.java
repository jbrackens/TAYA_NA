package tech.argyll.video.datafeed.oddsfeed.markets;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;
import lombok.Value;
import lombok.experimental.Wither;
import tech.argyll.video.datafeed.oddsfeed.LiveOption;
import tech.argyll.video.datafeed.oddsfeed.MainOption;
import tech.argyll.video.datafeed.oddsfeed.MarketTypeRef;
import tech.argyll.video.datafeed.oddsfeed.SportRef;

@Value
public class GetMarketsCriteria {
  @Wither private LocalDate timeFilterToDate;
  private MainOption isOption;
  private LiveOption isLive;
  private boolean includeEachWay;
  private List<MarketTypeRef> marketTypes;
  private List<SportRef> sports;

  @JsonProperty("IncludeEachWay")
  public Byte convertIncludeEachWay() {
    return (byte) (includeEachWay ? 1 : 0);
  }
}
