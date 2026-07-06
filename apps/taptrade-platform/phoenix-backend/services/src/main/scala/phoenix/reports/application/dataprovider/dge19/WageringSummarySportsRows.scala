package phoenix.reports.application.dataprovider.dge19

import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.template.dge19.WageringSummary.WageringSummarySportsRow

private[dge19] object WageringSummarySportsRows {

  def buildReportRow(reportingPeriod: ReportingPeriod, fixtureSummary: FixtureSummary): WageringSummarySportsRow = {
    val FixtureSummary(fixtureMarket, financialSummary) = fixtureSummary
    WageringSummarySportsRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      eventName = StringField(fixtureMarket.fixture.name),
      eventType = SportDisciplineField(Other),
      transfersToSports = MoneyField(financialSummary.betsSold),
      transfersFromSports = MoneyField(financialSummary.betsPaid),
      cancelSportsWagers = MoneyField(financialSummary.betsCancelled),
      voidSportsWagers = MoneyField(financialSummary.betsVoided),
      resettledSportsWager = MoneyField(financialSummary.betsResettled),
      sportsWinLoss = MoneyField(financialSummary.revenue))
  }
}
