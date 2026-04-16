package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.CacheConfig
import phoenix.core.TimeUtils._
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dgen113.ResultDetails.ResultDetailsRow
import phoenix.reports.infrastructure.CsvBetEventsRepository
import phoenix.reports.infrastructure.CsvFixtureMarketRepository
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.support.BetStubs
import phoenix.shared.support.CsvReader
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class ResultDetailsDataSpec
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

  "A ResultDetailsData from CSV" should {
    val csvReader = new CsvReader
    val fixtureFinder = FixtureMarketFinder(
      new CsvFixtureMarketRepository(csvReader, "data/reports/application/fixture-market.csv"),
      CacheConfig(100, 100, 10.minutes, 10.minutes))
    "produce empty report for no data" in {
      Given("no bets returned by repository")
      val repository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = Source(List())
      }
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest =
        new ResultDetailsData(repository, fixtureFinder, new PuntersFinder(puntersRepository))

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should be empty")
      result.size should be(0)
    }

    "present each event individually" in {
      Given("multiple bets with different state returned by repository")
      val repository = new CsvBetEventsRepository(csvReader, "data/reports/application/multiple-states-bets.csv")
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest =
        new ResultDetailsData(repository, fixtureFinder, new PuntersFinder(puntersRepository))

      val gamingDate = givenReportingPeriod.periodStart
      await(
        puntersRepository.upsert(
          PunterProfile(
            PunterId("p1"),
            generatePunterName(),
            isTestAccount = false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("all individual events are properly reported")
      result.size should be(9)

      result(0) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(10, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b1")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("MAD Lions vs PSG Talon"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-15T18:00:00Z")),
        wagerDescription = StringField("Match winner - threeway"),
        betSelection = StringField("selection2"),
        betPlacedAmount = MoneyField(1),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(1))
      result(1) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(11, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b1")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("MAD Lions vs PSG Talon"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-15T18:00:00Z")),
        wagerDescription = StringField("Match winner - threeway"),
        betSelection = StringField("selection2"),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(2.5),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-2.5))
      result(2) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(12, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b2")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("MAD Lions vs PSG Talon"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-15T18:00:00Z")),
        wagerDescription = StringField("Quadra kill - map 1"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(2),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(2))
      result(3) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(12, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b2")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("MAD Lions vs PSG Talon"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-15T18:00:00Z")),
        wagerDescription = StringField("Quadra kill - map 1"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(2),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-2))
      result(4) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(13, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b3")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("London Royal Ravens vs Paris Legion"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-13T19:00:00Z")),
        wagerDescription = StringField("Match winner - twoway"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(3),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(3))
      result(5) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(18, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b3")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("London Royal Ravens vs Paris Legion"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-13T19:00:00Z")),
        wagerDescription = StringField("Match winner - twoway"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(4.8),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-4.8))
      result(6) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(20, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b3")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("London Royal Ravens vs Paris Legion"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-13T19:00:00Z")),
        wagerDescription = StringField("Match winner - twoway"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(-4.8),
        transactionImpactOnSportSpoolRevenue = MoneyField(4.8))
      result(7) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(14, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b4")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("London Royal Ravens vs Paris Legion"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-13T19:00:00Z")),
        wagerDescription = StringField("Overtime - map 1"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(4),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(4))
      result(8) shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(gamingDate.withTime(TimeOfADay.of(14, 11))),
        patronId = PatronIdField(PunterId("p1")),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(BetId("b4")),
        eventType = SportDisciplineField(Other),
        eventName = StringField("London Royal Ravens vs Paris Legion"),
        eventDate = DateTimeField(OffsetDateTime.parse("2021-05-13T19:00:00Z")),
        wagerDescription = StringField("Overtime - map 1"),
        betSelection = StringField("selection1"),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(4),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-4))
    }
  }

  "A ResultDetailsData from Events" should {
    "present each event individually" in {
      Given("multiple bets with different state returned by repository")
      val env = new EnvironmentWithTwoPuntersAndTwoBetsResettled()

      val betEventsRepository = BetStubs.stubbedBetEvents(env.bets)
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(env.markets)
      val puntersRepository = new InMemoryPuntersRepository()

      val objectUnderTest =
        new ResultDetailsData(betEventsRepository, fixtureMarketFinder, new PuntersFinder(puntersRepository))

      val dayOfEvents =
        ReportingPeriod.enclosingDay(OffsetDateTime.of(2022, 2, 25, 0, 0, 0, 0, ZoneOffset.UTC), hardcodedClock)
      val gamingDate = dayOfEvents.periodStart
      await(puntersRepository.upsert(env.punterProfile))
      await(puntersRepository.upsert(env.punterProfile2))

      When("data is aggregated")
      val result = await(objectUnderTest.getData(dayOfEvents))

      Then("all individual events are properly reported")
      result.size should be(8)

      getRowForEvent(result, env.firstBetSettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.firstBetSettledEvent.operationTime),
        patronId = PatronIdField(env.firstBetSettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.firstBetSettledEvent.betData.betId),
        eventType = SportDisciplineField(env.firstBetSettledEvent.discipline),
        eventName = StringField(env.markets(0).fixture.name),
        eventDate = DateTimeField(env.markets(0).fixture.startTime),
        wagerDescription = StringField(env.markets(0).market.name),
        betSelection = StringField(env.selections1(0).selectionName),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(0))

      getRowForEvent(result, env.secondBetSettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.secondBetSettledEvent.operationTime),
        patronId = PatronIdField(env.secondBetSettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.secondBetSettledEvent.betData.betId),
        eventType = SportDisciplineField(env.secondBetSettledEvent.discipline),
        eventName = StringField(env.markets(0).fixture.name),
        eventDate = DateTimeField(env.markets(0).fixture.startTime),
        wagerDescription = StringField(env.markets(0).market.name),
        betSelection = StringField(env.selections1(1).selectionName),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(64.5),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-64.5))

      getRowForEvent(result, env.thirdBetSettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.thirdBetSettledEvent.operationTime),
        patronId = PatronIdField(env.thirdBetSettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.thirdBetSettledEvent.betData.betId),
        eventType = SportDisciplineField(env.thirdBetSettledEvent.discipline),
        eventName = StringField(env.fixtureMarket2.fixture.name),
        eventDate = DateTimeField(env.fixtureMarket2.fixture.startTime),
        wagerDescription = StringField(env.fixtureMarket2.market.name),
        betSelection = StringField(env.selections2(1).selectionName),
        betPlacedAmount = MoneyField(0),
        betPaidAmount = MoneyField(0),
        canceledBetAmount = MoneyField(0),
        voidedBetAmount = MoneyField(0),
        resettledBetAdjustment = MoneyField(0),
        transactionImpactOnSportSpoolRevenue = MoneyField(0))

      getRowForEvent(result, env.fourthBetSettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.fourthBetSettledEvent.operationTime),
        patronId = PatronIdField(env.fourthBetSettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.fourthBetSettledEvent.betData.betId),
        eventType = SportDisciplineField(env.fourthBetSettledEvent.discipline),
        eventName = StringField(env.fixtureMarket2.fixture.name),
        eventDate = DateTimeField(env.fixtureMarket2.fixture.startTime),
        wagerDescription = StringField(env.fixtureMarket2.market.name),
        betSelection = StringField(env.selections2(0).selectionName),
        betPlacedAmount = MoneyField(0.0),
        betPaidAmount = MoneyField(82.5),
        canceledBetAmount = MoneyField(0.0),
        voidedBetAmount = MoneyField(0.0),
        resettledBetAdjustment = MoneyField(0.0),
        transactionImpactOnSportSpoolRevenue = MoneyField(-82.5))

      getRowForEvent(result, env.firstBetResettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.firstBetResettledEvent.operationTime),
        patronId = PatronIdField(env.firstBetResettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.firstBetResettledEvent.betData.betId),
        eventType = SportDisciplineField(env.firstBetResettledEvent.discipline),
        eventName = StringField(env.markets(0).fixture.name),
        eventDate = DateTimeField(env.markets(0).fixture.startTime),
        wagerDescription = StringField(env.markets(0).market.name),
        betSelection = StringField(env.selections1(0).selectionName),
        betPlacedAmount = MoneyField(0.0),
        betPaidAmount = MoneyField(0.0),
        canceledBetAmount = MoneyField(0.0),
        voidedBetAmount = MoneyField(0.0),
        resettledBetAdjustment = MoneyField(env.firstBetResettledEvent.resettledAmount.amount),
        transactionImpactOnSportSpoolRevenue = MoneyField(-env.firstBetResettledEvent.resettledAmount.amount))

      getRowForEvent(result, env.secondBetResettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.secondBetResettledEvent.operationTime),
        patronId = PatronIdField(env.secondBetResettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.secondBetResettledEvent.betData.betId),
        eventType = SportDisciplineField(env.secondBetResettledEvent.discipline),
        eventName = StringField(env.markets(0).fixture.name),
        eventDate = DateTimeField(env.markets(0).fixture.startTime),
        wagerDescription = StringField(env.markets(0).market.name),
        betSelection = StringField(env.selections1(1).selectionName),
        betPlacedAmount = MoneyField(0.0),
        betPaidAmount = MoneyField(0.0),
        canceledBetAmount = MoneyField(0.0),
        voidedBetAmount = MoneyField(0.0),
        resettledBetAdjustment = MoneyField(-env.secondBetResettledEvent.unsettledAmount.amount),
        transactionImpactOnSportSpoolRevenue = MoneyField(env.secondBetResettledEvent.unsettledAmount.amount))

      getRowForEvent(result, env.thirdBetResettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.thirdBetResettledEvent.operationTime),
        patronId = PatronIdField(env.thirdBetResettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.thirdBetResettledEvent.betData.betId),
        eventType = SportDisciplineField(env.thirdBetResettledEvent.discipline),
        eventName = StringField(env.markets(1).fixture.name),
        eventDate = DateTimeField(env.markets(1).fixture.startTime),
        wagerDescription = StringField(env.markets(1).market.name),
        betSelection = StringField(env.selections2(1).selectionName),
        betPlacedAmount = MoneyField(0.0),
        betPaidAmount = MoneyField(0.0),
        canceledBetAmount = MoneyField(0.0),
        voidedBetAmount = MoneyField(0.0),
        resettledBetAdjustment = MoneyField(env.thirdBetResettledEvent.resettledAmount.amount),
        transactionImpactOnSportSpoolRevenue = MoneyField(-env.thirdBetResettledEvent.resettledAmount.amount))

      getRowForEvent(result, env.fourthBetResettledEvent).get shouldBe
      ResultDetailsRow(
        gamingDate = DateField(gamingDate),
        transactionTime = TimeField(env.fourthBetResettledEvent.operationTime),
        patronId = PatronIdField(env.fourthBetResettledEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(env.fourthBetResettledEvent.betData.betId),
        eventType = SportDisciplineField(env.fourthBetResettledEvent.discipline),
        eventName = StringField(env.markets(1).fixture.name),
        eventDate = DateTimeField(env.markets(1).fixture.startTime),
        wagerDescription = StringField(env.markets(1).market.name),
        betSelection = StringField(env.selections2(0).selectionName),
        betPlacedAmount = MoneyField(0.0),
        betPaidAmount = MoneyField(0.0),
        canceledBetAmount = MoneyField(0.0),
        voidedBetAmount = MoneyField(0.0),
        resettledBetAdjustment = MoneyField(-env.fourthBetResettledEvent.unsettledAmount.amount),
        transactionImpactOnSportSpoolRevenue = MoneyField(env.fourthBetResettledEvent.unsettledAmount.amount))
    }
  }
  private def getRowForEvent(rows: Seq[ResultDetailsRow], event: BetEvent): Option[ResultDetailsRow] =
    rows.find(row => (row.betId.value == event.betData.betId) && row.transactionTime.value == event.operationTime)
}
