package phoenix.reports.application.es

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetProtocol.Events.{BetEvent => PhoenixBetEvent}
import phoenix.bets.{BetData => PhoenixBetData}
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.projections.ProjectionEventHandler
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.bets.{BetData => ReportingBetData}
import phoenix.reports.domain.model.bets.{BetEvent => ReportingBetEvent}

final class BetEventsReportingEventHandler(betEventsRepository: BetEventsRepository, clock: Clock)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[PhoenixBetEvent] {

  override def process(envelope: EventEnvelope[PhoenixBetEvent]): Future[Done] = {
    val eventId = uniqueEventId(envelope)
    val eventCreationTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    val mappedEvent = BetEventsMapper.transform(envelope.event, eventId, eventCreationTime)
    mappedEvent.fold(Future.unit)(betEventsRepository.upsert).map(_ => Done)
  }

  private def uniqueEventId(envelope: EventEnvelope[PhoenixBetEvent]): EventId =
    EventId(s"${envelope.persistenceId}#${envelope.offset}")
}

private[reports] object BetEventsMapper {
  def transform(phoenixEvent: PhoenixBetEvent, eventId: EventId, createdAt: OffsetDateTime): Option[ReportingBetEvent] =
    phoenixEvent match {
      case BetOpened(betId, betData, _, _, placedAt) =>
        Some(ESportEvents.betOpened(eventId, convert(betId, betData), placedAt))

      case _: BetFailed =>
        None

      case event @ BetSettled(betId, betData, _, _) =>
        Some(ESportEvents.betSettled(eventId, convert(betId, betData), createdAt, paidAmount(event)))

      case BetVoided(betId, betData, _) =>
        Some(ESportEvents.betCancelled(eventId, convert(betId, betData), createdAt))

      case BetPushed(betId, betData, _) =>
        Some(ESportEvents.betPushed(eventId, convert(betId, betData), createdAt))

      case event: BetCancelled =>
        Some(
          ESportEvents.betVoided(
            eventId,
            convert(event.betId, event.betData),
            createdAt,
            event.adminUser,
            event.cancellationReason))

      case BetResettled(betId, betData, winner, resettledAt) =>
        Some(
          ESportEvents.betResettled(
            eventId,
            convert(betId, betData),
            resettledAt,
            unsettledAmount(winner, betData.winnerFunds),
            resettledAmount(winner, betData.winnerFunds)))
    }

  private def convert(betId: BetId, betData: PhoenixBetData): ReportingBetData =
    ReportingBetData(
      betId,
      betData.punterId,
      betData.selectionId,
      betData.marketId,
      MoneyAmount(betData.stake.value.amount),
      betData.odds)

  private def paidAmount(event: BetSettled): MoneyAmount =
    if (event.winner) event.betData.winnerFunds else MoneyAmount.zero.get

  private def unsettledAmount(winner: Boolean, winnerFunds: MoneyAmount): MoneyAmount =
    if (winner) MoneyAmount.zero.get else winnerFunds

  private def resettledAmount(winner: Boolean, winnerFunds: MoneyAmount): MoneyAmount =
    if (winner) winnerFunds else MoneyAmount.zero.get
}
