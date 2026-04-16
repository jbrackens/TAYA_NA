package phoenix.reports.acceptance

import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.punters.domain.Email
import phoenix.punters.support.{InMemoryPuntersRepository => ApplicationInMemoryPuntersRepository}
import phoenix.reports.ProductionReportsModule
import phoenix.reports.acceptance.AMLReportsGenerationAcceptanceSpec.amlRecipientEmail
import phoenix.reports.acceptance.AMLReportsGenerationAcceptanceSpec.everySecond
import phoenix.reports.infrastructure.SlickBetEventsRepository
import phoenix.reports.infrastructure.SlickWalletSummaryRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConfigFactory.Environment
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._

final class AMLReportsGenerationAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec {

  val eventuallyTimeout: Timeout = Timeout(Span(30, Seconds))
  val eventuallyInterval: Interval = Interval(Span(10, Millis))

  val environment = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)
  implicit val clock = environment.clock
  val reportingBets = new SlickBetEventsRepository(dbConfig)
  val dailySummaries = new SlickWalletSummaryRepository(dbConfig, environment.clock)
  val stubbedEmailSender = new EmailSenderStub()
  val mailingModule: EmailingModule = EmailingModule.init(stubbedEmailSender)
  val applicationPunterRepository = new ApplicationInMemoryPuntersRepository()

  new ProductionReportsModule(
    environment.clock,
    environment.schedulerModule.akkaJobScheduler,
    mailingModule.mailer,
    dbConfig,
    applicationPunterRepository)(system, ec)

  override protected def environmentOverride: Environment =
    super.environmentOverride ++ Map(
      "AML_EMAIL_REPORTS_RECIPIENT" -> amlRecipientEmail.value,
      "AML_DAILY_REPORTS_SCHEDULE" -> everySecond,
      "AML_WEEKLY_REPORTS_SCHEDULE" -> everySecond,
      "AML_MONTHLY_REPORTS_SCHEDULE" -> everySecond,
      "AML_DECEASED_REPORTS_SCHEDULE" -> everySecond,
      "AML_MANUALLY_UNSUSPENDED_REPORTS_SCHEDULE" -> everySecond,
      "AML_MULTI_DEVICE_ACTIVITY_REPORTS_SCHEDULE" -> everySecond)

  "should send daily AML report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Daily") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }

  "should send weekly AML report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Weekly") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }

  "should send monthly AML report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Monthly") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }

  "should send deceased punters report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Deceased") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }

  "should send manually unsuspended punters report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Manual KYC Report") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }

  "should send multi-device punters activity report" in {
    // expect
    eventually(eventuallyTimeout, eventuallyInterval) {
      stubbedEmailSender.sentMessages.exists { message =>
        message.recipient == amlRecipientEmail &&
        message.subject.value.contains("Multi-Device Activity Report") &&
        message.attachments.nonEmpty
      } shouldBe true
    }
  }
}

object AMLReportsGenerationAcceptanceSpec {
  val amlRecipientEmail: Email = Email.fromString("aml.reports@vie.gg").unsafe()
  val everySecond = "mode=recurring,every=1.second"
}
