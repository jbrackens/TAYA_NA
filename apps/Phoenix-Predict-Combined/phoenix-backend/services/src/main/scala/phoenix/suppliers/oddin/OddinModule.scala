package phoenix.suppliers.oddin
import akka.actor.typed.scaladsl.ActorContext

import phoenix.core.Clock
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.SupplierModule
import phoenix.suppliers.oddin.OddinCoordinator

final class OddinModule(marketsContext: MarketsBoundedContext, clock: Clock, context: ActorContext[_])
    extends SupplierModule {

  def start(): Unit = {
    implicit val system = context.system

    val oddinConfig = OddinConfig.of(system)
    val phoenixOddinConfig = PhoenixOddinConfig.of(system)

    OddinCoordinator.init(system, oddinConfig, phoenixOddinConfig, clock, marketsContext)
    ()
  }
}

object OddinModule {

  def init(marketsContext: MarketsBoundedContext, clock: Clock, context: ActorContext[_]): OddinModule = {
    new OddinModule(marketsContext, clock, context)
  }
}
