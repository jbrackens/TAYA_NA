package phoenix.reports.integration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency._
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.reports.domain.PunterWalletAlreadyExist
import phoenix.reports.domain.PunterWalletNotFound
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.wallets.Adjustments
import phoenix.reports.domain.model.wallets.DailyBalance
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.reports.domain.model.wallets.Deposits
import phoenix.reports.domain.model.wallets.Lifetime
import phoenix.reports.domain.model.wallets.Turnover
import phoenix.reports.domain.model.wallets.Withdrawals
import phoenix.reports.infrastructure.InMemoryWalletSummaryRepository
import phoenix.reports.infrastructure.SlickWalletSummaryRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateAccountBalance
import phoenix.support.DataGenerator.generateBetTransaction
import phoenix.support.DataGenerator.generatePaymentTransaction
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.domain.Funds.RealMoney

final class WalletSummaryRepositorySpec
    extends AnyFlatSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables
    with RepositoryBehavior {

  private val clock: Clock = Clock.utcClock

  private val inMemoryRepository = () => new InMemoryWalletSummaryRepository(clock)
  private val jdbcRepository = () => {
    truncateTables()
    new SlickWalletSummaryRepository(dbConfig, clock)
  }

  ("InMemoryDailyWalletSummaryRepository" should behave).like(dailyWalletRepository(inMemoryRepository, clock))
  ("SlickDailyWalletSummaryRepository" should behave).like(dailyWalletRepository(jdbcRepository, clock))
}

trait RepositoryBehavior {
  this: AnyFlatSpec with Matchers with FutureSupport =>

