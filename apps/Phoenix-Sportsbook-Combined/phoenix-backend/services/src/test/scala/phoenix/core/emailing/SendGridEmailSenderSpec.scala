package phoenix.core.emailing

import java.util.Base64

import org.scalatest.Assertion
import org.scalatest.LoneElement._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.emailing.SendgridMailMatchers.SendgridMailAssertionOps
import phoenix.punters.domain.Email
import phoenix.punters.support.SendgridMockContainer
import phoenix.punters.support.SendgridMockContainer.Attachments
import phoenix.punters.support.SendgridMockContainer.SendgridMail
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._

final class SendGridEmailSenderSpec
    extends ActorSystemIntegrationSpec
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  private val sendgrid = SendgridMockContainer.started(system)
  private val flipSportsEmailAddress = Email.fromStringUnsafe("notifications@flipsports.com")
  val objectUnderTest: EmailSender = EmailSenders.instance(
    EmailNotificationsConfig(enabled = true, fromAddress = flipSportsEmailAddress, sendgrid.config))

  "Send Grid email sender" should {
    "send email messages using sendgrid API" in {
      // given
      val recipient = Email.fromStringUnsafe("new.punter@example.com")
      val subject = EmailSubject("Registration")
      val content = HtmlEmailContent("Hello there, thanks for joining!")
      val attachment = EmailAttachment(
        fileName = "example.csv",
        fileMime = AttachmentType.CSV,
        content = "comma,separated,values".getBytes)

      // when
      await(objectUnderTest.send(EmailMessage(recipient, subject, content, List(attachment))))

      // then
      val sentMessages = await(sendgrid.sentEmails())
      sentMessages.size shouldBe 1

      val message = sentMessages.loneElement
      message shouldHaveSubject subject
      message shouldBeSentFrom flipSportsEmailAddress
      message shouldBeAddressedTo recipient
      message shouldContain content
      message shouldContain attachment
    }
  }
}

private object SendgridMailMatchers extends Matchers {
  implicit class SendgridMailAssertionOps(self: SendgridMail) {
    def shouldHaveSubject(subject: EmailSubject): Assertion =
      self.subject shouldBe subject.value

    def shouldBeSentFrom(from: Email): Assertion =
      self.from.email shouldBe from.value

    def shouldBeAddressedTo(to: Email): Assertion =
      self.personalizations.loneElement.to.loneElement.email shouldBe to.value

    def shouldContain(content: HtmlEmailContent): Assertion =
      self.content.loneElement.value shouldBe content.value

    def shouldContain(attachment: EmailAttachment): Assertion = {
      val expectedAttachment = Attachments(
        `type` = attachment.fileMime.value,
        content = Base64.getEncoder.encodeToString(attachment.content),
        filename = attachment.fileName,
        disposition = "attachment")

      self.attachments should contain(expectedAttachment)
    }
  }
}
