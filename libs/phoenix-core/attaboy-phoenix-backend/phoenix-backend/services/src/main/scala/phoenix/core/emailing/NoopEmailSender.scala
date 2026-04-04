package phoenix.core.emailing

import scala.concurrent.Future

import org.slf4j.Logger
import org.slf4j.LoggerFactory

private object NoopEmailSender extends EmailSender {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def send(message: EmailMessage): Future[Unit] =
    Future.successful(log.debug(s"Email message to send [message = $message]"))
}
