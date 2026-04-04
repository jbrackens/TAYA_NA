package phoenix.boundedcontexts.wallet

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.AdminId
import phoenix.support.DataGenerator.randomElement
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.DepositHistory
import phoenix.wallets.domain.Deposits
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus

class WalletContextProviderSuccess(clock: Clock) extends WalletsBoundedContext {

  override def createWallet(walletId: WalletId, initialBalance: Balance)(implicit
      ec: ExecutionContext): EitherT[Future, WalletAlreadyExistsError, Balance] =
    EitherT.safeRightT(
      Balance(
        realMoney = RealMoney(DefaultCurrencyMoney(0)),
        bonusFunds = Seq(BonusFunds(DefaultCurrencyMoney(42.00)))))

  override def deposit(
      walletId: WalletId,
      funds: PositiveAmount[RealMoney],
      reason: CreditFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] = {
    EitherT.safeRightT(
      Balance(
        realMoney = RealMoney(DefaultCurrencyMoney(0)),
        bonusFunds = Seq(BonusFunds(DefaultCurrencyMoney(84.00)))))
  }

  override def withdraw(
      walletId: WalletId,
      withdrawal: PositiveAmount[RealMoney],
      reason: DebitFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance] =
    EitherT.safeRightT(zero)

  override def reserveForWithdrawal(walletId: WalletId, withdrawal: WithdrawalReservation)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    EitherT.safeRightT(WalletFundsReserved(ReservationId("reservation-1"), zero))

  override def finalizeWithdrawal(walletId: WalletId, reservationId: ReservationId, outcome: WithdrawalOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, WithdrawalFinalizationError, Balance] =
    EitherT.safeRightT(zero)

  override def reserveForBet(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    EitherT.safeRightT(WalletFundsReserved(ReservationId("reservation-1"), zero))

  override def finalizeBet(walletId: WalletId, reservationId: ReservationId, outcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] =
    EitherT.safeRightT(zero)

  override def refinalizeBet(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] =
    EitherT.safeRightT(zero)

  override def currentBalance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
    EitherT.safeRightT(
      Balance(
        realMoney = RealMoney(DefaultCurrencyMoney(100)),
        bonusFunds = Seq(BonusFunds(DefaultCurrencyMoney(42.00)))))

  override def walletTransactions(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] =
    Future.successful(
      PaginatedResult(
        totalCount = 2,
        data = getRandomTransactions(query.walletId),
        paginationRequest = Pagination(currentPage = 1, itemsPerPage = 10)))

  override def allWalletTransactions(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed] =
    Source(getRandomTransactions(query.walletId))

  private def getRandomTransactions(walletId: WalletId): Seq[WalletTransaction] = {
    (1 to 10).map { _ =>
      WalletTransaction(
        reservationId = None,
        transactionId = UUID.randomUUID().toString,
        walletId = walletId,
        reason = TransactionReason.FundsDeposited,
        transactionAmount = DefaultCurrencyMoney(100),
        createdAt = clock.currentOffsetDateTime(),
        preTransactionBalance = DefaultCurrencyMoney(100),
        postTransactionBalance = DefaultCurrencyMoney(100),
        betId = None,
        externalId = Some(UUID.randomUUID().toString),
        paymentMethod = Some(getRandomPaymentMethod()))
    }
  }

  private def getRandomPaymentMethod(): PaymentMethod = {
    val possiblePaymentMethods = Seq(
      CreditCardPaymentMethod,
      BankTransferPaymentMethod,
      BackOfficeManualPaymentMethod("this is a reason", AdminId("thisIsAnAdminUser")))
    randomElement(possiblePaymentMethods)
  }

  private val zero: Balance = Balance(RealMoney(DefaultCurrencyMoney(0)), Seq.empty)

  override def depositHistory(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Deposits] =
    EitherT.safeRightT(
      DepositHistory(List.empty, MoneyAmount.zero.get).calculateDeposits(clock.currentOffsetDateTime(), clock))

  override def findResponsibilityCheckStatus(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, ResponsibilityCheckStatus] =
    EitherT.safeRightT(ResponsibilityCheckStatus.NoActionNeeded)

  override def acceptResponsibilityCheck(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] =
    EitherT.safeRightT(())

  override def requestResponsibilityCheckAcceptance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] =
    EitherT.safeRightT(())

  override def requestBalanceCheckForSuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = EitherT.safeRightT(())

  override def requestBalanceCheckForUnsuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = EitherT.safeRightT(())

