package phoenix.oddin.streamlets

import akka.actor.typed.scaladsl.adapter._
import akka.kafka.ConsumerMessage.Committable
import akka.stream.scaladsl.{ FlowWithContext, RunnableGraph }
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.akkastream.{ AkkaStreamlet, AkkaStreamletLogic }
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import cloudflow.streamlets._
import phoenix.ConfigSupport
import phoenix.core.FutureUtils.withTimeout
import phoenix.oddin.data.{ MarketOddsChange, OddsChange }
import phoenix.oddin.{ CachingMarketIdMapper, _ }
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import scala.concurrent.duration._

class CreatePhoenixCommands extends AkkaStreamlet with ConfigSupport {
  import CreatePhoenixCommands._

  val in = AvroInlet[OddsChange]("in")
  val out = AvroOutlet[MarketOddsChange]("out", _.marketId)

  override def shape(): StreamletShape = StreamletShape(in, out)

  override def configParameters = ConfigurationParameters

  override def createLogic(): AkkaStreamletLogic =
    new RunnableGraphStreamletLogic() {

      override def runnableGraph(): RunnableGraph[_] = {

        val fixtureDetailsRepository =
          FixtureDetailsRepository(oddinConfig, fixtureDetailsRepositoryConfig)
        val marketDescriptionsRepository =
          MarketDetailsRepository(oddinConfig, marketDescriptionsRepositoryConfig)
        val marketIdMapper = CachingMarketIdMapper(system.toTyped, dbConfig, marketIdMappingConfig)

        implicit val scheduler = system.scheduler

        val flow =
          FlowWithContext[OddsChange, Committable]
            // Pull the Fixture Details (the fixture 'catalogue')
            // Pull the Market Descriptions (the market 'catalogue')
            // Converts the Oddin OddsChange message to multiple Phoenix MarketOddsChange messages
            .mapAsync(fixtureDetailsParallelism) { elem =>
              for {
                fixtureDetails <- fixtureDetailsRepository.fixtureDetailsForId(elem.eventId)
                marketDescriptions <- marketDescriptionsRepository.marketDescriptions()
              } yield {
                OddinMarketFormatter.toMarketOddsChanges(elem, fixtureDetails, marketDescriptions)
              }
            }
            // flatmaps the upstream Set
            .mapConcat(identity)
            // Pull the Phoenix market id for the Oddin marketId
            .mapAsync(marketIdMappingParallelism) { elem =>
              withTimeout(marketIdMappingTimeout) {
                marketIdMapper.retrievePhoenixId(elem.marketId).map { uuid =>
                  val id = uuid.toString
                  elem.copy(marketId = id, selectionOdds = elem.selectionOdds.map(_.copy(marketId = id)))
                }
              }
            }

        sourceWithCommittableContext(in).via(flow).to(committableSink(out))
      }
    }
}

/**
 * Handles the configuration for the Streamlet.
 *
 * * SlickConfigLocation is loaded from a secret mounted as a volume in the streamlet's pod
 * * Everything else is an individual configuration parameter handled by Cloudflow to ensure a value is set.
 */
object CreatePhoenixCommands extends ConfigSupport {

  private object Configuration {

    private object Defaults {
      val FixtureDetailsParallelism = 1
      val MarketIdMappingParallelism = 1
      val MarketIdMappingTimeout = "3s"

      val OddinIsProduction = false
      val OddinRestEndpoint = "api-mq.integration.oddin.gg"

      val CacheMaxCapacity = 300
      val CacheTimeToLive = "24h"
      val CacheTimeToIdle = "1h"
    }

    val FixtureDetailsParallelism =
      IntegerConfigParameter("fixture-details-parallelism", defaultValue = Some(Defaults.FixtureDetailsParallelism))
    val MarketIdMappingParallelism =
      IntegerConfigParameter("market-id-mapping-parallelism", defaultValue = Some(Defaults.MarketIdMappingParallelism))
    val MarketIdMappingTimeout =
      DurationConfigParameter("market-id-mapping-timeout", defaultValue = Some(Defaults.MarketIdMappingTimeout))

    val SlickConfigLocation = StringConfigParameter("slick-config-location")

    val OddinIsProduction =
      BooleanConfigParameter(key = "oddin-is-production", defaultValue = Some(Defaults.OddinIsProduction))
    val OddinRestEndpoint =
      StringConfigParameter(key = "oddin-rest-endpoint", defaultValue = Some(Defaults.OddinRestEndpoint))
    val OddinAccessToken = StringConfigParameter("oddin-access-token")

