package phoenix.suppliers.oddin
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.PostStop
import akka.actor.typed.scaladsl.Behaviors
import akka.stream.KillSwitches
import akka.stream.Materializer
import akka.stream.UniqueKillSwitch
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.SuppliersAkkaSerializable
import phoenix.suppliers.oddin.PhoenixOddinFlows.MarketChangeFlow
import phoenix.suppliers.oddin.kafka.KafkaConsumingPhoenixOddinClient
import phoenix.suppliers.oddin.kafka.SimpleConsumerConfig
import phoenix.suppliers.oddin.kafka.Topic
object PhoenixOddinStreamConsumer {
  private val log = LoggerFactory.getLogger(this.objectName)

  sealed trait PhoenixOddinStreamMessage extends SuppliersAkkaSerializable

  final case object Start extends PhoenixOddinStreamMessage
  final case object Stop extends PhoenixOddinStreamMessage

  def apply(
      settings: OddinConfig,
      consumerConfig: SimpleConsumerConfig,
      marketsContext: MarketsBoundedContext): Behavior[PhoenixOddinStreamMessage] = {
    Behaviors.setup { context =>
      val adapter = Adapter(context.system, settings, consumerConfig, marketsContext)
      stopped(adapter)
    }
  }

  private def started(adapter: Adapter, killSwitches: Seq[UniqueKillSwitch]): Behavior[PhoenixOddinStreamMessage] = {
    Behaviors
      .receiveMessagePartial[PhoenixOddinStreamMessage] {
        case Stop =>
          log.info("stopping")
          killSwitches.foreach(_.shutdown())
          stopped(adapter)
      }
      .receiveSignal {
        case (_, PostStop) =>
          log.info("stopped, shutting down streams")
          killSwitches.foreach(_.shutdown())
          Behaviors.unhandled
      }
  }

  private def stopped(adapter: Adapter): Behavior[PhoenixOddinStreamMessage] = {
    Behaviors.receiveMessagePartial[PhoenixOddinStreamMessage] {
      case Start =>
        log.info("starting")
        val killSwitch = adapter.connectToMarketOddsChangeEventsTopic
        started(adapter, Seq(killSwitch))
    }
  }

  private final class Adapter(phoenixOddinClient: PhoenixOddinClient, marketChangeFlow: MarketChangeFlow)(implicit
      mat: Materializer) {
    def connectToMarketOddsChangeEventsTopic: UniqueKillSwitch =
      phoenixOddinClient
        .connectTo(Topic.OddinMarketOddsChangeEvents)
        .via(marketChangeFlow)
        .viaMat(KillSwitches.single)(Keep.right)
        .toMat(Sink.ignore)(Keep.left)
        .run()
  }

  private object Adapter {
    def apply(
        system: ActorSystem[_],
        settings: OddinConfig,
        consumerConfig: SimpleConsumerConfig,
        marketsContext: MarketsBoundedContext): Adapter = {
      implicit val ec = system.executionContext
      val kafkaPhoenixOddinClient = KafkaConsumingPhoenixOddinClient(system, consumerConfig)
      val marketOddsFlow = PhoenixOddinFlows.marketChangedFlow(settings.marketFlow, marketsContext)
      val mat = Materializer.matFromSystem(system)
      new Adapter(kafkaPhoenixOddinClient, marketOddsFlow)(mat)
    }
  }
}
