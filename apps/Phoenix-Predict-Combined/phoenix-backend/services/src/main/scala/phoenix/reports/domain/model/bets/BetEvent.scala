package phoenix.reports.domain.model.bets

import java.time.OffsetDateTime
import java.util.UUID

import phoenix.bets.BetEntity.BetId
import phoenix.bets.CancellationReason
import phoenix.core.PotentialReturn
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.bets.BetEvent._
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.sharding.PhoenixId

final case class EventId(value: String) extends PhoenixId

object EventId {
  def random(): EventId = EventId(UUID.randomUUID().toString)
}

final case class BetData(
    betId: BetId,
    punterId: PunterId,
    selectionId: SelectionId,
    marketId: MarketId,
    stake: MoneyAmount,
    odds: Odds) {
  def potentialReturn: MoneyAmount = PotentialReturn(stake, odds)
}

sealed trait BetEvent {
  def eventId: EventId
  def betData: BetData
  def operationTime: OffsetDateTime
  def discipline: SportDiscipline
}

object BetEvent {
  final case class BetOpened(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline)
      extends BetEvent

  final case class BetSettled(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline,
      paidAmount: MoneyAmount)
      extends BetEvent

  // Reporting domain 'cancelled' event corresponds to core domain 'voided' event. Different nomenclatures are used.
  final case class BetCancelled(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline)
      extends BetEvent

  // Reporting domain 'voided' event corresponds to core domain 'cancelled' event. Different nomenclatures are used.
  final case class BetVoided(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline,
      adminUser: AdminId,
      cancellationReason: CancellationReason)
      extends BetEvent

  final case class BetPushed(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline)
      extends BetEvent

  final case class BetResettled(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      discipline: SportDiscipline,
      unsettledAmount: MoneyAmount,
      resettledAmount: MoneyAmount)
      extends BetEvent
}

object ESportEvents {
  private val eSportDiscipline: SportDiscipline = SportDiscipline.Other

  def betOpened(eventId: EventId, betData: BetData, operationTime: OffsetDateTime): BetOpened =
    BetOpened(eventId, betData, operationTime, eSportDiscipline)

  def betSettled(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      paidAmount: MoneyAmount): BetSettled =
    BetSettled(eventId, betData, operationTime, eSportDiscipline, paidAmount)

  def betCancelled(eventId: EventId, betData: BetData, operationTime: OffsetDateTime): BetCancelled =
    BetCancelled(eventId, betData, operationTime, eSportDiscipline)

  def betPushed(eventId: EventId, betData: BetData, operationTime: OffsetDateTime): BetPushed =
    BetPushed(eventId, betData, operationTime, eSportDiscipline)

  def betVoided(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      adminUser: AdminId,
      cancellationReason: CancellationReason): BetVoided =
    BetVoided(eventId, betData, operationTime, eSportDiscipline, adminUser, cancellationReason)

  def betResettled(
      eventId: EventId,
      betData: BetData,
      operationTime: OffsetDateTime,
      unsettledAmount: MoneyAmount,
      resettledAmount: MoneyAmount): BetResettled =
    BetResettled(eventId, betData, operationTime, eSportDiscipline, unsettledAmount, resettledAmount)
}
