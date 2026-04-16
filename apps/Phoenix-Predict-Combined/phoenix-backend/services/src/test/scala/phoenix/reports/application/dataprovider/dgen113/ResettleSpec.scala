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
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
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
import phoenix.reports.domain.model.bets.BetEvent.BetResettled
import phoenix.reports.domain.model.bets.BetEvent.BetSettled
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.template.dgen113.Resettle.ResettleRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.ReportsDataGenerator.extractBetData
import phoenix.reports.support.BetStubs
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateSelectionName
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class ResettleSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC))
  private val givenReportingPeriod =
    ReportingPeriod.enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  "A Ressetle Report" should {
    "produce empty report for no data" in {
      Given("no bets returned by repository")
      val betEventsRepository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = Source(List())
      }
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(List())
      val puntersRepository = new InMemoryPuntersRepository()
      val betsFinder = BetStubs.stubbedBetsFinder(List())

      val objectUnderTest =
        new ResettleData(betEventsRepository, betsFinder, fixtureMarketFinder, new PuntersFinder(puntersRepository))
      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should not contain any data")
      result.size should be(0)
    }

    "generate data for settled and resettled bets" in {
      Given("bets events")
      val fixture = Fixture(
        fixtureId = generateFixtureId(),
        name = "Real Madrid vs Barcelona",
        startTime = OffsetDateTime.of(2021, 5, 19, 19, 37, 0, 0, ZoneOffset.UTC))
      val market = Market(generateMarketId(), generateMarketName(), fixture.fixtureId)
      val marketSelection = generateMarketSelection(market.marketId)
      val marketSelection2 = MarketSelection("Selection2", generateSelectionName(), market.marketId)
      val marketSelection3 = MarketSelection("Selection3", generateSelectionName(), market.marketId)
      val fixtureMarket = FixtureMarket(fixture, market, Seq(marketSelection, marketSelection2, marketSelection3))
      val firstBetEvent = ESportEvents.betSettled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet1"),
          punterId = PunterId("punter1"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(10),
          odds = Odds(1.5)),
        paidAmount = MoneyAmount(20),
        operationTime = OffsetDateTime.of(2021, 5, 19, 19, 40, 0, 0, ZoneOffset.UTC))
      val secondBetEvent = ESportEvents.betSettled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet2"),
          punterId = PunterId("punter2"),
          selectionId = "Selection",
          marketId = market.marketId,
          stake = MoneyAmount(20),
          odds = Odds(1.7)),
        paidAmount = MoneyAmount(20),
        operationTime = OffsetDateTime.of(2021, 5, 19, 19, 45, 0, 0, ZoneOffset.UTC))
      val thirdBetEvent = ESportEvents.betResettled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet1"),
          punterId = PunterId("punter1"),
          selectionId = "Selection2",
          marketId = market.marketId,
          stake = MoneyAmount(10),
          odds = Odds(1.5)),
        unsettledAmount = MoneyAmount(10),
        resettledAmount = MoneyAmount(50),
        operationTime = OffsetDateTime.of(2021, 5, 19, 19, 45, 0, 0, ZoneOffset.UTC))
      val fourthBetEvent = ESportEvents.betResettled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet2"),
          punterId = PunterId("punter2"),
          selectionId = "Selection3",
          marketId = market.marketId,
          stake = MoneyAmount(20),
          odds = Odds(1.7)),
        unsettledAmount = MoneyAmount(20),
        resettledAmount = MoneyAmount(50),
        operationTime = OffsetDateTime.of(2021, 5, 19, 22, 0, 0, 0, ZoneOffset.UTC))

      // and
      val betEventsRepository =
        BetStubs.stubbedBetEvents(List(firstBetEvent, secondBetEvent, thirdBetEvent, fourthBetEvent))
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(List(fixtureMarket))
      val puntersRepository = new InMemoryPuntersRepository()
      val betsFinder = BetStubs.stubbedBetsFinder(
        List(
          extractBetData(firstBetEvent),
          extractBetData(secondBetEvent),
          extractBetData(thirdBetEvent),
          extractBetData(fourthBetEvent)))

      // and
      val objectUnderTest =
        new ResettleData(betEventsRepository, betsFinder, fixtureMarketFinder, new PuntersFinder(puntersRepository))
      val punterProfile =
        PunterProfile(
          firstBetEvent.betData.punterId,
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
        ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC), hardcodedClock)
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 2

      // and
      rows.find(_.patronId.value == punterProfile.punterId) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(firstBetEvent.betData.punterId),
          accountDesignation = AccountDesignationField(punterProfile.designation()),
          betId = BetIdField(firstBetEvent.betData.betId),
          eventType = SportDisciplineField(firstBetEvent.discipline),
          eventName = StringField(fixtureMarket.fixture.name),
          eventDate = DateTimeField(fixtureMarket.fixture.startTime),
          wagerDescription = StringField(fixtureMarket.market.name),
          betSelection = StringField(marketSelection2.selectionName),
          initialSettlementDateTime = DateTimeField(firstBetEvent.operationTime),
          resettlementDateTime = DateTimeField(thirdBetEvent.operationTime),
          unsettledAmount = MoneyField(firstBetEvent.betData.stake.amount),
          resettledAmount = MoneyField(thirdBetEvent.resettledAmount.amount),
          netAdjustment = MoneyField(thirdBetEvent.resettledAmount.amount - firstBetEvent.betData.stake.amount)))

      // and
      rows.find(_.patronId.value == punterProfile2.punterId) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(secondBetEvent.betData.punterId),
          accountDesignation = AccountDesignationField(punterProfile.designation()),
          betId = BetIdField(secondBetEvent.betData.betId),
          eventType = SportDisciplineField(secondBetEvent.discipline),
          eventName = StringField(fixtureMarket.fixture.name),
          eventDate = DateTimeField(fixtureMarket.fixture.startTime),
          wagerDescription = StringField(fixtureMarket.market.name),
          betSelection = StringField(marketSelection3.selectionName),
          initialSettlementDateTime = DateTimeField(secondBetEvent.operationTime),
          resettlementDateTime = DateTimeField(fourthBetEvent.operationTime),
          unsettledAmount = MoneyField(secondBetEvent.betData.stake.amount),
          resettledAmount = MoneyField(fourthBetEvent.resettledAmount.amount),
          netAdjustment = MoneyField(fourthBetEvent.resettledAmount.amount - secondBetEvent.betData.stake.amount)))
    }

    "generate data for usecase with multiple resettlements bets" in {
      Given("resettlements bets")
      val env = new EnvironmentWithTwoPuntersAndTwoBetsResettled()

      val betEventsRepository = BetStubs.stubbedBetEvents(env.bets)
      val fixtureMarketFinder = BetStubs.finderWithExistingFixtureMarkets(env.markets)
      val puntersRepository = new InMemoryPuntersRepository()
      val betsFinder = BetStubs.stubbedBetsFinder(env.bets.map(extractBetData))

      // and
      val objectUnderTest =
        new ResettleData(betEventsRepository, betsFinder, fixtureMarketFinder, new PuntersFinder(puntersRepository))

      await(puntersRepository.upsert(env.punterProfile))
      await(puntersRepository.upsert(env.punterProfile2))

      // when
      val dayOfEvent =
        ReportingPeriod.enclosingDay(OffsetDateTime.of(2022, 2, 25, 0, 0, 0, 0, ZoneOffset.UTC), hardcodedClock)
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 4

      // and
      getRowForEvent(rows, env.firstBetSettledEvent) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(env.firstBetSettledEvent.betData.punterId),
          accountDesignation = AccountDesignationField(env.punterProfile.designation()),
          betId = BetIdField(env.firstBetSettledEvent.betData.betId),
          eventType = SportDisciplineField(env.firstBetSettledEvent.discipline),
          eventName = StringField(env.fixtureMarket1.fixture.name),
          eventDate = DateTimeField(env.fixtureMarket1.fixture.startTime),
          wagerDescription = StringField(env.fixtureMarket1.market.name),
          betSelection = StringField(env.selections1(0).selectionName),
          initialSettlementDateTime = DateTimeField(env.firstBetSettledEvent.operationTime),
          resettlementDateTime = DateTimeField(env.firstBetResettledEvent.operationTime),
          unsettledAmount = MoneyField(env.firstBetResettledEvent.unsettledAmount.amount),
          resettledAmount = MoneyField(env.firstBetResettledEvent.resettledAmount.amount),
          netAdjustment = MoneyField(
            env.firstBetResettledEvent.resettledAmount.amount - env.firstBetResettledEvent.unsettledAmount.amount)))

      // and
      getRowForEvent(rows, env.secondBetSettledEvent) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(env.secondBetSettledEvent.betData.punterId),
          accountDesignation = AccountDesignationField(env.punterProfile2.designation()),
          betId = BetIdField(env.secondBetSettledEvent.betData.betId),
          eventType = SportDisciplineField(env.secondBetSettledEvent.discipline),
          eventName = StringField(env.fixtureMarket1.fixture.name),
          eventDate = DateTimeField(env.fixtureMarket1.fixture.startTime),
          wagerDescription = StringField(env.fixtureMarket1.market.name),
          betSelection = StringField(env.selections1(1).selectionName),
          initialSettlementDateTime = DateTimeField(env.secondBetSettledEvent.operationTime),
          resettlementDateTime = DateTimeField(env.secondBetResettledEvent.operationTime),
          unsettledAmount = MoneyField(env.secondBetResettledEvent.unsettledAmount.amount),
          resettledAmount = MoneyField(env.secondBetResettledEvent.resettledAmount.amount),
          netAdjustment = MoneyField(
            (env.secondBetResettledEvent.resettledAmount - env.secondBetResettledEvent.unsettledAmount).amount)))

      // and
      getRowForEvent(rows, env.thirdBetSettledEvent) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(env.thirdBetSettledEvent.betData.punterId),
          accountDesignation = AccountDesignationField(env.punterProfile2.designation()),
          betId = BetIdField(env.thirdBetSettledEvent.betData.betId),
          eventType = SportDisciplineField(env.thirdBetSettledEvent.discipline),
          eventName = StringField(env.fixtureMarket2.fixture.name),
          eventDate = DateTimeField(env.fixtureMarket2.fixture.startTime),
          wagerDescription = StringField(env.fixtureMarket2.market.name),
          betSelection = StringField(env.selections2(1).selectionName),
          initialSettlementDateTime = DateTimeField(env.thirdBetSettledEvent.operationTime),
          resettlementDateTime = DateTimeField(env.thirdBetResettledEvent.operationTime),
          unsettledAmount = MoneyField(env.thirdBetResettledEvent.unsettledAmount.amount),
          resettledAmount = MoneyField(env.thirdBetResettledEvent.resettledAmount.amount),
          netAdjustment = MoneyField(
            (env.thirdBetResettledEvent.resettledAmount - env.thirdBetResettledEvent.unsettledAmount).amount)))

      // and
      getRowForEvent(rows, env.fourthBetSettledEvent) shouldBe Some(
        ResettleRow(
          gamingDate = DateField(dayOfEvent.periodStart),
          patronId = PatronIdField(env.fourthBetSettledEvent.betData.punterId),
          accountDesignation = AccountDesignationField(env.punterProfile2.designation()),
          betId = BetIdField(env.fourthBetSettledEvent.betData.betId),
          eventType = SportDisciplineField(env.fourthBetSettledEvent.discipline),
          eventName = StringField(env.fixtureMarket2.fixture.name),
          eventDate = DateTimeField(env.fixtureMarket2.fixture.startTime),
          wagerDescription = StringField(env.fixtureMarket2.market.name),
          betSelection = StringField(env.selections2(0).selectionName),
          initialSettlementDateTime = DateTimeField(env.fourthBetSettledEvent.operationTime),
          resettlementDateTime = DateTimeField(env.fourthBetResettledEvent.operationTime),
          unsettledAmount = MoneyField(env.fourthBetResettledEvent.unsettledAmount.amount),
          resettledAmount = MoneyField(env.fourthBetResettledEvent.resettledAmount.amount),
          netAdjustment = MoneyField(
            (env.fourthBetResettledEvent.resettledAmount - env.fourthBetResettledEvent.unsettledAmount).amount)))
    }
  }

  private def getRowForEvent(rows: Seq[ResettleRow], event: BetEvent): Option[ResettleRow] =
    rows.find(_.betId.value == event.betData.betId)

  private def generateMarketSelection(
      marketId: MarketId,
      selectionId: SelectionId = generateSelectionId()): MarketSelection =
    MarketSelection(selectionId, generateSelectionName(), marketId)
}

