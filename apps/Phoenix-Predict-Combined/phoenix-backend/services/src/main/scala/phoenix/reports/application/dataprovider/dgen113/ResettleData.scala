package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.reports.application.BetsFinder
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent.BetResettled
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Resettle.ResettleRow

final class ResettleData(
    betEvents: BetEventsRepository,
    betsFinder: BetsFinder,
    fixtureMarketFinder: FixtureMarketFinder,
    puntersFinder: PuntersFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[ResettleRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[ResettleRow]] = {
    betEvents
      .findEventsWithinPeriod(reportingPeriod)
      .collect { case event: BetResettled => event }
      .mapAsync(parallelism = 1)(convertToRows(reportingPeriod, _))
      .runWith(Sink.seq)
  }

  private def convertToRows(reportingPeriod: ReportingPeriod, resettleEvent: BetResettled): Future[ResettleRow] =
    for {
      market <- fixtureMarketFinder.find(resettleEvent.betData.marketId)
      bet <- betsFinder.find(resettleEvent.betData.betId)
      selectionName <- market.getSelectionNameById(resettleEvent.betData.selectionId)
      punterProfile <- puntersFinder.find(resettleEvent.betData.punterId)
    } yield ResettleRows.buildReportRow(
      reportingPeriod,
      punterProfile.designation(),
      bet,
      resettleEvent,
      selectionName,
      market)
}
