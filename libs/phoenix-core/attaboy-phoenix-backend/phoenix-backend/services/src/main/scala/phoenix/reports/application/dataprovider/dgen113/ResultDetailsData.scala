package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source

import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.OperatorBettingSummary
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.ResultDetails.ResultDetailsRow

final class ResultDetailsData(
    betsRepository: BetEventsRepository,
    fixtureMarketFinder: FixtureMarketFinder,
    puntersFinder: PuntersFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[ResultDetailsRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[ResultDetailsRow]] = {
    val betsForDay = betsRepository.findEventsWithinPeriod(reportingPeriod)

    val eventSummaries = collectSingleEvents(betsForDay)

    eventSummaries.flatMap(summaries => {
      val eventsRows =
        summaries.map(data => buildReportRow(reportingPeriod, data))

      Future.sequence(eventsRows)
    })
  }

  private def collectSingleEvents(bets: Source[BetEvent, NotUsed]): Future[List[EventSummary]] = {
    bets.map(event => EventSummary(event, OperatorBettingSummary.empty.add(event))).runWith(Sink.collection)
  }

  private def buildReportRow(reportingPeriod: ReportingPeriod, eventSummary: EventSummary): Future[ResultDetailsRow] = {
    for {
      punterProfile <- puntersFinder.find(eventSummary.event.betData.punterId)
      fixtureMarket <- fixtureMarketFinder.find(eventSummary.event.betData.marketId)
      selectionName <- fixtureMarket.getSelectionNameById(eventSummary.event.betData.selectionId)
    } yield ResultDetailsRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      transactionTime = TimeField(eventSummary.event.operationTime),
      patronId = PatronIdField(eventSummary.event.betData.punterId),
      accountDesignation = AccountDesignationField(punterProfile.designation()),
      betId = BetIdField(eventSummary.event.betData.betId),
      eventType = SportDisciplineField(eventSummary.event.discipline),
      eventName = StringField(fixtureMarket.fixture.name),
      eventDate = DateTimeField(fixtureMarket.fixture.startTime),
      wagerDescription = StringField(fixtureMarket.market.name),
      betSelection = StringField(selectionName),
      betPlacedAmount = MoneyField(eventSummary.summary.betsSold.toDouble),
      betPaidAmount = MoneyField(eventSummary.summary.betsPaid.toDouble),
      canceledBetAmount = MoneyField(eventSummary.summary.betsCancelled.toDouble),
      voidedBetAmount = MoneyField(eventSummary.summary.betsVoided.toDouble),
      resettledBetAdjustment = MoneyField(eventSummary.summary.betsResettled.toDouble),
      transactionImpactOnSportSpoolRevenue = MoneyField(eventSummary.summary.revenue.toDouble))
  }

  private case class EventSummary(event: BetEvent, summary: OperatorBettingSummary)
}
