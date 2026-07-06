package phoenix.oddin.streamlets

import cloudflow.streamlets._

import phoenix.core.CacheConfig
import phoenix.oddin.infrastructure.FlowConfig
import phoenix.oddin.infrastructure.OddinApiConfig
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinEnvironment.withNameInsensitive

object PipelineConfigParameters {

  private object Configuration {

    private object Defaults {
      val OddinEnvironment = "INTEGRATION"
      val OddinRestEndpoint = "https://api-mq.integration.oddin.gg"
      val OddinNodeId = 1

      val CacheInitialCapacity = 300
      val CacheMaxCapacity = 300
      val CacheTimeToLive = "24h"
      val CacheTimeToIdle = "1h"

      val MarketDescriptionsCacheInitialCapacity = 1
      val MarketDescriptionsCacheMaxCapacity = 1
      val MarketIdMappingCacheMaxCapacity = 8000

      // Flow Defaults
      val FlowParallelism = 5
      val FlowRestartMinBackoff = "10s"
      val FlowRestartMaxBackoff = "60s"
      val FlowRestartRandomFactor = 0.1
      val FlowMaxRestarts = 10
    }

    val MarketFlowEventBuilderParallelism =
      IntegerConfigParameter("market-flow-event-builder-parallelism", defaultValue = Some(Defaults.FlowParallelism))
    val MarketFlowContextAskParallelism =
      IntegerConfigParameter("market-flow-context-ask-parallelism", defaultValue = Some(Defaults.FlowParallelism))
    val MarketFlowRestartMinBackoff =
      DurationConfigParameter("market-flow-restart-min-backoff", defaultValue = Some(Defaults.FlowRestartMinBackoff))
    val MarketFlowRestartMaxBackoff =
      DurationConfigParameter("market-flow-restart-max-backoff", defaultValue = Some(Defaults.FlowRestartMaxBackoff))
    val MarketFlowRestartRandomFactor =
      DoubleConfigParameter("market-flow-restart-random-factor", defaultValue = Some(Defaults.FlowRestartRandomFactor))
    val MarketFlowMaxRestarts =
      IntegerConfigParameter("market-flow-max-restarts", defaultValue = Some(Defaults.FlowMaxRestarts))

    val FixtureFlowEventBuilderParallelism =
      IntegerConfigParameter("fixture-flow-event-builder-parallelism", defaultValue = Some(Defaults.FlowParallelism))
    val FixtureFlowContextAskParallelism =
      IntegerConfigParameter("fixture-flow-context-ask-parallelism", defaultValue = Some(Defaults.FlowParallelism))
    val FixtureFlowRestartMinBackoff =
      DurationConfigParameter("fixture-flow-restart-min-backoff", defaultValue = Some(Defaults.FlowRestartMinBackoff))
    val FixtureFlowRestartMaxBackoff =
      DurationConfigParameter("fixture-flow-restart-max-backoff", defaultValue = Some(Defaults.FlowRestartMaxBackoff))
    val FixtureFlowRestartRandomFactor =
      DoubleConfigParameter("fixture-flow-restart-random-factor", defaultValue = Some(Defaults.FlowRestartRandomFactor))
    val FixtureFlowMaxRestarts =
      IntegerConfigParameter("fixture-flow-max-restarts", defaultValue = Some(Defaults.FlowMaxRestarts))

