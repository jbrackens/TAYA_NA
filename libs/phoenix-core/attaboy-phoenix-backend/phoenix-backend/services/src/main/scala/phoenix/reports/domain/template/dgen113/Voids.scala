package phoenix.reports.domain.template.dgen113

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dgen113.Voids.VoidsRow

final class Voids(dataProvider: ReportDataProvider[VoidsRow])(implicit ec: ExecutionContext) extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[VoidsRow]): Report =
    Report(
      name = "Voids Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Transaction time"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bet ID"),
            Column(displayName = "Issuance Date & Time"),
            Column(displayName = "Event Type"),
            Column(displayName = "Event Name"),
            Column(displayName = "Event Date"),
            Column(displayName = "Wager description"),
            Column(displayName = "Bet Amount", aggregation = Sum),
            Column(displayName = "Employee Name / System Identifier"),
            Column(displayName = "Reason for Void")),
          data = data)))
}

object Voids {

  final case class VoidsRow(
      gamingDate: DateField,
      transactionTime: TimeField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      betId: BetIdField,
      issuanceDateTime: DateTimeField,
      eventType: SportDisciplineField,
      eventName: StringField,
      eventDate: DateTimeField,
      wagerDescription: StringField,
      betAmount: MoneyField,
      employeeNameSystemIdentifier: AdminIdField,
      reasonForVoid: StringField)
      extends RowType
}
