package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public enum LiveOption {
  PRE_LIVE((byte) 0),
  LIVE((byte) 1),
  BOTH(null);

  private final Byte value;

  @JsonValue
  public Byte getValue() {
    return value;
  }
}
