package phoenix.markets

import java.time.OffsetDateTime

import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.ReplyEffect
import org.slf4j.LoggerFactory

import phoenix.core.OptionUtils._
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketLifecycleTransitions.attemptLifecycleTransition
import phoenix.markets.MarketProtocol.Commands._
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events._
import phoenix.markets.MarketProtocol.Responses.Failure
import phoenix.markets.MarketProtocol.Responses.Failure._
import phoenix.markets.MarketProtocol.Responses.MarketResponse
import phoenix.markets.MarketProtocol.Responses.Success._
import phoenix.markets.MarketProtocol._
import phoenix.markets.MarketsBoundedContext._
import phoenix.sharding.PhoenixPersistenceId
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.sharding.ShardingCommandChecker
import phoenix.utils.EventSourcedBehaviourConfiguration.enrichWithCommonPersistenceConfiguration
private[markets] object MarketEntity extends ShardingCommandChecker[MarketCommand, MarketEvent, MarketState] {
  private val log = LoggerFactory.getLogger(this.objectName)

  def apply(marketId: MarketId, tags: Vector[ProjectionTag]): Behavior[MarketCommand] = {

    Behaviors.setup[MarketCommand] { _ =>
      log.debug("Starting Market entity {}", marketId)
      enrichWithCommonPersistenceConfiguration {
        EventSourcedBehavior[MarketCommand, MarketEvent, MarketState](
          persistenceId = PhoenixPersistenceId.of(MarketShardingRegion.TypeKey, marketId),
          emptyState = Uninitialized,
          commandHandler = (state, command) =>
            checkCommandAndHandle(marketId, command.marketId)(() => MarketCommandHandler(marketId)(state, command)),
          eventHandler = MarketEventHandler()).withTagger(_ =>
          Set(ProjectionTag.from(marketId, tags).value, MarketTags.allMarketEventsNotSharded.value))
      }
    }
  }
}

private object MarketCommandHandler {
  private val log = LoggerFactory.getLogger(this.objectName)

  type CommandHandler = (MarketState, MarketCommand) => ReplyEffect[MarketEvent, MarketState]

  def apply(marketId: MarketId): CommandHandler = {
    case (Uninitialized, command: UpdateMarket)                   => createMarket(command)
    case (Uninitialized, other)                                   => marketNotInitialized(other)
    case (state: InitializedMarket, command: UpdateMarket)        => updateMarket(state, command)
    case (state: InitializedMarket, command: UpdateSelectionOdds) => updateSelectionOdds(state, command)
    case (state: InitializedMarket, command: UpdateMarketInfo)    => updateMarketInfo(state, command)
    case (state: InitializedMarket, command: CheckIfMarketExists) => marketExists(state, command)
    case (state: InitializedMarket, command: SettleMarket)        => settleMarket(state, command)
    case (state: InitializedMarket, command: ResettleMarket)      => resettleMarket(state, command)
    case (state: InitializedMarket, command: CancelMarket)        => cancelMarket(state, command)
    case (state: InitializedMarket, command: FreezeMarket)        => freezeMarket(state, command)
    case (state: InitializedMarket, command: UnfreezeMarket)      => unfreezeMarket(state, command)
    case (state: InitializedMarket, command: GetMarketState)      => getState(state, command)
    case (otherState, otherCommand)                               => unhandledCommand(marketId, otherState, otherCommand)
  }

  private def createMarket(command: UpdateMarket): ReplyEffect[MarketEvent, MarketState] = {
    val UpdateMarket(
      _,
      receivedAtUtc,
      fixtureId,
      marketId,
      marketName,
      marketType,
      marketCategory,
      marketLifecycle,
      marketSpecifiers,
      selectionOdds,
      replyTo) = command

    val marketInfo = MarketInfo(marketName, fixtureId, marketType, marketCategory, marketSpecifiers)

    val events =
      List(
        Events.MarketCreated(marketId, marketLifecycle, marketInfo, selectionOdds, receivedAtUtc),
        Events.MarketInfoChanged(marketId, marketInfo, receivedAtUtc),
        Events.MarketOddsChanged(marketId, selectionOdds, receivedAtUtc),
        MarketLifecycleTransitions.lifecycleEvent(marketId, marketLifecycle, receivedAtUtc))

    Effect.persist(events).thenReply(replyTo)(_ => MarketUpdatedResponse(marketId))
  }

  private def marketNotInitialized(command: MarketCommand): ReplyEffect[MarketEvent, MarketState] =
    Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(
      MarketNotInitializedResponse(command.marketId))

