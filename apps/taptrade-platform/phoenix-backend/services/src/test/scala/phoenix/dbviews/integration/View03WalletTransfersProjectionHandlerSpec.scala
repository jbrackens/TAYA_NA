package phoenix.dbviews.integration

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.odds.Odds
import phoenix.dbviews.domain.model.TransferDescription
import phoenix.dbviews.domain.model.TransferType
import phoenix.dbviews.domain.model.WalletTransfer
import phoenix.dbviews.infrastructure.View03WalletTransfersProjectionHandler
import phoenix.punters.PuntersBoundedContext
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.generateBetId
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletActorProtocol.events.BetVoided
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

class View03WalletTransfersProjectionHandlerSpec extends AnyWordSpecLike with Matchers {

  private val clock = Clock.utcClock
  private val SomeFixtureName = Some("Natus Vincere vs G2 Esports")
  private val SomeSessionId = Some(PuntersBoundedContext.SessionId("FakeSessionId"))

  "View03WalletTransferProjectionHandler" should {
    val USD20 = RealMoney(DefaultCurrencyMoney(20.00))
    val aPaymentMethod = PaymentMethod.CreditCardPaymentMethod
    val timestamp = clock.currentOffsetDateTime()
    val balanceUSD20 = DataGenerator.generateAccountBalance(USD20.moneyAmount)

    "handle FundsWithdrawn event" in {
      val event = FundsWithdrawn(
        walletId = generateWalletId(),
        transactionId = RandomUUIDGenerator.generate().toString,
        withdrawal = USD20,
        paymentMethod = aPaymentMethod,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = event.transactionId,
          timestamp = timestamp,
          transferType = TransferType.FromWallet,
          transferDescription = TransferDescription.Cash,
          amount = event.withdrawal.moneyAmount,
          gameName = None,
          gameVersion = None,
          rgsName = None))
    }

