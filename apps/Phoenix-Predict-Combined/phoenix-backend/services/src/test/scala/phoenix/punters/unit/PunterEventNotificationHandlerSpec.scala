package phoenix.punters.unit

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._

import cats.data.EitherT
import org.scalatest.BeforeAndAfterAll
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.EitherTUtils._
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.punters.CustomerSupportContext
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.PunterDataGenerator.createDepositLimitAmount
import phoenix.punters.PunterDataGenerator.createStakeLimitAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.CoolOffPeriod
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.PunterState.StartedSession
import phoenix.punters.TalonAppBaseUrl
import phoenix.punters.application.es.PunterEventNotificationHandler
import phoenix.punters.domain.CustomerServiceNotifications.PlayerHasSelfExcludedNotification
import phoenix.punters.domain.EmailNotification._
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain._
import phoenix.punters.support.AccountVerificationCodeRepositoryStub
import phoenix.punters.unit.EventHandlerScope.signInNotificationsDisabled
import phoenix.punters.unit.EventHandlerScope.signInNotificationsEnabled
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateEmail
import phoenix.time.FakeHardcodedClock

final class PunterEventNotificationHandlerSpec
    extends AnyWordSpecLike
    with BeforeAndAfterAll
    with FutureSupport
    with Matchers {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  // Looks like the rendering engine takes some time to initialize
  override def awaitTimeout: Timeout = Timeout(Span(30, Seconds))
  private val dateFormatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss")

  private def formatDateTime(timestamp: OffsetDateTime): String = timestamp.format(dateFormatter)

  private val uuid: UUID = DataGenerator.randomUUID()
  private val appBaseUrl = DataGenerator.createPhoenixAppBaseUrl()
  private val talonAppBaseUrl = TalonAppBaseUrl("https://office.dev.phoenix.darkstormlabs.net/")
  private val customerServiceEmail = generateEmail()

  "PunterEventNotificationHandler" should {

    "send notification when punter created" in new EventHandlerScope(uuid, appBaseUrl) {
      // given
      val depositLimits = Limits.unsafe(
        Limit.Daily(Some(createDepositLimitAmount(21))),
        Limit.Weekly(Some(createDepositLimitAmount(37))),
        Limit.Monthly(Some(createDepositLimitAmount(2137))))
      val sessionLimits = Limits.unsafe(
        SessionLimits.Daily.unsafe(SessionDuration(3.hours)),
        SessionLimits.Weekly.unsafe(SessionDuration(10.hours)),
        SessionLimits.Monthly.unsafe(SessionDuration(30.hours)))
      val stakeLimits = Limits.unsafe(
        Limit.Daily(Some(createStakeLimitAmount(100))),
        Limit.Weekly(Some(createStakeLimitAmount(300))),
        Limit.Monthly(Some(createStakeLimitAmount(1500))))
      val punterCreated: PunterEvent =
        PunterProfileCreated(
          punterId,
          depositLimits,
          stakeLimits,
          sessionLimits,
          referralCode = None,
          isTestAccount = false)

      // when
      await(handleEvent(punterCreated))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == AccountActivation.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(s"We also advise you to set strong authentication on your account.")
      }
    }

    "send notification when punter suspended by the operator" in new EventHandlerScope {
      // given
      val suspensionReason = OperatorSuspend("Nasty boi")
      val punterSuspended: PunterEvent =
        PunterSuspended(punterId, entity = suspensionReason, suspendedAt = randomOffsetDateTime())

      // when
      await(handleEvent(punterSuspended))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == PunterSuspendedByOperator.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(s"Your account has been suspended due to '${suspensionReason.details}'")
      }
    }

    "send notification when punter suspended due to negative balance" in new EventHandlerScope {
      // given
      val suspensionReason = NegativeBalance("Low balance")
      val punterSuspended: PunterEvent =
        PunterSuspended(punterId, entity = suspensionReason, suspendedAt = randomOffsetDateTime())

      // when
      await(handleEvent(punterSuspended))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == PunterSuspendedByNegativeBalance.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(s"Your account has been suspended due to having a negative balance")
      }
    }

    s"send notification when punter is suspended by a RegistrationIssue (AML)" in new EventHandlerScope(
      talonAppBaseUrl = talonAppBaseUrl,
      customerServiceEmail = customerServiceEmail) {
      // given
      val suspensionReason: RegistrationIssue = RegistrationIssue("some issue")
      val punterSuspended: PunterEvent =
        PunterSuspended(punterId, entity = suspensionReason, suspendedAt = randomOffsetDateTime())

      // when
      await(handleEvent(punterSuspended))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject.value == "Punter account suspended" &&
        message.recipient == customerServiceEmail &&
        message.content.value.contains(s"Punter account has been suspended due to '${suspensionReason.details}'") &&
        message.content.value.contains(s"https://office.dev.phoenix.darkstormlabs.net/users/${punterId.value}")
      }
    }

    "send notification when punter requested for a cool off" in new EventHandlerScope {
      // given
      val punterCoolOffBegan: PunterEvent =
        CoolOffExclusionBegan(
          punterId,
          CoolOffPeriod(OffsetDateTime.MIN, OffsetDateTime.MAX),
          CoolOffCause.SelfInitiated,
          Some(clock.currentOffsetDateTime().plusDays(3)))

      // when
      await(handleEvent(punterCoolOffBegan))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == SelfInitiatedCoolOffPeriodBeganNotification.subject &&
        message.recipient == punterProfile.email &&
        message.content.value
          .contains(s"You've requested to start a cool-off period until ${formatDateTime(OffsetDateTime.MAX)}.")
      }
    }

    "send notification when a punter breached the session limits was automatically put in cool off" in new EventHandlerScope {
      // given
      val punterCoolOffBegan: PunterEvent =
        CoolOffExclusionBegan(
          punterId,
          CoolOffPeriod(OffsetDateTime.MIN, OffsetDateTime.MAX),
          CoolOffCause.SessionLimitBreach,
          Some(clock.currentOffsetDateTime().plusDays(3)))

      // when
      await(handleEvent(punterCoolOffBegan))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == AutomatedCoolOffPeriodBeganNotification.subject &&
        message.recipient == punterProfile.email &&
        message.content.value
          .contains(s"Your account has been automatically set to cool-off due to reaching your session limits until")
      }
    }

    "send notifications when punter requested for a self exclusion in our site (internal)" in new EventHandlerScope(
      talonAppBaseUrl = talonAppBaseUrl,
      customerServiceEmail = customerServiceEmail) {
      // given
      val punterSelfExclusionBegan: PunterEvent =
        SelfExclusionBegan(punterId, SelfExclusionOrigin.Internal(SelfExclusionDuration.OneYear))

      // when
      await(handleEvent(punterSelfExclusionBegan))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == ExclusionBeganNotification.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(
          s"Your exclusion registration has been completed with the New Jersey Division of Gaming Enforcement for a period of one year.")
      }

      emailSender shouldContainEmailMessage { message =>
        message.subject == PlayerHasSelfExcludedNotification.subject &&
        message.recipient == customerServiceEmail &&
        message.content.value.contains(s"https://office.dev.phoenix.darkstormlabs.net/users/${punterId.value}")
      }
    }

    "send a notification when punter requested for a self exclusion in another site (external)" in new EventHandlerScope(
      talonAppBaseUrl = talonAppBaseUrl,
      customerServiceEmail = customerServiceEmail) {
      // given
      val punterSelfExclusionBegan: PunterEvent = SelfExclusionBegan(punterId, SelfExclusionOrigin.External)

      // when
      await(handleEvent(punterSelfExclusionBegan))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == PlayerHasSelfExcludedNotification.subject &&
        message.recipient == customerServiceEmail &&
        message.content.value.contains(s"https://office.dev.phoenix.darkstormlabs.net/users/${punterId.value}")
      }
    }

    "send notification when punter exclusion ends" in new EventHandlerScope {
      // given
      val punterExclusionEnded: PunterEvent = CoolOffEnded(punterId, CoolOffCause.SelfInitiated, None)

      // when
      await(handleEvent(punterExclusionEnded))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == CoolOffPeriodEndedNotification.subject &&
        message.recipient == punterProfile.email &&
        message.content.value
          .contains(s"Your cool-off period just ended. You should be able to interact with the page again.")
      }
    }

    "send notification when punter's session limit breach cool off ends" in new EventHandlerScope {
      // given
      val punterExclusionEnded: PunterEvent = CoolOffEnded(punterId, CoolOffCause.SessionLimitBreach, None)

      // when
      await(handleEvent(punterExclusionEnded))

      // then
      emailSender shouldContainEmailMessage { message =>
        message.subject == AutomatedCoolOffPeriodEndedNotification.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(s"Your automated cool-off period just ended")
      }
    }

    "send notification when punter signs in (if punter has sign-in notifications enabled)" in new EventHandlerScope(
      punterProfile = signInNotificationsEnabled) {

      // given
      val punterSessionStarted: PunterEvent =
        SessionStarted(
          punterId,
          startedSession(startedAt = clock.currentOffsetDateTime(), dateInTheFuture),
          ipAddress = None)

      // when
      await(handleEvent(punterSessionStarted))

      // then
      emailSender shouldContainEmailMessage { message => //Sign-in date: {{signInDate}}
        message.subject == PunterSignedIn.subject &&
        message.recipient == punterProfile.email &&
        message.content.value.contains(s"Sign-in date: ${formatDateTime(clock.currentOffsetDateTime())}")
      }
    }

    "not send notification when punter signs in (if punter has sign-in notifications disabled)" in new EventHandlerScope(
      punterProfile = signInNotificationsDisabled) {

      // given
      val punterSessionStarted: PunterEvent =
        SessionStarted(
          punterId,
          startedSession(startedAt = clock.currentOffsetDateTime(), dateInTheFuture),
          ipAddress = None)

      // when
      await(handleEvent(punterSessionStarted))

      // then
      emailSender.sentMessages shouldBe empty
    }
  }

  private def startedSession(startedAt: OffsetDateTime, refreshTokenTimeout: OffsetDateTime): StartedSession =
    StartedSession(generateSessionId(), startedAt, Unlimited(refreshTokenTimeout), ipAddress = None)
}

