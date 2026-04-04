package tech.argyll.video.datafeed.oddsfeed.markets.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Line {
  private String lineID;
  private Long lineIntID;
  private Long lineGroupID;
}
