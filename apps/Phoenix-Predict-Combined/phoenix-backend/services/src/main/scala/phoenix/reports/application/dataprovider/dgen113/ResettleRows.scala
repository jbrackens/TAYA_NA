package phoenix.reports.application.dataprovider.dgen113

import phoenix.reports.domain.Bet
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetEvent.BetResettled
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.template.dgen113.Resettle.ResettleRow

private[dgen113] object ResettleRows {

  def buildReportRow(
      reportingPeriod: ReportingPeriod,
      punterDesignation: AccountDesignation,
      bet: Bet,
      eventResettled: BetResettled,
      betSelection: String,
      fixtureMarket: FixtureMarket): ResettleRow =
    ResettleRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      patronId = PatronIdField(eventResettled.betData.punterId),
      accountDesignation = AccountDesignationField(punterDesignation),
      betId = BetIdField(eventResettled.betData.betId),
      eventType = SportDisciplineField(eventResettled.discipline),
      eventName = StringField(fixtureMarket.fixture.name),
      eventDate = DateTimeField(fixtureMarket.fixture.startTime),
      initialSettlementDateTime = DateTimeField(bet.initialSettlementData.get),
      resettlementDateTime = DateTimeField(eventResettled.operationTime),
      wagerDescription = StringField(fixtureMarket.market.name),
      betSelection = StringField(betSelection),
      unsettledAmount = MoneyField(eventResettled.unsettledAmount.amount),
      resettledAmount = MoneyField(eventResettled.resettledAmount.amount),
      netAdjustment = MoneyField((eventResettled.resettledAmount - eventResettled.unsettledAmount).amount))
}
