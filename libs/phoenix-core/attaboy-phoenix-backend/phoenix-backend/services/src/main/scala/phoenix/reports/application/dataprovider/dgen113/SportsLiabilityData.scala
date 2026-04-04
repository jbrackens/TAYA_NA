package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import cats.instances.future._
import cats.syntax.traverse._

import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.OpenedBetsFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.Bet
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetStatus.Open
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.SportsLiability.SportsLiabilityRow

final class SportsLiabilityData(
    openedBetsFinder: OpenedBetsFinder,
    fixtureMarketFinder: FixtureMarketFinder,
    puntersFinder: PuntersFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[SportsLiabilityRow] {

  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[SportsLiabilityRow]] = {
    for {
      bets <- openedBetsFinder.findOpenBetsAsOf(reportingPeriod.periodEnd).runWith(Sink.seq)
      data <- bets.toList.traverse(bet => buildReportRow(reportingPeriod, bet))
    } yield data
  }

  private def buildReportRow(reportingPeriod: ReportingPeriod, bet: Bet): Future[SportsLiabilityRow] =
    for {
      fixtureMarket <- fixtureMarketFinder.find(bet.marketId)
      selectionName <- fixtureMarket.getSelectionNameById(bet.selectionId)
      punterProfile <- puntersFinder.find(bet.punterId)
    } yield SportsLiabilityRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      patronId = PatronIdField(bet.punterId),
      accountDesignation = AccountDesignationField(punterProfile.designation()),
      betId = BetIdField(bet.betId),
      eventType = SportDisciplineField(Other),
      eventName = StringField(fixtureMarket.fixture.name),
      betDateTime = DateTimeField(bet.placedAt),
      eventDate = DateTimeField(fixtureMarket.fixture.startTime),
      wagerDescription = StringField(fixtureMarket.market.name),
      betSelection = StringField(selectionName),
      betAmount = MoneyField(bet.stake.value.amount),
      status = BetStatusField(Open))
}
