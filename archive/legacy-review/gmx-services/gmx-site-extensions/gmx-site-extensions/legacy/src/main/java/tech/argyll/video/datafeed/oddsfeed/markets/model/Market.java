package tech.argyll.video.datafeed.oddsfeed.markets.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Market {
  private Long marketTypeID;
  private List<Line> lines;
}
