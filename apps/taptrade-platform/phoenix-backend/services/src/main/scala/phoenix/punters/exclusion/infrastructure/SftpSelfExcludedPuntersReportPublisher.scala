package phoenix.punters.exclusion.infrastructure

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.xml.Node

import phoenix.core.TimeUtils._
import phoenix.core.XmlUtils.XmlFormat
import phoenix.core.XmlUtils.XmlWriter
import phoenix.core.ftp.SftpClient
import phoenix.punters.ExcludedUsersReportConfig
import phoenix.punters.PunterState
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.exclusion.domain.SelfExcludedPunterReportData
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReportPublisher
import phoenix.punters.exclusion.infrastructure.DateTimeFormatForSelfExcludedReport.formatOffsetDateTimeForSelfExcludedReport
import phoenix.punters.exclusion.infrastructure.SelfExcludedPuntersReportXmlFormat._

private[exclusion] final class SftpSelfExcludedPuntersReportPublisher(
    sftp: SftpClient,
    config: ExcludedUsersReportConfig)(implicit ec: ExecutionContext)
    extends SelfExcludedPuntersReportPublisher {
  override def publish(report: SelfExcludedPuntersReport): Future[Unit] = {
    val reportBodyAsXML = XmlWriter.write(report)
    val fullReportIncludingHeader = s"""<?xml version="1.0" encoding="utf-8"?>\n${reportBodyAsXML.toString()}"""

    sftp.transfer(fullReportIncludingHeader.getBytes(), config.reportPath).map(_ => ())
  }
}

private[exclusion] object SelfExcludedPuntersReportXmlFormat {
  implicit val selfExcludedPuntersReportFormat: XmlFormat[SelfExcludedPuntersReport] =
    XmlFormat.writeOnly(selfExcludedPuntersReportWriter)

  private lazy val selfExcludedPuntersReportWriter: XmlWriter[SelfExcludedPuntersReport] =
    (report: SelfExcludedPuntersReport) =>
      // @formatter:off
<DGE_Report>
  <Report_Date>{report.reportGeneratedAt.formatAsIsoLocalDate}</Report_Date>
  <License_ID>{report.licenseId.value}</License_ID>
  {for (punterData <- report.puntersData) yield writePunterData(punterData)}
</DGE_Report>
  // @formatter:on

  private def writePunterData(punterData: SelfExcludedPunterReportData): Node =
    // @formatter:off
    <playerData>
      <Player_ID>{punterData.punterId.value}</Player_ID>
      <Skin_ID>{punterData.skinId.value}</Skin_ID>
      <Name>{punterData.name.firstName.value}</Name>
      <Surname>{punterData.name.lastName.value}</Surname>
      <Street_Address_1>{punterData.address.addressLine.value}</Street_Address_1>
      <City>{punterData.address.city.value}</City>
      <State>{punterData.address.state.value}</State>
      <Country>{punterData.address.country.value}</Country>
      <ZIP_Code>{punterData.address.zipcode.value}</ZIP_Code>
      <Document_Type>{punterData.documentType.value}</Document_Type>
      <SSN>{punterData.ssn.value}</SSN>
      <Personal_ID>{punterData.documentNumber.value}</Personal_ID>
      <DOB>{punterData.dateOfBirth.toLocalDate.formatAsIsoLocalDate}</DOB>
      <Submit_Date>{formatOffsetDateTimeForSelfExcludedReport(punterData.excludedAt)}</Submit_Date>
      <Duration>{formatDuration(punterData.duration)}</Duration>
      <LastLogin>{formatOffsetDateTimeForSelfExcludedReport(punterData.lastSignInData.timestamp.value)}</LastLogin>
      <Remote_IP>{punterData.lastSignInData.ipAddress.value}</Remote_IP>
    </playerData>
  // @formatter:on

  private def formatDuration(duration: PunterState.SelfExclusionDuration): String =
    duration match {
      case SelfExclusionDuration.OneYear   => "1 YEAR"
      case SelfExclusionDuration.FiveYears => "5 YEAR"
    }

}

private object DateTimeFormatForSelfExcludedReport {
  private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS")

  def formatOffsetDateTimeForSelfExcludedReport(offsetDateTime: OffsetDateTime): String =
    formatter.format(offsetDateTime)
}
