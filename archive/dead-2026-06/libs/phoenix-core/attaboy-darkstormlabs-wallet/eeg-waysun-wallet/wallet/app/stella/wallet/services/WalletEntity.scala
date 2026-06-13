package stella.wallet.services

import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import akka.persistence.typed.scaladsl.RetentionCriteria

import stella.common.core.Clock

import stella.wallet.config.WalletAkkaConfig
import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.WalletKey
import stella.wallet.models.Ids.WalletPersistenceId
import stella.wallet.models.wallet.WalletState
import stella.wallet.models.wallet.WalletState.WalletBalanceState
import stella.wallet.services.WalletActorProtocol.WalletCommand
import stella.wallet.services.WalletActorProtocol.WalletCommand._
import stella.wallet.services.WalletActorProtocol.WalletEvent
import stella.wallet.services.WalletActorProtocol.WalletEvent.FundsAdded
import stella.wallet.services.WalletActorProtocol.WalletEvent.FundsSubtracted
import stella.wallet.services.WalletActorProtocol.WalletResponse._
import stella.wallet.services.projections.WalletTags

object WalletEntity {

  def apply(
      walletKey: WalletKey,
      walletAkkaConfig: WalletAkkaConfig,
      walletTags: WalletTags,
      clock: Clock): Behavior[WalletCommand] =
    Behaviors.setup[WalletCommand] { context =>
      context.log.info("Starting Wallet entity {}", walletKey.entityId)
      EventSourcedBehavior
        .withEnforcedReplies[WalletCommand, WalletEvent, WalletState](
          persistenceId = WalletPersistenceId.of(WalletShardingRegion.TypeKey, walletKey),
          emptyState = WalletBalanceState.empty,
          commandHandler = commandHandler(clock),
          eventHandler = eventHandler)
        .withRetention(
          RetentionCriteria.snapshotEvery(
            numberOfEvents = walletAkkaConfig.stateSnapshot.numberOfEvents,
            keepNSnapshots = walletAkkaConfig.stateSnapshot.keepNSnapshots))
        .onPersistFailure(SupervisorStrategy.restartWithBackoff(
          minBackoff = walletAkkaConfig.statePersistenceFailureRestart.minBackoff,
          maxBackoff = walletAkkaConfig.statePersistenceFailureRestart.maxBackoff,
          randomFactor = walletAkkaConfig.statePersistenceFailureRestart.randomFactor))
        .withTagger(_ => Set(walletTags.from(walletKey).value, WalletTags.allWalletTransactionsTag.value))
    }

  private def commandHandler(clock: Clock): (WalletState, WalletCommand) => ReplyEffect[WalletEvent, WalletState] =
    (state, command) =>
      state match {
        case WalletBalanceState(balance) =>
          command match {
            case command: TopUpFunds =>
              Effect
                .persist(FundsAdded.fromCommand(command, clock.currentUtcOffsetDateTime()))
                .thenReply(command.replyTo)(_ => TopUpFundsSucceeded)
            case command: WithdrawFunds =>
              if (hasEnoughFunds(balance, command))
                Effect
                  .persist(FundsSubtracted.fromCommand(command, clock.currentUtcOffsetDateTime()))
                  .thenReply(command.replyTo)(_ => WithdrawFundsSucceeded)
              else Effect.reply(command.replyTo)(InsufficientFunds)
            case GetBalances(replyTo) =>
              Effect.reply(replyTo)(GetBalancesValue(balance))
            case GetBalance(currencyId, replyTo) =>
              balance.get(currencyId) match {
                case Some(amount) =>
                  Effect.reply(replyTo)(GetBalanceValue(amount))
                case None =>
                  Effect.reply(replyTo)(BalanceForCurrencyNotFound)
              }
          }
      }

  private def eventHandler: (WalletState, WalletEvent) => WalletState =
    (state, event) =>
      state match {
        case WalletBalanceState(balance) =>
          event match {
            case addedEvent: FundsAdded =>
              val oldAmount: BigDecimal = balance.getOrElse(addedEvent.currencyId, 0)
              val newAmount = oldAmount + addedEvent.amount.value
              WalletBalanceState(balance.updated(addedEvent.currencyId, newAmount))
            case subtractedEvent: FundsSubtracted =>
              // actually in this case it's expected the funds will be always present
              val oldAmount: BigDecimal = balance.getOrElse(subtractedEvent.currencyId, 0)
              val newAmount = oldAmount - subtractedEvent.amount.value
              WalletBalanceState(balance.updated(subtractedEvent.currencyId, newAmount))
          }
      }

  private def hasEnoughFunds(balance: Map[CurrencyId, BigDecimal], command: WithdrawFunds): Boolean = {
    val oldAmount: BigDecimal = balance.getOrElse(command.currencyId, 0)
    oldAmount >= command.amount.value
  }
}
