package phoenix.reports.application.dataprovider.dge19

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import cats.data.OptionT
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.OpenedBetsFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dge19.PatronAccountSummary.PatronAccountSummaryReportRow
import phoenix.reports.infrastructure.InMemoryBetEventsRepository
import phoenix.reports.infrastructure.InMemoryBetsRepository
import phoenix.reports.infrastructure.InMemoryWalletSummaryRepository
import phoenix.reports.support.PunterDepositScenario
import phoenix.reports.support.PunterLostScenario
import phoenix.reports.support.PunterPlacedBetScenario
import phoenix.reports.support.PunterResettledScenario
import phoenix.reports.support.PunterWithBalanceScenario
import phoenix.reports.support.PunterWithdrawalScenario
import phoenix.reports.support.PunterWonScenario
import phoenix.support.FutureSupport

final class PatronAccountSummaryDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  val clock: Clock = Clock.utcClock

  "A PatronAccountSummaryData" should {
    "correctly calculate per-fixture stats" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC)

      val betEventsRepository = new InMemoryBetEventsRepository()
      val betsRepository = new InMemoryBetsRepository()
      val walletsRepository = new InMemoryWalletSummaryRepository(clock)
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

      // and: first punter - old but still opened bet, deposit, withdrawal
      val firstPunter = generatePunterId()
      val longTimeAgo = reportingDay.minusYears(1)
      val firstPunterWallet = new PunterWithBalanceScenario(firstPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(firstPunterWallet.setup(walletsRepository))

      val dayBefore = reportingDay.minusDays(1)
      val betPlaced = new PunterPlacedBetScenario(firstPunter, stake = MoneyAmount(10), odds = Odds(1.5), dayBefore)
      await(betPlaced.setup(betEventsRepository, betsRepository, walletsRepository, clock))

      val fundsDeposited = new PunterDepositScenario(firstPunter, amount = MoneyAmount(128), reportingDay)
      await(fundsDeposited.setup(walletsRepository, clock))

      val findsWithdrawn = new PunterWithdrawalScenario(firstPunter, amount = MoneyAmount(64), reportingDay)
      await(findsWithdrawn.setup(walletsRepository, clock))

      // and: second punter - two bets, won & lost
      val secondPunter = generatePunterId()
      val secondPunterWallet =
        new PunterWithBalanceScenario(secondPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(secondPunterWallet.setup(walletsRepository))

      val betWon = new PunterWonScenario(secondPunter, stake = MoneyAmount(50), odds = Odds(1.5), reportingDay)
      await(betWon.setup(betEventsRepository, betsRepository, walletsRepository, clock))

      val betLost = new PunterLostScenario(secondPunter, stake = MoneyAmount(20), odds = Odds(1.7), reportingDay)
      await(betLost.setup(betEventsRepository, betsRepository, walletsRepository, clock))

      // and: third punter - two bets, settle & resettle
      val thirdPunter = generatePunterId()
      val thirdPunterWallet =
        new PunterWithBalanceScenario(thirdPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(thirdPunterWallet.setup(walletsRepository))

      val betWon2 = new PunterWonScenario(thirdPunter, stake = MoneyAmount(50), odds = Odds(1.5), reportingDay)
      await(betWon2.setup(betEventsRepository, betsRepository, walletsRepository, clock))

      val betResettled =
        new PunterResettledScenario(thirdPunter, stake = MoneyAmount(40), odds = Odds(1.7), reportingDay)
      await(betResettled.setup(betEventsRepository, betsRepository, walletsRepository, clock))

      // and
      val objectUnderTest =
        new PatronAccountSummaryData(
          betEventsRepository,
          new OpenedBetsFinder(betsRepository),
          walletsRepository,
          new PuntersFinder(puntersRepository))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(reportingDay, clock)
      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData should have size 3

      // and
      reportData(0) shouldBe
      PatronAccountSummaryReportRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(firstPunter),
        accountDesignation = AccountDesignationField(RealAccount),
        openingBalance = MoneyField(90),
        patronCashDeposits = MoneyField(128),
        patronWithdrawals = MoneyField(64),
        patronCanceledWithdrawals = MoneyField(0),
        adjustments = MoneyField(0),
        netBonusMovement = MoneyField(0),
        transfersToSports = MoneyField(0),
        canceledSportWagers = MoneyField(0),
        voidSportWager = MoneyField(0),
        resettledSportsWager = MoneyField(0),
        transfersFromSports = MoneyField(0),
        endingSportsGameFunds = MoneyField(10),
        patronSportsWinLoss = MoneyField(0),
        transfersToPrediction = MoneyField(0),
        cancelledPredictionOrders = MoneyField(0),
        transfersFromPrediction = MoneyField(0),
        endingPredictionExposure = MoneyField(0),
        patronPredictionWinLoss = MoneyField(0),
        federalTax = MoneyField(0),
        stateTax = MoneyField(0),
        closingBalance = MoneyField(154))

      reportData(1) shouldBe
      PatronAccountSummaryReportRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(secondPunter),
        accountDesignation = AccountDesignationField(RealAccount),
        openingBalance = MoneyField(100),
        patronCashDeposits = MoneyField(0),
        patronWithdrawals = MoneyField(0),
        patronCanceledWithdrawals = MoneyField(0),
        adjustments = MoneyField(0),
        netBonusMovement = MoneyField(0),
        transfersToSports = MoneyField(70),
        canceledSportWagers = MoneyField(0),
        voidSportWager = MoneyField(0),
        resettledSportsWager = MoneyField(0),
        transfersFromSports = MoneyField(75),
        endingSportsGameFunds = MoneyField(0),
        patronSportsWinLoss = MoneyField(5),
        transfersToPrediction = MoneyField(0),
        cancelledPredictionOrders = MoneyField(0),
        transfersFromPrediction = MoneyField(0),
        endingPredictionExposure = MoneyField(0),
        patronPredictionWinLoss = MoneyField(0),
        federalTax = MoneyField(0),
        stateTax = MoneyField(0),
        closingBalance = MoneyField(105))

      reportData(2) shouldBe
      PatronAccountSummaryReportRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(thirdPunter),
        accountDesignation = AccountDesignationField(RealAccount),
        openingBalance = MoneyField(100),
        patronCashDeposits = MoneyField(0),
        patronWithdrawals = MoneyField(0),
        patronCanceledWithdrawals = MoneyField(0),
        adjustments = MoneyField(0),
        netBonusMovement = MoneyField(0),
        transfersToSports = MoneyField(90),
        canceledSportWagers = MoneyField(0),
        voidSportWager = MoneyField(0),
        resettledSportsWager = MoneyField(68),
        transfersFromSports = MoneyField(143),
        endingSportsGameFunds = MoneyField(0),
        patronSportsWinLoss = MoneyField(121),
        transfersToPrediction = MoneyField(0),
        cancelledPredictionOrders = MoneyField(0),
        transfersFromPrediction = MoneyField(0),
        endingPredictionExposure = MoneyField(0),
        patronPredictionWinLoss = MoneyField(0),
        federalTax = MoneyField(0),
        stateTax = MoneyField(0),
        closingBalance = MoneyField(153))
    }

    "generate empty report given no data" in {
      // given
      val betEventsRepository = new InMemoryBetEventsRepository()
      val betsRepository = new InMemoryBetsRepository()
      val walletsRepository = new InMemoryWalletSummaryRepository(clock)
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

      val objectUnderTest =
        new PatronAccountSummaryData(
          betEventsRepository,
          new OpenedBetsFinder(betsRepository),
          walletsRepository,
          new PuntersFinder(puntersRepository))

      // when
      val today = clock.currentOffsetDateTime()
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)

      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData shouldBe empty
    }

    "include prediction breakdown columns when prediction activity exists" in {
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 20, 0, 0, 0, ZoneOffset.UTC)

      val betEventsRepository = new InMemoryBetEventsRepository()
      val betsRepository = new InMemoryBetsRepository()
      val walletsRepository = new InMemoryWalletSummaryRepository(clock)
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

      val punter = generatePunterId()
      val punterWallet = new PunterWithBalanceScenario(punter, walletBalance = MoneyAmount(100), reportingDay.minusDays(2))
      await(punterWallet.setup(walletsRepository))

      val predictionSummaryProvider = new PredictionReportingSummaryProvider {
        override def summarizePunters(reportingPeriod: ReportingPeriod, punterIds: Set[PunterId])(implicit
            ec: ExecutionContext): Future[Map[PunterId, PredictionPunterReportSummary]] =
          Future.successful(
            punterIds.map(id =>
              id -> PredictionPunterReportSummary(
                transfersToPrediction = MoneyAmount(22),
                cancelledPredictionOrders = MoneyAmount(7),
                transfersFromPrediction = MoneyAmount(35),
                endingPredictionExposure = MoneyAmount(11),
                patronPredictionWinLoss = MoneyAmount(13))).toMap)

        override def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionMarketReportSummary]] =
          Future.successful(Seq.empty)

        override def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionResultCategorySummary]] =
          Future.successful(Seq.empty)

        override def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]] =
          Future.successful(Seq.empty)
      }

      val objectUnderTest =
        new PatronAccountSummaryData(
          betEventsRepository,
          new OpenedBetsFinder(betsRepository),
          walletsRepository,
          new PuntersFinder(puntersRepository),
          predictionSummaryProvider)

      val reportingPeriod = ReportingPeriod.enclosingDay(reportingDay, clock)
      val reportData = await(objectUnderTest.getData(reportingPeriod))

      reportData should contain only
      PatronAccountSummaryReportRow(
        gamingDate = DateField(reportingPeriod.periodStart),
        patronId = PatronIdField(punter),
        accountDesignation = AccountDesignationField(RealAccount),
        openingBalance = MoneyField(100),
        patronCashDeposits = MoneyField(0),
        patronWithdrawals = MoneyField(0),
        patronCanceledWithdrawals = MoneyField(0),
        adjustments = MoneyField(0),
        netBonusMovement = MoneyField(0),
        transfersToSports = MoneyField(0),
        canceledSportWagers = MoneyField(0),
        voidSportWager = MoneyField(0),
        resettledSportsWager = MoneyField(0),
        transfersFromSports = MoneyField(0),
        endingSportsGameFunds = MoneyField(0),
        patronSportsWinLoss = MoneyField(0),
        transfersToPrediction = MoneyField(22),
        cancelledPredictionOrders = MoneyField(7),
        transfersFromPrediction = MoneyField(35),
        endingPredictionExposure = MoneyField(11),
        patronPredictionWinLoss = MoneyField(13),
        federalTax = MoneyField(0),
        stateTax = MoneyField(0),
        closingBalance = MoneyField(100))
    }
  }
}
