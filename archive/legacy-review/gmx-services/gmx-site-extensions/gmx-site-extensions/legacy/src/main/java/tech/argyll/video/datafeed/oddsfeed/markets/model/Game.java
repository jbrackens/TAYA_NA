package tech.argyll.video.datafeed.oddsfeed.markets.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Game {
  private Long gameID;
  private Byte gameType;
  private List<Market> markets;
}
