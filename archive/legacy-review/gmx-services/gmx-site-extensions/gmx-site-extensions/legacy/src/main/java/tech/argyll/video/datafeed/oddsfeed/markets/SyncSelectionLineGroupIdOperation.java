package tech.argyll.video.datafeed.oddsfeed.markets;

import static tech.argyll.video.common.LoggerUtils.kvCount;
import static tech.argyll.video.datafeed.oddsfeed.LiveOption.PRE_LIVE;
import static tech.argyll.video.datafeed.oddsfeed.MainOption.MAIN;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.inject.assistedinject.Assisted;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import tech.argyll.video.common.http.PostMethodCall;
import tech.argyll.video.core.sbtech.SBTechBranchType;
import tech.argyll.video.core.sbtech.SBTechMarketType;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.MarketTypeRef;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedParser;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedPostOperation;
import tech.argyll.video.datafeed.oddsfeed.SportRef;

@Slf4j
public class SyncSelectionLineGroupIdOperation extends OddsFeedPostOperation {

  @Getter private final String operation = "markets";

  private final GetMarketsCriteria criteria;

  private final OddsFeedParser parser;

  private final SelectionUpdater selectionUpdater;

  @Inject
  public SyncSelectionLineGroupIdOperation(
      @Assisted SBTechOperatorType operator,
      PostMethodCall postMethodCall,
      OddsFeedParser parser,
      SelectionUpdater selectionUpdater) {
    super(operator, postMethodCall);
    this.criteria = initializeCriteria();
    this.parser = parser;
    this.selectionUpdater = selectionUpdater;
  }

  private GetMarketsCriteria initializeCriteria() {
    return new GetMarketsCriteria(
        null,
        MAIN,
        PRE_LIVE,
        false,
        Arrays.stream(SBTechMarketType.values())
            .map(m -> new MarketTypeRef(m.getSbtechId()))
            .collect(Collectors.toList()),
        Arrays.stream(SBTechBranchType.values())
            .map(branchType -> new SportRef(branchType.getSbtechId()))
            .collect(Collectors.toList()));
  }

  @Override
  protected HttpEntity prepareRequest() throws JsonProcessingException {
    GetMarketsCriteria currentTimeQuery =
        criteria.withTimeFilterToDate(LocalDate.now().plusDays(4));
    return parser.prepareRequest(currentTimeQuery);
  }

  @Override
  protected void processResponse(InputStream inputStream) {
    try {
      GetMarketsResponse getMarketsResponse =
          parser.parseResponse(inputStream, GetMarketsResponse.class);
      log.info(
          "Loaded games - {}",
          kvCount(
              getMarketsResponse.getSports().stream()
                  .flatMap(s -> s.getLeagues().stream())
                  .mapToLong(l -> l.getGames().size())
                  .sum()));

      selectionUpdater.updateLineGroupId(getMarketsResponse.getSports(), operator);
    } catch (IOException e) {
      log.error("Error parsing response", e);
    }
  }
}
