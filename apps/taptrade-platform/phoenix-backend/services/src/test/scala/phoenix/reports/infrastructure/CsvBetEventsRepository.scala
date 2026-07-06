package phoenix.reports.infrastructure

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.bets.BetEntity.BetId
import phoenix.bets.CancellationReason
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEventType._
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.bets._
import phoenix.shared.support.CsvReader

final class CsvBetEventsRepository(csvReader: CsvReader, resourcePath: String) extends BetEventsRepository {

  private val CSV_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mmxxx")

  private val eventTypeColumn: String = "eventType"
  private val betIdColumn: String = "betId"
  private val punterIdColumn: String = "punterId"
  private val marketIdColumn: String = "marketId"
  private val selectionIdColumn: String = "selectionId"
  private val stakeColumn: String = "stake"
  private val oddsColumn: String = "odds"
  private val operationTimeColumn: String = "operationTime"
  private val paidAmountColumn: String = "paidAmount"
  private val unsettledAmountColumn: String = "unsettledAmount"
  private val resettledAmountColumn: String = "resettledAmount"

  override def upsert(event: BetEvent): Future[Unit] = ???

  override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = {
    csvReader.sourceCsvFile(resourcePath).map(buildBetEvent)
  }

  private def buildBetEvent(input: Map[String, String]): BetEvent = {
    // we control this file, we can fail hard on wrong data
    BetEventType.withName(input(eventTypeColumn)) match {
      case Open =>
        ESportEvents.betOpened(
          randomEventId(),
          buildBetData(BetId(input(betIdColumn)), input),
          OffsetDateTime.parse(input(operationTimeColumn), CSV_DATE_FORMATTER))
      case Settled =>
        ESportEvents.betSettled(
          randomEventId(),
          buildBetData(BetId(input(betIdColumn)), input),
          OffsetDateTime.parse(input(operationTimeColumn), CSV_DATE_FORMATTER),
          MoneyAmount(BigDecimal(input(paidAmountColumn))))
      case Cancelled =>
        ESportEvents.betCancelled(
          randomEventId(),
          buildBetData(BetId(input(betIdColumn)), input),
          OffsetDateTime.parse(input(operationTimeColumn), CSV_DATE_FORMATTER))
      case Voided =>
        ESportEvents.betVoided(
          randomEventId(),
          buildBetData(BetId(input(betIdColumn)), input),
          OffsetDateTime.parse(input(operationTimeColumn), CSV_DATE_FORMATTER),
          adminUser = AdminId("admin1"),
          cancellationReason = CancellationReason.unsafe("reason"))
      case Resettled =>
        ESportEvents.betResettled(
          randomEventId(),
          buildBetData(BetId(input(betIdColumn)), input),
          OffsetDateTime.parse(input(operationTimeColumn), CSV_DATE_FORMATTER),
          MoneyAmount(BigDecimal(input(unsettledAmountColumn))),
          MoneyAmount(BigDecimal(input(resettledAmountColumn))))
    }
  }

  private def randomEventId() =
    EventId.random()

  private def buildBetData(betId: BetId, input: Map[String, String]): BetData = {
    BetData(
      betId = betId,
      punterId = PunterId(input(punterIdColumn)),
      marketId = MarketId.unsafeParse(input(marketIdColumn)),
      selectionId = input(selectionIdColumn),
      stake = MoneyAmount(BigDecimal(input(stakeColumn))),
      odds = Odds(scala.BigDecimal(input(oddsColumn))))
  }

}
