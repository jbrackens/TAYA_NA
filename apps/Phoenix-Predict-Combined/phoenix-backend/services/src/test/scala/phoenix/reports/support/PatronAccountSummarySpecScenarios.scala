package phoenix.reports.support

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.BetsRepository
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.bets.NormalizedStake
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.randomString
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.{Bet => WalletBCBet}
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

final class PunterWithBalanceScenario(punterId: PunterId, val walletBalance: MoneyAmount, time: OffsetDateTime) {

  def setup(wallets: WalletSummaryRepository)(implicit ec: ExecutionContext): Future[Unit] =
    wallets
      .createWallet(punterId, Balance(RealMoney(DefaultCurrencyMoney(walletBalance.amount))), createdAt = time)
      .rethrowT
}

final class PunterPlacedBetScenario(punterId: PunterId, stake: MoneyAmount, odds: Odds, time: OffsetDateTime) {

  val betId: BetId = generateBetId()
  val marketId: MarketId = generateMarketId()
  val selectionId: SelectionId = generateSelectionId()
  val betData: BetData = BetData(betId, punterId, selectionId, marketId, stake, odds)

  def setup(betEvents: BetEventsRepository, bets: BetsRepository, wallets: WalletSummaryRepository, clock: Clock)(
      implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] =
    for {
      _ <- setupBetEvents(betEvents)
      _ <- setupBetRepository(bets)
      _ <- setupWallet(wallets, clock)
    } yield ()

  private def setupBetEvents(betEvents: BetEventsRepository): Future[Unit] = {
    val betOpenedEvent = ESportEvents.betOpened(EventId.random(), betData, time)
    betEvents.upsert(betOpenedEvent)
  }

  private def setupBetRepository(betsRepository: BetsRepository): Future[Unit] = {
    val openedBet =
      Bet(
        betId,
        punterId,
        marketId,
        selectionId,
        NormalizedStake(stake),
        placedAt = time,
        closedAt = None,
        initialSettlementData = None)
    betsRepository.upsert(openedBet)
  }

