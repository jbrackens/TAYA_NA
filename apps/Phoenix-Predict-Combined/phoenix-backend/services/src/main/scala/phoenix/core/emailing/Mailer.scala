package phoenix.core.emailing
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

final class Mailer private[emailing] (sender: EmailSender, renderer: ContentRenderer) {
  def send(template: EmailMessageTemplate)(implicit ec: ExecutionContext): Future[Unit] =
    renderer
      .render(template.contentTemplate)
      .flatMap(renderedContent =>
        sender.send(EmailMessage(template.recipient, template.subject, renderedContent, template.attachments)))
}
