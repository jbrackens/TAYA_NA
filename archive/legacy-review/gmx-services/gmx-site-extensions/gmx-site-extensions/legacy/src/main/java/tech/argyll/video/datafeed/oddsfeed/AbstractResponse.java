package tech.argyll.video.datafeed.oddsfeed;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public abstract class AbstractResponse {
  @JsonProperty("code")
  private Integer code;

  private String message;
}
