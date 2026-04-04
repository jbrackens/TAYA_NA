package phoenix.reports.domain.template.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PatronAccountSummary.PatronAccountSummaryReportRow

final class PatronAccountSummary(dataProvider: ReportDataProvider[PatronAccountSummaryReportRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[PatronAccountSummaryReportRow]): Report =
    Report(
      name = "Patron Account Summary Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Opening Balance", aggregation = Sum),
            Column(displayName = "Patron Cash Deposits", aggregation = Sum),
            Column(displayName = "Patron Withdrawals", aggregation = Sum),
            Column(displayName = "Patron Canceled Withdrawals", aggregation = Sum),
            Column(displayName = "Adjustments", aggregation = Sum),
            Column(displayName = "Net Bonus Movement", aggregation = Sum),
            Column(displayName = "Transfers To Sports", aggregation = Sum),
            Column(displayName = "Canceled Sport Wagers", aggregation = Sum),
            Column(displayName = "Void Sport Wager", aggregation = Sum),
            Column(displayName = "Resettled Sports Wager", aggregation = Sum),
            Column(displayName = "Transfers From Sports", aggregation = Sum),
            Column(displayName = "Ending Sports Game Funds", aggregation = Sum),
            Column(displayName = "Patron Sports Win/Loss", aggregation = Sum),
            Column(displayName = "Federal Tax", aggregation = Sum),
            Column(displayName = "NJ Tax", aggregation = Sum),
            Column(displayName = "Closing Balance", aggregation = Sum)),
          data = data)))
}

object PatronAccountSummary {

  final case class PatronAccountSummaryReportRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      openingBalance: MoneyField,
      patronCashDeposits: MoneyField,
      patronWithdrawals: MoneyField,
      patronCanceledWithdrawals: MoneyField,
      adjustments: MoneyField,
      netBonusMovement: MoneyField,
      transfersToSports: MoneyField,
      canceledSportWagers: MoneyField,
      voidSportWager: MoneyField,
      resettledSportsWager: MoneyField,
      transfersFromSports: MoneyField,
      endingSportsGameFunds: MoneyField,
      patronSportsWinLoss: MoneyField,
      federalTax: MoneyField,
      stateTax: MoneyField,
      closingBalance: MoneyField)
      extends RowType
}