  final def dailyWalletRepository(emptyRepository: () => WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Unit = {

    it should "create patron wallet" in {
      // given
      val walletSummaries = emptyRepository()
      val punterId = generatePunterId()

      // and
      val createdAt = clock.currentOffsetDateTime()
      awaitRight(walletSummaries.createWallet(punterId, Balance(RealMoney(DefaultCurrencyMoney(21.37))), createdAt))

      // when
      val today = ReportingPeriod.enclosingDay(createdAt, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(today))

      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = today,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(0), closing = MoneyAmount(21.37)),
          lifetime = Lifetime.empty,
          turnover = Turnover.empty))
    }

    it should "not create patron wallet twice" in {
      // given
      val walletSummaries = emptyRepository()
      val punterId = generatePunterId()
      val balance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))

      // and
      val createdLongTimeAgo = clock.currentOffsetDateTime().minusYears(10)
      awaitRight(walletSummaries.createWallet(punterId, balance, createdLongTimeAgo))

      // when
      val secondAttempt = awaitLeft(walletSummaries.createWallet(punterId, balance, clock.currentOffsetDateTime()))

      // then
      secondAttempt shouldBe a[PunterWalletAlreadyExist]
    }

    it should "update daily balance" in {
      // given
      val walletSummaries = emptyRepository()
      val today = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.DAYS)
      val longTimeAgo = today.minusDays(100)

      // and
      val firstPunter = generatePunterId()
      awaitRight(
        walletSummaries.createWallet(firstPunter, Balance(RealMoney(DefaultCurrencyMoney(21.37))), longTimeAgo))

      val deposit =
        generatePaymentTransaction(
          reason = TransactionReason.FundsDeposited,
          amount = MoneyAmount(100),
          currentBalance = generateAccountBalance(MoneyAmount(21.37)),
          timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, deposit))

      // and
      val secondPunter = generatePunterId()
      awaitRight(
        walletSummaries.createWallet(secondPunter, Balance(RealMoney(DefaultCurrencyMoney(21.37))), longTimeAgo))

      val withdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(10),
        currentBalance = generateAccountBalance(MoneyAmount(21.37)),
        timestamp = today.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, withdrawal))

      // and
      val thirdPunter = generatePunterId()
      awaitRight(walletSummaries.createWallet(thirdPunter, Balance(RealMoney(DefaultCurrencyMoney(100))), longTimeAgo))

      val fundsReservedForBet = generateBetTransaction(
        reason = TransactionReason.FundsReservedForBet,
        amount = MoneyAmount(10),
        currentBalance = generateAccountBalance(MoneyAmount(100)),
        timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(thirdPunter, fundsReservedForBet))

      val betVoided = generateBetTransaction(
        reason = TransactionReason.BetVoided,
        amount = MoneyAmount(20),
        currentBalance = fundsReservedForBet.currentBalance,
        timestamp = today.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(thirdPunter, betVoided))

      val betPushed = generateBetTransaction(
        reason = TransactionReason.BetPushed,
        amount = MoneyAmount(20),
        currentBalance = betVoided.currentBalance,
        timestamp = today.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(thirdPunter, betPushed))

      val betCancelled = generateBetTransaction(
        reason = TransactionReason.BetCancelled,
        amount = MoneyAmount(25),
        currentBalance = betPushed.currentBalance,
        timestamp = today.plusHours(3))
      awaitRight(walletSummaries.recordWalletTransaction(thirdPunter, betCancelled))

      // and
      val fourthPunter = generatePunterId()
      awaitRight(walletSummaries.createWallet(fourthPunter, Balance(RealMoney(DefaultCurrencyMoney(100))), longTimeAgo))

      val fundsReservedForWithdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsReservedForWithdrawal,
        amount = MoneyAmount(50),
        currentBalance = generateAccountBalance(MoneyAmount(100)),
        timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(fourthPunter, fundsReservedForWithdrawal))

      val withdrawalCancelled = generatePaymentTransaction(
        reason = TransactionReason.WithdrawalCancelled,
        amount = MoneyAmount(50),
        currentBalance = fundsReservedForWithdrawal.currentBalance,
        timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(fourthPunter, withdrawalCancelled))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(reportingPeriod))

      // then
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = firstPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(21.37), closing = MoneyAmount(121.37)),
          lifetime = Lifetime(MoneyAmount(100.0), MoneyAmount(0)),
          turnover = Turnover.empty))

      // and
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = secondPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(10), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(21.37), closing = MoneyAmount(11.37)),
          lifetime = Lifetime(MoneyAmount(0), MoneyAmount(10.0)),
          turnover = Turnover.empty))

      // and
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = thirdPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(100), closing = MoneyAmount(155)),
          lifetime = Lifetime.empty,
          turnover = Turnover(MoneyAmount(-15.0))))

      // and
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = fourthPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(50), pending = MoneyAmount(50)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(100), closing = MoneyAmount(100)),
          lifetime = Lifetime.empty,
          turnover = Turnover.empty))
    }

    it should "correctly update lifetime deposit value" in {
      // given
      val walletSummaries = emptyRepository()
      val today = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.DAYS)
      val longTimeAgo = today.minusYears(1)

      // and
      val firstPunter = generatePunterId()
      awaitRight(
        walletSummaries.createWallet(firstPunter, Balance(RealMoney(DefaultCurrencyMoney(200.0))), longTimeAgo))

      val deposit =
        generatePaymentTransaction(
          reason = TransactionReason.FundsDeposited,
          amount = MoneyAmount(50),
          currentBalance = generateAccountBalance(MoneyAmount(200.0)),
          timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, deposit))

      val deposit2 =
        generatePaymentTransaction(
          reason = TransactionReason.FundsDeposited,
          amount = MoneyAmount(50),
          currentBalance = deposit.currentBalance,
          timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, deposit2))

      val deposit3 =
        generatePaymentTransaction(
          reason = TransactionReason.FundsDeposited,
          amount = MoneyAmount(50),
          currentBalance = deposit2.currentBalance,
          timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(firstPunter, deposit3))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(reportingPeriod))

      // then
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = firstPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(150)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(200.0), closing = MoneyAmount(350.0)),
          lifetime = Lifetime(MoneyAmount(150.0), MoneyAmount(0)),
          turnover = Turnover.empty))
    }

    it should "not include daily balance if there's no punter wallet" in {
      // given
      val walletSummaries = emptyRepository()

      // and
      val nonExistingPunter = generatePunterId()
      val withdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(1.27),
        currentBalance = generateAccountBalance(MoneyAmount(31.27)),
        timestamp = clock.currentOffsetDateTime())

      // when
      val attempt = awaitLeft(walletSummaries.recordWalletTransaction(nonExistingPunter, withdrawal))

      // then
      attempt shouldBe a[PunterWalletNotFound]
    }

    it should "include punter even if there's no daily activity" in {
      // given
      val walletSummaries = emptyRepository()
      val today = clock.currentOffsetDateTime()
      val longTimeAgo = today.minusYears(1)

      // and
      val firstPunter = generatePunterId()
      awaitRight(
        walletSummaries.createWallet(firstPunter, Balance(RealMoney(DefaultCurrencyMoney(21.37))), longTimeAgo))

      // and
      val secondPunter = generatePunterId()
      awaitRight(
        walletSummaries.createWallet(secondPunter, Balance(RealMoney(DefaultCurrencyMoney(31.27))), longTimeAgo))

      val yesterday = today.minusDays(1)
      val withdrawal = generatePaymentTransaction(
        reason = TransactionReason.FundsWithdrawn,
        amount = MoneyAmount(1.27),
        currentBalance = generateAccountBalance(MoneyAmount(31.27)),
        timestamp = yesterday)
      awaitRight(walletSummaries.recordWalletTransaction(secondPunter, withdrawal))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(reportingPeriod))

      // then
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = firstPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(MoneyAmount(0), MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(21.37), closing = MoneyAmount(21.37)),
          lifetime = Lifetime.empty,
          turnover = Turnover.empty))

      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = secondPunter,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(0)),
          withdrawals = Withdrawals(MoneyAmount(0), MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(30), closing = MoneyAmount(30)),
          lifetime = Lifetime(MoneyAmount(0), MoneyAmount(1.27)),
          turnover = Turnover.empty))
    }

    it should "only include every punter once in the summary list" in {
      // given
      val walletSummaries = emptyRepository()
      val today = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.DAYS)
      val longTimeAgo = today.minusYears(1)

      // and
      val punterId = generatePunterId()
      awaitRight(walletSummaries.createWallet(punterId, Balance(RealMoney(DefaultCurrencyMoney(21.37))), longTimeAgo))

      // and
      val deposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = generateAccountBalance(MoneyAmount(21.37)),
        timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(reportingPeriod))

      // then
      dailyWalletLogs should have size 1
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(21.37), closing = MoneyAmount(121.37)),
          lifetime = Lifetime(MoneyAmount(100.0), MoneyAmount(0)),
          turnover = Turnover.empty))
    }

    it should "fetch DailyWalletSummary based on day period" in {
      // given
      val walletSummaries = emptyRepository()
      val today = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.DAYS)
      val longTimeAgo = today.minusYears(1)

      // and
      val punterId = generatePunterId()
      awaitRight(walletSummaries.createWallet(punterId, Balance(RealMoney(DefaultCurrencyMoney(221.37))), longTimeAgo))

      // and
      val deposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = generateAccountBalance(MoneyAmount(221.37)),
        timestamp = today.plusHours(1))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit))

      val deposit2 = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = deposit.currentBalance,
        timestamp = today.plusHours(2))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit2))

      // when
      val reportingPeriod = ReportingPeriod.enclosingDay(today, clock)
      val dailyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummary(reportingPeriod))

      // then
      dailyWalletLogs should have size 1
      dailyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = reportingPeriod,
          deposits = Deposits(MoneyAmount(200)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(221.37), closing = MoneyAmount(421.37)),
          lifetime = Lifetime(MoneyAmount(200.0), MoneyAmount(0)),
          turnover = Turnover.empty))
    }

    it should "fetch DailyWalletSummary based on week/month period" in {
      // given
      val walletSummaries = emptyRepository()
      val reportingDay = OffsetDateTime.of(2022, 2, 1, 0, 0, 0, 0, ZoneOffset.UTC)
      val previousWeek = OffsetDateTime.of(2022, 1, 24, 0, 0, 0, 0, ZoneOffset.UTC)
      val previousMonth = OffsetDateTime.of(2022, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)
      val longTimeAgo = reportingDay.minusYears(1)

      // and
      val punterId = generatePunterId()
      awaitRight(walletSummaries.createWallet(punterId, Balance(RealMoney(DefaultCurrencyMoney(31.37))), longTimeAgo))

      // and
      val oldDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(10),
        currentBalance = generateAccountBalance(MoneyAmount(31.37)),
        timestamp = OffsetDateTime.of(2021, 12, 31, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, oldDeposit))

      val deposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = oldDeposit.currentBalance,
        timestamp = OffsetDateTime.of(2022, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit))

      val deposit2 = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = deposit.currentBalance,
        timestamp = OffsetDateTime.of(2022, 1, 23, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit2))

      val deposit3 = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = deposit2.currentBalance,
        timestamp = OffsetDateTime.of(2022, 1, 24, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit3))

      val deposit4 = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = deposit3.currentBalance,
        timestamp = OffsetDateTime.of(2022, 1, 30, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit4))

      val deposit5 = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(100),
        currentBalance = deposit4.currentBalance,
        timestamp = OffsetDateTime.of(2022, 1, 31, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, deposit5))

      val freshDeposit = generatePaymentTransaction(
        reason = TransactionReason.FundsDeposited,
        amount = MoneyAmount(200),
        currentBalance = deposit5.currentBalance,
        timestamp = OffsetDateTime.of(2022, 2, 1, 0, 0, 0, 0, ZoneOffset.UTC))
      awaitRight(walletSummaries.recordWalletTransaction(punterId, freshDeposit))

      // when
      val weeklyReportingPeriod = ReportingPeriod.enclosingWeek(previousWeek, clock)
      val weeklyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummaryByPeriod(weeklyReportingPeriod))

      // then
      weeklyWalletLogs should have size 2
      weeklyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit3.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(241.37), closing = MoneyAmount(341.37)),
          lifetime = Lifetime(MoneyAmount(310.00), MoneyAmount(0)),
          turnover = Turnover.empty))
      weeklyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit4.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(341.37), closing = MoneyAmount(441.37)),
          lifetime = Lifetime(MoneyAmount(410.00), MoneyAmount(0)),
          turnover = Turnover.empty))
      // when
      val monthlyReportingPeriod = ReportingPeriod.enclosingMonth(previousMonth, clock)
      val monthlyWalletLogs = awaitSource(walletSummaries.getDailyWalletSummaryByPeriod(monthlyReportingPeriod))

      // then
      monthlyWalletLogs should have size 5
      monthlyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(41.37), closing = MoneyAmount(141.37)),
          lifetime = Lifetime(MoneyAmount(110.00), MoneyAmount(0)),
          turnover = Turnover.empty))

      monthlyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit2.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(141.37), closing = MoneyAmount(241.37)),
          lifetime = Lifetime(MoneyAmount(210.00), MoneyAmount(0)),
          turnover = Turnover.empty))

      monthlyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit3.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(241.37), closing = MoneyAmount(341.37)),
          lifetime = Lifetime(MoneyAmount(310.00), MoneyAmount(0)),
          turnover = Turnover.empty))
      monthlyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit4.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(341.37), closing = MoneyAmount(441.37)),
          lifetime = Lifetime(MoneyAmount(410.00), MoneyAmount(0)),
          turnover = Turnover.empty))

      monthlyWalletLogs should contain(
        DailyWalletSummary(
          punterId = punterId,
          day = ReportingPeriod.enclosingDay(deposit5.timestamp, clock),
          deposits = Deposits(MoneyAmount(100)),
          withdrawals = Withdrawals(confirmed = MoneyAmount(0), cancelled = MoneyAmount(0), pending = MoneyAmount(0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount(441.37), closing = MoneyAmount(541.37)),
          lifetime = Lifetime(MoneyAmount(510.00), MoneyAmount(0)),
          turnover = Turnover.empty))
    }
  }
}
