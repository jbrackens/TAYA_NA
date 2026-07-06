package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import cats.data.OptionT
import cats.syntax.foldable._
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.CacheConfig
import phoenix.core.CacheSupport
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.OpenedBetsFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetStatus
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dgen113.SportsLiability.SportsLiabilityRow
import phoenix.reports.infrastructure.InMemoryBetsRepository
import phoenix.reports.infrastructure.InMemoryFixtureMarketRepository
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.ReportsDataGenerator
import phoenix.reports.infrastructure.ReportsDataGenerator.generateFixtureMarket
import phoenix.support.FutureSupport
import phoenix.support.TimeDataGenerator
import phoenix.time.FakeHardcodedClock

final class SportsLiabilityDataSpec
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

  "should create an empty report when no data exists" in {
    val sportsLiabilityData = new SportsLiabilityData(
      new OpenedBetsFinder(new InMemoryBetsRepository()),
      new FixtureMarketFinder(
        new InMemoryFixtureMarketRepository(),
        CacheSupport.createCache[MarketId, Option[FixtureMarket]](
          system.classicSystem,
          CacheConfig(initialCapacity = 10, maxCapacity = 100, timeToLive = 5.hours, timeToIdle = 5.hours))),
      new PuntersFinder(new InMemoryPuntersRepository()))

    await(sportsLiabilityData.getData(givenReportingPeriod)) shouldBe Seq.empty
  }

  "should aggregate data when multiple bets exist" in {
    val betsRepository = new InMemoryBetsRepository()
    val fixtureMarketRepository = new InMemoryFixtureMarketRepository()
    val puntersRepository = new PuntersRepository() {
      override def upsert(event: PunterProfile): Future[Unit] = Future.unit
      override def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit] = Future.unit
      override def setActivationPath(
          punterId: PunterId,
          activationPath: ActivationPath,
          verifiedAt: OffsetDateTime,
          verifiedBy: Option[AdminId]): Future[Unit] = Future.unit
      override def find(punterId: PunterId): OptionT[Future, PunterProfile] =
        OptionT.pure(
          PunterProfile(
            punterId,
            generatePunterName(),
            isTestAccount = false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None))
      override def getManuallyVerifiedPunters(
          verifiedAfter: OffsetDateTime,
          verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]] = Future.successful(Seq())
    }

    val sportsLiabilityData = new SportsLiabilityData(
      new OpenedBetsFinder(betsRepository),
      new FixtureMarketFinder(
        fixtureMarketRepository,
        CacheSupport.createCache[MarketId, Option[FixtureMarket]](
          system.classicSystem,
          CacheConfig(initialCapacity = 10, maxCapacity = 100, timeToLive = 5.hours, timeToIdle = 5.hours))),
      new PuntersFinder(puntersRepository))

    Given("Two bets that should be included in the report")
    val firstBet =
      ReportsDataGenerator
        .generateBet()
        .copy(placedAt = TimeDataGenerator.before(givenReportingPeriod.periodStart), closedAt = None)
    val secondBet =
      ReportsDataGenerator
        .generateBet()
        .copy(
          placedAt = TimeDataGenerator.between(givenReportingPeriod.periodStart, givenReportingPeriod.periodEnd),
          closedAt = None)
    await(List(firstBet, secondBet).traverse_(betsRepository.upsert))

    Given("the bets belong to existing fixtures and markets")
    val fixtureMarketForFirstBet =
      generateFixtureMarket(firstBet.marketId, Seq(MarketSelection(firstBet.selectionId, "Market", firstBet.marketId)))
    val fixtureMarketForSecondBet = generateFixtureMarket(
      secondBet.marketId,
      Seq(MarketSelection(secondBet.selectionId, "Market", secondBet.marketId)))
    val firstBetSelectionName = fixtureMarketForFirstBet.selectionNameById(firstBet.selectionId).get
    val secondBetSelectionName = fixtureMarketForSecondBet.selectionNameById(secondBet.selectionId).get
    await(
      List(fixtureMarketForFirstBet, fixtureMarketForSecondBet)
        .map(_.fixture)
        .traverse_(fixtureMarketRepository.upsert))
    await(
      List(fixtureMarketForFirstBet, fixtureMarketForSecondBet)
        .map(_.selections)
        .traverse_(fixtureMarketRepository.upsert))
    await(
      List(fixtureMarketForFirstBet, fixtureMarketForSecondBet).map(_.market).traverse_(fixtureMarketRepository.upsert))

    When("data is aggregated")

    val result = await(sportsLiabilityData.getData(givenReportingPeriod))

    Then("all open bets from given period are properly reported")
    result.size should be(2)

    result(0) shouldBe
    SportsLiabilityRow(
      gamingDate = DateField(givenReportingPeriod.periodStart),
      patronId = PatronIdField(firstBet.punterId),
      accountDesignation = AccountDesignationField(RealAccount),
      betId = BetIdField(firstBet.betId),
      eventType = SportDisciplineField(Other),
      eventName = StringField(fixtureMarketForFirstBet.fixture.name),
      betDateTime = DateTimeField(firstBet.placedAt),
      eventDate = DateTimeField(fixtureMarketForFirstBet.fixture.startTime),
      wagerDescription = StringField(fixtureMarketForFirstBet.market.name),
      betSelection = StringField(firstBetSelectionName),
      betAmount = MoneyField(firstBet.stake.value.amount),
      status = BetStatusField(BetStatus.Open))

    result(1) shouldBe
    SportsLiabilityRow(
      gamingDate = DateField(givenReportingPeriod.periodStart),
      patronId = PatronIdField(secondBet.punterId),
      accountDesignation = AccountDesignationField(RealAccount),
      betId = BetIdField(secondBet.betId),
      eventType = SportDisciplineField(Other),
      eventName = StringField(fixtureMarketForSecondBet.fixture.name),
      betDateTime = DateTimeField(secondBet.placedAt),
      eventDate = DateTimeField(fixtureMarketForSecondBet.fixture.startTime),
      wagerDescription = StringField(fixtureMarketForSecondBet.market.name),
      betSelection = StringField(secondBetSelectionName),
      betAmount = MoneyField(secondBet.stake.value.amount),
      status = BetStatusField(BetStatus.Open))
  }
}
