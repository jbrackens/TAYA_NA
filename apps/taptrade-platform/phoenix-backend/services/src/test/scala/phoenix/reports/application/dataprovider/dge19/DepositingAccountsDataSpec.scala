package phoenix.reports.application.dataprovider.dge19
import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.dataprovider.aml.DepositingAccountsData
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields.ActivationPathField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.aml.DepositingAccounts.DepositingAccountsReportRow
import phoenix.reports.infrastructure.InMemoryPuntersRepository
import phoenix.reports.infrastructure.InMemoryWalletSummaryRepository
import phoenix.reports.support.PunterWithBalanceScenario
import phoenix.support.DataGenerator.generateAccountBalance
import phoenix.support.DataGenerator.generateBetTransaction
import phoenix.support.DataGenerator.generatePaymentTransaction
import phoenix.support.FutureSupport
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class DepositingAccountsDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)
  val clock: Clock = Clock.utcClock

  "A DepositingAccountsData" should {
    "correctly calculate per-day stats" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
      val walletSummaries = new InMemoryWalletSummaryRepository(clock)
      val puntersRepository = new InMemoryPuntersRepository()
      val puntersFinder = new PuntersFinder(puntersRepository)

      // and: first punter - deposit, withdrawal
      val firstPunter = generatePunterId()
      await(
        puntersRepository.upsert(
          PunterProfile(
            firstPunter,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      val longTimeAgo = reportingDay.minusYears(1)
      val firstPunterWallet = new PunterWithBalanceScenario(firstPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(firstPunterWallet.setup(walletSummaries))

      val firstPunterDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(50),
        currentBalance = generateAccountBalance(firstPunterWallet.walletBalance),
        timestamp = reportingDay.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterDeposit))

      val firstPunterWithdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(10),
        currentBalance = firstPunterDeposit.currentBalance,
        timestamp = reportingDay.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterWithdrawal))

      // and: second punter - deposit, withdrawal, two bets, won & lost
      val secondPunter = generatePunterId()
      await(
        puntersRepository.upsert(
          PunterProfile(
            secondPunter,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      val secondPunterWallet =
        new PunterWithBalanceScenario(secondPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(secondPunterWallet.setup(walletSummaries))

      val secondPunterDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(10),
        currentBalance = generateAccountBalance(secondPunterWallet.walletBalance),
        timestamp = reportingDay.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterDeposit))

      val secondPunterWithdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(50),
        currentBalance = secondPunterDeposit.currentBalance,
        timestamp = reportingDay.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterWithdrawal))

      val betReserved = generateBetTransaction(
        reason = TransactionReason.FundsReservedForBet,
        amount = MoneyAmount(20),
        timestamp = reportingDay.plusHours(3),
        currentBalance = secondPunterWithdrawal.currentBalance)
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, betReserved))

      val betCancelled = generateBetTransaction(
        reason = TransactionReason.BetCancelled,
        amount = MoneyAmount(10),
        timestamp = reportingDay.plusHours(4),
        currentBalance = betReserved.currentBalance)
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, betCancelled))

      // and
      val objectUnderTest =
        new DepositingAccountsData(puntersFinder, walletSummaries)

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(reportingDay, clock)
      val reportData = await(objectUnderTest.getData(reportingPeriod))

      // then
      reportData should have size 2

      // and
      reportData.find(_.accountId.value == firstPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(firstPunter),
          kbaStatus = ActivationPathField(ActivationPath.Manual),
          deposits = MoneyField(50.00),
          withdrawals = MoneyField(10.00),
          lifetimeDeposits = MoneyField(50.00),
          lifetimeWithdrawals = MoneyField(10.00),
          sportTurnover = MoneyField(0)))

      reportData.find(_.accountId.value == secondPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(secondPunter),
          kbaStatus = ActivationPathField(ActivationPath.Manual),
          deposits = MoneyField(10.00),
          withdrawals = MoneyField(50.00),
          lifetimeDeposits = MoneyField(10.00),
          lifetimeWithdrawals = MoneyField(50.00),
          sportTurnover = MoneyField(10.00)))
    }

    "correctly calculate per-week and per-month stats" in {
      // given
      val reportingDay = OffsetDateTime.of(2021, 5, 23, 0, 0, 0, 0, ZoneOffset.UTC)
      val walletSummaries = new InMemoryWalletSummaryRepository(clock)
      val puntersRepository = new InMemoryPuntersRepository()
      val puntersFinder = new PuntersFinder(puntersRepository)

      // and: first punter - deposit, withdrawal
      val firstPunter = generatePunterId()
      await(
        puntersRepository.upsert(
          PunterProfile(
            firstPunter,
            generatePunterName(),
            false,
            ActivationPath.Manual,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      val longTimeAgo = reportingDay.minusYears(1)
      val firstPunterWallet = new PunterWithBalanceScenario(firstPunter, walletBalance = MoneyAmount(100), longTimeAgo)
      await(firstPunterWallet.setup(walletSummaries))

      val firstPunterDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(50),
        currentBalance = generateAccountBalance(firstPunterWallet.walletBalance),
        timestamp = reportingDay.minusDays(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterDeposit))

      val firstPunterWithdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(10),
        currentBalance = firstPunterDeposit.currentBalance,
        timestamp = reportingDay.minusDays(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterWithdrawal))

      // and: second punter - deposit, withdrawal, two bets, won & lost
      val secondPunter = generatePunterId()
      await(
        puntersRepository.upsert(
          PunterProfile(
            secondPunter,
            generatePunterName(),
            false,
            ActivationPath.IDPV,
            suspensionReason = None,
            verifiedAt = None,
            verifiedBy = None)))
      val secondPunterWallet =
        new PunterWithBalanceScenario(secondPunter, walletBalance = MoneyAmount(200), longTimeAgo)
      await(secondPunterWallet.setup(walletSummaries))

      val betCancelledWithinMonth = generateBetTransaction(
        reason = TransactionReason.BetCancelled,
        amount = MoneyAmount(5),
        timestamp = reportingDay.minusDays(10),
        currentBalance = generateAccountBalance(secondPunterWallet.walletBalance))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, betCancelledWithinMonth))

      val secondPunterDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(10),
        currentBalance = betCancelledWithinMonth.currentBalance,
        timestamp = reportingDay.minusDays(3))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterDeposit))

      val secondPunterWithdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(10),
        currentBalance = secondPunterDeposit.currentBalance,
        timestamp = reportingDay.minusDays(3))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterWithdrawal))

      val betReserved = generateBetTransaction(
        reason = TransactionReason.FundsReservedForBet,
        amount = MoneyAmount(10),
        timestamp = reportingDay.minusDays(2),
        currentBalance = secondPunterWithdrawal.currentBalance)
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, betReserved))

      val betCancelled = generateBetTransaction(
        reason = TransactionReason.BetCancelled,
        amount = MoneyAmount(5),
        timestamp = reportingDay.minusDays(2),
        currentBalance = betReserved.currentBalance)
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, betCancelled))

      // and
      val objectUnderTest =
        new DepositingAccountsData(puntersFinder, walletSummaries)

      // when
      val reportingWeekPeriod = ReportingPeriod.enclosingWeek(reportingDay, clock)
      val reportingMonthPeriod = ReportingPeriod.enclosingMonth(reportingDay, clock)

      val reportWeekData = await(objectUnderTest.getData(reportingWeekPeriod))
      val reportMonthData = await(objectUnderTest.getData(reportingMonthPeriod))

      // then
      reportWeekData should have size 2
      reportMonthData should have size 2

      // and
      reportWeekData.find(_.accountId.value == firstPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(firstPunter),
          kbaStatus = ActivationPathField(ActivationPath.Manual),
          deposits = MoneyField(50.00),
          withdrawals = MoneyField(10.00),
          lifetimeDeposits = MoneyField(50.00),
          lifetimeWithdrawals = MoneyField(10.00),
          sportTurnover = MoneyField(0)))

      reportWeekData.find(_.accountId.value == secondPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(secondPunter),
          kbaStatus = ActivationPathField(ActivationPath.IDPV),
          deposits = MoneyField(10.00),
          withdrawals = MoneyField(10.00),
          lifetimeDeposits = MoneyField(10.00),
          lifetimeWithdrawals = MoneyField(10.00),
          sportTurnover = MoneyField(0.00)))

      reportMonthData.find(_.accountId.value == firstPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(firstPunter),
          kbaStatus = ActivationPathField(ActivationPath.Manual),
          deposits = MoneyField(50.00),
          withdrawals = MoneyField(10.00),
          lifetimeDeposits = MoneyField(50.00),
          lifetimeWithdrawals = MoneyField(10.00),
          sportTurnover = MoneyField(0.00)))

      reportMonthData.find(_.accountId.value == secondPunter) shouldBe
      Some(
        DepositingAccountsReportRow(
          accountId = PatronIdField(secondPunter),
          kbaStatus = ActivationPathField(ActivationPath.IDPV),
          deposits = MoneyField(10.00),
          withdrawals = MoneyField(10.00),
          lifetimeDeposits = MoneyField(10.00),
          lifetimeWithdrawals = MoneyField(10.00),
          sportTurnover = MoneyField(0.00)))
    }
  }

  "generate empty report given no punter who made deposits/withdrawals" in {
    // given
    val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
    val walletSummaries = new InMemoryWalletSummaryRepository(clock)
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersFinder = new PuntersFinder(puntersRepository)

    // and: first punter - two bets
    val firstPunter = generatePunterId()
    await(
      puntersRepository.upsert(
        PunterProfile(
          firstPunter,
          generatePunterName(),
          false,
          ActivationPath.IDPV,
          suspensionReason = None,
          verifiedAt = None,
          verifiedBy = None)))
    val longTimeAgo = reportingDay.minusYears(1)
    val firstPunterWallet = new PunterWithBalanceScenario(firstPunter, walletBalance = MoneyAmount(100), longTimeAgo)
    await(firstPunterWallet.setup(walletSummaries))

    val firstPunterBetLost = generateBetTransaction(
      reason = TransactionReason.BetLost,
      amount = MoneyAmount(40),
      timestamp = reportingDay.plusHours(4),
      currentBalance = generateAccountBalance(firstPunterWallet.walletBalance))
    awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterBetLost))

    val firstPunterBetLost2 = generateBetTransaction(
      reason = TransactionReason.BetLost,
      amount = MoneyAmount(40),
      timestamp = reportingDay.plusHours(4),
      currentBalance = firstPunterBetLost.currentBalance)
    awaitRight(walletSummaries.recordWalletTransaction(firstPunter, firstPunterBetLost2))

    // and: second punter - two bets
    val secondPunter = generatePunterId()
    await(
      puntersRepository.upsert(
        PunterProfile(
          secondPunter,
          generatePunterName(),
          false,
          ActivationPath.KBA,
          suspensionReason = None,
          verifiedAt = None,
          verifiedBy = None)))
    val secondPunterWallet =
      new PunterWithBalanceScenario(secondPunter, walletBalance = MoneyAmount(100), longTimeAgo)
    await(secondPunterWallet.setup(walletSummaries))

    val secondPunterBetWon = generateBetTransaction(
      reason = TransactionReason.BetWon,
      amount = MoneyAmount(10),
      timestamp = reportingDay.plusHours(3),
      currentBalance = generateAccountBalance(secondPunterWallet.walletBalance))
    awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterBetWon))

    val secondPunterBetLost = generateBetTransaction(
      reason = TransactionReason.BetLost,
      amount = MoneyAmount(10),
      timestamp = reportingDay.plusHours(4),
      currentBalance = secondPunterBetWon.currentBalance)
    awaitRight(walletSummaries.recordWalletTransaction(secondPunter, secondPunterBetLost))

    // and
    val objectUnderTest =
      new DepositingAccountsData(puntersFinder, walletSummaries)

    // when
    val reportingPeriod = ReportingPeriod.enclosingDay(reportingDay, clock)
    val reportData = await(objectUnderTest.getData(reportingPeriod))

    // then
    reportData shouldBe empty
  }

  "generate empty report given no punter who made withdrawal" in {
    // given
    val reportingDay = OffsetDateTime.of(2021, 5, 19, 0, 0, 0, 0, ZoneOffset.UTC)
    val walletSummaries = new InMemoryWalletSummaryRepository(clock)
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersFinder = new PuntersFinder(puntersRepository)

    // and: punter - one withdrawal
    val punter = generatePunterId()
    val longTimeAgo = reportingDay.minusYears(1)
    val punterWallet = new PunterWithBalanceScenario(punter, walletBalance = MoneyAmount(100), longTimeAgo)
    await(punterWallet.setup(walletSummaries))

    val punterWithdrawal = generatePaymentTransaction(
      reason = TransactionReason.FundsWithdrawn,
      amount = MoneyAmount(10),
      currentBalance = generateAccountBalance(punterWallet.walletBalance),
      timestamp = reportingDay.minusDays(1))
    awaitRight(walletSummaries.recordWalletTransaction(punter, punterWithdrawal))

    // and
    val objectUnderTest =
      new DepositingAccountsData(puntersFinder, walletSummaries)

    // when
    val reportingPeriod = ReportingPeriod.enclosingDay(reportingDay, clock)
    val reportData = await(objectUnderTest.getData(reportingPeriod))

    // then
    reportData shouldBe empty
  }

  "generate empty report given no data" in {
    // given
    val walletSummaries = new InMemoryWalletSummaryRepository(clock)
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersFinder = new PuntersFinder(puntersRepository)

    val objectUnderTest =
      new DepositingAccountsData(puntersFinder, walletSummaries)

    // when
    val today = clock.currentOffsetDateTime()
    val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)

    val reportData = await(objectUnderTest.getData(reportingPeriod))

    // then
    reportData shouldBe empty
  }
}
