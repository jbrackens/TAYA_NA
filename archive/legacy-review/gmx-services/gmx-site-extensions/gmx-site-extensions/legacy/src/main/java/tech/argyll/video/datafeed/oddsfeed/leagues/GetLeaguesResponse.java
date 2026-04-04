package tech.argyll.video.datafeed.oddsfeed.leagues;

import java.util.List;
import lombok.Data;
import tech.argyll.video.datafeed.oddsfeed.AbstractResponse;
import tech.argyll.video.datafeed.oddsfeed.leagues.model.Sport;

@Data
public class GetLeaguesResponse extends AbstractResponse {
  private List<Sport> sports;
}
