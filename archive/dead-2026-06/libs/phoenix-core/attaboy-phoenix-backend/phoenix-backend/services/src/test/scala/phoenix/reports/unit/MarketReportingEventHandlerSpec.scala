package phoenix.reports.unit

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketInfo
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketProtocol.Events.MarketCreated
import phoenix.markets.MarketProtocol.Events.MarketInfoChanged
import phoenix.markets.MarketProtocol.Events.MarketOddsChanged
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.reports.application.es.MarketReportingEventHandler
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateSelectionOdds
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.FutureSupport

final class MarketReportingEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport with MockFactory {
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  val clock: Clock = Clock.utcClock

  "A MarketReportingEventHandler" should {
    "handle MarketCreated event" in {
      val event = MarketCreated(
        marketId = generateMarketId(),
        lifecycle = MarketLifecycle.Bettable(BackofficeChange()),
        info = marketInfo(generateFixtureId()),
        selectionOdds = List(generateSelectionOdds()),
        createdAt = clock.currentOffsetDateTime())

      val expectedMarket = Market(event.marketId, event.info.name, event.info.fixtureId)
      val expectedSelections = event.selectionOdds.map { selectionOdds =>
        MarketSelection(selectionOdds.selectionId, selectionOdds.selectionName, event.marketId)
      }

      val fixtureMarkets = mock[FixtureMarketRepository]
      (fixtureMarkets.upsert(_: Market)).expects(expectedMarket).returns(Future.unit).once()
      (fixtureMarkets.upsert(_: Seq[MarketSelection])).expects(expectedSelections).returns(Future.unit).once()

      await(MarketReportingEventHandler.handle(fixtureMarkets)(event))
    }

    "handle MarketInfoChanged event" in {
      val event = MarketInfoChanged(
        marketId = generateMarketId(),
        marketInfo = marketInfo(generateFixtureId()),
        updatedAt = clock.currentOffsetDateTime())

      val expectedMarket = Market(event.marketId, event.marketInfo.name, event.marketInfo.fixtureId)
      val fixtureMarkets = mock[FixtureMarketRepository]
      (fixtureMarkets.upsert(_: Market)).expects(expectedMarket).returns(Future.unit).once()

      await(MarketReportingEventHandler.handle(fixtureMarkets)(event))
    }

    "handle MarketOddsChanged event" in {
      val marketId = generateMarketId()
      val event = MarketOddsChanged(
        marketId = marketId,
        selectionOdds = List(generateSelectionOdds()),
        timestamp = clock.currentOffsetDateTime())

      val expectedSelections = event.selectionOdds.map { selectionOdds =>
        MarketSelection(selectionOdds.selectionId, selectionOdds.selectionName, event.marketId)
      }
      val fixtureMarkets = mock[FixtureMarketRepository]
      (fixtureMarkets.upsert(_: Seq[MarketSelection])).expects(expectedSelections).returns(Future.unit).once()

      await(MarketReportingEventHandler.handle(fixtureMarkets)(event))
    }
  }

  private def marketInfo(fixtureId: FixtureId): MarketInfo =
    MarketInfo("aMarket", fixtureId, randomEnumValue[MarketType](), category = None, specifiers = List.empty)
}