    "handle AdjustingFundsDeposited event" in {
      val event = AdjustingFundsDeposited(
        walletId = generateWalletId(),
        transactionId = RandomUUIDGenerator.generate().toString,
        funds = USD20,
        paymentMethod = aPaymentMethod,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())
      val transaction = event.transaction

      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.ToWallet,
          transferDescription = TransferDescription.CasinoAdjustment,
          amount = transaction.amount,
          gameName = None,
          gameVersion = None,
          rgsName = None))
    }

    "handle AdjustingFundsWithdrawn event" in {
      val event = AdjustingFundsWithdrawn(
        walletId = generateWalletId(),
        transactionId = RandomUUIDGenerator.generate().toString,
        withdrawal = USD20,
        paymentMethod = aPaymentMethod,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())
      val transaction = event.transaction

      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.FromWallet,
          transferDescription = TransferDescription.CasinoAdjustment,
          amount = transaction.amount,
          gameName = None,
          gameVersion = None,
          rgsName = None))
    }

    "handle WithdrawalConfirmed event" in {
      val event = WithdrawalConfirmed(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          reservationId = ReservationId.create(),
          funds = PositiveAmount.unsafe(USD20),
          paymentMethod = aPaymentMethod),
        confirmedBy = ConfirmationOrigin.PaymentGateway,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      val transaction = event.transaction
      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.FromWallet,
          transferDescription = TransferDescription.Cash,
          amount = transaction.amount,
          gameName = None,
          gameVersion = None,
          rgsName = None))
    }

    "handle BetWon event" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetWon(
        walletId = generateWalletId(),
        reservationId = ReservationId.create(),
        bet = bet,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      val transaction = event.transaction
      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.ToWallet,
          transferDescription = TransferDescription.Profit,
          amount = transaction.amount,
          gameName = SomeFixtureName,
          gameVersion = None,
          rgsName = None))
    }

    "handle BetLost event" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetLost(
        walletId = generateWalletId(),
        reservationId = ReservationId.create(),
        bet = bet,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      val transaction = event.transaction
      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.FromWallet,
          transferDescription = TransferDescription.Profit,
          amount = transaction.amount,
          gameName = SomeFixtureName,
          gameVersion = None,
          rgsName = None))
    }

    "handle BetResettled event winner=true" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetResettled(
        walletId = generateWalletId(),
        transactionId = RandomUUIDGenerator.generate().toString,
        bet = bet,
        winner = true,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      val transaction = event.transaction
      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.ToWallet,
          transferDescription = TransferDescription.Profit,
          amount = transaction.amount,
          gameName = SomeFixtureName,
          gameVersion = None,
          rgsName = None))
    }

    "handle BetResettled event for winner=false" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetResettled(
        walletId = generateWalletId(),
        transactionId = RandomUUIDGenerator.generate().toString,
        bet = bet,
        winner = false,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      val transaction = event.transaction
      transform(timestamp, event) shouldBe Some(
        WalletTransfer(
          punterId = event.walletId.owner,
          sessionId = SomeSessionId,
          transactionId = transaction.transactionId,
          timestamp = timestamp,
          transferType = TransferType.FromWallet,
          transferDescription = TransferDescription.Profit,
          amount = MoneyAmount(-transaction.amount.amount),
          gameName = SomeFixtureName,
          gameVersion = None,
          rgsName = None))
    }

    "handle BetVoided event" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetVoided(
        walletId = generateWalletId(),
        reservationId = ReservationId.create(),
        bet = bet,
        previousBalance = balanceUSD20,
        createdAt = timestamp)

      transform(timestamp, event) shouldBe None
    }

    "handle BetPushed event" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetPushed(
        walletId = generateWalletId(),
        reservationId = ReservationId.create(),
        bet = bet,
        previousBalance = balanceUSD20,
        createdAt = timestamp)

      transform(timestamp, event) shouldBe None
    }

    "handle BetCancelled event" in {
      val bet = Bet(generateBetId(), USD20, Odds(2))
      val event = BetCancelled(
        walletId = generateWalletId(),
        reservationId = ReservationId.create(),
        bet = bet,
        previousBalance = balanceUSD20,
        createdAt = timestamp)

      transform(timestamp, event) shouldBe None
    }

    "handle WithdrawalCancelled event" in {
      val event = WithdrawalCancelled(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          reservationId = ReservationId.create(),
          funds = PositiveAmount.unsafe(USD20),
          paymentMethod = aPaymentMethod),
        rejectedBy = RejectionOrigin.PaymentGateway,
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())

      transform(timestamp, event) shouldBe None
    }

    "handle WalletCreated event" in {
      val event = WalletCreated(
        walletId = generateWalletId(),
        Balance(RealMoney(DefaultCurrencyMoney(21.37))),
        clock.currentOffsetDateTime())
      transform(timestamp, event) shouldBe None
    }

    "handle FundsReservedForWithdrawal event" in {
      val event = FundsReservedForWithdrawal(
        walletId = generateWalletId(),
        withdrawal = WithdrawalReservation(
          reservationId = ReservationId.create(),
          funds = PositiveAmount.unsafe(USD20),
          paymentMethod = aPaymentMethod),
        previousBalance = balanceUSD20,
        createdAt = clock.currentOffsetDateTime())
      transform(timestamp, event) shouldBe None
    }

    "handle ResponsibilityCheckAccepted event" in {
      val event = ResponsibilityCheckAccepted(generateWalletId())
      transform(timestamp, event) shouldBe None
    }

    "handle ResponsibilityCheckAcceptanceRequested event" in {
      val event = ResponsibilityCheckAcceptanceRequested(generateWalletId())
      transform(timestamp, event) shouldBe None
    }

    "handle PunterUnsuspendApproved event" in {
      val event = PunterUnsuspendApproved(generateWalletId())
      transform(timestamp, event) shouldBe None
    }

    "handle PunterUnsuspendRejected event" in {
      val event = PunterUnsuspendRejected(generateWalletId())
      transform(timestamp, event) shouldBe None
    }

    "handle NegativeBalance event" in {
      val event = NegativeBalance(generateWalletId())
      transform(timestamp, event) shouldBe None
    }

  }

  def transform(
      timestamp: OffsetDateTime,
      event: WalletEvent,
      fixtureName: Option[String] = SomeFixtureName,
      sessionId: Option[PuntersBoundedContext.SessionId] = SomeSessionId): Option[WalletTransfer] =
    View03WalletTransfersProjectionHandler
      .transform[Option](timestamp, event, _ => Some(fixtureName), _ => Some(sessionId))
      .flatten

}