    val FixtureDetailsCacheMaxCapacity =
      IntegerConfigParameter(key = "fixture-details-cache-max-capacity", defaultValue = Some(Defaults.CacheMaxCapacity))
    val FixtureDetailsCacheTimeToLive =
      DurationConfigParameter(key = "fixture-details-cache-time-to-live", defaultValue = Some(Defaults.CacheTimeToLive))
    val FixtureDetailsCacheTimeToIdle =
      DurationConfigParameter(key = "fixture-details-cache-time-to-idle", defaultValue = Some(Defaults.CacheTimeToIdle))

    val MarketDescriptionsCacheMaxCapacity =
      IntegerConfigParameter(
        key = "market-descriptions-cache-max-capacity",
        defaultValue = Some(Defaults.CacheMaxCapacity))
    val MarketDescriptionsCacheTimeToLive =
      DurationConfigParameter(
        key = "market-descriptions-cache-time-to-live",
        defaultValue = Some(Defaults.CacheTimeToLive))
    val MarketDescriptionsCacheTimeToIdle =
      DurationConfigParameter(
        key = "market-descriptions-cache-time-to-idle",
        defaultValue = Some(Defaults.CacheTimeToIdle))

    val MarketIdCacheMaxCapacity =
      IntegerConfigParameter(key = "market-id-cache-max-capacity", defaultValue = Some(Defaults.CacheMaxCapacity))
    val MarketIdCacheTimeToLive =
      DurationConfigParameter(key = "market-id-cache-time-to-live", defaultValue = Some(Defaults.CacheTimeToLive))
    val MarketIdCacheTimeToIdle =
      DurationConfigParameter(key = "market-id-cache-time-to-idle", defaultValue = Some(Defaults.CacheTimeToIdle))
  }

  import Configuration._

  val ConfigurationParameters = Vector(
    FixtureDetailsParallelism,
    MarketIdMappingParallelism,
    MarketIdMappingTimeout,
    SlickConfigLocation,
    OddinIsProduction,
    OddinRestEndpoint,
    OddinAccessToken,
    FixtureDetailsCacheMaxCapacity,
    FixtureDetailsCacheTimeToLive,
    FixtureDetailsCacheTimeToIdle,
    MarketDescriptionsCacheMaxCapacity,
    MarketDescriptionsCacheTimeToLive,
    MarketDescriptionsCacheTimeToIdle,
    MarketIdCacheMaxCapacity,
    MarketIdCacheTimeToLive,
    MarketIdCacheTimeToIdle)

  implicit def asFiniteDuration(d: java.time.Duration) =
    scala.concurrent.duration.Duration.fromNanos(d.toNanos)

  def fixtureDetailsParallelism(implicit context: StreamletContext) = FixtureDetailsParallelism.value

  def marketIdMappingParallelism(implicit context: StreamletContext) = MarketIdMappingParallelism.value

  def marketIdMappingTimeout(implicit context: StreamletContext): FiniteDuration =
    MarketIdMappingTimeout.value

  def oddinConfig(implicit context: StreamletContext) =
    OddinConfig(OddinIsProduction.value, OddinRestEndpoint.value, OddinAccessToken.value)

  def fixtureDetailsRepositoryConfig(implicit context: StreamletContext) =
    CacheConfig(
      FixtureDetailsCacheMaxCapacity.value,
      FixtureDetailsCacheTimeToLive.value,
      FixtureDetailsCacheTimeToIdle.value)

  def marketDescriptionsRepositoryConfig(implicit context: StreamletContext) =
    CacheConfig(
      MarketDescriptionsCacheMaxCapacity.value,
      MarketDescriptionsCacheTimeToLive.value,
      MarketDescriptionsCacheTimeToIdle.value)

  def marketIdMappingConfig(implicit context: StreamletContext) =
    CacheConfig(MarketIdCacheMaxCapacity.value, MarketIdCacheTimeToLive.value, MarketIdCacheTimeToIdle.value)

  def dbConfig(implicit context: StreamletContext) = {
    val dbConf = loadConfig(SlickConfigLocation.value)
    DatabaseConfig.forConfig[JdbcProfile]("slick", dbConf)
  }
}
