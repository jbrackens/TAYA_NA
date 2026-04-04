package tech.argyll.video.datafeed.config;

import tech.argyll.video.core.sbtech.SBTechOperatorType;
import tech.argyll.video.datafeed.oddsfeed.countries.CacheCountriesOperation;
import tech.argyll.video.datafeed.oddsfeed.leagues.SyncLeaguesOperation;
import tech.argyll.video.datafeed.oddsfeed.markets.SyncSelectionLineGroupIdOperation;
import tech.argyll.video.datafeed.oddsfeed.markettypes.CheckMarketTypesOperation;

public interface OddsJSONFeedOperationFactory {
  CacheCountriesOperation createCacheCountriesOperation(SBTechOperatorType operator);

  CheckMarketTypesOperation createCheckMarketTypesOperation(SBTechOperatorType operator);

  SyncLeaguesOperation createSyncLeaguesOperation(SBTechOperatorType operator);

  SyncSelectionLineGroupIdOperation createSyncSelectionLineGroupIdOperation(SBTechOperatorType operator);
}
