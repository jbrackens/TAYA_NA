package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.Bet
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets._
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dgen113.Cancelled.CancelledRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.support.BetStubs
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.FutureSupport

final class CancelledDataSpec extends ScalaTestWithActorTestKit with AnyWordSpecLike with Matchers with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  val clock: Clock = Clock.utcClock

  "A CancelledData" should {
    "generate data for voided bets, because the domain is different (internal voided bets are reported cancelled bets)" in {
      // given
      val fixture = Fixture(
        fixtureId = generateFixtureId(),
        name = "Real Madrid vs Barcelona",
        startTime = OffsetDateTime.of(2021, 5, 19, 21, 37, 0, 0, ZoneOffset.UTC))
      val market = Market(generateMarketId(), generateMarketName(), fixture.fixtureId)
      val fixtureFinder =
        BetStubs.finderWithExistingFixtureMarkets(List(FixtureMarket(fixture, market, Seq.empty[MarketSelection])))(
          ec,
          system)
      val puntersRepository = new InMemoryPuntersRepository()
      // and
      val firstBetEvent = ESportEvents.betCancelled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet1"),
          punterId = PunterId("punter1"),
          marketId = market.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(10),
          odds = Odds(1.5)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 22, 0, 0, 0, ZoneOffset.UTC))
      val secondBetEvent = ESportEvents.betCancelled(
        EventId.random(),
        betData = BetData(
          betId = BetId("bet2"),
          punterId = PunterId("punter2"),
          marketId = market.marketId,
          selectionId = "Selection",
          stake = MoneyAmount(20),
          odds = Odds(1.7)),
        operationTime = OffsetDateTime.of(2021, 5, 17, 23, 0, 0, 0, ZoneOffset.UTC))
      val events = BetStubs.stubbedBetEvents(List(firstBetEvent, secondBetEvent))

      // and
      val firstBet = Bet(
        firstBetEvent.betData.betId,
        firstBetEvent.betData.punterId,
        firstBetEvent.betData.marketId,
        firstBetEvent.betData.selectionId,
        NormalizedStake(firstBetEvent.betData.stake),
        placedAt = OffsetDateTime.of(2021, 5, 17, 20, 0, 0, 0, ZoneOffset.UTC),
        closedAt = Some(firstBetEvent.operationTime),
        initialSettlementData = None)
      val secondBet = Bet(
        secondBetEvent.betData.betId,
        secondBetEvent.betData.punterId,
        secondBetEvent.betData.marketId,
        secondBetEvent.betData.selectionId,
        NormalizedStake(secondBetEvent.betData.stake),
        placedAt = OffsetDateTime.of(2021, 5, 17, 21, 0, 0, 0, ZoneOffset.UTC),
        closedAt = Some(secondBetEvent.operationTime),
        initialSettlementData = Some(secondBetEvent.operationTime))
      val betsFinder = BetStubs.stubbedBetsFinder(List(firstBet, secondBet))

      // and
      val objectUnderTest =
        new CancelledData(events, betsFinder, fixtureFinder, new PuntersFinder(puntersRepository))
      await(
        puntersRepository.upsert(
          PunterProfile(
            firstBet.punterId,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      await(
        puntersRepository.upsert(
          PunterProfile(
            secondBetEvent.betData.punterId,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))

      // when
      val dayOfEvent = ReportingPeriod.enclosingDay(OffsetDateTime.of(2021, 5, 17, 23, 59, 0, 0, ZoneOffset.UTC), clock)
      val rows = await(objectUnderTest.getData(dayOfEvent))

      // then
      rows should have size 2

      // and
      rows(0) shouldBe CancelledRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        transactionTime = TimeField(firstBetEvent.operationTime),
        patronId = PatronIdField(firstBet.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(firstBet.betId),
        issuanceDateTime = DateTimeField(firstBet.placedAt),
        eventType = SportDisciplineField(Other),
        eventName = StringField(fixture.name),
        eventDate = DateTimeField(fixture.startTime),
        wagerDescription = StringField(market.name),
        betAmount = MoneyField(firstBet.stake.value.amount),
        reasonForCancellation = StringField("Cancelled by Data Supplier"))

      // and
      rows(1) shouldBe CancelledRow(
        gamingDate = DateField(dayOfEvent.periodStart),
        transactionTime = TimeField(secondBetEvent.operationTime),
        patronId = PatronIdField(secondBetEvent.betData.punterId),
        accountDesignation = AccountDesignationField(RealAccount),
        betId = BetIdField(secondBet.betId),
        issuanceDateTime = DateTimeField(secondBet.placedAt),
        eventType = SportDisciplineField(Other),
        eventName = StringField(fixture.name),
        eventDate = DateTimeField(fixture.startTime),
        wagerDescription = StringField(market.name),
        betAmount = MoneyField(secondBet.stake.value.amount),
        reasonForCancellation = StringField("Cancelled by Data Supplier"))
    }
  }
}
