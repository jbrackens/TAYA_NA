package phoenix.bets

import java.util.UUID

import akka.actor.typed.Behavior
import akka.actor.typed.SupervisorStrategy
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import org.slf4j.LoggerFactory

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Commands._
import phoenix.bets.BetProtocol.Events
import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetProtocol.Responses._
import phoenix.core.ScalaObjectUtils._
import phoenix.sharding.PhoenixId
import phoenix.sharding.PhoenixPersistenceId
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.sharding.ShardingCommandChecker
import phoenix.utils.EventSourcedBehaviourConfiguration.enrichWithCommonPersistenceConfiguration

object BetEntity extends ShardingCommandChecker[BetCommand, BetEvent, BetState] {

  final case class BetId(value: String) extends PhoenixId

  object BetId {
    def random(): BetId = BetId(UUID.randomUUID().toString)
  }

  def apply(betId: BetId): Behavior[BetCommand] =
    Behaviors.setup { _ =>
      Behaviors
        .supervise(enrichWithCommonPersistenceConfiguration {
          EventSourcedBehavior[BetCommand, BetEvent, BetState](
            persistenceId = PhoenixPersistenceId.of(BetsShardingRegion.TypeKey, betId),
            emptyState = Uninitialized,
            commandHandler = (state, command) => {
              checkCommandAndHandle(betId, command.betId)(() => BetCommandHandler(betId)(state, command))
            },
            eventHandler = BetEventHandler()).withTagger(_ =>
            Set(ProjectionTag.from(betId, BetTags.betTags).value, BetTags.allBetEventsNotSharded.value))
        })
        .onFailure[IllegalStateException](SupervisorStrategy.resume)
    }
}

private object BetCommandHandler {

  private val log = LoggerFactory.getLogger(this.objectName)

  type CommandHandler = (BetState, BetCommand) => ReplyEffect[BetEvent, BetState]

  def apply(betId: BetId): CommandHandler = {
    case (Uninitialized, command: OpenBet)          => open(command, betId)
    case (Uninitialized, command: FailBet)          => fail(command, betId)
    case (Uninitialized, command: BetCommand)       => failureDueToUninitialized(command)
    case (state: Open, command: GetBetDetails)      => getDetails(state, command, betId)
    case (state: Open, command: SettleBet)          => settle(state, command, betId)
    case (state: Open, command: VoidBet)            => void(state, command, betId)
    case (state: Open, command: PushBet)            => push(state, command, betId)
    case (state: Open, command: CancelBet)          => cancel(state, command)
    case (state: Settled, command: GetBetDetails)   => getDetails(state, command, betId)
    case (state: Settled, command: ResettleBet)     => resettle(state, command, betId)
    case (state: Resettled, command: GetBetDetails) => getDetails(state, command, betId)
    case (state: Voided, command: GetBetDetails)    => getDetails(state, command, betId)
    case (state: Pushed, command: GetBetDetails)    => getDetails(state, command, betId)
    case (state: Cancelled, command: GetBetDetails) => getDetails(state, command, betId)
    case (state: Failed, command: GetBetDetails)    => getDetails(state, command, betId)
    case (_: Cancelled, command: CancelBet)         => failureDueToAlreadyCancelled(command)
    case (otherState, otherCommand)                 => unhandledCommand(otherState, otherCommand)
  }

  private def failureDueToUninitialized(command: BetCommand): ReplyEffect[BetEvent, BetState] =
    Effect.reply(command.replyTo)(Failure.BetNotInitialized(command.betId))

  private def failureDueToAlreadyCancelled(command: CancelBet): ReplyEffect[BetEvent, BetState] =
    Effect.reply(command.replyTo)(Failure.AlreadyCancelled(command.betId))

  private def getDetails(state: BetState, command: GetBetDetails, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    val response = state match {
      case settled: Settled    => Success.BetDetails(betId, state.getStatus, settled.betData, settled.isWinner)
      case failed: Failed      => Success.FailedBetDetails(betId, failed.betData, failed.reasons)
      case hasData: HasBetData => Success.BetDetails(betId, state.getStatus, hasData.betData, isWinner = false)
      case other               => Failure.GetBetDetailsFailure(betId, s"Unknown state for bet $other")
    }

    Effect.reply(command.replyTo)(response)
  }

  private def fail(command: FailBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"$betId failing bet $command")
    Effect
      .persist(BetFailed(betId, command.betData, command.reasons))
      .thenReply(command.replyTo)(_ => Success.BetFailed(betId))
  }

  private def open(command: OpenBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"$betId opening bet $command")
    Effect
      .persist(
        BetOpened(betId, command.betData, command.reservationId, command.geolocation, placedAt = command.placedAt))
      .thenReply(command.replyTo)(_ => Success.BetOpened(betId))
  }

  private def settle(state: Open, command: SettleBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"Bet $betId settled [$command]")
    Effect
      .persist(
        BetSettled(betId, state.betData, state.reservationId, command.winningSelectionId == state.betData.selectionId))
      .thenReply(command.replyTo)(_ => Success.BetSettled(betId))
  }

  private def resettle(state: Settled, command: ResettleBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"Bet $betId resettled [$command]")
    Effect
      .persist(
        BetResettled(
          betId,
          state.betData,
          command.newWinningSelectionId == state.betData.selectionId,
          command.resettledAt))
      .thenReply(command.replyTo)(_ => Success.BetResettled(betId))
  }

  private def void(state: Open, command: VoidBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"Bet $betId voided [$command]")
    Effect
      .persist(BetVoided(betId, state.betData, state.reservationId))
      .thenReply(command.replyTo)(_ => Success.BetVoided(betId))
  }

  private def push(state: Open, command: PushBet, betId: BetId): ReplyEffect[BetEvent, BetState] = {
    log.info(s"Bet $betId pushed [$command]")
    Effect
      .persist(BetPushed(betId, state.betData, state.reservationId))
      .thenReply(command.replyTo)(_ => Success.BetPushed(betId))
  }

  private def cancel(state: Open, command: CancelBet): ReplyEffect[BetEvent, BetState] = {
    log.info(s"Bet ${command.betId} cancelled [$command]")
    Effect
      .persist(
        Events.BetCancelled(
          command.betId,
          state.betData,
          state.reservationId,
          command.adminUser,
          command.cancellationReason,
          command.betCancellationTimestamp))
      .thenReply(command.replyTo)(_ => Success.BetCancelled(command.betId))
  }

  private def unhandledCommand(state: BetState, command: BetCommand): ReplyEffect[BetEvent, BetState] = {
    log.warn(s"Ignoring market command $command in state $state")
    Effect.noReply
  }
}

private object BetEventHandler {

  type EventHandler = EventSourcedBehavior.EventHandler[BetState, BetEvent]

  def apply(): EventHandler = {
    case (Uninitialized, event: BetOpened) =>
      Uninitialized.open(event.betId, event.betData, event.reservationId, event.geolocation)
    case (Uninitialized, event: BetFailed) =>
      Uninitialized.fail(event.betId, event.betData, event.reasons)
    case (state: Open, event: BetSettled) => state.settle(event.winner)
    case (state: Open, _: BetVoided)      => state.void()
    case (state: Open, _: BetPushed)      => state.push()
    case (state: Open, event: BetCancelled) =>
      state.cancel(event.adminUser, event.cancellationReason, event.betCancellationTimestamp)
    case (state: Settled, event: BetResettled) => state.resettle(event.winner)
    case (otherState, otherEvent) =>
      throw new IllegalStateException(s"unexpected event [$otherEvent] in state [$otherState]")
  }
}
