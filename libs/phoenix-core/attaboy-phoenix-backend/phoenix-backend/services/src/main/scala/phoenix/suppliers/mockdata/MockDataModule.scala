package phoenix.suppliers.mockdata

import akka.actor.typed.scaladsl.ActorContext

import phoenix.markets.MarketsBoundedContext
import phoenix.suppliers.SupplierModule

final class MockDataModule(marketsContext: MarketsBoundedContext, context: ActorContext[_]) extends SupplierModule {
  def start(): Unit = {
    implicit val system = context.system

    val phoenixMockDataConfig = PhoenixMockDataConfig.of(system)

    MockDataCoordinator.init(system, phoenixMockDataConfig, marketsContext)
    ()
  }
}

object MockDataModule {
  def init(marketsContext: MarketsBoundedContext, context: ActorContext[_]): MockDataModule = {
    new MockDataModule(marketsContext, context)
  }
}
