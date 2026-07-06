package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.bets.CancellationReason
import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.template.dge19.WageringSummary.WageringSummarySportsRow
import phoenix.reports.infrastructure.InMemoryBetEventsRepository
import phoenix.reports.infrastructure.InMemoryFixtureMarketRepository
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.FutureSupport

final class WageringSummarySportsDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  val clock: Clock = Clock.utcClock

  "A WageringSummarySportsData" should {
    "correctly calculate per-fixture stats" in {
      // given: a fixture
      val firstFixture = Fixture(
        fixtureId = generateFixtureId(),
        name = "Real Madrid vs Barcelona",
        startTime = OffsetDateTime.of(2021, 5, 19, 21, 0, 0, 0, ZoneOffset.UTC))
      val firstFixtureFirstMarket = Market(generateMarketId(), generateMarketName(), firstFixture.fixtureId)
      val firstFixtureSecondMarket = Market(generateMarketId(), generateMarketName(), firstFixture.fixtureId)

      // and: punter won
      val punterWonEvents = {
        val betData = BetData(
          betId = BetId("bet1"),
          punterId = PunterId("punter1"),
          marketId = firstFixtureFirstMarket.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(10),
          odds = Odds(1.5))

        val betOpened = ESportEvents.betOpened(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC))

        val betWon = ESportEvents.betSettled(
          EventId.random(),
          betData,
          paidAmount = MoneyAmount(15),
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC))

        List(betOpened, betWon)
      }

      // and: another punter lost
      val punterLostEvents = {
        val betData = BetData(
          betId = BetId("bet2"),
          punterId = PunterId("punter2"),
          marketId = firstFixtureSecondMarket.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(100),
          odds = Odds(1.3))

        val betOpened = ESportEvents.betOpened(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC))

        val betLost = ESportEvents.betSettled(
          EventId.random(),
          betData,
          paidAmount = MoneyAmount(0),
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC))

        List(betOpened, betLost)
      }

      // and: punter voided his bet
      val punterVoidedEvents = {
        val betData = BetData(
          betId = BetId("bet3"),
          punterId = PunterId("punter3"),
          marketId = firstFixtureSecondMarket.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(2137),
          odds = Odds(1.3))

        val betOpened = ESportEvents.betOpened(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC))

        val betVoided = ESportEvents.betVoided(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC),
          adminUser = AdminId("admin1"),
          cancellationReason = CancellationReason.unsafe("reason"))

        List(betOpened, betVoided)
      }

      // and: punter bet resettled
      val punterResettledEvents = {
        val betData = BetData(
          betId = BetId("bet3"),
          punterId = PunterId("punter3"),
          marketId = firstFixtureSecondMarket.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(10),
          odds = Odds(1.5))

        val betOpened = ESportEvents.betOpened(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC))

        val betSettled = ESportEvents.betSettled(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC),
          paidAmount = MoneyAmount(15))

        val betResettled = ESportEvents.betResettled(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC),
          unsettledAmount = MoneyAmount(15),
          resettledAmount = MoneyAmount(0))

        List(betOpened, betSettled, betResettled)
      }

      // and - a second fixture
      val secondFixture = Fixture(
        fixtureId = generateFixtureId(),
        name = "PSG vs Chelsea",
        startTime = OffsetDateTime.of(2021, 5, 19, 21, 0, 0, 0, ZoneOffset.UTC))
      val secondFixtureFirstMarket = Market(generateMarketId(), generateMarketName(), secondFixture.fixtureId)
      val secondFixtureSecondMarket = Market(generateMarketId(), generateMarketName(), secondFixture.fixtureId)

      // and - fixture cancelled
      val fixtureCancelledEvents = {
        val betData = BetData(
          betId = BetId("bet3"),
          punterId = PunterId("punter3"),
          marketId = secondFixtureSecondMarket.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(40),
          odds = Odds(1.2))

        val betOpened = ESportEvents.betOpened(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC))

        val betCancelled = ESportEvents.betCancelled(
          EventId.random(),
          betData,
          operationTime = OffsetDateTime.of(2021, 5, 19, 23, 0, 0, 0, ZoneOffset.UTC))

        List(betOpened, betCancelled)
      }

      // and
      val fixtureFinder = stubbedFixtureFinder(
        List(firstFixture, secondFixture),
        List(firstFixtureFirstMarket, firstFixtureSecondMarket, secondFixtureFirstMarket, secondFixtureSecondMarket))

      val events = stubbedBetEvents(
        punterWonEvents ++ punterLostEvents ++ punterVoidedEvents ++ punterResettledEvents ++ fixtureCancelledEvents)

      // and
      val objectUnderTest = new WageringSummarySportsData(events, fixtureFinder)

      // when
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 5, 19, 23, 59, 0, 0, ZoneOffset.UTC), clock)
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 2

      // and
      rows(0) shouldBe
      WageringSummarySportsRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        eventName = StringField("PSG vs Chelsea"),
        eventType = SportDisciplineField(Other),
        transfersToSports = MoneyField(40),
        transfersFromSports = MoneyField(0),
        cancelSportsWagers = MoneyField(40),
        voidSportsWagers = MoneyField(0),
        resettledSportsWager = MoneyField(0),
        sportsWinLoss = MoneyField(0))

      // and
      rows(1) shouldBe
      WageringSummarySportsRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        eventName = StringField("Real Madrid vs Barcelona"),
        eventType = SportDisciplineField(Other),
        transfersToSports = MoneyField(2257),
        transfersFromSports = MoneyField(30),
        cancelSportsWagers = MoneyField(0),
        voidSportsWagers = MoneyField(2137),
        resettledSportsWager = MoneyField(-15),
        sportsWinLoss = MoneyField(105))
    }

    "produce empty report if there's no data" in {
      // given
      val noEvents = stubbedBetEvents(List.empty)
      val fixtureMarketFinder = stubbedFixtureFinder(fixtures = List.empty, markets = List.empty)
      val objectUnderTest = new WageringSummarySportsData(noEvents, fixtureMarketFinder)

      // when
      val dayOfEvent = ReportingPeriod.enclosingDay(clock.currentOffsetDateTime(), clock)
      val reportRows = await(objectUnderTest.getData(dayOfEvent))

      //
      reportRows shouldBe empty
    }
  }

  private def stubbedBetEvents(events: List[BetEvent]): BetEventsRepository =
    new InMemoryBetEventsRepository(events)

  private def stubbedFixtureFinder(fixtures: List[Fixture], markets: List[Market]): FixtureMarketFinder = {
    val repository = new InMemoryFixtureMarketRepository(fixtures, markets)
    val cache = CacheSupport.createCache[MarketId, Option[FixtureMarket]](
      system.classicSystem,
      CacheConfig(initialCapacity = 10, maxCapacity = 100, timeToLive = 5.hours, timeToIdle = 5.hours))

    new FixtureMarketFinder(repository, cache)
  }
}
