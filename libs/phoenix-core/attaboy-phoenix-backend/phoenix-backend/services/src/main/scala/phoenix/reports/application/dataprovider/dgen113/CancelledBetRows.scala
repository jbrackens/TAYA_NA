package phoenix.reports.application.dataprovider.dgen113

import phoenix.reports.domain.Bet
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent.BetCancelled
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.template.dgen113.Cancelled.CancelledRow

private[dgen113] object CancelledBetRows {

  def buildReportRow(
      reportingPeriod: ReportingPeriod,
      punterDesignation: AccountDesignation,
      event: BetCancelled,
      bet: Bet,
      fixtureMarket: FixtureMarket): CancelledRow =
    CancelledRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      transactionTime = TimeField(event.operationTime),
      patronId = PatronIdField(event.betData.punterId),
      accountDesignation = AccountDesignationField(punterDesignation),
      betId = BetIdField(event.betData.betId),
      issuanceDateTime = DateTimeField(bet.placedAt),
      eventType = SportDisciplineField(event.discipline),
      eventName = StringField(fixtureMarket.fixture.name),
      eventDate = DateTimeField(fixtureMarket.fixture.startTime),
      wagerDescription = StringField(fixtureMarket.market.name),
      betAmount = MoneyField(event.betData.stake.amount),
      reasonForCancellation = byDataSupplier)

  //TODO (PHXD-1303): Cancelled by Back Office - will not be supported now
  private lazy val byDataSupplier: StringField = StringField("Cancelled by Data Supplier")
}
