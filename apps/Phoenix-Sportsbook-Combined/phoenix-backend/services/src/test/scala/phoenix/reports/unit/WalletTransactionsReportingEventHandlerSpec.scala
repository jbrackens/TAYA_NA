package phoenix.reports.unit

import java.time.OffsetDateTime
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalamock.scalatest.MockFactory
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.reports.application.es.WalletTransactionsReportingEventHandler
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.WalletTransactionRepository
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.DataGenerator.randomString
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class WalletTransactionsReportingEventHandlerSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with MockFactory {

  private val clock: Clock = Clock.utcClock
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  "A WalletTransactionsReportingEventHandler" should {
    "handle FundsDeposited event" in {
      val event = FundsDeposited(
        walletId = generateWalletId(),
        transactionId = randomString(),
        funds = RealMoney(21.37),
        paymentMethod = CreditCardPaymentMethod,
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletTransactionRepository]
      (walletsRepository.upsert(_: WalletTransaction)).expects(*).returns(Future.unit).once()

      await(WalletTransactionsReportingEventHandler.handle(walletsRepository, event))
    }

    "handle FundsWithdrawn event" in {
      val event = FundsWithdrawn(
        walletId = generateWalletId(),
        transactionId = randomString(),
        withdrawal = RealMoney(21.37),
        paymentMethod = CreditCardPaymentMethod,
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletTransactionRepository]
      (walletsRepository.upsert(_: WalletTransaction)).expects(*).returns(Future.unit).once()

      await(WalletTransactionsReportingEventHandler.handle(walletsRepository, event))
    }

    "handle FundsReservedForWithdrawal" in {
      val event = FundsReservedForWithdrawal(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          generateReservationId(),
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditCardPaymentMethod),
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount.zero.get)),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletTransactionRepository]
      (walletsRepository.upsert(_: WalletTransaction)).expects(*).returns(Future.unit).once()

      await(WalletTransactionsReportingEventHandler.handle(walletsRepository, event))
    }

    "handle WithdrawalConfirmed" in {
      val event = WithdrawalConfirmed(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          generateReservationId(),
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditCardPaymentMethod),
        confirmedBy = ConfirmationOrigin.PaymentGateway,
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount(21.37))),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletTransactionRepository]
      (walletsRepository
        .setClosedAt(_: TransactionId, _: OffsetDateTime))
        .expects(event.transaction.transactionId, event.transaction.timestamp)
        .returns(Future.unit)
        .once()

      await(WalletTransactionsReportingEventHandler.handle(walletsRepository, event))
    }

    "handle WithdrawalCancelled" in {
      val event = WithdrawalCancelled(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          generateReservationId(),
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditCardPaymentMethod),
        rejectedBy = RejectionOrigin.PaymentGateway,
        previousBalance = AccountBalance(
          available = MoneyAmount(100),
          blocked = BlockedFunds(blockedForBets = MoneyAmount.zero.get, blockedForWithdrawals = MoneyAmount(21.37))),
        createdAt = clock.currentOffsetDateTime())

      val walletsRepository = mock[WalletTransactionRepository]
      (walletsRepository
        .setClosedAt(_: TransactionId, _: OffsetDateTime))
        .expects(event.transaction.transactionId, event.transaction.timestamp)
        .returns(Future.unit)
        .once()

      await(WalletTransactionsReportingEventHandler.handle(walletsRepository, event))
    }
  }
}
