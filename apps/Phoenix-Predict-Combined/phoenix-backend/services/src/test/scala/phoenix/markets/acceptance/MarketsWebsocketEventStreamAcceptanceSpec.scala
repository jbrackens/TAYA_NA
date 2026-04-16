package phoenix.markets.acceptance

import java.util.UUID

import akka.stream.scaladsl.Sink
import cats.data.NonEmptyList
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.odds.Odds
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets._
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateSelectionName
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.time.FakeHardcodedClock

class MarketsWebsocketEventStreamAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with GivenWhenThen {

  private val clock = new FakeHardcodedClock()
  private val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  "Markets" should {

    "emit an update when Market is updated" in {

      Given("a market")
      val selection = SelectionOdds(generateSelectionId(), generateSelectionName(), Some(Odds(2.0)), active = true)
      val market = env.marketScenarios.bettableMarket(NonEmptyList.one(selection))

      When("the market receives updates")
      val marketWithChanges = market.copy(
        selections = Seq(selection.copy(odds = Some(Odds(3.0)))),
        marketLifecycle = Settled(LifecycleChangeReason.DataSupplierStatusChange, selection.selectionId))
      val marketEventStream = await(env.marketEventStreams.streamStateUpdates(market.marketId))
      val updateMarketRequest = UpdateMarketRequest(
        UUID.randomUUID().toString,
        clock.currentOffsetDateTime(),
        marketWithChanges.fixtureId,
        marketWithChanges.marketId,
        marketWithChanges.marketName,
        None,
        marketWithChanges.marketType,
        marketWithChanges.marketLifecycle,
        marketWithChanges.marketSpecifiers,
        marketWithChanges.selections)
      await(env.marketsBC.createOrUpdateMarket(updateMarketRequest))

      Then("the changes should be received on the socket")
      val events = await(marketEventStream.take(1).runWith(Sink.seq))
      val expectedEvent = MarketStateUpdate(
        marketWithChanges.marketId,
        marketWithChanges.marketName,
        marketWithChanges.marketType,
        MarketCategory(marketWithChanges.marketType.entryName),
        marketWithChanges.marketLifecycle,
        MarketDataConverters.marketSpecifiersToMap(marketWithChanges.marketSpecifiers),
        marketWithChanges.selections)

      events should contain only expectedEvent
    }
  }
}