  private def updateSelectionOdds(
      state: InitializedMarket,
      command: UpdateSelectionOdds): ReplyEffect[MarketEvent, MarketState] = {
    val UpdateSelectionOdds(marketId, selectionOdds, timestamp, replyTo) = command
    val maybeOddsChanged = detectOddsChanges(state, selectionOdds, timestamp)

    val events = maybeOddsChanged.toList

    Effect.persist(events).thenReply(replyTo)(_ => MarketOddsUpdatedResponse(marketId))
  }

  private def updateMarket(state: InitializedMarket, command: UpdateMarket): ReplyEffect[MarketEvent, MarketState] = {
    val UpdateMarket(
      _,
      receivedAtUtc,
      fixtureId,
      marketId,
      marketName,
      marketType,
      marketCategory,
      lifecycle,
      marketSpecifiers,
      selectionOdds,
      replyTo) = command

    val marketInfo = MarketInfo(marketName, fixtureId, marketType, marketCategory, marketSpecifiers)

    val maybeInfoChanged = detectInfoChanges(state, marketInfo, receivedAtUtc)
    val maybeOddsChanged = detectOddsChanges(state, selectionOdds, receivedAtUtc)
    val maybeLifecycleChanged = detectLifecycleChanges(state, lifecycle, receivedAtUtc)

    val events = (maybeInfoChanged ++ maybeOddsChanged ++ maybeLifecycleChanged).toList

    Effect.persist(events).thenReply(replyTo)(_ => MarketUpdatedResponse(marketId))
  }

  private def detectInfoChanges(
      state: InitializedMarket,
      newInfo: MarketInfo,
      timestamp: OffsetDateTime): Option[MarketEvent] =
    Option.when(newInfo != state.info) {
      Events.MarketInfoChanged(state.id, newInfo, timestamp)
    }

  private def detectOddsChanges(
      state: InitializedMarket,
      newOdds: Seq[SelectionOdds],
      timestamp: OffsetDateTime): Option[MarketEvent] =
    Option.when(MarketSelections(newOdds) != state.marketSelections) {
      MarketOddsChanged(state.id, newOdds, timestamp)
    }

  private def detectLifecycleChanges(
      state: InitializedMarket,
      newLifecycle: MarketLifecycle,
      timestamp: OffsetDateTime): Option[MarketEvent] =
    Option.whenOpt(newLifecycle != state.lifecycle)(
      attemptLifecycleTransition(state.id, state.lifecycle, newLifecycle, timestamp))

  private def updateMarketInfo(
      state: InitializedMarket,
      command: UpdateMarketInfo): ReplyEffect[MarketEvent, MarketState] = {
    val UpdateMarketInfo(marketId, newName, timestamp, replyTo) = command
    val maybeEvent = Option.when(newName != state.info.name) {
      Events.MarketInfoChanged(marketId, state.info.withName(newName), timestamp)
    }

    val events = maybeEvent.toList

    Effect.persist(events).thenReply(replyTo)((_: MarketState) => MarketInfoUpdatedResponse(marketId))
  }

  private def marketExists(
      state: InitializedMarket,
      command: CheckIfMarketExists): ReplyEffect[MarketEvent, MarketState] =
    Effect.reply[MarketExistsResponse, MarketEvent, MarketState](command.replyTo)(MarketExistsResponse(state.id))

  private def settleMarket(state: InitializedMarket, command: SettleMarket): ReplyEffect[MarketEvent, MarketState] = {
    if (!state.hasSelection(command.winningSelection))
      Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(
        SelectionDoesNotExistResponse(state.id, command.winningSelection))
    else {
      val settled = Settled(command.reason, command.winningSelection)

      attemptLifecycleTransition(state.id, state.lifecycle, settled, command.receivedAt) match {
        case Some(lifecycleEvent) =>
          Effect.persist(lifecycleEvent).thenReply(command.replyTo)((_: MarketState) => MarketSettledResponse(state.id))

        case None =>
          val response =
            if (state.lifecycle == settled) DuplicateSettleMarketEventResponse.apply _
            else CannotSettleMarketResponse.apply _

          Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(
            response(state.id, command.winningSelection))
      }
    }
  }

