package phoenix.core.emailing

import java.io.ByteArrayInputStream

import scala.concurrent.Future
import scala.concurrent.Promise

import com.sendgrid.APICallback
import com.sendgrid.Method
import com.sendgrid.Request
import com.sendgrid.Response
import com.sendgrid.SendGrid
import com.sendgrid.helpers.mail.Mail
import com.sendgrid.helpers.mail.objects.Attachments
import com.sendgrid.helpers.mail.objects.Content
import com.sendgrid.helpers.mail.objects.Email

import phoenix.punters.domain

private final class SendGridEmailSender(sendGrid: SendGrid, fromAddress: domain.Email) extends EmailSender {

  override def send(message: EmailMessage): Future[Unit] = {
    val mail = toSendgridRepresentation(message)
    val apiRequest = sendEmailRequest(mail)
    runRequest(apiRequest)
  }

  private def toSendgridRepresentation(emailMessage: EmailMessage): Mail = {
    val from = new Email(fromAddress.value)
    val to = new Email(emailMessage.recipient.value)
    val content = new Content("text/html", emailMessage.content.value)
    val attachments = emailMessage.attachments.map(toSendgridRepresentation)

    val mail = new Mail(from, emailMessage.subject.value, to, content)
    attachments.foreach(mail.addAttachments)
    mail
  }

  private def toSendgridRepresentation(attachment: EmailAttachment): Attachments =
    new Attachments.Builder(attachment.fileName, new ByteArrayInputStream(attachment.content))
      .withType(attachment.fileMime.value)
      .withDisposition("attachment")
      .build()

  private def sendEmailRequest(mail: Mail): Request = {
    val request = new Request()
    request.setMethod(Method.POST)
    request.setEndpoint("mail/send")
    request.setBody(mail.build)
    request
  }

  private def runRequest(sendgridApiRequest: Request): Future[Unit] = {
    val promise = Promise[Unit]()
    sendGrid.attempt(
      sendgridApiRequest,
      new APICallback {
        override def error(cause: Exception): Unit = promise.failure(cause)
        override def response(response: Response): Unit = promise.success(())
      })
    promise.future
  }
}
