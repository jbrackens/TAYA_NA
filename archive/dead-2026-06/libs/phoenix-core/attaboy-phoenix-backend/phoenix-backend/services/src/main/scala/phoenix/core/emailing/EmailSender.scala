package phoenix.core.emailing

import scala.concurrent.Future

import enumeratum.values.StringEnum
import enumeratum.values.StringEnumEntry

import phoenix.punters.domain.Email

trait EmailSender {
  def send(message: EmailMessage): Future[Unit]
}

final case class EmailMessage(
    recipient: Email,
    subject: EmailSubject,
    content: HtmlEmailContent,
    attachments: List[EmailAttachment] = List.empty)
final case class HtmlEmailContent(value: String)
final case class EmailSubject(value: String)
final case class EmailAttachment(fileName: String, fileMime: AttachmentType, content: Array[Byte])
sealed abstract class AttachmentType(val value: String) extends StringEnumEntry
object AttachmentType extends StringEnum[AttachmentType] {
  override def values: IndexedSeq[AttachmentType] = findValues

  object CSV extends AttachmentType("text/csv")
  object Spreadsheet extends AttachmentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
}
