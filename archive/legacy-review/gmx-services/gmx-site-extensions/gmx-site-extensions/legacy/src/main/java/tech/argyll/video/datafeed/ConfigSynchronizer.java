package tech.argyll.video.datafeed;

import javax.inject.Inject;
import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.config.OddsJSONFeedOperationFactory;

public class ConfigSynchronizer {

  private final OddsJSONFeedOperationFactory oddsJSONFeedOperationFactory;
  private final SBTechOperatorType operatorType;

  @Inject
  public ConfigSynchronizer(OddsJSONFeedOperationFactory oddsJSONFeedOperationFactory, SBTechOperatorType operatorType) {
    this.oddsJSONFeedOperationFactory = oddsJSONFeedOperationFactory;
    this.operatorType = operatorType;
  }

  public void syncSBTechConfig() {
    // TODO (GM-1751): should we deprecate MarketType checks?
    oddsJSONFeedOperationFactory.createCheckMarketTypesOperation(operatorType).run();
    // TODO (GM-1751): load countries from SD api?
    oddsJSONFeedOperationFactory.createCacheCountriesOperation(operatorType).run();
  }
}
