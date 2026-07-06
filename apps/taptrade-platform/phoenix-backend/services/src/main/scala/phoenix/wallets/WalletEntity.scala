package phoenix.wallets

import java.util.UUID

import scala.math.Ordered.orderingToOrdered

import akka.actor.typed.ActorRef
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.core.currency.MoneyAmount
import phoenix.sharding.PhoenixPersistenceId
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.utils.EventSourcedBehaviourConfiguration.enrichWithCommonPersistenceConfiguration
import phoenix.wallets.WalletActorProtocol.Responses.Failure._
import phoenix.wallets.WalletActorProtocol.Responses.Success.CurrentFinances
import phoenix.wallets.WalletActorProtocol.Responses.Success._
import phoenix.wallets.WalletActorProtocol.Responses.WalletResponse
import phoenix.wallets.WalletActorProtocol.commands._
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletState._
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.DepositHistory
import phoenix.wallets.domain.Funds.RealMoney

private[wallets] object WalletEntity {
  private val log = LoggerFactory.getLogger(this.objectName)

  type EventTags = Set[String]

  private val ResponsibilityCheckStatusThreshold = MoneyAmount(2500)

  def apply(walletId: WalletId)(implicit clock: Clock): Behavior[WalletCommand] = {
    Behaviors.setup { _ =>
      log.info("Context: WalletEntity - Starting Wallet entity {}", kv("WalletId", walletId.value))
      enrichWithCommonPersistenceConfiguration {
        EventSourcedBehavior[WalletCommand, WalletEvent, WalletState](
          persistenceId = PhoenixPersistenceId.of(WalletShardingRegion.TypeKey, walletId),
          emptyState = Uninitialized,
          commandHandler = WalletCommandHandler(),
          eventHandler = eventHandler).withTagger(_ =>
          Set(ProjectionTag.from(walletId, WalletTags.walletTags).value, WalletTags.allWalletEventsNotSharded.value))
      }
    }
  }

  private def eventHandler: (WalletState, WalletEvent) => WalletState =
    (state, event) =>
      event match {
        case WalletCreated(id, balance, _) => WalletState.initial(id, balance)
        case AdjustingFundsDeposited(_, _, funds, _, _, createdAt) =>
          handleDeposit(state.asActive, state.asActive.deposit(funds, createdAt))
        case FundsDeposited(_, _, funds, _, _, createdAt) =>
          handleDeposit(state.asActive, state.asActive.deposit(funds, createdAt))
        case FundsWithdrawn(_, _, funds, _, _, _)             => state.asActive.withdraw(funds)
        case AdjustingFundsWithdrawn(_, _, funds, _, _, _)    => state.asActive.withdraw(funds)
        case FundsReservedForBet(_, reservation, bet, _, _)   => state.asActive.reserveFunds(reservation, bet)
        case FundsReservedForPrediction(_, reservation, bet, _, _) =>
          state.asActive.reserveFunds(reservation, bet)
        case FundsReservedForWithdrawal(_, reservation, _, _) => state.asActive.reserveFunds(reservation)
        case WithdrawalConfirmed(_, reservation, _, _, _) =>
          state.asActive.onWithdrawalConfirmed(reservation.reservationId)
        case WithdrawalCancelled(_, reservation, _, _, _) =>
          state.asActive.onWithdrawalCancelled(reservation.reservationId)
        case BetVoided(_, reservation, _, _, _)                                           => state.asActive.onBetVoided(reservation)
        case PredictionVoided(_, reservation, _, _, _)                                    => state.asActive.onBetVoided(reservation)
        case BetPushed(_, reservation, _, _, _)                                           => state.asActive.onBetPushed(reservation)
        case PredictionPushed(_, reservation, _, _, _)                                    => state.asActive.onBetPushed(reservation)
        case BetCancelled(_, reservation, _, _, _)                                        => state.asActive.onBetCancelled(reservation)
        case PredictionCancelled(_, reservation, _, _, _)                                 => state.asActive.onBetCancelled(reservation)
        case BetWon(_, reservation, _, _, _)                                              => state.asActive.onBetWon(reservation)
        case PredictionWon(_, reservation, _, _, _)                                       => state.asActive.onBetWon(reservation)
        case BetLost(_, reservation, _, _, _)                                             => state.asActive.onBetLost(reservation)
        case PredictionLost(_, reservation, _, _, _)                                      => state.asActive.onBetLost(reservation)
        case ResponsibilityCheckAccepted(_)                                               => state.asActive.onResponsibilityCheckAccepted()
        case ResponsibilityCheckAcceptanceRequested(_)                                    => state.asActive.onResponsibilityCheckAcceptanceRequested()
        case msg @ BetResettled(_, _, _, _, _, _)                                         => state.asActive.onBetResettled(msg.transaction.amount)
        case msg @ PredictionResettled(_, _, _, _, _, _)                                  => state.asActive.onBetResettled(msg.transaction.amount)
        case _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance => state.asActive
      }

  private def handleDeposit(stateBeforeDeposit: ActiveWallet, stateAfterDeposit: ActiveWallet): ActiveWallet =
    if (
      stateBeforeDeposit.depositHistory.totalDeposited <= ResponsibilityCheckStatusThreshold &&
      stateAfterDeposit.depositHistory.totalDeposited > ResponsibilityCheckStatusThreshold
    ) {
      stateAfterDeposit.forceResponsibilityCheck()
    } else {
      stateAfterDeposit
    }

  private object WalletCommandHandler {

    type CommandHandler = (WalletState, WalletCommand) => ReplyEffect[WalletEvent, WalletState]

    def apply()(implicit clock: Clock): CommandHandler =
      (state, command) =>
        state match {
          case Uninitialized       => walletDoesNotExist(command)
          case state: ActiveWallet => walletExists(state, command)
        }

    private def walletDoesNotExist(walletCommand: WalletCommand)(implicit
        clock: Clock): ReplyEffect[WalletEvent, WalletState] =
      walletCommand match {
        case CreateWallet(walletId, initialBalance, replyTo) =>
          Effect
            .persist(WalletCreated(walletId, initialBalance, clock.currentOffsetDateTime()))
            .thenReply(replyTo)(state => CurrentBalance(walletId, getCurrentBalance(state)))

        case activeWalletCommand: ActiveWalletCommand =>
          Effect.reply(activeWalletCommand.replyTo)(WalletNotFound(activeWalletCommand.walletId))
      }

    private def walletExists(state: ActiveWallet, walletCommand: WalletCommand)(implicit
        clock: Clock): ReplyEffect[WalletEvent, WalletState] =
      walletCommand match {
        case CreateWallet(walletId, _, replyTo) =>
          Effect.reply(replyTo)(AlreadyExists(walletId))

        case GetCurrentBalance(walletId, replyTo) =>
          Effect.reply(replyTo)(CurrentBalance(walletId, getCurrentBalance(state)))

        case GetCurrentFinances(walletId, replyTo) =>
          Effect.reply(replyTo)(
            CurrentFinances(
              walletId,
              getCurrentBalance(state).realMoney,
              getOpenedBetsValue(state),
              getPendingWithdrawalsValue(state)))

        case GetDepositHistory(walletId, replyTo) =>
          Effect.reply(replyTo)(CurrentDepositHistory(walletId, getCurrentDepositHistory(state)))

        case GetResponsibilityCheckStatus(walletId, replyTo) =>
          Effect.reply(replyTo)(CurrentResponsibilityCheckStatus(walletId, state.responsibilityCheckStatus))

        case AcceptResponsibilityCheck(walletId, replyTo) =>
          Effect
            .persist(ResponsibilityCheckAccepted(walletId))
            .thenReply(replyTo)(_ => ResponsibilityCheckAcceptedResponse)

        case RequestResponsibilityCheckAcceptance(walletId, replyTo) =>
          Effect
            .persist(ResponsibilityCheckAcceptanceRequested(walletId))
            .thenReply(replyTo)(_ => ResponsibilityCheckAcceptanceRequestedResponse)

        case AdjustmentDepositFunds(walletId, funds, paymentMethod, replyTo) =>
          val now = clock.currentOffsetDateTime()
          Effect
            .persist(
              AdjustingFundsDeposited(walletId, newTransactionId(), funds, paymentMethod, state.accountBalance, now))
            .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))

        case AdjustmentWithdrawFunds(walletId, funds, paymentMethod, replyTo) =>
          ifCanWithdraw(state, funds, replyTo) {
            val now = clock.currentOffsetDateTime()
            Effect
              .persist(
                AdjustingFundsWithdrawn(walletId, newTransactionId(), funds, paymentMethod, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))
          }

        case DepositFunds(walletId, funds, paymentMethod, replyTo) =>
          val now = clock.currentOffsetDateTime()
          Effect
            .persist(FundsDeposited(walletId, newTransactionId(), funds, paymentMethod, state.accountBalance, now))
            .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))

        case WithdrawFunds(walletId, funds, paymentMethod, replyTo) =>
          ifCanWithdraw(state, funds, replyTo) {
            val now = clock.currentOffsetDateTime()
            Effect
              .persist(FundsWithdrawn(walletId, newTransactionId(), funds, paymentMethod, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))
          }

        case ReserveFundsForBet(walletId, bet, replyTo) =>
          ifCanWithdraw(state, bet.stake, replyTo) {
            val now = clock.currentOffsetDateTime()
            val reservationId = ReservationId.create()
            Effect
              .persist(FundsReservedForBet(walletId, reservationId, bet, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => FundsReserved(reservationId, getCurrentBalance(updatedState)))
          }

        case ReserveFundsForPrediction(walletId, bet, replyTo) =>
          ifCanWithdraw(state, bet.stake, replyTo) {
            val now = clock.currentOffsetDateTime()
            val reservationId = ReservationId.create()
            Effect
              .persist(FundsReservedForPrediction(walletId, reservationId, bet, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => FundsReserved(reservationId, getCurrentBalance(updatedState)))
          }

        case ReserveFundsForWithdrawal(walletId, withdrawal, replyTo) =>
          ifReservationDoesNotExist(state, withdrawal.reservationId, replyTo) {
            ifCanWithdraw(state, withdrawal.funds.value, replyTo) {
              val now = clock.currentOffsetDateTime()
              Effect
                .persist(FundsReservedForWithdrawal(walletId, withdrawal, state.accountBalance, now))
                .thenReply(replyTo)(updatedState =>
                  FundsReserved(withdrawal.reservationId, getCurrentBalance(updatedState)))
            }
          }

        case ConfirmWithdrawal(walletId, reservationId, origin, replyTo) =>
          ifReservationExists(state, reservationId, replyTo) {
            val now = clock.currentOffsetDateTime()
            val reservation = state.findWithdrawalReservation(reservationId)
            Effect
              .persist(WithdrawalConfirmed(walletId, reservation, origin, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))
          }

        case RejectWithdrawal(walletId, reservationId, origin, replyTo) =>
          ifReservationExists(state, reservationId, replyTo) {
            val now = clock.currentOffsetDateTime()
            val withdrawal = state.findWithdrawalReservation(reservationId)
            Effect
              .persist(WithdrawalCancelled(walletId, withdrawal, origin, state.accountBalance, now))
              .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))
          }

        case MarkBetVoided(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            BetVoided(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkPredictionVoided(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            PredictionVoided(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkBetPushed(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            BetPushed(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkPredictionPushed(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            PredictionPushed(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkBetCancelled(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            BetCancelled(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkPredictionCancelled(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            PredictionCancelled(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkBetWon(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            BetWon(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkPredictionWon(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            PredictionWon(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkBetLost(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            BetLost(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case MarkPredictionLost(walletId, reservationId, replyTo) =>
          markBetIfReservationExists(state, walletId, reservationId, replyTo) { bet =>
            PredictionLost(walletId, reservationId, bet, state.accountBalance, clock.currentOffsetDateTime())
          }

        case ResettleBet(walletId, bet, winner, replyTo) =>
          val transactionId = newTransactionId()

          Effect
            .persist(
              BetResettled(walletId, transactionId, bet, winner, state.accountBalance, clock.currentOffsetDateTime()))
            .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))

        case ResettlePrediction(walletId, bet, winner, replyTo) =>
          val transactionId = newTransactionId()

          Effect
            .persist(
              PredictionResettled(
                walletId,
                transactionId,
                bet,
                winner,
                state.accountBalance,
                clock.currentOffsetDateTime()))
            .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))

        case CheckBalanceForSuspend(walletId, replyTo) =>
          handleCheckBalanceForSuspend(walletId, state, replyTo)

        case CheckBalanceForUnsuspend(walletId, replyTo) =>
          handleCheckBalanceForUnsuspend(walletId, state, replyTo)

        case other =>
          log.warn(s"Unsupported command $other")
          Effect.reply(other.replyTo)(UnhandledCommandResponse(other.walletId))
      }

    private def handleCheckBalanceForUnsuspend(
        walletId: WalletId,
        state: ActiveWallet,
        replyTo: ActorRef[WalletResponse]): ReplyEffect[WalletEvent, WalletState] = {
      if (getCurrentBalance(state).realMoney >= RealMoney.zero.get)
        Effect
          .persist(PunterUnsuspendApproved(walletId))
          .thenReply(replyTo)(_ => BalanceCheckForUnsuspendAcceptedResponse)
      else
        Effect
          .persist(PunterUnsuspendRejected(walletId))
          .thenReply(replyTo)(_ => BalanceCheckForUnsuspendAcceptedResponse)
    }

    private def handleCheckBalanceForSuspend(
        walletId: WalletId,
        state: ActiveWallet,
        replyTo: ActorRef[WalletResponse]): ReplyEffect[WalletEvent, WalletState] = {
      if (getCurrentBalance(state).realMoney < RealMoney.zero.get)
        Effect.persist(NegativeBalance(walletId)).thenReply(replyTo)(_ => BalanceCheckForSuspendAcceptedResponse)
      else
        Effect.reply(replyTo)(BalanceCheckForSuspendAcceptedResponse)
    }

    private def markBetIfReservationExists(
        state: ActiveWallet,
        walletId: WalletId,
        reservationId: ReservationId,
        replyTo: ActorRef[WalletResponse])(eventFor: Bet => WalletEvent): ReplyEffect[WalletEvent, WalletState] =
      ifReservationExists(state, reservationId, replyTo) {
        val bet = state.findBetReservation(reservationId)
        Effect
          .persist(eventFor(bet))
          .thenReply(replyTo)(updatedState => CurrentBalance(walletId, getCurrentBalance(updatedState)))
      }

    private def getCurrentBalance(state: WalletState): Balance =
      state.asActive.balance

    private def getOpenedBetsValue(state: WalletState): RealMoney =
      state.asActive.bets.values.map(_.stake).fold(RealMoney(0))(_ + _)

    private def getPendingWithdrawalsValue(state: WalletState): RealMoney =
      state.asActive.withdrawals.values.map(_.funds.value).fold(RealMoney(0))(_ + _)

    private def getCurrentDepositHistory(state: WalletState): DepositHistory =
      state.asActive.depositHistory

    private def ifCanWithdraw[T](state: ActiveWallet, funds: RealMoney, replyTo: ActorRef[WalletResponse])(
        thenContinue: => ReplyEffect[WalletEvent, WalletState]): ReplyEffect[WalletEvent, WalletState] = {
      if (state.canWithdraw(funds))
        thenContinue
      else
        Effect.reply(replyTo)(InsufficientFunds(state.walletId))
    }

    private def ifReservationExists(
        state: ActiveWallet,
        reservationId: ReservationId,
        recipient: ActorRef[WalletResponse])(
        thenContinue: => ReplyEffect[WalletEvent, WalletState]): ReplyEffect[WalletEvent, WalletState] = {
      if (state.hasReservedFunds(reservationId))
        thenContinue
      else
        Effect.reply(recipient)(ReservationNotFound(state.walletId, reservationId))
    }

    private def ifReservationDoesNotExist(
        state: ActiveWallet,
        reservationId: ReservationId,
        recipient: ActorRef[WalletResponse])(
        thenContinue: => ReplyEffect[WalletEvent, WalletState]): ReplyEffect[WalletEvent, WalletState] = {
      if (!state.hasReservedFunds(reservationId))
        thenContinue
      else
        Effect.reply(recipient)(ReservationAlreadyExists(state.walletId, reservationId))
    }

    private def newTransactionId(): String =
      UUID.randomUUID().toString
  }
}
