package phoenix.reports.domain.template.aml

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.punters.domain.Punter
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.ManuallyUnsuspendedPunters.ManuallyUnsuspendedPuntersReportRow

final class ManuallyUnsuspendedPunters(dataProvider: ReportDataProvider[ManuallyUnsuspendedPuntersReportRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map { rows =>
      prepareReport(reportingPeriod, rows)
    }
  }

  private def prepareReport(
      reportingPeriod: ReportingPeriod,
      data: Seq[ManuallyUnsuspendedPuntersReportRow]): Report = {
    Report(
      name = s"Manual KYC Report week ending ${reportingPeriod.periodEnd.toLocalDate}",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Date"),
            Column(displayName = "Account ID"),
            Column(displayName = "Full Name"),
            Column(displayName = "Registration Date"),
            Column(displayName = "Failure reason"),
            Column(displayName = "Manual Verification Date"),
            Column(displayName = "Verified by"),
            Column(displayName = "Documents received")),
          data = data)))
  }
}

object ManuallyUnsuspendedPunters {

  final case class ManuallyUnsuspendedPuntersReportRow(
      date: DateField,
      accountId: PatronIdField,
      fullName: StringField,
      registrationDate: DateField,
      failureReason: StringField,
      manualVerificationDate: OptionalField[DateField],
      verifiedBy: OptionalField[FullNameField],
      documentsReceived: StringField)
      extends RowType

  object ManuallyUnsuspendedPuntersReportRow {
    def buildReportRow(
        punterProfile: PunterProfile,
        registeredAt: OffsetDateTime,
        admin: Option[Punter],
        periodStart: OffsetDateTime): ManuallyUnsuspendedPuntersReportRow =
      ManuallyUnsuspendedPuntersReportRow(
        date = DateField(periodStart),
        accountId = PatronIdField(punterProfile.punterId),
        fullName = StringField(punterProfile.punterName),
        registrationDate = DateField(registeredAt),
        failureReason = StringField(punterProfile.suspensionReason.getOrElse("Unknown")),
        manualVerificationDate = OptionalField(punterProfile.verifiedAt.map(DateField)),
        verifiedBy = OptionalField(admin.map(a => FullNameField(a.details.name))),
        // Not available for now
        documentsReceived = StringField("N/A"))

  }
}