  private def resettleMarket(state: InitializedMarket, command: ResettleMarket): ReplyEffect[MarketEvent, MarketState] =
    if (!state.hasSelection(command.newWinningSelection))
      Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(
        SelectionDoesNotExistResponse(state.id, command.newWinningSelection))
    else {
      val resettled = Resettled(command.reason, command.newWinningSelection)

      attemptLifecycleTransition(state.id, state.lifecycle, resettled, command.receivedAt) match {
        case Some(lifecycleEvent) =>
          Effect
            .persist(lifecycleEvent)
            .thenReply(command.replyTo)((_: MarketState) => MarketResettledResponse(state.id))

        case None =>
          Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(
            CannotResettleMarketResponse(state.id, command.newWinningSelection))
      }
    }

  private def cancelMarket(state: InitializedMarket, command: CancelMarket): ReplyEffect[MarketEvent, MarketState] = {
    val cancelled = Cancelled(command.reason)

    attemptLifecycleTransition(state.id, state.lifecycle, cancelled, command.receivedAt) match {
      case Some(transitionEvent) =>
        Effect
          .persist(transitionEvent)
          .thenReply(command.replyTo)((_: MarketState) => MarketCancelledResponse(state.id))

      case None =>
        val response =
          if (state.lifecycle == cancelled) DuplicateCancelMarketEventResponse.apply _
          else CannotCancelMarketResponse.apply _

        Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(response(state.id))
    }
  }

  private def freezeMarket(state: InitializedMarket, command: FreezeMarket): ReplyEffect[MarketEvent, MarketState] = {
    val notBettable = NotBettable(command.reason)

    attemptLifecycleTransition(state.id, state.lifecycle, notBettable, command.receivedAt) match {
      case Some(lifecycleEvent) =>
        Effect.persist(lifecycleEvent).thenReply(command.replyTo)((_: MarketState) => MarketFrozenResponse(state.id))

      case None =>
        val response =
          if (state.lifecycle == notBettable) DuplicateFreezeMarketEventResponse.apply _
          else CannotFreezeMarketResponse.apply _
        Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(response(state.id))
    }
  }

  private def unfreezeMarket(
      state: InitializedMarket,
      command: UnfreezeMarket): ReplyEffect[MarketEvent, MarketState] = {
    val bettableAgain = Bettable(command.reason)

    attemptLifecycleTransition(state.id, state.lifecycle, bettableAgain, command.receivedAt) match {
      case Some(lifecycleEvent) =>
        Effect.persist(lifecycleEvent).thenReply(command.replyTo)((_: MarketState) => MarketUnfrozenResponse(state.id))

      case None =>
        Effect.reply[MarketResponse, MarketEvent, MarketState](command.replyTo)(CannotUnfreezeMarketResponse(state.id))
    }
  }

  private def getState(state: InitializedMarket, command: GetMarketState): ReplyEffect[MarketEvent, MarketState] =
    Effect.reply(command.replyTo)(MarketStateResponse(state))

  private def unhandledCommand(
      marketId: MarketId,
      state: MarketState,
      command: MarketCommand): ReplyEffect[MarketEvent, MarketState] = {
    log.warn(s"Ignoring market command $command in state $state")
    Effect.reply(command.replyTo)(Failure.UnhandledCommandResponse(marketId))
  }
}

private object MarketEventHandler {
  private val log = LoggerFactory.getLogger(this.objectName)

  type EventHandler = EventSourcedBehavior.EventHandler[MarketState, MarketEvent]

  def apply(): EventHandler =
    (state, event) => {
      state match {
        case Uninitialized                  => whenUninitialized(event)
        case initialized: InitializedMarket => whenInitialized(initialized, event)
      }
    }

  private def whenUninitialized(event: MarketEvent): MarketState =
    event match {
      case Events.MarketCreated(id, lifecycleStatus, info, odds, _) =>
        InitializedMarket(id, info, lifecycleStatus, odds)
      case other => unexpectedEvent(Uninitialized, other)
    }

  private def whenInitialized(state: InitializedMarket, event: MarketEvent): MarketState =
    event match {
      case Events.MarketOddsChanged(_, selectionOdds, _) => state.updateOdds(selectionOdds)
      case Events.MarketInfoChanged(_, info, _)          => state.updateInfo(info)
      case event: Events.MarketLifecycleEvent            => state.changeLifecycle(event.lifecycle)
      case other                                         => unexpectedEvent(state, other)
    }

  private def unexpectedEvent(state: MarketState, event: MarketEvent): MarketState = {
    val msg = s"unexpected market event [$event] in state [$state]"
    val exception = new IllegalStateException(msg)
    log.warn(msg, exception)
    throw exception
  }
}
