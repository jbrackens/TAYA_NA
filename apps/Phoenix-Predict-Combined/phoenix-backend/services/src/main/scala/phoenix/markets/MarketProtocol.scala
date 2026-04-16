package phoenix.markets

import java.time.OffsetDateTime

import akka.actor.typed.ActorRef

import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketProtocol.Responses.MarketResponse
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.domain.MarketType
import phoenix.markets.infrastructure.MarketsAkkaSerializable
import phoenix.markets.sports.SportEntity.FixtureId

object MarketProtocol {
  object Commands {
    sealed trait MarketCommand extends MarketsAkkaSerializable {
      val marketId: MarketId
      val replyTo: ActorRef[MarketResponse]
    }

    final case class UpdateMarket(
        correlationId: String,
        receivedAtUtc: OffsetDateTime,
        fixtureId: FixtureId,
        marketId: MarketId,
        marketName: String,
        marketType: MarketType,
        marketCategory: Option[MarketCategory],
        marketLifecycle: MarketLifecycle,
        marketSpecifiers: Seq[MarketSpecifier],
        selectionOdds: Seq[SelectionOdds],
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class UpdateSelectionOdds(
        marketId: MarketId,
        selectionOdds: Seq[SelectionOdds],
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class CheckIfMarketExists(marketId: MarketId, replyTo: ActorRef[MarketResponse]) extends MarketCommand

    final case class UpdateMarketInfo(
        marketId: MarketId,
        marketName: String,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class SettleMarket(
        marketId: MarketId,
        winningSelection: SelectionId,
        reason: LifecycleOperationalChangeReason,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class ResettleMarket(
        marketId: MarketId,
        newWinningSelection: SelectionId,
        reason: LifecycleOperationalChangeReason,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class CancelMarket(
        marketId: MarketId,
        reason: LifecycleCancellationReason,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class FreezeMarket(
        marketId: MarketId,
        reason: LifecycleOperationalChangeReason,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class UnfreezeMarket(
        marketId: MarketId,
        reason: LifecycleOperationalChangeReason,
        receivedAt: OffsetDateTime,
        replyTo: ActorRef[MarketResponse])
        extends MarketCommand

    final case class GetMarketState(marketId: MarketId, replyTo: ActorRef[MarketResponse]) extends MarketCommand
  }

  object Responses {

    sealed trait MarketResponse extends MarketsAkkaSerializable

    sealed trait MarketFailure extends MarketResponse

    object Success {

      final case class MarketUpdatedResponse(marketId: MarketId) extends MarketResponse

      final case class MarketInfoUpdatedResponse(marketId: MarketId) extends MarketResponse

      final case class MarketOddsUpdatedResponse(marketId: MarketId) extends MarketResponse

      final case class MarketSettledResponse(marketId: MarketId) extends MarketResponse

      final case class MarketResettledResponse(marketId: MarketId) extends MarketResponse

      final case class MarketCancelledResponse(marketId: MarketId) extends MarketResponse

      final case class MarketFrozenResponse(marketId: MarketId) extends MarketResponse

      final case class MarketUnfrozenResponse(marketId: MarketId) extends MarketResponse

      final case class MarketExistsResponse(id: MarketId) extends MarketResponse

      final case class MarketStateResponse(marketState: InitializedMarket) extends MarketResponse
    }

    object Failure {

      final case class MarketNotInitializedResponse(marketId: MarketId) extends MarketFailure

      final case class SelectionDoesNotExistResponse(marketId: MarketId, selectionId: SelectionId) extends MarketFailure

      final case class CannotSettleMarketResponse(marketId: MarketId, selectionId: SelectionId) extends MarketFailure

      final case class DuplicateSettleMarketEventResponse(marketId: MarketId, selectionId: SelectionId)
          extends MarketFailure

      final case class CannotResettleMarketResponse(marketId: MarketId, selectionId: SelectionId) extends MarketFailure

      final case class CannotCancelMarketResponse(marketId: MarketId) extends MarketFailure

      final case class DuplicateCancelMarketEventResponse(marketId: MarketId) extends MarketFailure

      final case class CannotFreezeMarketResponse(marketId: MarketId) extends MarketFailure

      final case class DuplicateFreezeMarketEventResponse(marketId: MarketId) extends MarketFailure

      final case class CannotUnfreezeMarketResponse(marketId: MarketId) extends MarketFailure

      final case class UnhandledCommandResponse(marketId: MarketId) extends MarketFailure
    }
  }

  object Events {

    sealed trait MarketEvent extends MarketsAkkaSerializable {
      val marketId: MarketId
    }

    final case class MarketCreated(
        marketId: MarketId,
        lifecycle: MarketLifecycle,
        info: MarketInfo,
        selectionOdds: Seq[SelectionOdds],
        createdAt: OffsetDateTime)
        extends MarketEvent

    final case class MarketOddsChanged(marketId: MarketId, selectionOdds: Seq[SelectionOdds], timestamp: OffsetDateTime)
        extends MarketEvent

    sealed trait MarketLifecycleEvent extends MarketEvent {
      def lifecycle: MarketLifecycle
      val updatedAt: OffsetDateTime
    }

    final case class MarketInfoChanged(marketId: MarketId, marketInfo: MarketInfo, updatedAt: OffsetDateTime)
        extends MarketEvent

    final case class MarketBecameBettable(
        marketId: MarketId,
        reason: LifecycleOperationalChangeReason,
        updatedAt: OffsetDateTime)
        extends MarketLifecycleEvent {
      override def lifecycle: MarketLifecycle = Bettable(reason)
    }

    final case class MarketBecameNotBettable(
        marketId: MarketId,
        reason: LifecycleOperationalChangeReason,
        updatedAt: OffsetDateTime)
        extends MarketLifecycleEvent {
      override def lifecycle: MarketLifecycle = NotBettable(reason)
    }

    final case class MarketSettled(
        marketId: MarketId,
        winningSelection: SelectionId,
        reason: LifecycleOperationalChangeReason,
        updatedAt: OffsetDateTime)
        extends MarketLifecycleEvent {
      override def lifecycle: MarketLifecycle = Settled(reason, winningSelection)
    }

    final case class MarketResettled(
        marketId: MarketId,
        newWinningSelection: SelectionId,
        reason: LifecycleOperationalChangeReason,
        updatedAt: OffsetDateTime)
        extends MarketLifecycleEvent {
      override def lifecycle: MarketLifecycle = Resettled(reason, newWinningSelection)
    }

    final case class MarketCancelled(marketId: MarketId, reason: LifecycleCancellationReason, updatedAt: OffsetDateTime)
        extends MarketLifecycleEvent {
      override def lifecycle: MarketLifecycle = Cancelled(reason)
    }

  }
}
