package phoenix.wallets.unit

import java.time.OffsetDateTime
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.odds.Odds
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.TransactionCategory
import phoenix.wallets.WalletActorProtocol.events.BetCancelled
import phoenix.wallets.WalletActorProtocol.events.BetLost
import phoenix.wallets.WalletActorProtocol.events.BetPushed
import phoenix.wallets.WalletActorProtocol.events.BetVoided
import phoenix.wallets.WalletActorProtocol.events.BetWon
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForBet
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.WalletsProjectionHandler
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.support.InMemoryWalletTransactionsRepository

final class WalletsProjectionHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  private val clock: Clock = Clock.utcClock

  "WalletsProjectionHandler" should {
    "handle FundsDeposited event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = FundsDeposited(
        walletId = WalletId("wallet-1"),
        transactionId = "tx-1",
        funds = RealMoney(21.37),
        paymentMethod = CreditCardPaymentMethod,
        previousBalance = AccountBalance(available = MoneyAmount(0), blocked = noBlockedFunds),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = None,
          transactionId = "tx-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.FundsDeposited,
          transactionAmount = DefaultCurrencyMoney(21.37),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(0),
          postTransactionBalance = DefaultCurrencyMoney(21.37),
          betId = None,
          externalId = None,
          paymentMethod = Some(CreditCardPaymentMethod)))
    }

    "handle FundsWithdrawn event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = FundsWithdrawn(
        walletId = WalletId("wallet-1"),
        transactionId = "tx-1",
        withdrawal = RealMoney(137),
        paymentMethod = CreditCardPaymentMethod,
        previousBalance = AccountBalance(available = MoneyAmount(2137), blocked = noBlockedFunds),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = None,
          transactionId = "tx-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.FundsWithdrawn,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2137),
          postTransactionBalance = DefaultCurrencyMoney(2000),
          betId = None,
          externalId = None,
          paymentMethod = Some(CreditCardPaymentMethod)))
    }

    "handle FundsReservedForBet event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = FundsReservedForBet(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(available = MoneyAmount(2137), blocked = noBlockedFunds),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.FundsReservedForBet,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2137),
          postTransactionBalance = DefaultCurrencyMoney(2000),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle BetVoided event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = BetVoided(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(137), blockedForWithdrawals = MoneyAmount(0))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.BetVoided,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2137),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle BetPushed event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = BetPushed(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(137), blockedForWithdrawals = MoneyAmount(0))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.BetPushed,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2137),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle BetCancelled event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = BetCancelled(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(137), blockedForWithdrawals = MoneyAmount(0))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.BetCancelled,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2137),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle BetWon event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = BetWon(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(137), blockedForWithdrawals = MoneyAmount(0))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.BetWon,
          transactionAmount = DefaultCurrencyMoney(274),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2274),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle BetLost event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = BetLost(
        walletId = WalletId("wallet-1"),
        reservationId = ReservationId("res-1"),
        bet = Bet(BetId("bet-1"), RealMoney(137), Odds(2.0)),
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(137), blockedForWithdrawals = MoneyAmount(0))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.BetLost,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2000),
          betId = Some(BetId("bet-1")),
          externalId = None,
          paymentMethod = None))
    }

    "handle FundsReservedForWithdrawal event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = FundsReservedForWithdrawal(
        walletId = WalletId("wallet-1"),
        withdrawal = WithdrawalReservation(
          ReservationId("res-1"),
          PositiveAmount.ensure(RealMoney(137)).unsafe(),
          CreditCardPaymentMethod),
        previousBalance = AccountBalance(available = MoneyAmount(2137), blocked = noBlockedFunds),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.FundsReservedForWithdrawal,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2137),
          postTransactionBalance = DefaultCurrencyMoney(2000),
          betId = None,
          externalId = None,
          paymentMethod = Some(CreditCardPaymentMethod)))
    }

    "handle WithdrawalConfirmed event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = WithdrawalConfirmed(
        walletId = WalletId("wallet-1"),
        withdrawal = WithdrawalReservation(
          ReservationId("res-1"),
          PositiveAmount.ensure(RealMoney(137)).unsafe(),
          CreditCardPaymentMethod),
        confirmedBy = ConfirmationOrigin.PaymentGateway,
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(0), blockedForWithdrawals = MoneyAmount(137))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.WithdrawalConfirmed,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2000),
          betId = None,
          externalId = None,
          paymentMethod = Some(CreditCardPaymentMethod)))
    }

    "handle WithdrawalCancelled event" in {
      // given
      val repository = new InMemoryWalletTransactionsRepository()

      // when
      val now = clock.currentOffsetDateTime()
      val event = WithdrawalCancelled(
        walletId = WalletId("wallet-1"),
        withdrawal = WithdrawalReservation(
          ReservationId("res-1"),
          PositiveAmount.ensure(RealMoney(137)).unsafe(),
          CreditCardPaymentMethod),
        rejectedBy = RejectionOrigin.PaymentGateway,
        previousBalance = AccountBalance(
          available = MoneyAmount(2000),
          blocked = BlockedFunds(blockedForBets = MoneyAmount(0), blockedForWithdrawals = MoneyAmount(137))),
        createdAt = now)
      await(WalletsProjectionHandler.handle(repository)(event))

      // then
      val transactions = await(repository.findPaginated(queryAllTransactions, pagination1000))
      transactions.data should contain(
        WalletTransaction(
          reservationId = Some("res-1"),
          transactionId = "res-1",
          walletId = WalletId("wallet-1"),
          reason = TransactionReason.WithdrawalCancelled,
          transactionAmount = DefaultCurrencyMoney(137),
          createdAt = now,
          preTransactionBalance = DefaultCurrencyMoney(2000),
          postTransactionBalance = DefaultCurrencyMoney(2137),
          betId = None,
          externalId = None,
          paymentMethod = Some(CreditCardPaymentMethod)))
    }
  }

  private lazy val queryAllTransactions: WalletTransactionsQuery =
    WalletTransactionsQuery(
      walletId = WalletId("wallet-1"),
      timeRange = TimeRange(start = OffsetDateTime.MIN, end = OffsetDateTime.MAX),
      categories = TransactionCategory.values.toSet)

  private lazy val pagination1000 = Pagination(currentPage = 1, itemsPerPage = 1000)

  private lazy val noBlockedFunds: BlockedFunds =
    BlockedFunds(blockedForBets = MoneyAmount(0), blockedForWithdrawals = MoneyAmount(0))
}
