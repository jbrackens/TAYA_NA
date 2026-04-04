package phoenix.reports.domain.template.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PendingTransactionDepositsWithdrawals.PendingTransactionDepositsWithdrawalsRow

final class PendingTransactionDepositsWithdrawals(
    dataProvider: ReportDataProvider[PendingTransactionDepositsWithdrawalsRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[PendingTransactionDepositsWithdrawalsRow]): Report =
    Report(
      name = "Pending Transaction Deposits & Withdrawals Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Transaction Date & Time"),
            Column(displayName = "Transaction Type"),
            Column(displayName = "Transaction Amount", aggregation = Sum),
            Column(displayName = "Days Outstanding")),
          data = data)))
}

object PendingTransactionDepositsWithdrawals {

  final case class PendingTransactionDepositsWithdrawalsRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      transactionDateTime: DateTimeField,
      transactionType: TransactionTypeField,
      transactionAmount: MoneyField,
      daysOutstanding: NumberField)
      extends RowType
}
