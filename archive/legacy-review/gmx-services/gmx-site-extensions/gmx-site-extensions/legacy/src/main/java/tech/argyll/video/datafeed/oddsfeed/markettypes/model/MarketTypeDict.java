package tech.argyll.video.datafeed.oddsfeed.markettypes.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Wither;

@Data
@Wither
@NoArgsConstructor
@AllArgsConstructor
public class MarketTypeDict {
  private long marketTypeID;
  private String marketTypeName;
  private String eventTypeName;
  private String lineTypeName;
  private long eventTypeID;
  private long lineTypeID;
  private byte isQA;

  public boolean isQA() {
    return isQA == 1;
  }
}
