package phoenix.suppliers.betgenius

import akka.actor.typed.ActorSystem

import phoenix.betgenius.infrastructure.BetgeniusIngestSource
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.common.PhoenixSharedFlows

class BetgeniusStreamConsumer(
    settings: OddinConfig,
    streamSource: BetgeniusIngestSource.StreamSource,
    marketsContext: MarketsBoundedContext)(implicit system: ActorSystem[_]) {

  implicit val ec = system.executionContext

  val graph = PhoenixSharedFlows.buildCommonPipeline(settings, streamSource, marketsContext)

  def start() = graph.run()
}
