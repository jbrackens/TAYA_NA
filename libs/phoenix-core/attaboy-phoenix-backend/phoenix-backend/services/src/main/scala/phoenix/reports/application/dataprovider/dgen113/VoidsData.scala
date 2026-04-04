package phoenix.reports.application.dataprovider.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.reports.application.BetsFinder
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent.BetVoided
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Voids.VoidsRow

final class VoidsData(
    betEventsRepository: BetEventsRepository,
    betsFinder: BetsFinder,
    puntersFinder: PuntersFinder,
    fixtureMarketFinder: FixtureMarketFinder)(implicit mat: Materializer, ec: ExecutionContext)
    extends ReportDataProvider[VoidsRow] {
  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[VoidsRow]] = {
    betEventsRepository
      .findEventsWithinPeriod(reportingPeriod)
      .collect { case event: BetVoided => event }
      .mapAsync(parallelism = 8)(buildReportRow(reportingPeriod, _))
      .runWith(Sink.seq)
  }

  private def buildReportRow(reportingPeriod: ReportingPeriod, event: BetVoided): Future[VoidsRow] = {
    for {
      bet <- betsFinder.find(event.betData.betId)
      punterProfile <- puntersFinder.find(event.betData.punterId)
      fixtureMarket <- fixtureMarketFinder.find(event.betData.marketId)
    } yield VoidsRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      transactionTime = TimeField(event.operationTime),
      patronId = PatronIdField(event.betData.punterId),
      accountDesignation = AccountDesignationField(punterProfile.designation()),
      betId = BetIdField(event.betData.betId),
      issuanceDateTime = DateTimeField(bet.placedAt),
      eventType = SportDisciplineField(event.discipline),
      eventName = StringField(fixtureMarket.fixture.name),
      eventDate = DateTimeField(fixtureMarket.fixture.startTime),
      wagerDescription = StringField(fixtureMarket.market.name),
      betAmount = MoneyField(event.betData.stake.amount),
      employeeNameSystemIdentifier = AdminIdField(event.adminUser),
      reasonForVoid = StringField(event.cancellationReason.value))
  }
}
