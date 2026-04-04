package phoenix.reports.application.es

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.bets.BetProtocol.Events._
import phoenix.core.Clock
import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository
import phoenix.reports.domain.model.bets.NormalizedStake

private[reports] final class BetsProjectionEventHandler(betsRepository: BetsRepository, clock: Clock)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {

  private def handler: (BetEvent, OffsetDateTime) => Future[Unit] = BetsProjectionEventHandler.handle(betsRepository)

  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] = {
    val eventHappenedAt = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    handler(envelope.event, eventHappenedAt).map(_ => Done)
  }
}

private[reports] object BetsProjectionEventHandler {
  def handle(betsRepository: BetsRepository)(betEvent: BetEvent, eventHappenedAt: OffsetDateTime): Future[Unit] =
    betEvent match {
      case BetOpened(betId, betData, _, _, placedAt) =>
        betsRepository.upsert(
          Bet(
            betId,
            betData.punterId,
            betData.marketId,
            betData.selectionId,
            NormalizedStake.from(betData.stake),
            placedAt,
            closedAt = None,
            initialSettlementData = None))
      case BetSettled(betId, _, _, _) =>
        betsRepository.setSettled(betId, eventHappenedAt)
      case BetResettled(betId, _, _, resettledAt) =>
        betsRepository.setClosedAt(betId, resettledAt)
      case BetVoided(betId, _, _) =>
        betsRepository.setClosedAt(betId, eventHappenedAt)
      case BetPushed(betId, _, _) =>
        betsRepository.setClosedAt(betId, eventHappenedAt)
      case BetCancelled(betId, _, _, _, _, _) =>
        betsRepository.setClosedAt(betId, eventHappenedAt)
      case BetFailed(_, _, _) =>
        Future.unit
    }
}
