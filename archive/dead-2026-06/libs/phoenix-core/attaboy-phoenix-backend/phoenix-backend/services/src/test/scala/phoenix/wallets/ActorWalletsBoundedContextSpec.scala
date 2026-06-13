package phoenix.wallets

import scala.concurrent.ExecutionContext

import akka.stream.scaladsl.Sink
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Events
import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.bets.BetProtocol.Events.BetPushed
import phoenix.bets.BetProtocol.Events.BetResettled
import phoenix.bets.BetProtocol.Events.BetSettled
import phoenix.bets.BetProtocol.Events.BetVoided
import phoenix.bets.Stake
import phoenix.bets.support.BetDataGenerator.generateCancellationReason
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.core.odds.Odds
import phoenix.core.pagination.Pagination
import phoenix.core.scheduler.SchedulerModule
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TestEventQueue
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.BetTransactionCategory.BetSettlement
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.AdjustingFundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetWon
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Confirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Rejected
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class ActorWalletsBoundedContextSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {

  implicit val clock: Clock = Clock.utcClock
  implicit val executionContext: ExecutionContext = system.executionContext

  private val eventuallyTimeout = Timeout(Span(10, Seconds))
  private val eventuallyInterval = Interval(Span(1, Seconds))

  val betEventQueue: TestEventQueue[BetEvent] = TestEventQueue.instance
  val walletRepository = new SlickWalletTransactionsRepository(dbConfig)
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)
  val wallets: WalletsBoundedContext =
    ActorWalletsBoundedContext(
      system,
      dbConfig,
      betEventQueue,
      ConstantUUIDGenerator,
      schedulerModule.akkaJobScheduler,
      WalletProjectionRunner.build(system, dbConfig))

  "Wallet initialization" should {
    "use default initial balance" in {
      // given
      val walletId = generateWalletId()

      // when
      awaitRight(wallets.createWallet(walletId))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe Balance.initial
    }

    "allow specifying initial balance" in {
      // given
      val walletId = generateWalletId()
      val initialBalance =
        Balance(
          realMoney = RealMoney(DefaultCurrencyMoney(0)),
          bonusFunds = Seq(BonusFunds(DefaultCurrencyMoney(21.37))))

      // when
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe initialBalance
    }

    "throw an error if wallet already exists" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val creationAttempt = awaitLeft(wallets.createWallet(walletId, noFunds))

      // then
      creationAttempt shouldBe WalletAlreadyExistsError(walletId)
    }
  }

  "Funds deposit" should {
    "allow deposit" in {
      // given
      val walletId = forRandomPunter()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val moneyDeposit = PositiveAmount.ensure(RealMoney(21.37)).unsafe()
      awaitRight(wallets.deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, CreditCardPaymentMethod))
      awaitRight(wallets.deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, CreditCardPaymentMethod))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(42.74))
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val moneyDeposit = PositiveAmount.ensure(RealMoney(21.37)).unsafe()
      val depositAttempt =
        awaitLeft(wallets.deposit(nonExistingWallet, moneyDeposit, CreditFundsReason.Deposit, CreditCardPaymentMethod))

      // then
      depositAttempt shouldBe WalletNotFoundError(nonExistingWallet)
    }
    "allow back office deposits" in {
      // given
      val adminUser = generateAdminId()
      val walletId = forRandomPunter()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val moneyDeposit = PositiveAmount.ensure(RealMoney(21.37)).unsafe()
      awaitRight(
        wallets
          .deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, BackOfficeManualPaymentMethod("lala", adminUser)))
      awaitRight(
        wallets.deposit(
          walletId,
          moneyDeposit,
          CreditFundsReason.Adjustment,
          BackOfficeManualPaymentMethod("lala", adminUser)))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(42.74))
    }
  }

  "Funds withdraw" should {
    "allow funds withdraw" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))

      // when
      awaitRight(
        wallets.withdraw(
          walletId,
          PositiveAmount.ensure(RealMoney(21.36)).unsafe(),
          DebitFundsReason.Withdrawal,
          CreditCardPaymentMethod))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(0.01))
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val withdrawAttempt = awaitLeft(
        wallets.withdraw(
          nonExistingWallet,
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          DebitFundsReason.Withdrawal,
          CreditCardPaymentMethod))

      // then
      withdrawAttempt shouldBe WalletNotFoundError(nonExistingWallet)
    }

    "throw an error for insufficient funds" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val withdrawAttempt =
        awaitLeft(
          wallets.withdraw(
            walletId,
            PositiveAmount.ensure(RealMoney(0.01)).unsafe(),
            DebitFundsReason.Withdrawal,
            CreditCardPaymentMethod))

      // then
      withdrawAttempt shouldBe InsufficientFundsError(walletId)
    }
  }

  "Funds reserved for withdrawal" should {
    "reserve funds so that they can't be used anymore" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(DefaultCurrencyMoney(21.37)))))

      // when
      awaitRight(
        wallets.reserveForWithdrawal(
          walletId,
          WithdrawalReservation(
            ReservationId.create(),
            PositiveAmount.ensure(RealMoney(10)).unsafe(),
            CreditCardPaymentMethod)))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(11.37))
    }

    "throw an error for duplicated reservations" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(DefaultCurrencyMoney(21.37)))))

      // and
      val reservationId = ReservationId.create()
      awaitRight(
        wallets.reserveForWithdrawal(
          walletId,
          WithdrawalReservation(reservationId, PositiveAmount.ensure(RealMoney(10)).unsafe(), CreditCardPaymentMethod)))

      // when
      val reservationAttempt = awaitLeft(
        wallets.reserveForWithdrawal(
          walletId,
          WithdrawalReservation(reservationId, PositiveAmount.ensure(RealMoney(20)).unsafe(), CreditCardPaymentMethod)))

      // then
      reservationAttempt shouldBe a[ReservationAlreadyExistsError]
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val reservationAttempt =
        awaitLeft(
          wallets.reserveForWithdrawal(
            nonExistingWallet,
            WithdrawalReservation(
              ReservationId.create(),
              PositiveAmount.ensure(RealMoney(10)).unsafe(),
              CreditCardPaymentMethod)))

      // then
      reservationAttempt shouldBe WalletNotFoundError(nonExistingWallet)
    }

    "throw an error for insufficient funds" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val reservationAttempt =
        awaitLeft(
          wallets.reserveForWithdrawal(
            walletId,
            WithdrawalReservation(
              ReservationId.create(),
              PositiveAmount.ensure(RealMoney(10)).unsafe(),
              CreditCardPaymentMethod)))

      // then
      reservationAttempt shouldBe InsufficientFundsError(walletId)
    }
  }

  "Finalizing withdrawals" should {
    "when confirming, not change wallet balance (as founds has been already reserved)" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(10)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val reservationId = ReservationId.create()
      val reservationResponse = awaitRight(
        wallets.reserveForWithdrawal(
          walletId,
          WithdrawalReservation(reservationId, PositiveAmount.ensure(RealMoney(5)).unsafe(), CreditCardPaymentMethod)))

      // when
      awaitRight(wallets.finalizeWithdrawal(walletId, reservationId, Confirmed(ConfirmationOrigin.PaymentGateway)))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe reservationResponse.balance
    }

    "when cancelling, unfreeze reserved funds" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val withdrawalAttempt =
        WithdrawalReservation(
          ReservationId.create(),
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditCardPaymentMethod)
      awaitRight(wallets.reserveForWithdrawal(walletId, withdrawalAttempt))

      // when
      awaitRight(
        wallets.finalizeWithdrawal(walletId, withdrawalAttempt.reservationId, Rejected(RejectionOrigin.PaymentGateway)))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe initialBalance
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val attempt =
        awaitLeft(wallets
          .finalizeWithdrawal(nonExistingWallet, generateReservationId(), Confirmed(ConfirmationOrigin.PaymentGateway)))

      // then
      attempt shouldBe WalletNotFoundError(nonExistingWallet)
    }

    "throw an error for non existing reservation" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, plenty))

      // when
      val nonExistingReservation = generateReservationId()
      val attempt =
        awaitLeft(
          wallets.finalizeWithdrawal(walletId, nonExistingReservation, Confirmed(ConfirmationOrigin.PaymentGateway)))

      // then
      attempt shouldBe ReservationNotFoundError(walletId, nonExistingReservation)
    }
  }

  "Funds reserved for bet purposes" should {
    "reserve funds so that they can't be used anymore" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(DefaultCurrencyMoney(21.37)))))

      // when
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      awaitRight(wallets.reserveForBet(walletId, bet))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(11.37))
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      val reservationAttempt = awaitLeft(wallets.reserveForBet(nonExistingWallet, bet))

      // then
      reservationAttempt shouldBe WalletNotFoundError(nonExistingWallet)
    }

    "throw an error for insufficient funds" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      val reservationAttempt = awaitLeft(wallets.reserveForBet(walletId, bet))

      // then
      reservationAttempt shouldBe InsufficientFundsError(walletId)
    }
  }

  "Finalizing bet" should {
    "when bet won, increase wallet balance according to the bet odds" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(10)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(5)), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      awaitRight(wallets.finalizeBet(walletId, reservationId, BetPlacementOutcome.Won))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(15.5))
    }

    "when bet lost, not change wallet balance as founds has been already reserved" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(10)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(5)), odds = Odds(2.1))
      val reservationResponse = awaitRight(wallets.reserveForBet(walletId, bet))

      // when
      awaitRight(wallets.finalizeBet(walletId, reservationResponse.reservationId, BetPlacementOutcome.Lost))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe reservationResponse.balance
    }

    "when bet is voided, unfreeze reserved funds" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      awaitRight(wallets.finalizeBet(walletId, reservationId, BetPlacementOutcome.Voided))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe initialBalance
    }

    "when bet is cancelled, unfreeze reserved funds" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      awaitRight(wallets.finalizeBet(walletId, reservationId, BetPlacementOutcome.Cancelled))

      // then
      val currentBalance = awaitRight(wallets.currentBalance(walletId))
      currentBalance shouldBe initialBalance
    }

    "throw an error for non existing wallet" in {
      // given
      val nonExistingWallet = generateWalletId()

      // when
      val attempt =
        awaitLeft(wallets.finalizeBet(nonExistingWallet, generateReservationId(), BetPlacementOutcome.Won))

      // then
      attempt shouldBe WalletNotFoundError(nonExistingWallet)
    }

    "throw an error for non existing reservation" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, plenty))

      // when
      val nonExistingReservation = generateReservationId()
      val attempt = awaitLeft(wallets.finalizeBet(walletId, nonExistingReservation, BetPlacementOutcome.Won))

      // then
      attempt shouldBe ReservationNotFoundError(walletId, nonExistingReservation)
    }

    "react to 'BetSettled' event" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(10)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val stake = Stake.unsafe(DefaultCurrencyMoney(5))
      val bet = Bet(betId = generateBetId(), stake = RealMoney(stake.value), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      betEventQueue.pushEvent(
        BetSettled(
          betId = bet.betId,
          betData = BetData(
            punterId = PunterId(walletId.value),
            marketId = generateMarketId(),
            selectionId = generateSelectionId(),
            stake = stake,
            odds = bet.odds),
          reservationId = reservationId,
          winner = true))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val currentBalance = awaitRight(wallets.currentBalance(walletId))
        currentBalance.realMoney shouldBe RealMoney(DefaultCurrencyMoney(15.5))
      }
    }

    "react to 'BetVoided' event" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val stake = Stake.unsafe(DefaultCurrencyMoney(10))
      val bet = Bet(betId = generateBetId(), stake = RealMoney(stake.value), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      betEventQueue.pushEvent(
        BetVoided(
          betId = bet.betId,
          betData = BetData(
            punterId = PunterId(walletId.value),
            marketId = generateMarketId(),
            selectionId = generateSelectionId(),
            stake = stake,
            odds = bet.odds),
          reservationId = reservationId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val currentBalance = awaitRight(wallets.currentBalance(walletId))
        currentBalance shouldBe initialBalance
      }
    }

    "react to 'BetPushed' event" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val stake = Stake.unsafe(DefaultCurrencyMoney(10))
      val bet = Bet(betId = generateBetId(), stake = RealMoney(stake.value), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      betEventQueue.pushEvent(
        BetPushed(
          betId = bet.betId,
          betData = BetData(
            punterId = PunterId(walletId.value),
            marketId = generateMarketId(),
            selectionId = generateSelectionId(),
            stake = stake,
            odds = bet.odds),
          reservationId = reservationId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val currentBalance = awaitRight(wallets.currentBalance(walletId))
        currentBalance shouldBe initialBalance
      }
    }

    "react to 'BetCancelled' event" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val stake = Stake.unsafe(DefaultCurrencyMoney(10))
      val bet = Bet(betId = generateBetId(), stake = RealMoney(stake.value), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // when
      betEventQueue.pushEvent(
        Events.BetCancelled(
          betId = bet.betId,
          betData = BetData(
            punterId = PunterId(walletId.value),
            marketId = generateMarketId(),
            selectionId = generateSelectionId(),
            stake = stake,
            odds = bet.odds),
          reservationId = reservationId,
          adminUser = generateAdminId(),
          cancellationReason = generateCancellationReason(),
          betCancellationTimestamp = randomOffsetDateTime()))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val currentBalance = awaitRight(wallets.currentBalance(walletId))
        currentBalance shouldBe initialBalance
      }
    }
  }

  "Refinalise bet" should {
    "return error if outcome is not recognised" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(10)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      val stake = Stake.unsafe(DefaultCurrencyMoney(5))
      val bet = Bet(betId = generateBetId(), stake = RealMoney(stake.value), odds = Odds(2.1))

      // when
      val error = awaitLeft(wallets.refinalizeBet(walletId, bet, BetPlacementOutcome.Cancelled))

      // then
      error shouldBe a[UnexpectedOutcomeError]
    }

    "should refinalize a bet after a resettlement lost -> won" in {
      // given
      val isNewOutcomeWinner = true

      val punterId = PunterId.fromUuid(RandomUUIDGenerator.generate())
      val walletId = WalletId.deriveFrom(punterId)

      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(100))))

      val betId = BetId(RandomUUIDGenerator.generate().toString)
      val betData =
        BetData(punterId, MarketId.unsafeParse("m:o:1"), "selection", Stake.unsafe(DefaultCurrencyMoney(10)), Odds(1.1))

      val betResettled = BetResettled(betId, betData, isNewOutcomeWinner, clock.currentOffsetDateTime())

      // when
      betEventQueue.pushEvent(betResettled)

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val transactions = await(
          walletRepository
            .findAll(WalletTransactionsQuery(walletId, TimeRange.lastDays(2), Set(BetSettlement)))
            .runWith(Sink.seq))

        transactions should have size 1
        transactions.head.transactionAmount.amount shouldBe 11
        transactions.head.reason shouldBe TransactionReason.BetResettled
        transactions.head.preTransactionBalance.amount shouldBe 100
        transactions.head.postTransactionBalance.amount shouldBe 111

        val balance = awaitRight(wallets.currentBalance(walletId))
        balance.realMoney.value.amount shouldBe 111
      }
    }

    "should refinalize a bet after a resettlement won -> lost" in {
      // given
      val isNewOutcomeWinner = false

      val punterId = PunterId.fromUuid(RandomUUIDGenerator.generate())
      val walletId = WalletId.deriveFrom(punterId)

      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(100))))

      val betId = BetId(RandomUUIDGenerator.generate().toString)
      val betData =
        BetData(punterId, MarketId.unsafeParse("m:o:1"), "selection", Stake.unsafe(DefaultCurrencyMoney(10)), Odds(1.1))

      val betResettled = BetResettled(betId, betData, isNewOutcomeWinner, clock.currentOffsetDateTime())

      // when
      betEventQueue.pushEvent(betResettled)

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val transactions = await(
          walletRepository
            .findAll(WalletTransactionsQuery(walletId, TimeRange.lastDays(2), Set(BetSettlement)))
            .runWith(Sink.seq))

        transactions should have size 1
        transactions.head.transactionAmount.amount shouldBe -11
        transactions.head.reason shouldBe TransactionReason.BetResettled
        transactions.head.preTransactionBalance.amount shouldBe 100
        transactions.head.postTransactionBalance.amount shouldBe 89

        val balance = awaitRight(wallets.currentBalance(walletId))
        balance.realMoney.value.amount shouldBe 89
      }
    }

    "should refinalize a bet after a resettlement won -> lost with balance lower than bet amount" in {
      // given
      val isNewOutcomeWinner = false

      val punterId = PunterId.fromUuid(RandomUUIDGenerator.generate())
      val walletId = WalletId.deriveFrom(punterId)
      val betId = BetId(RandomUUIDGenerator.generate().toString)
      val betData =
        BetData(punterId, MarketId.unsafeParse("m:o:1"), "selection", Stake.unsafe(DefaultCurrencyMoney(20)), Odds(1.1))

      awaitRight(wallets.createWallet(walletId, Balance(RealMoney(10))))

      // when
      val betResettled = BetResettled(betId, betData, isNewOutcomeWinner, clock.currentOffsetDateTime())
      betEventQueue.pushEvent(betResettled)

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val transactions = await(
          walletRepository
            .findAll(WalletTransactionsQuery(walletId, TimeRange.lastDays(2), Set(BetSettlement)))
            .runWith(Sink.seq))

        transactions should have size 1
        transactions.head.transactionAmount.amount shouldBe -22
        transactions.head.reason shouldBe TransactionReason.BetResettled
        transactions.head.preTransactionBalance.amount shouldBe 10
        transactions.head.postTransactionBalance.amount shouldBe -12

        val balance = awaitRight(wallets.currentBalance(walletId))
        balance.realMoney.value.amount shouldBe -12
      }
    }
  }

  "Transaction history" should {
    val pagination = Pagination(currentPage = 1, itemsPerPage = 10)

    "return an empty sequence for a period with no activity" in {
      // given
      val walletId = generateWalletId()
      val now = clock.currentOffsetDateTime()

      val query = WalletTransactionsQuery(
        walletId = walletId,
        timeRange = TimeRange(start = now.minusDays(60), end = now.minusDays(30)),
        categories = TransactionCategory.values.toSet)

      // when
      val result = await(wallets.walletTransactions(query, pagination))

      // then
      result.data shouldBe empty
    }

    "eventually return recently added transactions" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      // and
      val bet = Bet(betId = generateBetId(), stake = RealMoney(DefaultCurrencyMoney(10)), odds = Odds(2.1))
      val reservationId = awaitRight(wallets.reserveForBet(walletId, bet)).reservationId

      // and
      awaitRight(wallets.finalizeBet(walletId, reservationId, BetPlacementOutcome.Won))

      // and
      val now = clock.currentOffsetDateTime()
      val query = WalletTransactionsQuery(
        walletId = walletId,
        timeRange = TimeRange(start = now.minusDays(60), end = now),
        categories = TransactionCategory.values.toSet)

      eventually(eventuallyTimeout, eventuallyInterval) {

        // when
        val result = await(wallets.walletTransactions(query, pagination))

        // then
        result.data.map(_.reason) shouldBe Seq(BetWon)
      }

      // when
      val result2 = await(wallets.walletTransactions(query.copy(categories = Set(BetSettlement)), pagination))

      // then
      result2.data.map(_.reason) shouldBe Seq(BetWon)

      // when
      val earlierTimeRange = TimeRange(start = now.minusDays(60), end = now.minusDays(30))
      val result3 = await(wallets.walletTransactions(query.copy(timeRange = earlierTimeRange), pagination))

      // then
      result3.data shouldBe empty
    }

    "return only the latest entry for a given transaction" in {
      // given
      val walletId = generateWalletId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))

      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))

      val reservationId = awaitRight(
        wallets.reserveForWithdrawal(
          walletId,
          WithdrawalReservation(
            generateReservationId(),
            PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
            BankTransferPaymentMethod))).reservationId

      awaitRight(
        wallets
          .finalizeWithdrawal(walletId, reservationId, WithdrawalOutcome.Confirmed(ConfirmationOrigin.PaymentGateway)))

      // and
      val now = clock.currentOffsetDateTime()
      val query = WalletTransactionsQuery(
        walletId = walletId,
        timeRange = TimeRange(start = now.minusDays(60), end = now),
        categories = TransactionCategory.values.toSet)

      eventually(eventuallyTimeout, eventuallyInterval) {

        // when
        val result = await(wallets.walletTransactions(query, pagination))
        val transactions = result.data

        // then
        transactions.map(_.transactionId).size shouldBe 3
        transactions.map(_.reason) shouldBe Seq(WithdrawalConfirmed, FundsDeposited, FundsDeposited)
        result.data.map(_.paymentMethod) shouldBe Seq(
          Some(BankTransferPaymentMethod),
          Some(CreditCardPaymentMethod),
          Some(CreditCardPaymentMethod))
      }
    }

    "return correct types of payment method for deposits" in {
      val walletId = generateWalletId()
      val adminId = generateAdminId()
      val initialBalance = Balance(RealMoney(DefaultCurrencyMoney(21.37)))
      awaitRight(wallets.createWallet(walletId, initialBalance))

      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Deposit,
          BankTransferPaymentMethod))
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Deposit,
          BackOfficeManualPaymentMethod("I am not giving free credit to my buddies, I promise", adminId)))
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(10)).unsafe(),
          CreditFundsReason.Adjustment,
          BackOfficeManualPaymentMethod("Or maybe I am", adminId)))

      // and
      val now = clock.currentOffsetDateTime()
      val query = WalletTransactionsQuery(
        walletId = walletId,
        timeRange = TimeRange(start = now.minusDays(60), end = now),
        categories = TransactionCategory.values.toSet)

      eventually(eventuallyTimeout, eventuallyInterval) {

        // when
        val result = await(wallets.walletTransactions(query, pagination))

        // then
        result.data.map(_.reason) shouldBe Seq(AdjustingFundsDeposited, FundsDeposited, FundsDeposited, FundsDeposited)
        result.data.map(_.paymentMethod) shouldBe Seq(
          Some(BackOfficeManualPaymentMethod("Or maybe I am", adminId)),
          Some(BackOfficeManualPaymentMethod("I am not giving free credit to my buddies, I promise", adminId)),
          Some(BankTransferPaymentMethod),
          Some(CreditCardPaymentMethod))
      }

    }
  }

  "Finding responsibility check status" should {
    "fail if the wallet does not exist" in {
      // given
      val walletId = generateWalletId()

      // when
      val attempt = awaitLeft(wallets.findResponsibilityCheckStatus(walletId))

      // then
      attempt shouldBe WalletNotFoundError(walletId)
    }

    "default to `NoActionNeeded` right after creation" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val status = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      // then
      status shouldBe ResponsibilityCheckStatus.NoActionNeeded
    }

    "return `NoActionNeeded` when we make deposits for less than or equal 2500$" in {
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(2000)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      val statusAfterFirstDeposit = awaitRight(wallets.findResponsibilityCheckStatus(walletId))
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(500)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      val statusAfterSecondDeposit = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      // then
      statusAfterFirstDeposit shouldBe ResponsibilityCheckStatus.NoActionNeeded
      statusAfterSecondDeposit shouldBe ResponsibilityCheckStatus.NoActionNeeded
    }

    "return `NeedsToBeAccepted` only when we pass 2500$ of deposits for the first time, accept the responsibility check," +
    " and even make more deposits after that" in {
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(2500)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      val statusAfterFirstDeposit = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(1)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      val statusAfterSecondDeposit = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      awaitRight(wallets.acceptResponsibilityCheck(walletId))
      val statusAfterAccept = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      awaitRight(
        wallets.deposit(
          walletId,
          PositiveAmount.ensure(RealMoney(100)).unsafe(),
          CreditFundsReason.Deposit,
          CreditCardPaymentMethod))
      val statusAfterThirdDeposit = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      // then
      statusAfterFirstDeposit shouldBe ResponsibilityCheckStatus.NoActionNeeded
      statusAfterSecondDeposit shouldBe ResponsibilityCheckStatus.NeedsToBeAccepted
      statusAfterAccept shouldBe ResponsibilityCheckStatus.NoActionNeeded
      statusAfterThirdDeposit shouldBe ResponsibilityCheckStatus.NoActionNeeded
    }
  }

  "Accept Responsibility Check" should {
    "fail when the wallet does not exist" in {
      // given
      val walletId = generateWalletId()

      // when
      val attempt = awaitLeft(wallets.acceptResponsibilityCheck(walletId))

      // then
      attempt shouldBe WalletNotFoundError(walletId)
    }
  }

  "Request Responsibility Check Acceptance" should {
    "fail when the wallet does not exist" in {
      // given
      val walletId = generateWalletId()

      // when
      val attempt = awaitLeft(wallets.requestResponsibilityCheckAcceptance(walletId))

      // then
      attempt shouldBe WalletNotFoundError(walletId)
    }

    "change the responsibility check status" in {
      // given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      // when
      val beforeStatus = awaitRight(wallets.findResponsibilityCheckStatus(walletId))
      awaitRight(wallets.requestResponsibilityCheckAcceptance(walletId))
      val afterStatus = awaitRight(wallets.findResponsibilityCheckStatus(walletId))

      // then
      beforeStatus shouldBe ResponsibilityCheckStatus.NoActionNeeded
      afterStatus shouldBe ResponsibilityCheckStatus.NeedsToBeAccepted
    }
  }

  "Request Balance Check For Suspend" should {
    "fail when the wallet does not exist" in {
      // given
      val walletId = generateWalletId()

      // when
      val attempt = awaitLeft(wallets.requestBalanceCheckForSuspend(walletId))

      // then
      attempt shouldBe WalletNotFoundError(walletId)
    }
  }

  "Request Balance Check For Unsuspend" should {
    "fail when the wallet does not exist" in {
      // given
      val walletId = generateWalletId()

      // when
      val attempt = awaitLeft(wallets.requestBalanceCheckForUnsuspend(walletId))

      // then
      attempt shouldBe WalletNotFoundError(walletId)
    }
  }

  "Financial summary" should {
    "fail when the wallet does not exist" in {
      val walletId = generateWalletId()
      val attempt = awaitLeft(wallets.financialSummary(walletId))
      attempt shouldBe WalletNotFoundError(walletId)
    }

    "work for empty wallet" in {
      val walletId = forRandomPunter()
      awaitRight(wallets.createWallet(walletId, noFunds))

      val financialSummary = awaitRight(wallets.financialSummary(walletId))
      val zero = RealMoney(0.0)
      financialSummary shouldBe FinancialSummary(zero, zero, zero, zero, zero)
    }

    "give comprehensive summary" in {
      //given
      val walletId = generateWalletId()
      awaitRight(wallets.createWallet(walletId, noFunds))

      //when
      val adminUser = generateAdminId()
      val moneyDeposit = PositiveAmount.ensure(RealMoney(23.00)).unsafe()
      awaitRight(wallets.deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, CreditCardPaymentMethod))
      awaitRight(wallets.deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, NotApplicablePaymentMethod))
      awaitRight(
        wallets
          .deposit(walletId, moneyDeposit, CreditFundsReason.Deposit, BackOfficeManualPaymentMethod("lala", adminUser)))

      val bets = (0 until 4)
        .map(_ => Bet(betId = generateBetId(), stake = RealMoney(5), odds = Odds(2.1)))
        .map { bet =>
          wallets.reserveForBet(walletId, bet)
        }
        .map(awaitRight(_).reservationId)

      bets
        .take(2)
        .map { reservationId =>
          wallets.finalizeBet(walletId, reservationId, BetPlacementOutcome.Lost)
        }
        .foreach(awaitRight)

      val reservationIds = (0 until 4)
        .map(_ => ReservationId.create())
        .map { reservationId =>
          wallets.reserveForWithdrawal(
            walletId,
            WithdrawalReservation(
              reservationId,
              PositiveAmount.ensure(RealMoney(11)).unsafe(),
              CreditCardPaymentMethod))
        }
        .map(awaitRight(_).reservationId)

      reservationIds
        .take(2)
        .map { reservationId =>
          wallets.finalizeWithdrawal(walletId, reservationId, Confirmed(ConfirmationOrigin.PaymentGateway))
        }
        .foreach(awaitRight)

      //then
      eventually(eventuallyTimeout, eventuallyInterval) {
        val financialSummary = awaitRight(wallets.financialSummary(walletId))
        financialSummary.currentBalance shouldBe RealMoney(5)
        financialSummary.openedBets shouldBe RealMoney(10)
        financialSummary.pendingWithdrawals shouldBe RealMoney(22)
        financialSummary.lifetimeWithdrawals shouldBe RealMoney(22)
        financialSummary.lifetimeDeposits shouldBe RealMoney(46)
        financialSummary.netCash shouldBe RealMoney(2)
      }
    }

  }
  private def forRandomPunter(): WalletId =
    WalletId.deriveFrom(generatePunterId())

  private lazy val noFunds: Balance =
    Balance(realMoney = RealMoney(DefaultCurrencyMoney(0)))

  private lazy val plenty: Balance =
    Balance(realMoney = RealMoney(DefaultCurrencyMoney(2137)), bonusFunds = Seq(BonusFunds(DefaultCurrencyMoney(2137))))
}
