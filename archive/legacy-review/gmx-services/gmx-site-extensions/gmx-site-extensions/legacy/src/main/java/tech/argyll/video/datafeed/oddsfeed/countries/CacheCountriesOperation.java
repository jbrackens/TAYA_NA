package tech.argyll.video.datafeed.oddsfeed.countries;

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
public class CacheCountriesOperation extends OddsFeedGetOperation {

  @Getter private final String operation = "countries";

  private final OddsFeedParser parser;

  private final CountriesCache countriesCache;

  @Inject
  public CacheCountriesOperation(
      @Assisted SBTechOperatorType operator,
      GetMethodCall getMethodCall,
      OddsFeedParser parser,
      CountriesCache countriesCache) {
    super(operator, getMethodCall);
    this.parser = parser;
    this.countriesCache = countriesCache;
  }

  @Override
  protected void processResponse(InputStream inputStream) {
    try {
      GetCountriesResponse getCountriesResponse =
          parser.parseResponse(inputStream, GetCountriesResponse.class);

      log.info("Loaded countries - {}", kvCount((long) getCountriesResponse.getCountries().size()));

      countriesCache.build(getCountriesResponse.getCountries());
    } catch (IOException e) {
      log.error("Error parsing response", e);
    }
  }
}