  override def financialSummary(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, FinancialSummary] =
    EitherT.safeRightT(
      FinancialSummary(RealMoney(100), RealMoney(200), RealMoney(100), RealMoney(1000), RealMoney(1100)))
}

final class MemorizedTestWalletsContext(
    clock: Clock,
    var walletCreations: List[(WalletId, Balance)] = List.empty,
    var responsibilityCheckStatusAccepts: List[WalletId] = List.empty,
    var responsibilityCheckAcceptanceRequests: List[WalletId] = List.empty,
    var depositRequests: List[(WalletId, CreditFundsReason, RealMoney)] = List.empty,
    var withdrawalRequests: List[(WalletId, DebitFundsReason, RealMoney)] = List.empty,
    var financialSummaryRequests: List[WalletId] = List.empty)
    extends WalletContextProviderSuccess(clock) {
  override def createWallet(walletId: WalletId, initialBalance: Balance)(implicit
      ec: ExecutionContext): EitherT[Future, WalletAlreadyExistsError, Balance] = {
    walletCreations = walletCreations :+ ((walletId, initialBalance))
    super.createWallet(walletId, initialBalance)
  }

  override def deposit(
      walletId: WalletId,
      funds: PositiveAmount[RealMoney],
      reason: CreditFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] = {
    depositRequests = depositRequests :+ (walletId, reason, funds.value)
    super.deposit(walletId, funds, reason, paymentMethod)
  }

  override def withdraw(
      walletId: WalletId,
      withdrawal: PositiveAmount[RealMoney],
      reason: DebitFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance] = {
    withdrawalRequests = withdrawalRequests :+ (walletId, reason, withdrawal.value)
    super.withdraw(walletId, withdrawal, reason, paymentMethod)
  }

  override def acceptResponsibilityCheck(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
    responsibilityCheckStatusAccepts = responsibilityCheckStatusAccepts :+ walletId
    super.acceptResponsibilityCheck(walletId)
  }

  override def requestResponsibilityCheckAcceptance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
    responsibilityCheckAcceptanceRequests = responsibilityCheckAcceptanceRequests :+ walletId
    super.requestResponsibilityCheckAcceptance(walletId)
  }

  override def financialSummary(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, FinancialSummary] = {
    financialSummaryRequests = financialSummaryRequests :+ walletId
    super.financialSummary(walletId)
  }
}

class WalletContextProviderFailure extends WalletsBoundedContext {

  override def createWallet(walletId: WalletId, initialBalance: Balance)(implicit
      ec: ExecutionContext): EitherT[Future, WalletAlreadyExistsError, Balance] =
    EitherT.leftT(WalletAlreadyExistsError(walletId))

  override def deposit(
      walletId: WalletId,
      funds: PositiveAmount[RealMoney],
      reason: CreditFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def withdraw(
      walletId: WalletId,
      withdrawal: PositiveAmount[RealMoney],
      reason: DebitFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance] =
    EitherT.leftT(InsufficientFundsError(walletId))

  override def reserveForWithdrawal(walletId: WalletId, withdrawal: WithdrawalReservation)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    EitherT.leftT(InsufficientFundsError(walletId))

  override def finalizeWithdrawal(walletId: WalletId, reservationId: ReservationId, outcome: WithdrawalOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, WithdrawalFinalizationError, Balance] =
    EitherT.leftT(ReservationNotFoundError(walletId, reservationId))

  override def reserveForBet(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    EitherT.leftT(InsufficientFundsError(walletId))

  override def finalizeBet(walletId: WalletId, reservationId: ReservationId, outcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] =
    EitherT.leftT(ReservationNotFoundError(walletId, reservationId))

  override def refinalizeBet(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def currentBalance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def walletTransactions(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] =
    Future.successful(
      PaginatedResult(
        totalCount = 0,
        data = Seq.empty,
        paginationRequest = Pagination(currentPage = 1, itemsPerPage = 10)))

  override def allWalletTransactions(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed] =
    Source.empty

  override def depositHistory(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Deposits] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def findResponsibilityCheckStatus(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, ResponsibilityCheckStatus] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def acceptResponsibilityCheck(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def requestResponsibilityCheckAcceptance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] =
    EitherT.leftT(WalletNotFoundError(walletId))

  override def requestBalanceCheckForSuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = EitherT.leftT(WalletNotFoundError(walletId))

  override def requestBalanceCheckForUnsuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = EitherT.leftT(WalletNotFoundError(walletId))

  override def financialSummary(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, FinancialSummary] =
    EitherT.leftT(WalletNotFoundError(walletId))
}
