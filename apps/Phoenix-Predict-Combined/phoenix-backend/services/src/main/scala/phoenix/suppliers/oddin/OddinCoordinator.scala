package phoenix.suppliers.oddin

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.adapter._
import akka.cluster.typed.ClusterSingleton
import akka.cluster.typed.SingletonActor
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.http.core.AkkaHttpClient
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi
import phoenix.suppliers.oddin.CollectorBehaviors._
import phoenix.suppliers.oddin.kafka.SimpleConsumerConfig

object OddinCoordinator {
  private val log = LoggerFactory.getLogger(this.objectName)

  def init(
      system: ActorSystem[_],
      oddinConfig: OddinConfig,
      phoenixOddinConfig: PhoenixOddinConfig,
      clock: Clock,
      marketsContext: MarketsBoundedContext) =
    ClusterSingleton(system).init(
      SingletonActor(
        OddinCoordinator(oddinConfig, phoenixOddinConfig, clock, marketsContext),
        OddinCoordinator.simpleObjectName))

  def apply(
      oddinConfig: OddinConfig,
      phoenixOddinConfig: PhoenixOddinConfig,
      clock: Clock,
      marketsContext: MarketsBoundedContext): Behavior[NotUsed] =
    Behaviors.setup { context =>
      log.info(s"ODDIN DATA INGESTION ENABLED? ${phoenixOddinConfig.dataIngestionEnabled}")
      if (phoenixOddinConfig.dataIngestionEnabled) {
        implicit val system = context.system.toClassic
        implicit val ec = context.executionContext

        val client = new AkkaHttpOddinRestApi(new AkkaHttpClient(system), oddinConfig.apiConfig)(context.system)

        log.info("starting collectors")

        val collectSports =
          context.spawn(
            sportsCollector(context.system, marketsContext, client, clock),
            SportsCollector.simpleObjectName)
        collectSports ! Next

        val collectFixtures =
          context.spawn(
            fixturesCollector(context.system, marketsContext, client, clock),
            FixturesCollector.simpleObjectName)
        collectFixtures ! Next

        val collectRecoveryEvents =
          context.spawn(
            recoveryCollector(context.system, marketsContext, client, clock),
            RecoveryCollector.simpleObjectName)
        collectRecoveryEvents ! Next

        if (phoenixOddinConfig.kafka.enabled) {
          log.info("spawning phoenix-oddin Kafka consumer")

          val consumerConfig = SimpleConsumerConfig.of(context.system)
          val phoenixOddinStreamConsumer =
            context.spawn(
              PhoenixOddinStreamConsumer(oddinConfig, consumerConfig, marketsContext),
              PhoenixOddinStreamConsumer.simpleObjectName)

          phoenixOddinStreamConsumer ! PhoenixOddinStreamConsumer.Start
        } else {
          log.info("spawning Akka Streams consumer")

          val streamConsumer = context.spawn(
            StronglyTypedOddinStreamConsumer(
              oddinConfig,
              clock,
              marketsContext,
              phoenixOddinConfig.useCommonDataApiModel),
            StronglyTypedOddinStreamConsumer.simpleObjectName)
          streamConsumer ! StronglyTypedOddinStreamConsumer.Start

        }
      }

      Behaviors.empty
    }
}
