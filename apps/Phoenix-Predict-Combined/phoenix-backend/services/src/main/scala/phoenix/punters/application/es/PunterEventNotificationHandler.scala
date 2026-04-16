package phoenix.punters.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.emailing.EmailContentTemplate.NoParams
import phoenix.core.emailing.EmailMessageTemplate
import phoenix.core.emailing.Mailer
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.CustomerSupportContext
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.SelfExclusionOrigin
import phoenix.punters.application.es.Notifications.PunterReader
import phoenix.punters.domain.CustomerServiceNotifications.PlayerHasSelfExcludedNotification
import phoenix.punters.domain.CustomerServiceNotifications.PunterSuspendedNotification
import phoenix.punters.domain.EmailNotification.AccountActivation.AccountActivationParams
import phoenix.punters.domain.EmailNotification.CoolOffPeriodParams
import phoenix.punters.domain.EmailNotification.ExclusionBeganNotification.ExclusionBeganParams
import phoenix.punters.domain.EmailNotification.PunterSignedIn.PunterSignedInParams
import phoenix.punters.domain.EmailNotification.PunterSuspendedByOperator.PunterSuspendedByOperatorParams
import phoenix.punters.domain.EmailNotification._
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain._

private[punters] final class PunterEventNotificationHandler(
    punterReader: PunterReader,
    mailer: Mailer,
    accountVerificationCodeRepository: AccountVerificationCodeRepository,
    appBaseUrl: PhoenixAppBaseUrl,
    customerSupport: CustomerSupportContext)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    PunterEventNotificationHandler
      .handle(
        punterReader,
        mailer,
        accountVerificationCodeRepository,
        appBaseUrl,
        customerSupport: CustomerSupportContext)(envelope.event)
      .map(_ => Done)
}

private[punters] object PunterEventNotificationHandler {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  def handle(
      punterReader: PunterReader,
      mailer: Mailer,
      accountVerificationCodeRepository: AccountVerificationCodeRepository,
      appBaseUrl: PhoenixAppBaseUrl,
      customerSupport: CustomerSupportContext)(event: PunterEvent)(implicit ec: ExecutionContext): Future[Unit] = {

    def sendEmailToPunter(id: PunterId, templateBuilder: UserProfile => EmailMessageTemplate): Future[Unit] =
      sendEmailToPunterIf(id, shouldSendEmail = _ => true, templateBuilder)

    def sendEmailToPunterIf(
        id: PunterId,
        shouldSendEmail: UserProfile => Boolean,
        templateBuilder: UserProfile => EmailMessageTemplate): Future[Unit] =
      for {
        punter <- punterReader(id).leftMap { error =>
          log.error("Could not retrieve PunterProfile {}, {}", kv("PunterId", id.value), kv("Error", error.toString))
          new MissingPunterDetails(id, error.toString)
        }.rethrowT
        emailTemplate = templateBuilder(punter)
        _ <- if (shouldSendEmail(punter)) mailer.send(emailTemplate) else Future.unit
      } yield ()

    def sendPlayerSuspensionEmailToCustomerSupport(punterId: PunterId, amlReason: String): Future[Unit] =
      mailer.send(
        PunterSuspendedNotification.build(
          customerSupport.customerSupportEmail,
          PunterSuspendedNotification.Params(amlReason, customerSupport.talonPunterUrlFor(punterId))))

    def sendPlayerHasSelfExcludedEmail(punterId: PunterId): Future[Unit] =
      mailer.send(
        PlayerHasSelfExcludedNotification.build(
          customerSupport.customerSupportEmail,
          PlayerHasSelfExcludedNotification.Params(customerSupport.talonPunterUrlFor(punterId))))

    event match {
      case PunterProfileCreated(punterId, _, _, _, _, _) =>
        for {
          authToken <- accountVerificationCodeRepository.create(java.util.UUID.fromString(punterId.value))
          _ = log.info("Created account verification code for punter {}", kv("PunterId", punterId.value))
          activationUrl = s"${appBaseUrl.value}/esports-bets/?emailToken=${authToken.urlEncodedId}"
          _ <- sendEmailToPunter(
            punterId,
            punter => AccountActivation.build(punter.email, AccountActivationParams(activationURL = activationUrl)))
        } yield ()

      case PunterSuspended(punterId, entity, _) =>
        entity match {
          case OperatorSuspend(reason) =>
            for {
              _ <- sendEmailToPunter(
                punterId,
                punter => PunterSuspendedByOperator.build(punter.email, PunterSuspendedByOperatorParams(reason)))
              _ <- sendPlayerSuspensionEmailToCustomerSupport(punterId, reason)
            } yield ()
          case NegativeBalance(reason) =>
            for {
              _ <- sendEmailToPunter(punterId, punter => PunterSuspendedByNegativeBalance.build(punter.email, NoParams))
              _ <- sendPlayerSuspensionEmailToCustomerSupport(punterId, reason)
            } yield ()
          case RegistrationIssue(amlReason) => sendPlayerSuspensionEmailToCustomerSupport(punterId, amlReason)
          case d @ Deceased(_, _, _)        => sendPlayerSuspensionEmailToCustomerSupport(punterId, d.details)
        }

      case CoolOffExclusionBegan(punterId, period, cause, _) =>
        cause match {
          case CoolOffCause.SelfInitiated =>
            sendEmailToPunter(
              punterId,
              punter => SelfInitiatedCoolOffPeriodBeganNotification.build(punter.email, CoolOffPeriodParams(period)))
          case CoolOffCause.SessionLimitBreach =>
            sendEmailToPunter(
              punterId,
              punter => AutomatedCoolOffPeriodBeganNotification.build(punter.email, CoolOffPeriodParams(period)))
        }

      case SelfExclusionBegan(punterId, SelfExclusionOrigin.External) =>
        sendPlayerHasSelfExcludedEmail(punterId)

      case SelfExclusionBegan(punterId, SelfExclusionOrigin.Internal(duration)) =>
        for {
          _ <- sendEmailToPunter(
            punterId,
            punter => ExclusionBeganNotification.build(punter.email, ExclusionBeganParams(duration)))
          _ <- sendPlayerHasSelfExcludedEmail(punterId)
        } yield ()

      case CoolOffEnded(punterId, cause, _) =>
        cause match {
          case CoolOffCause.SelfInitiated =>
            sendEmailToPunter(punterId, punter => CoolOffPeriodEndedNotification.build(punter.email, NoParams))
          case CoolOffCause.SessionLimitBreach =>
            sendEmailToPunter(punterId, punter => AutomatedCoolOffPeriodEndedNotification.build(punter.email, NoParams))
        }

      case SessionStarted(punterId, session, _) =>
        sendEmailToPunterIf(
          punterId,
          shouldSendEmail = punter => punter.communicationPreferences.signInNotifications,
          punter => PunterSignedIn.build(punter.email, PunterSignedInParams(session.startedAt)))

      case other =>
        Future.successful(log.debug(s"Ignoring $other, irrelevant for NotificationHandler"))
    }
  }

  private final class MissingPunterDetails(id: PunterId, error: String)
      extends RuntimeException(s"No such punter with PunterId: ${id.value} (Error: $error)")
}
