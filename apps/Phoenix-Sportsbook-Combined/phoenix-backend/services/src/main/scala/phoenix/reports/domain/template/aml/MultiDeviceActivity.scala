package phoenix.reports.domain.template.aml

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.punters.domain.PunterDeviceFingerprint
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.ConfidenceField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.VisitorIdField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.Column
import phoenix.reports.domain.definition.ReportDefinition.HeadingColumn
import phoenix.reports.domain.definition.ReportDefinition.Report
import phoenix.reports.domain.definition.ReportDefinition.ReportTable
import phoenix.reports.domain.definition.ReportDefinition.RowType
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.MultiDeviceActivity.MultiDeviceActivityRow

final class MultiDeviceActivity(dataProvider: ReportDataProvider[MultiDeviceActivityRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[ReportDefinition.Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map { rows =>
      prepareReport(reportingPeriod, rows)
    }
  }

  private def prepareReport(reportingPeriod: ReportingPeriod, data: Seq[MultiDeviceActivityRow]): Report =
    Report(
      name = s"Multi-Device Activity Report day report ${reportingPeriod.periodEnd.toLocalDate}",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          title = Some("Sports Pool"),
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Visitor ID"),
            Column(displayName = "Device Information")),
          data = data)))
}

object MultiDeviceActivity {

  final case class MultiDeviceActivityRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      visitorId: VisitorIdField,
      confidence: ConfidenceField)
      extends RowType

  object MultiDeviceActivityRow {

    def buildReportRow(
        periodStart: OffsetDateTime,
        punterProfile: PunterProfile,
        deviceFingerprint: PunterDeviceFingerprint): MultiDeviceActivityRow =
      MultiDeviceActivityRow(
        gamingDate = DateField(periodStart),
        patronId = PatronIdField(punterProfile.punterId),
        accountDesignation = AccountDesignationField(punterProfile.designation()),
        visitorId = VisitorIdField(deviceFingerprint.visitorId),
        confidence = ConfidenceField(deviceFingerprint.confidence))

  }

}