    val MarketSettlementFlowEventBuilderParallelism =
      IntegerConfigParameter(
        "market-settlement-flow-event-builder-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MarketSettlementFlowContextAskParallelism =
      IntegerConfigParameter(
        "market-settlement-flow-context-ask-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MarketSettlementFlowRestartMinBackoff =
      DurationConfigParameter(
        "market-settlement-flow-restart-min-backoff",
        defaultValue = Some(Defaults.FlowRestartMinBackoff))
    val MarketSettlementFlowRestartMaxBackoff =
      DurationConfigParameter(
        "market-settlement-flow-restart-max-backoff",
        defaultValue = Some(Defaults.FlowRestartMaxBackoff))
    val MarketSettlementFlowRestartRandomFactor =
      DoubleConfigParameter(
        "market-settlement-flow-restart-random-factor",
        defaultValue = Some(Defaults.FlowRestartRandomFactor))
    val MarketSettlementFlowMaxRestarts =
      IntegerConfigParameter("market-settlement-flow-max-restarts", defaultValue = Some(Defaults.FlowMaxRestarts))

    val MarketCancelFlowEventBuilderParallelism =
      IntegerConfigParameter(
        "market-cancel-flow-event-builder-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MarketCancelFlowContextAskParallelism =
      IntegerConfigParameter(
        "market-cancel-flow-context-ask-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MarketCancelFlowRestartMinBackoff =
      DurationConfigParameter(
        "market-cancel-flow-restart-min-backoff",
        defaultValue = Some(Defaults.FlowRestartMinBackoff))
    val MarketCancelFlowRestartMaxBackoff =
      DurationConfigParameter(
        "market-cancel-flow-restart-max-backoff",
        defaultValue = Some(Defaults.FlowRestartMaxBackoff))
    val MarketCancelFlowRestartRandomFactor =
      DoubleConfigParameter(
        "market-cancel-flow-restart-random-factor",
        defaultValue = Some(Defaults.FlowRestartRandomFactor))
    val MarketCancelFlowMaxRestarts =
      IntegerConfigParameter("market-cancel-flow-max-restarts", defaultValue = Some(Defaults.FlowMaxRestarts))

    val MatchStatusUpdateFlowEventBuilderParallelism =
      IntegerConfigParameter(
        "match-status-update-flow-event-builder-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MatchStatusUpdateFlowContextAskParallelism =
      IntegerConfigParameter(
        "match-status-update-flow-context-ask-parallelism",
        defaultValue = Some(Defaults.FlowParallelism))
    val MatchStatusUpdateFlowRestartMinBackoff =
      DurationConfigParameter(
        "match-status-update-flow-restart-min-backoff",
        defaultValue = Some(Defaults.FlowRestartMinBackoff))
    val MatchStatusUpdateFlowRestartMaxBackoff =
      DurationConfigParameter(
        "match-status-update-flow-restart-max-backoff",
        defaultValue = Some(Defaults.FlowRestartMaxBackoff))
    val MatchStatusUpdateFlowRestartRandomFactor =
      DoubleConfigParameter(
        "match-status-update-flow-restart-random-factor",
        defaultValue = Some(Defaults.FlowRestartRandomFactor))
    val MatchStatusUpdateFlowMaxRestarts =
      IntegerConfigParameter("match-status-update-flow-max-restarts", defaultValue = Some(Defaults.FlowMaxRestarts))

    val OddinEnvironment =
      StringConfigParameter(key = "oddin-environment", defaultValue = Some(Defaults.OddinEnvironment))
    val OddinRestEndpoint =
      StringConfigParameter(key = "oddin-rest-endpoint", defaultValue = Some(Defaults.OddinRestEndpoint))
    val OddinAccessToken = StringConfigParameter("oddin-access-token", defaultValue = Some("changeme"))
    val OddinNodeId = IntegerConfigParameter("oddin-node-id", defaultValue = Some(Defaults.OddinNodeId))

    val MatchSummaryCacheInitialCapacity =
      IntegerConfigParameter(
        key = "match-summary-cache-initial-capacity",
        defaultValue = Some(Defaults.CacheInitialCapacity))
    val MatchSummaryCacheMaxCapacity =
      IntegerConfigParameter(key = "match-summary-cache-max-capacity", defaultValue = Some(Defaults.CacheMaxCapacity))
    val MatchSummaryCacheTimeToLive =
      DurationConfigParameter(key = "match-summary-cache-time-to-live", defaultValue = Some(Defaults.CacheTimeToLive))
    val MatchSummaryCacheTimeToIdle =
      DurationConfigParameter(key = "match-summary-cache-time-to-idle", defaultValue = Some(Defaults.CacheTimeToIdle))

    val MarketDescriptionsCacheInitialCapacity =
      IntegerConfigParameter(
        key = "market-descriptions-cache-initial-capacity",
        defaultValue = Some(Defaults.MarketDescriptionsCacheInitialCapacity))
    val MarketDescriptionsCacheMaxCapacity =
      IntegerConfigParameter(
        key = "market-descriptions-cache-max-capacity",
        defaultValue = Some(Defaults.MarketDescriptionsCacheMaxCapacity))
    val MarketDescriptionsCacheTimeToLive =
      DurationConfigParameter(
        key = "market-descriptions-cache-time-to-live",
        defaultValue = Some(Defaults.CacheTimeToLive))
    val MarketDescriptionsCacheTimeToIdle =
      DurationConfigParameter(
        key = "market-descriptions-cache-time-to-idle",
        defaultValue = Some(Defaults.CacheTimeToIdle))

    val MarketIdCacheInitialCapacity =
      IntegerConfigParameter(key = "market-id-cache-initial-capacity", defaultValue = Some(Defaults.CacheMaxCapacity))
    val MarketIdCacheMaxCapacity =
      IntegerConfigParameter(
        key = "market-id-cache-max-capacity",
        defaultValue = Some(Defaults.MarketIdMappingCacheMaxCapacity))
    val MarketIdCacheTimeToLive =
      DurationConfigParameter(key = "market-id-cache-time-to-live", defaultValue = Some(Defaults.CacheTimeToLive))
    val MarketIdCacheTimeToIdle =
      DurationConfigParameter(key = "market-id-cache-time-to-idle", defaultValue = Some(Defaults.CacheTimeToIdle))
  }

  import Configuration._

  lazy val OddinIngestorConfigurationParameters = Vector(
    OddinEnvironment,
    OddinRestEndpoint,
    OddinNodeId,
    OddinAccessToken,
    MarketIdCacheInitialCapacity,
    MarketIdCacheMaxCapacity,
    MarketIdCacheTimeToLive,
    MarketIdCacheTimeToIdle,
    MarketDescriptionsCacheInitialCapacity,
    MarketDescriptionsCacheMaxCapacity,
    MarketDescriptionsCacheTimeToLive,
    MarketDescriptionsCacheTimeToIdle,
    MatchSummaryCacheInitialCapacity,
    MatchSummaryCacheMaxCapacity,
    MatchSummaryCacheTimeToLive,
    MatchSummaryCacheTimeToIdle,
    MarketFlowEventBuilderParallelism,
    MarketFlowContextAskParallelism,
    MarketFlowRestartMinBackoff,
    MarketFlowRestartMaxBackoff,
    MarketFlowRestartRandomFactor,
    MarketFlowMaxRestarts,
    FixtureFlowEventBuilderParallelism,
    FixtureFlowContextAskParallelism,
    FixtureFlowRestartMinBackoff,
    FixtureFlowRestartMaxBackoff,
    FixtureFlowRestartRandomFactor,
    FixtureFlowMaxRestarts,
    MarketSettlementFlowEventBuilderParallelism,
    MarketSettlementFlowContextAskParallelism,
    MarketSettlementFlowRestartMinBackoff,
    MarketSettlementFlowRestartMaxBackoff,
    MarketSettlementFlowRestartRandomFactor,
    MarketSettlementFlowMaxRestarts,
    MarketCancelFlowEventBuilderParallelism,
    MarketCancelFlowContextAskParallelism,
    MarketCancelFlowRestartMinBackoff,
    MarketCancelFlowRestartMaxBackoff,
    MarketCancelFlowRestartRandomFactor,
    MarketCancelFlowMaxRestarts,
    MatchStatusUpdateFlowEventBuilderParallelism,
    MatchStatusUpdateFlowContextAskParallelism,
    MatchStatusUpdateFlowRestartMinBackoff,
    MatchStatusUpdateFlowRestartMaxBackoff,
    MatchStatusUpdateFlowRestartRandomFactor,
    MatchStatusUpdateFlowMaxRestarts)

  implicit def asFiniteDuration(d: java.time.Duration) =
    scala.concurrent.duration.Duration.fromNanos(d.toNanos)

  def matchSummaryCacheConfig(implicit context: StreamletContext) =
    CacheConfig(
      MatchSummaryCacheInitialCapacity.value,
      MatchSummaryCacheMaxCapacity.value,
      MatchSummaryCacheTimeToLive.value,
      MatchSummaryCacheTimeToIdle.value)

  def marketDescriptionsCacheConfig(implicit context: StreamletContext) =
    CacheConfig(
      MarketDescriptionsCacheInitialCapacity.value,
      MarketDescriptionsCacheMaxCapacity.value,
      MarketDescriptionsCacheTimeToLive.value,
      MarketDescriptionsCacheTimeToIdle.value)

  def marketIdMappingCacheConfig(implicit context: StreamletContext) =
    CacheConfig(
      MarketIdCacheInitialCapacity.value,
      MarketIdCacheMaxCapacity.value,
      MarketIdCacheTimeToLive.value,
      MarketIdCacheTimeToIdle.value)

  def marketFlowConfig(implicit context: StreamletContext) =
    FlowConfig(
      MarketFlowEventBuilderParallelism.value,
      MarketFlowContextAskParallelism.value,
      MarketFlowRestartMinBackoff.value,
      MarketFlowRestartMaxBackoff.value,
      MarketFlowRestartRandomFactor.value,
      MarketFlowMaxRestarts.value)

  def fixtureFlowConfig(implicit context: StreamletContext) =
    FlowConfig(
      FixtureFlowEventBuilderParallelism.value,
      FixtureFlowContextAskParallelism.value,
      FixtureFlowRestartMinBackoff.value,
      FixtureFlowRestartMaxBackoff.value,
      FixtureFlowRestartRandomFactor.value,
      FixtureFlowMaxRestarts.value)

  def marketSettlementFlowConfig(implicit context: StreamletContext) =
    FlowConfig(
      MarketSettlementFlowEventBuilderParallelism.value,
      MarketSettlementFlowContextAskParallelism.value,
      MarketSettlementFlowRestartMinBackoff.value,
      MarketSettlementFlowRestartMaxBackoff.value,
      MarketSettlementFlowRestartRandomFactor.value,
      MarketSettlementFlowMaxRestarts.value)

  def marketCancelFlowConfig(implicit context: StreamletContext) =
    FlowConfig(
      MarketCancelFlowEventBuilderParallelism.value,
      MarketCancelFlowContextAskParallelism.value,
      MarketCancelFlowRestartMinBackoff.value,
      MarketCancelFlowRestartMaxBackoff.value,
      MarketCancelFlowRestartRandomFactor.value,
      MarketCancelFlowMaxRestarts.value)

  def matchStatusUpdateFlowConfig(implicit context: StreamletContext) =
    FlowConfig(
      MatchStatusUpdateFlowEventBuilderParallelism.value,
      MatchStatusUpdateFlowContextAskParallelism.value,
      MatchStatusUpdateFlowRestartMinBackoff.value,
      MatchStatusUpdateFlowRestartMaxBackoff.value,
      MatchStatusUpdateFlowRestartRandomFactor.value,
      MatchStatusUpdateFlowMaxRestarts.value)

  def oddinConfig(implicit context: StreamletContext) =
    OddinApiConfig(
      withNameInsensitive(OddinEnvironment.value),
      OddinRestEndpoint.value,
      OddinAccessToken.value,
      OddinNodeId.value)

  def oddinSettings(implicit context: StreamletContext) =
    OddinConfig(
      oddinConfig,
      matchSummaryCacheConfig,
      marketDescriptionsCacheConfig,
      marketIdMappingCacheConfig,
      marketFlowConfig,
      fixtureFlowConfig,
      marketSettlementFlowConfig,
      marketCancelFlowConfig,
      matchStatusUpdateFlowConfig)
}
