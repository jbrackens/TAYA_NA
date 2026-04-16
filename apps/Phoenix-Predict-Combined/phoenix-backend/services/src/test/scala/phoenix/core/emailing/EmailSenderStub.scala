package phoenix.core.emailing

import scala.concurrent.Future

import org.scalatest.Assertion
import org.scalatest.matchers.should.Matchers._

final class EmailSenderStub(var sentMessages: List[EmailMessage] = List.empty) extends EmailSender {
  override def send(message: EmailMessage): Future[Unit] =
    Future.successful {
      sentMessages = sentMessages :+ message
    }

  def shouldContainEmailMessage(predicate: EmailMessage => Boolean): Assertion =
    sentMessages.exists(predicate) shouldBe true

  def shouldNotHaveSentAnyEmail(): Assertion =
    sentMessages.isEmpty shouldBe true
}