class EnvironmentWithTwoPuntersAndTwoBetsResettled() {
  val fixture1 = Fixture(
    FixtureId(DataProvider.Oddin, "od:match:67989"),
    "Action PH vs NAOS Esports",
    startTime = OffsetDateTime.of(2022, 2, 26, 2, 0, 0, 0, ZoneOffset.UTC))

  val fixture2 = Fixture(
    FixtureId(DataProvider.Oddin, "od:match:64425"),
    "Immortals vs Counter Logic Gaming",
    startTime = OffsetDateTime.of(2022, 2, 26, 1, 20, 0, 0, ZoneOffset.UTC))

  val market1 = Market(
    MarketId(DataProvider.Oddin, "od:match:67989:1:variant=way:two|way=two"),
    "Match winner - twoway",
    FixtureId(DataProvider.Oddin, "od:match:67989"))

  val market2 = Market(
    MarketId(DataProvider.Oddin, "od:match:64425:1:variant=way:two|way=two"),
    "Match winner - twoway",
    FixtureId(DataProvider.Oddin, "od:match:64425"))

  val selections1 =
    Seq(MarketSelection("2", "away", market1.marketId), MarketSelection("1", "home", market1.marketId))

  val selections2 =
    Seq(MarketSelection("2", "away", market2.marketId), MarketSelection("1", "home", market2.marketId))

