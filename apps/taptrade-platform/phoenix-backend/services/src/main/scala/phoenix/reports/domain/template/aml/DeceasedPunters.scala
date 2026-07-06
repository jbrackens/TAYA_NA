package phoenix.reports.domain.template.aml
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.punters.domain.Punter
import phoenix.reports.domain.DeceasedPunters.DeceasedPunterInformation
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.DeviceField
import phoenix.reports.domain.definition.Fields.FullAddressField
import phoenix.reports.domain.definition.Fields.FullNameField
import phoenix.reports.domain.definition.Fields.FullOrPartialSSNField
import phoenix.reports.domain.definition.Fields.IpAddressField
import phoenix.reports.domain.definition.Fields.OptionalField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.DeceasedPunters.DeceasedPuntersReportRow

final class DeceasedPunters(dataProvider: ReportDataProvider[DeceasedPuntersReportRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map { rows =>
      prepareReport(reportingPeriod, rows)
    }
  }

  private def prepareReport(reportingPeriod: ReportingPeriod, data: Seq[DeceasedPuntersReportRow]): Report = {
    Report(
      name = s"Deceased Report week ending ${reportingPeriod.periodEnd.toLocalDate}",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Date"),
            Column(displayName = "Account ID"),
            Column(displayName = "Full Name"),
            Column(displayName = "Registration Date"),
            Column(displayName = "Address"),
            Column(displayName = "SSN"),
            Column(displayName = "IP Address"),
            Column(displayName = "Device Information"),
            Column(displayName = "Additional Information")),
          data = data)))
  }
}

object DeceasedPunters {

  final case class DeceasedPuntersReportRow(
      date: DateField,
      accountId: PatronIdField,
      fullName: FullNameField,
      registrationDate: DateField,
      address: FullAddressField,
      ssn: FullOrPartialSSNField,
      ipAddress: OptionalField[IpAddressField],
      device: OptionalField[DeviceField],
      additionalInformation: StringField)
      extends RowType

  object DeceasedPuntersReportRow {
    def buildReportRow(
        punter: Punter,
        deceasedPunterInformation: DeceasedPunterInformation,
        reportingPeriod: ReportingPeriod): DeceasedPuntersReportRow =
      DeceasedPuntersReportRow(
        date = DateField(reportingPeriod.periodStart),
        accountId = PatronIdField(punter.punterId),
        fullName = FullNameField(punter.details.name),
        registrationDate = DateField(deceasedPunterInformation.suspendedAt),
        address = FullAddressField(punter.details.address),
        ssn = FullOrPartialSSNField(punter.ssn),
        ipAddress = OptionalField(deceasedPunterInformation.clientIp.map(IpAddressField)),
        device = OptionalField(deceasedPunterInformation.device.map(DeviceField)),
        additionalInformation = StringField("None"))
  }
}
