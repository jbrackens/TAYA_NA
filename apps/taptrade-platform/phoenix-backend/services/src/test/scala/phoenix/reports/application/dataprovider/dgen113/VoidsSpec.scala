package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.bets.support.BetDataGenerator.generateCancellationReason
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.domain.template.dgen113.Voids.VoidsRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.ReportsDataGenerator.extractBetData
import phoenix.reports.support.BetStubs
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class VoidsSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2021, 2, 20, 1, 0, 0, 0, ZoneOffset.UTC))
  private val givenReportingPeriod =
    ReportingPeriod.enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  "A Voids Report" should {
    "produce empty report for no data" in {
      Given("no bets returned by repository")
      val betEventsRepository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = Source(List())
      }
      val betsFinder = BetStubs.stubbedBetsFinder(List())
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(List())(ec, system)
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest =
        new VoidsData(betEventsRepository, betsFinder, new PuntersFinder(puntersRepository), fixtureMarketFinder)
      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should not contain any data")
      result.size should be(0)
    }

    "generate data for voided bets, because the domain is different (internal voided bets are reported cancelled bets)" in {
      Given("bets events")
      val fixture = Fixture(
        fixtureId = generateFixtureId(),
        name = "Real Madrid vs Barcelona",
        startTime = OffsetDateTime.of(2021, 5, 19, 21, 37, 0, 0, ZoneOffset.UTC))
      val market = Market(generateMarketId(), generateMarketName(), fixture.fixtureId)
      val fixtureMarket = FixtureMarket(fixture, market, Seq.empty[MarketSelection])
      val firstBetEvent = ESportEvents.betVoided(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet1"),
          punterId = PunterId("punter1"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(10),
          odds = Odds(1.5)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 22, 0, 0, 0, ZoneOffset.UTC),
        adminUser = AdminId("admin"),
        cancellationReason = generateCancellationReason())
      val secondBetEvent = ESportEvents.betVoided(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet2"),
          punterId = PunterId("punter2"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(20),
          odds = Odds(1.7)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 23, 0, 0, 0, ZoneOffset.UTC),
        adminUser = AdminId("admin"),
        cancellationReason = generateCancellationReason())
      val thirdBetEvent = ESportEvents.betCancelled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet3"),
          punterId = PunterId("punter1"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(10),
          odds = Odds(1.2)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 22, 0, 0, 0, ZoneOffset.UTC))
      val fourthBetEvent = ESportEvents.betOpened(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet4"),
          punterId = PunterId("punter1"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(20),
          odds = Odds(2)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 22, 0, 0, 0, ZoneOffset.UTC))

      // and
      val firstBet = extractBetData(firstBetEvent)
      val secondBet = extractBetData(secondBetEvent)

      val betsFinder = BetStubs.stubbedBetsFinder(List(firstBet, secondBet))
      val betEventsRepository =
        BetStubs.stubbedBetEvents(List(firstBetEvent, secondBetEvent, thirdBetEvent, fourthBetEvent))
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(List(fixtureMarket))(ec, system)
      val puntersRepository = new InMemoryPuntersRepository()

      // and
      val objectUnderTest =
        new VoidsData(betEventsRepository, betsFinder, new PuntersFinder(puntersRepository), fixtureMarketFinder)
      val punterProfile = PunterProfile(
        firstBet.punterId,
        generatePunterName(),
        false,
        ActivationPath.Manual,
        suspensionReason = None,
        verifiedAt = None,
        verifiedBy = None)
      val punterProfile2 =
        PunterProfile(
          secondBetEvent.betData.punterId,
          generatePunterName(),
          false,
          ActivationPath.Manual,
          suspensionReason = None,
          verifiedAt = None,
          verifiedBy = None)

      await(puntersRepository.upsert(punterProfile))
      await(puntersRepository.upsert(punterProfile2))

      // when
      val dayOfEvent =
        ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 5, 17, 23, 59, 0, 0, ZoneOffset.UTC), hardcodedClock)
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 2

      // and
      rows(0) shouldBe VoidsRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        transactionTime = TimeField(firstBetEvent.operationTime),
        patronId = PatronIdField(firstBetEvent.betData.punterId),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        betId = BetIdField(firstBetEvent.betData.betId),
        issuanceDateTime = DateTimeField(firstBet.placedAt),
        eventType = SportDisciplineField(firstBetEvent.discipline),
        eventName = StringField(fixtureMarket.fixture.name),
        eventDate = DateTimeField(fixtureMarket.fixture.startTime),
        wagerDescription = StringField(fixtureMarket.market.name),
        betAmount = MoneyField(firstBetEvent.betData.stake.amount),
        employeeNameSystemIdentifier = AdminIdField(firstBetEvent.adminUser),
        reasonForVoid = StringField(firstBetEvent.cancellationReason.value))

      // and
      rows(1) shouldBe VoidsRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        transactionTime = TimeField(secondBetEvent.operationTime),
        patronId = PatronIdField(secondBetEvent.betData.punterId),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        betId = BetIdField(secondBetEvent.betData.betId),
        issuanceDateTime = DateTimeField(secondBet.placedAt),
        eventType = SportDisciplineField(secondBetEvent.discipline),
        eventName = StringField(fixtureMarket.fixture.name),
        eventDate = DateTimeField(fixtureMarket.fixture.startTime),
        wagerDescription = StringField(fixtureMarket.market.name),
        betAmount = MoneyField(secondBetEvent.betData.stake.amount),
        employeeNameSystemIdentifier = AdminIdField(secondBetEvent.adminUser),
        reasonForVoid = StringField(secondBetEvent.cancellationReason.value))
    }
  }
}
