package phoenix.bets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.bets.BetsBoundedContext.BetPushingError
import phoenix.bets.BetsBoundedContext.BetSettlementError
import phoenix.bets.BetsBoundedContext.BetVoidingError
import phoenix.core.TimeUtils._
import phoenix.markets.LifecycleChangeReason.DataSupplierPush
import phoenix.markets.MarketProtocol.Events.MarketCancelled
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events.MarketResettled
import phoenix.markets.MarketProtocol.Events.MarketSettled
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.projections.ProjectionEventHandler

private final class MarketLifecycleEventHandler(bets: BetsBoundedContext)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[MarketEvent] {

  private val log = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[MarketEvent]): Future[Done] = {
    log.debug(s"{}", envelope.event)

    envelope.event match {
      case event: MarketSettled =>
        settleAllBetsForMarket(event.marketId, event.winningSelection)

      case event: MarketResettled =>
        resettleAllBetsForMarket(event.marketId, event.newWinningSelection, envelope.timestamp.toUtcOffsetDateTime)

      case MarketCancelled(marketId, DataSupplierPush(), _) =>
        pushAllBetsForMarket(marketId)

      case MarketCancelled(marketId, _, _) =>
        voidAllBetsForMarket(marketId)

      case other =>
        log.debug(s"Ignoring irrelevant market event [marketId = ${other.marketId}, event = $other]")
        Future.successful(Done)
    }
  }

  private def settleAllBetsForMarket(marketId: MarketId, winningSelection: SelectionId): Future[Done] =
    bets.settleBets(marketId, winningSelection).bimap(new SettlementHandlingException(_), _ => Done).rethrowT

  private def resettleAllBetsForMarket(
      marketId: MarketId,
      newWinningSelection: SelectionId,
      resettledAt: OffsetDateTime): Future[Done] =
    bets
      .resettleBets(marketId, newWinningSelection, resettledAt)
      .bimap(new ResettlementHandlingException(_), _ => Done)
      .rethrowT

  private def voidAllBetsForMarket(marketId: MarketId): Future[Done] =
    bets.voidBets(marketId).bimap(new VoidingHandlingException(_), _ => Done).rethrowT

  private def pushAllBetsForMarket(marketId: MarketId): Future[Done] =
    bets.pushBets(marketId).bimap(new PushingHandlingException(_), _ => Done).rethrowT
}

private final class SettlementHandlingException(error: BetSettlementError)
    extends RuntimeException(s"Error when trying to settle bets for market - underlying: $error")

private final class ResettlementHandlingException(error: BetSettlementError)
    extends RuntimeException(s"Error when trying to resettle bets for market - underlying: $error")

private final class VoidingHandlingException(error: BetVoidingError)
    extends RuntimeException(s"Error when trying to void bets for market - underlying: $error")

private final class PushingHandlingException(error: BetPushingError)
    extends RuntimeException(s"Error when trying to push bets for market - underlying: $error")