  val fixtureMarket1 = FixtureMarket(fixture1, market1, selections1)
  val fixtureMarket2 = FixtureMarket(fixture2, market2, selections2)

  val punterId1 = PunterId("51a9e900-b76a-4afb-bfef-d0a5136b88b8")
  val punterId2 = PunterId("ab311926-cd62-4c67-b184-1a1e7b156854")

  val firstBetSettledEvent = BetSettled(
    EventId("Bet~e4d8137b-8ad0-41ab-985a-7e8299415e06#Sequence(627486)"),
    BetData(
      BetId("e4d8137b-8ad0-41ab-985a-7e8299415e06"),
      punterId1,
      selections1(0).selectionId,
      market1.marketId,
      MoneyAmount(25),
      Odds(1.6200)),
    OffsetDateTime.of(2022, 2, 25, 19, 55, 52, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(0.00))

  val secondBetSettledEvent = BetSettled(
    EventId("Bet~38e8ffae-4af2-43fa-84b7-2e062c0209e8#Sequence(627487)"),
    BetData(
      BetId("38e8ffae-4af2-43fa-84b7-2e062c0209e8"),
      punterId2,
      selections1(1).selectionId,
      market1.marketId,
      MoneyAmount(30),
      Odds(2.1500)),
    OffsetDateTime.of(2022, 2, 25, 19, 55, 52, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(64.50))

  val thirdBetSettledEvent = BetSettled(
    EventId("Bet~63f1e2bc-3d78-4745-b6be-bed3b1b77d69#Sequence(627545)"),
    BetData(
      BetId("63f1e2bc-3d78-4745-b6be-bed3b1b77d69"),
      punterId2,
      selections2(1).selectionId,
      market2.marketId,
      MoneyAmount(10),
      Odds(2.1000)),
    OffsetDateTime.of(2022, 2, 25, 19, 57, 52, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(0.00))

  val fourthBetSettledEvent = BetSettled(
    EventId("Bet~00cc1099-277e-4254-a3d5-7dd0caadba44#Sequence(627546)"),
    BetData(
      BetId("00cc1099-277e-4254-a3d5-7dd0caadba44"),
      punterId1,
      selections2(0).selectionId,
      market2.marketId,
      MoneyAmount(50),
      Odds(1.6500)),
    OffsetDateTime.of(2022, 2, 25, 19, 57, 52, 10, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(82.50))

  val firstBetResettledEvent = BetResettled(
    EventId("Bet~e4d8137b-8ad0-41ab-985a-7e8299415e06#Sequence(627515)"),
    BetData(
      BetId("e4d8137b-8ad0-41ab-985a-7e8299415e06"),
      punterId1,
      selections1(0).selectionId,
      market1.marketId,
      MoneyAmount(25),
      Odds(1.6200)),
    OffsetDateTime.of(2022, 2, 25, 19, 56, 52, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(0.00),
    MoneyAmount(40.50))

  val secondBetResettledEvent = BetResettled(
    EventId("Bet~38e8ffae-4af2-43fa-84b7-2e062c0209e8#Sequence(627516)"),
    BetData(
      BetId("38e8ffae-4af2-43fa-84b7-2e062c0209e8"),
      punterId2,
      selections1(1).selectionId,
      market1.marketId,
      MoneyAmount(30),
      Odds(2.1500)),
    OffsetDateTime.of(2022, 2, 25, 19, 56, 52, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(64.50),
    MoneyAmount(0.00))

  val thirdBetResettledEvent = BetResettled(
    EventId("Bet~63f1e2bc-3d78-4745-b6be-bed3b1b77d69#Sequence(627562)"),
    BetData(
      BetId("63f1e2bc-3d78-4745-b6be-bed3b1b77d69"),
      punterId2,
      selections2(1).selectionId,
      market2.marketId,
      MoneyAmount(10),
      Odds(2.1000)),
    OffsetDateTime.of(2022, 2, 25, 19, 57, 59, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(0.00),
    MoneyAmount(21.00))

  val fourthBetResettledEvent = BetResettled(
    EventId("Bet~00cc1099-277e-4254-a3d5-7dd0caadba44#Sequence(627563)"),
    BetData(
      BetId("00cc1099-277e-4254-a3d5-7dd0caadba44"),
      punterId1,
      selections2(0).selectionId,
      market2.marketId,
      MoneyAmount(50),
      Odds(1.6500)),
    OffsetDateTime.of(2022, 2, 25, 19, 57, 59, 0, ZoneOffset.UTC),
    SportDiscipline.Other,
    MoneyAmount(82.50),
    MoneyAmount(0.00))

  val markets = List(fixtureMarket1, fixtureMarket2)

  val bets = List(
    firstBetSettledEvent,
    secondBetSettledEvent,
    firstBetResettledEvent,
    secondBetResettledEvent,
    thirdBetSettledEvent,
    fourthBetSettledEvent,
    thirdBetResettledEvent,
    fourthBetResettledEvent)

  val punterProfile =
    PunterProfile(
      punterId1,
      generatePunterName(),
      false,
      ActivationPath.Manual,
      suspensionReason = None,
      verifiedAt = None,
      verifiedBy = None)
  val punterProfile2 =
    PunterProfile(
      punterId2,
      generatePunterName(),
      false,
      ActivationPath.Manual,
      suspensionReason = None,
      verifiedAt = None,
      verifiedBy = None)
}
