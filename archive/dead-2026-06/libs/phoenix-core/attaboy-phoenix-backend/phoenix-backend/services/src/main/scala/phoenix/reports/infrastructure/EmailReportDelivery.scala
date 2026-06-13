package phoenix.reports.infrastructure

import java.io.ByteArrayOutputStream

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import com.norbitltd.spoiwo.model.Sheet
import com.norbitltd.spoiwo.natures.xlsx.Model2XlsxConversions._

import phoenix.core.emailing.AttachmentType
import phoenix.core.emailing.EmailAttachment
import phoenix.core.emailing.EmailContentTemplate
import phoenix.core.emailing.EmailContentTemplate.TemplateName
import phoenix.core.emailing.EmailContentTemplate.TemplatingParams
import phoenix.core.emailing.EmailMessageTemplate
import phoenix.core.emailing.EmailSubject
import phoenix.core.emailing.Mailer
import phoenix.punters.domain.Email
import phoenix.reports.application.ReportDelivery
import phoenix.reports.domain.model.ReportingPeriod

private[reports] final class EmailReportDelivery(mailer: Mailer, recipient: Email) extends ReportDelivery {
  override def transferReport(period: ReportingPeriod, report: Sheet)(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingEmail = ReportEmailNotification.build(period, report, recipient)
    mailer.send(reportingEmail)
  }
}

private object ReportEmailNotification {
  val templateName: TemplateName = "report_delivery"

  def build(reportingPeriod: ReportingPeriod, report: Sheet, recipient: Email): EmailMessageTemplate = {
    val reportName = ReportNameGenerator.reportName(report)
    val reportFileName = ReportNameGenerator.deriveFileName(report, reportingPeriod)
    val reportFile = report.writeToOutputStream(new ByteArrayOutputStream).toByteArray

    EmailMessageTemplate(
      recipient,
      subject = EmailSubject(reportFileName),
      contentTemplate = EmailContentTemplate(templateName, ReportingEmailParams(reportName, reportingPeriod)),
      attachments = List(EmailAttachment(reportFileName, AttachmentType.Spreadsheet, reportFile)))
  }

  private final case class ReportingEmailParams(reportName: String, period: ReportingPeriod) extends TemplatingParams {
    override def toMap: Map[String, Any] =
      Map("reportName" -> reportName, "periodStart" -> period.periodStart, "periodEnd" -> period.periodEnd)
  }
}
