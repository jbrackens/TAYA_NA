package phoenix.suppliers.oddin

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.TimerScheduler
import akka.stream.Materializer
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.domain.OddinRestApi
import phoenix.suppliers.SuppliersAkkaSerializable

object CollectorBehaviors {
  private val log = LoggerFactory.getLogger(getClass)

  sealed trait CollectorMessage extends SuppliersAkkaSerializable

  final case object Next extends CollectorMessage

  def sportsCollector(
      system: ActorSystem[_],
      marketsContext: MarketsBoundedContext,
      client: OddinRestApi,
      clock: Clock)(implicit ec: ExecutionContext): Behavior[CollectorMessage] = {
    log.info("starting sports collector")
    apply(system, client, clock, marketsContext, SportsCollector.apply)
  }

  def fixturesCollector(
      system: ActorSystem[_],
      marketsContext: MarketsBoundedContext,
      client: OddinRestApi,
      clock: Clock)(implicit ec: ExecutionContext): Behavior[CollectorMessage] = {
    log.info("starting fixtures collector")
    apply(system, client, clock, marketsContext, FixturesCollector.apply)
  }

  def recoveryCollector(
      system: ActorSystem[_],
      marketsContext: MarketsBoundedContext,
      client: OddinRestApi,
      clock: Clock)(implicit ec: ExecutionContext): Behavior[CollectorMessage] = {
    log.info("starting recovery collector")
    apply(system, client, clock, marketsContext, RecoveryCollector.apply)
  }

  def apply(
      system: ActorSystem[_],
      client: OddinRestApi,
      clock: Clock,
      marketsContext: MarketsBoundedContext,
      createCollector: (
          ActorSystem[_],
          TimerScheduler[CollectorMessage],
          OddinRestApi,
          Clock,
          MarketsBoundedContext) => Collector): Behavior[CollectorMessage] = {
    Behaviors.setup[CollectorMessage] { context =>
      Behaviors.withTimers[CollectorMessage] { timers =>
        implicit val ec: ExecutionContext = context.executionContext
        implicit val mat: Materializer = Materializer(context)

        val collector: Collector = createCollector(system, timers, client, clock, marketsContext)

        Behaviors.receiveMessage[CollectorMessage] {
          case Next =>
            log.info("starting cache build")
            collector.collect()
            Behaviors.same
        }
      }
    }
  }
}
