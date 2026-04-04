package tech.argyll.video.datafeed.oddsfeed.leagues.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Wither;

@Data
@Wither
@NoArgsConstructor
@AllArgsConstructor
public class LeagueDict {
  private Long leagueID;
  private String LeagueName;
  private Long countryID;
}