private abstract class EventHandlerScope(
    val uuid: UUID = DataGenerator.randomUUID(),
    val appBaseUrl: PhoenixAppBaseUrl = DataGenerator.createPhoenixAppBaseUrl(),
    val talonAppBaseUrl: TalonAppBaseUrl = DataGenerator.createTalonAppBaseUrl(),
    val punterProfile: UserProfile = signInNotificationsEnabled,
    val customerServiceEmail: Email = generateEmail())(implicit ec: ExecutionContext) {
  val clock = new FakeHardcodedClock()
  val punterId: PunterId = PunterId(punterProfile.userId.value.toString)
  val emailSender: EmailSenderStub = new EmailSenderStub()
  val accountVerificationCodeRepository: AccountVerificationCodeRepositoryStub =
    new AccountVerificationCodeRepositoryStub(clock)() {
      override def generateUUID(): UUID = uuid
    }

  def dateInTheFuture = clock.currentOffsetDateTime().plusMonths(10)
  def handleEvent(event: PunterEvent): Future[Unit] =
    PunterEventNotificationHandler.handle(
      punterReader = _ => EitherT.safeRightT(punterProfile),
      mailer = EmailingModule.init(emailSender).mailer,
      accountVerificationCodeRepository,
      appBaseUrl,
      CustomerSupportContext(talonAppBaseUrl, customerServiceEmail))(event)
}

object EventHandlerScope {
  val signInNotificationsEnabled: UserProfile = PunterDataGenerator
    .generateUserProfile()
    .copy(communicationPreferences = CommunicationPreferences(
      announcements = true,
      promotions = true,
      subscriptionUpdates = true,
      signInNotifications = true))

  val signInNotificationsDisabled: UserProfile = PunterDataGenerator
    .generateUserProfile()
    .copy(communicationPreferences = CommunicationPreferences(
      announcements = false,
      promotions = false,
      subscriptionUpdates = false,
      signInNotifications = false))
}
