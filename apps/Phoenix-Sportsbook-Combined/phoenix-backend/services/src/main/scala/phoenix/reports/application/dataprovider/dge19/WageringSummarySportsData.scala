package phoenix.reports.application.dataprovider.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.OperatorBettingSummary
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.WageringSummary.WageringSummarySportsRow

final class WageringSummarySportsData(events: BetEventsRepository, fixtureMarkets: FixtureMarketFinder)(implicit
    mat: Materializer,
    ec: ExecutionContext)
    extends ReportDataProvider[WageringSummarySportsRow] {

  private val fetchParallelism = 10
  private val maxNumberOfFixtures = 100000000

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[WageringSummarySportsRow]] = {
    val perFixtureSummaries = events
      .findEventsWithinPeriod(reportingPeriod)
      .mapAsync(parallelism = fetchParallelism)(enrichWithFixture)
      .groupBy(maxSubstreams = maxNumberOfFixtures, { case (_, fixture) => fixture.fixture.fixtureId })
      .map { case (event, fixture) => FixtureSummary.fromBetEvent(event, fixture) }
      .reduce(combineWithinTheSameFixture)
      .mergeSubstreams
      .map(summary => WageringSummarySportsRows.buildReportRow(reportingPeriod, summary))
      .runWith(Sink.seq)

    perFixtureSummaries
  }

  private def enrichWithFixture(event: BetEvent): Future[(BetEvent, FixtureMarket)] =
    fixtureMarkets.find(event.betData.marketId).map(market => (event, market))

  private def combineWithinTheSameFixture(first: FixtureSummary, second: FixtureSummary): FixtureSummary =
    FixtureSummary(first.fixtureMarket, OperatorBettingSummary.aggregate(List(first.summary, second.summary)))
}

private final case class FixtureSummary(fixtureMarket: FixtureMarket, summary: OperatorBettingSummary)

private object FixtureSummary {
  def fromBetEvent(event: BetEvent, fixture: FixtureMarket): FixtureSummary =
    FixtureSummary(fixture, OperatorBettingSummary.empty.add(event))
}
