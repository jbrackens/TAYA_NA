package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.annotation.JsonValue;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public enum MainOption {
  MAIN((byte) 0),
  OPTION((byte) 1),
  BOTH(null);

  private final Byte value;

  @JsonValue
  public Byte getValue() {
    return value;
  }
}