  private def setupWallet(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = BetTransaction(
        transactionId = randomString(),
        reason = TransactionReason.FundsReservedForBet,
        amount = MoneyAmount(stake.amount),
        timestamp = time,
        previousBalance = currentBalance,
        bet = WalletBCBet(betId, RealMoney(stake), odds))
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

final class PunterWonScenario(punterId: PunterId, stake: MoneyAmount, odds: Odds, time: OffsetDateTime) {

  val betPlacedScenario = new PunterPlacedBetScenario(punterId, stake, odds, time)

  def setup(betEvents: BetEventsRepository, bets: BetsRepository, wallets: WalletSummaryRepository, clock: Clock)(
      implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] =
    for {
      _ <- betPlacedScenario.setup(betEvents, bets, wallets, clock)
      _ <- setupBetEvents(betEvents)
      _ <- setupBetRepository(bets)
      _ <- setupWallet(wallets, clock)
    } yield ()

  private def setupBetEvents(betEvents: BetEventsRepository): Future[Unit] = {
    val betSettled = ESportEvents.betSettled(
      EventId.random(),
      betPlacedScenario.betData,
      operationTime = time,
      paidAmount = betPlacedScenario.betData.potentialReturn)
    betEvents.upsert(betSettled)
  }

  private def setupBetRepository(betsRepository: BetsRepository): Future[Unit] = {
    val settledBet = Bet(
      betPlacedScenario.betId,
      betPlacedScenario.betData.punterId,
      betPlacedScenario.betData.marketId,
      betPlacedScenario.betData.selectionId,
      NormalizedStake(betPlacedScenario.betData.stake),
      placedAt = time,
      closedAt = Some(time),
      initialSettlementData = Some(time))
    betsRepository.upsert(settledBet)
  }

  private def setupWallet(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = BetTransaction(
        transactionId = randomString(),
        reason = TransactionReason.BetWon,
        amount = betPlacedScenario.betData.potentialReturn,
        timestamp = time,
        previousBalance = currentBalance,
        bet = WalletBCBet(
          betPlacedScenario.betId,
          RealMoney(betPlacedScenario.betData.stake),
          betPlacedScenario.betData.odds))
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

final class PunterResettledScenario(punterId: PunterId, stake: MoneyAmount, odds: Odds, time: OffsetDateTime) {

  val betPlacedScenario = new PunterPlacedBetScenario(punterId, stake, odds, time)

  def setup(betEvents: BetEventsRepository, bets: BetsRepository, wallets: WalletSummaryRepository, clock: Clock)(
      implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] =
    for {
      _ <- betPlacedScenario.setup(betEvents, bets, wallets, clock)
      _ <- setupBetEvents(betEvents)
      _ <- setupBetRepository(bets)
      _ <- setupWallet(wallets, clock)
    } yield ()

  private def setupBetEvents(betEvents: BetEventsRepository): Future[Unit] = {
    val betSettled = ESportEvents.betSettled(
      EventId.random(),
      betPlacedScenario.betData,
      operationTime = time,
      paidAmount = betPlacedScenario.betData.potentialReturn)

    val winnerFunds = betPlacedScenario.betData.potentialReturn
    val betResettled = ESportEvents.betResettled(
      EventId.random(),
      betPlacedScenario.betData,
      operationTime = time.plusMinutes(30),
      unsettledAmount = MoneyAmount.zero.get,
      resettledAmount = winnerFunds)
    betEvents.upsert(betSettled)
    betEvents.upsert(betResettled)
  }

  private def setupBetRepository(betsRepository: BetsRepository): Future[Unit] = {
    val settledBet = Bet(
      betPlacedScenario.betId,
      betPlacedScenario.betData.punterId,
      betPlacedScenario.betData.marketId,
      betPlacedScenario.betData.selectionId,
      NormalizedStake(betPlacedScenario.betData.stake),
      placedAt = time,
      closedAt = Some(time),
      initialSettlementData = Some(time))
    betsRepository.upsert(settledBet)
  }

  private def setupWallet(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = BetTransaction(
        transactionId = randomString(),
        reason = TransactionReason.BetResettled,
        amount = betPlacedScenario.betData.potentialReturn,
        timestamp = time,
        previousBalance = currentBalance,
        bet = WalletBCBet(
          betPlacedScenario.betId,
          RealMoney(betPlacedScenario.betData.stake),
          betPlacedScenario.betData.odds))
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

final class PunterLostScenario(punterId: PunterId, stake: MoneyAmount, odds: Odds, time: OffsetDateTime) {

  val betPlacedScenario = new PunterPlacedBetScenario(punterId, stake, odds, time)

  def setup(betEvents: BetEventsRepository, bets: BetsRepository, wallets: WalletSummaryRepository, clock: Clock)(
      implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] =
    for {
      _ <- betPlacedScenario.setup(betEvents, bets, wallets, clock)
      _ <- setupBetEvents(betEvents)
      _ <- setupBetRepository(bets)
      _ <- setupWallet(wallets, clock)
    } yield ()

  private def setupBetEvents(betEvents: BetEventsRepository): Future[Unit] = {
    val betSettled = ESportEvents.betSettled(
      EventId.random(),
      betPlacedScenario.betData,
      operationTime = time,
      paidAmount = MoneyAmount.zero.get)
    betEvents.upsert(betSettled)
  }

  private def setupBetRepository(betsRepository: BetsRepository): Future[Unit] = {
    val settledBet = Bet(
      betPlacedScenario.betId,
      betPlacedScenario.betData.punterId,
      betPlacedScenario.betData.marketId,
      betPlacedScenario.betData.selectionId,
      NormalizedStake(betPlacedScenario.betData.stake),
      placedAt = time,
      closedAt = Some(time),
      initialSettlementData = Some(time))
    betsRepository.upsert(settledBet)
  }

  private def setupWallet(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = BetTransaction(
        transactionId = randomString(),
        reason = TransactionReason.BetLost,
        amount = betPlacedScenario.betData.stake,
        timestamp = time,
        previousBalance = currentBalance,
        bet = WalletBCBet(
          betPlacedScenario.betId,
          RealMoney(betPlacedScenario.betData.stake),
          betPlacedScenario.betData.odds))
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

final class PunterDepositScenario(punterId: PunterId, amount: MoneyAmount, time: OffsetDateTime) {

  def setup(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = PaymentTransaction(
        transactionId = randomString(),
        reason = TransactionReason.FundsDeposited,
        amount = amount,
        timestamp = time,
        paymentMethod = PaymentMethod.CreditCardPaymentMethod,
        previousBalance = currentBalance)
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

final class PunterWithdrawalScenario(punterId: PunterId, amount: MoneyAmount, time: OffsetDateTime) {

  def setup(walletsRepository: WalletSummaryRepository, clock: Clock)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[Unit] = {
    val reportingDay = ReportingPeriod.enclosingDay(time, clock)
    for {
      currentBalance <- WalletScenariosSupport.getPreviousBalance(punterId, reportingDay, walletsRepository)
      transaction = PaymentTransaction(
        transactionId = randomString(),
        reason = TransactionReason.FundsWithdrawn,
        amount = amount,
        timestamp = time,
        paymentMethod = PaymentMethod.CreditCardPaymentMethod,
        previousBalance = currentBalance)
      _ <- walletsRepository.recordWalletTransaction(punterId, transaction).rethrowT
    } yield ()
  }
}

private object WalletScenariosSupport {
  def getPreviousBalance(
      punterId: PunterId,
      reportingDay: ReportingPeriod.Day,
      walletsRepository: WalletSummaryRepository)(implicit
      ec: ExecutionContext,
      mat: Materializer): Future[AccountBalance] =
    walletsRepository
      .getDailyWalletSummary(reportingDay)
      .filter(_.punterId == punterId)
      .runWith(Sink.head)
      .map(_.balance.closing)
      .map(closingBalance => AccountBalance(available = closingBalance, blocked = noBlockedFunds))

  private lazy val noBlockedFunds = BlockedFunds(MoneyAmount(0), MoneyAmount(0))
}
