package phoenix.suppliers.betgenius

import scala.concurrent.ExecutionContext

import akka.actor.typed.scaladsl.ActorContext
import org.slf4j.LoggerFactory

import phoenix.betgenius.infrastructure.BetgeniusFeed
import phoenix.betgenius.infrastructure.BetgeniusIngestSource
import phoenix.betgenius.infrastructure.http.BetgeniusRoutes
import phoenix.core.ScalaObjectUtils._
import phoenix.http.core.HttpServer
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.SupplierModule

final class BetgeniusModule(httpPort: Int, marketsContext: MarketsBoundedContext, context: ActorContext[_])
    extends SupplierModule {
  private val log = LoggerFactory.getLogger(getClass.getName)

  def start(): Unit = {
    implicit val system = context.system
    implicit val ec: ExecutionContext = system.executionContext

    val phoenixBetgeniusConfig = PhoenixBetgeniusConfig.of(context.system)
    log.info(s"BETGENIUS DATA INGESTION ENABLED? ${phoenixBetgeniusConfig.dataIngestionEnabled}")
    val settings = OddinConfig.of(system)
    val (queue, streamSource) = BetgeniusIngestSource()
    if (phoenixBetgeniusConfig.dataIngestionEnabled) {
      log.info("Starting Betgenius Akka Streams consumer")
      val streamConsumer = new BetgeniusStreamConsumer(settings, streamSource, marketsContext)
      streamConsumer.start()

      val routes = new BetgeniusRoutes(new BetgeniusFeed(queue))
      HttpServer.start(BetgeniusModule.simpleObjectName, routes.toAkkaHttp, httpPort, system)
    }
  }
}

object BetgeniusModule {

  def init(httpPort: Int, marketsContext: MarketsBoundedContext, context: ActorContext[_]): BetgeniusModule = {
    new BetgeniusModule(httpPort, marketsContext, context)
  }
}
