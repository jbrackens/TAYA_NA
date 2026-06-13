package phoenix.reports.acceptance

import akka.stream.scaladsl.Sink
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.Stake
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.reports.ProductionReportsModule
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent.BetOpened
import phoenix.reports.domain.model.bets.BetEvent.BetSettled
import phoenix.reports.domain.model.wallets.Adjustments
import phoenix.reports.domain.model.wallets.DailyBalance
import phoenix.reports.domain.model.wallets.DailyWalletSummary
import phoenix.reports.domain.model.wallets.Deposits
import phoenix.reports.domain.model.wallets.Lifetime
import phoenix.reports.domain.model.wallets.Turnover
import phoenix.reports.domain.model.wallets.Withdrawals
import phoenix.reports.infrastructure.SlickBetEventsRepository
import phoenix.reports.infrastructure.SlickWalletSummaryRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment

final class ReportsModuleAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec {

  val eventuallyTimeout: Timeout = Timeout(Span(30, Seconds))
  val eventuallyInterval: Interval = Interval(Span(10, Millis))

  val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  implicit val clock = environment.clock
  val reportingBets = new SlickBetEventsRepository(dbConfig)
  val dailySummaries = new SlickWalletSummaryRepository(dbConfig, environment.clock)
  val applicationPunterRepository = new InMemoryPuntersRepository()

  new ProductionReportsModule(
    environment.clock,
    environment.schedulerModule.akkaJobScheduler,
    environment.mailer,
    dbConfig,
    applicationPunterRepository)(system, ec)

  "Opening a bet should populate reporting side" in {
    // given
    val market = environment.marketScenarios.bettableMarket()
    val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

    // when
    val betId = environment.betScenarios.placedBet(
      punter.punterId,
      market.marketId,
      market.selections.head,
      Stake.unsafe(DefaultCurrencyMoney(21.37)))

    // then
    val today = environment.clock.currentOffsetDateTime()
    eventually(eventuallyTimeout, eventuallyInterval) {
      val betEvents =
        await(
          reportingBets
            .findEventsWithinPeriod(ReportingPeriod.enclosingDay(today, environment.clock))
            .runWith(Sink.seq))
      betEvents.exists(event => event.betData.betId == betId && event.isInstanceOf[BetOpened]) shouldBe true
    }
  }

  "Settling a bet should populate reporting side" in {
    // given
    val market = environment.marketScenarios.bettableMarket()
    val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(2137))

    // when
    val betId = environment.betScenarios.settledBet(
      punter.punterId,
      market.marketId,
      market.selections.head,
      Stake.unsafe(DefaultCurrencyMoney(21.37)))

    // then
    val today = environment.clock.currentOffsetDateTime()
    eventually(eventuallyTimeout, eventuallyInterval) {
      val betEvents =
        await(
          reportingBets
            .findEventsWithinPeriod(ReportingPeriod.enclosingDay(today, environment.clock))
            .runWith(Sink.seq))
      betEvents.exists(event => event.betData.betId == betId && event.isInstanceOf[BetOpened]) shouldBe true
      betEvents.exists(event => event.betData.betId == betId && event.isInstanceOf[BetSettled]) shouldBe true
    }
  }

  "Deposits should populate reporting side" in {
    // given
    val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(0))

    // and
    environment.walletScenarios.deposit(punter.walletId, MoneyAmount(2137))

    // then
    val today = environment.clock.currentOffsetDateTime()
    val reportingDay = ReportingPeriod.enclosingDay(today, environment.clock)

    eventually(eventuallyTimeout, eventuallyInterval) {
      val summaries = awaitSource(dailySummaries.getDailyWalletSummary(reportingDay))
      summaries should contain(
        DailyWalletSummary(
          punterId = punter.punterId,
          day = reportingDay,
          deposits = Deposits(total = MoneyAmount(2137)),
          withdrawals = Withdrawals(
            confirmed = MoneyAmount.zero.get,
            cancelled = MoneyAmount.zero.get,
            pending = MoneyAmount.zero.get),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount.zero.get, closing = MoneyAmount(2137)),
          lifetime = Lifetime(MoneyAmount(2137.00), MoneyAmount(0)),
          turnover = Turnover.empty))
    }
  }

  "Pending withdrawals should not be visible on reporting side" in {
    // given
    val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(500))

    // and
    environment.walletScenarios.pendingWithdrawal(punter.walletId, MoneyAmount(50))
    environment.walletScenarios.deposit(punter.walletId, MoneyAmount(200))

    // then
    val today = environment.clock.currentOffsetDateTime()
    val reportingDay = ReportingPeriod.enclosingDay(today, environment.clock)

    eventually(eventuallyTimeout, eventuallyInterval) {
      val summaries = awaitSource(dailySummaries.getDailyWalletSummary(reportingDay))
      summaries should contain(
        DailyWalletSummary(
          punterId = punter.punterId,
          day = reportingDay,
          deposits = Deposits(total = MoneyAmount(200)),
          withdrawals = Withdrawals(
            confirmed = MoneyAmount.zero.get,
            cancelled = MoneyAmount.zero.get,
            pending = MoneyAmount(50.0)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount.zero.get, closing = MoneyAmount(650)),
          lifetime = Lifetime(MoneyAmount(200.00), MoneyAmount(0)),
          turnover = Turnover.empty))
    }
  }

  "Confirmed withdrawals should populate reporting side" in {
    // given
    val punter = environment.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(300))

    // and
    environment.walletScenarios.confirmedWithdrawal(punter.walletId, MoneyAmount(50))

    // then
    val today = environment.clock.currentOffsetDateTime()
    val reportingDay = ReportingPeriod.enclosingDay(today, environment.clock)

    eventually(eventuallyTimeout, eventuallyInterval) {
      val summaries = awaitSource(dailySummaries.getDailyWalletSummary(reportingDay))
      summaries should contain(
        DailyWalletSummary(
          punterId = punter.punterId,
          day = reportingDay,
          deposits = Deposits(total = MoneyAmount.zero.get),
          withdrawals =
            Withdrawals(confirmed = MoneyAmount(50), cancelled = MoneyAmount.zero.get, pending = MoneyAmount(50)),
          adjustments = Adjustments(MoneyAmount(0)),
          balance = DailyBalance(opening = MoneyAmount.zero.get, closing = MoneyAmount(250)),
          lifetime = Lifetime(MoneyAmount(0), MoneyAmount(50.0)),
          turnover = Turnover.empty))
    }
  }
}
