package tech.argyll.video.datafeed.oddsfeed.leagues;

import static tech.argyll.video.common.LoggerUtils.kvCount;

import com.google.inject.assistedinject.Assisted;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.common.http.GetMethodCall;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedGetOperation;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedParser;
import tech.argyll.video.datafeed.oddsfeed.leagues.model.LeagueDict;

@Slf4j
public class SyncLeaguesOperation extends OddsFeedGetOperation {

  @Getter private final String operation = "leagues";

  private final OddsFeedParser parser;

  private final LeagueUpdater leagueUpdater;

  @Inject
  public SyncLeaguesOperation(
      @Assisted SBTechOperatorType operator,
      GetMethodCall getMethodCall,
      OddsFeedParser parser,
      LeagueUpdater leagueUpdater) {
    super(operator, getMethodCall);
    this.parser = parser;
    this.leagueUpdater = leagueUpdater;
  }

  @Override
  protected void processResponse(InputStream inputStream) {
    try {
      GetLeaguesResponse getCountriesResponse =
          parser.parseResponse(inputStream, GetLeaguesResponse.class);

      List<LeagueDict> leagues =
          getCountriesResponse.getSports().stream()
              .flatMap(s -> s.getLeagues().stream())
              .collect(Collectors.toList());
      log.info("Loaded leagues - {}", kvCount((long) leagues.size()));

      leagueUpdater.updateDict(getCountriesResponse.getSports(), operator);
    } catch (IOException e) {
      log.error("Error parsing response", e);
    }
  }
}
