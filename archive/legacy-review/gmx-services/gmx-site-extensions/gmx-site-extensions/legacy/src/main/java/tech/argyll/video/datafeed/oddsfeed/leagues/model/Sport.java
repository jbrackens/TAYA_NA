package tech.argyll.video.datafeed.oddsfeed.leagues.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sport {
  private Long sportID;
  private List<LeagueDict> leagues;
}
