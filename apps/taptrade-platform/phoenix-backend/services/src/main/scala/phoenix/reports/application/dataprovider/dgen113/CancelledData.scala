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
import phoenix.reports.domain.model.bets.BetEvent.BetCancelled
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Cancelled.CancelledRow

final class CancelledData(
    betEvents: BetEventsRepository,
    betsFinder: BetsFinder,
    fixtureMarketFinder: FixtureMarketFinder,
    puntersFinder: PuntersFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[CancelledRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[CancelledRow]] = {
    betEvents
      .findEventsWithinPeriod(reportingPeriod)
      .collect { case event: BetCancelled => event }
      .mapAsync(parallelism = 1)(convertToRow(reportingPeriod, _))
      .runWith(Sink.seq)
  }

  private def convertToRow(reportingPeriod: ReportingPeriod, event: BetCancelled): Future[CancelledRow] =
    for {
      bet <- betsFinder.find(event.betData.betId)
      market <- fixtureMarketFinder.find(event.betData.marketId)
      punterProfile <- puntersFinder.find(event.betData.punterId)
    } yield CancelledBetRows.buildReportRow(reportingPeriod, punterProfile.designation(), event, bet, market)
}
