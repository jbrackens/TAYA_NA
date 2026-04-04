package tech.argyll.video.datafeed.oddsfeed.markettypes;

import static tech.argyll.video.common.LoggerUtils.kvCount;

import com.google.inject.assistedinject.Assisted;
import java.io.IOException;
import java.io.InputStream;
import javax.inject.Inject;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.common.http.GetMethodCall;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedGetOperation;
import tech.argyll.video.datafeed.oddsfeed.OddsFeedParser;

@Slf4j
public class CheckMarketTypesOperation extends OddsFeedGetOperation {

  @Getter private final String operation = "markettypes";

  private final OddsFeedParser parser;

  private final MarketTypeCheck marketTypeCheck;

  @Inject
  public CheckMarketTypesOperation(
      @Assisted SBTechOperatorType operator,
      GetMethodCall getMethodCall,
      OddsFeedParser parser,
      MarketTypeCheck marketTypeCheck) {
    super(operator, getMethodCall);
    this.parser = parser;
    this.marketTypeCheck = marketTypeCheck;
  }

  @Override
  protected void processResponse(InputStream inputStream) {
    try {
      GetMarketTypesResponse getMarketsResponse =
          parser.parseResponse(inputStream, GetMarketTypesResponse.class);

      log.info("Loaded market types - {}", kvCount((long) getMarketsResponse.getMarketTypes().size()));

      marketTypeCheck.execute(getMarketsResponse.getMarketTypes());
    } catch (IOException e) {
      log.error("Error parsing response", e);
    }
  }
}
