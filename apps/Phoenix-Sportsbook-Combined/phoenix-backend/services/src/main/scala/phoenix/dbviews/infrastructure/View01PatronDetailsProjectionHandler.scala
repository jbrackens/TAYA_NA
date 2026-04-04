package phoenix.dbviews.infrastructure

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.core.Clock
import phoenix.dbviews.domain.model.Constants.defaultGeoId
import phoenix.dbviews.domain.model.Constants.defaultVerificationTime
import phoenix.dbviews.domain.model.KYCVerificationMethod
import phoenix.dbviews.domain.model.KYCVerificationStatus
import phoenix.dbviews.domain.model.PatronDetails
import phoenix.dbviews.domain.model.PatronKYCDetails
import phoenix.dbviews.domain.model.PatronRegistrationDetails
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.domain.DUPI
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}

class View01PatronDetailsProjectionHandler(
    repository: View01PatronDetailsRepository,
    applicationPuntersRepository: ApplicationPuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  private val handle = View01PatronDetailsProjectionHandler.handle(repository, applicationPuntersRepository) _

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] = {
    val eventCreationTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    handle(envelope.event, eventCreationTime).map(_ => Done)
  }
}

object View01PatronDetailsProjectionHandler {
  def handle(repository: View01PatronDetailsRepository, applicationPuntersRepository: ApplicationPuntersRepository)(
      event: PunterEvent,
      eventCreationTime: OffsetDateTime)(implicit ec: ExecutionContext): Future[Unit] =
    event match {
      case event: Events.PunterProfileCreated => {
        applicationPuntersRepository.findByPunterId(event.punterId).value.flatMap { punterOpt =>
          val punter = punterOpt.get
          val (zipcode, state, country) =
            (punter.details.address.zipcode, punter.details.address.state, punter.details.address.country)
          val registrationDetails: PatronRegistrationDetails = PatronRegistrationDetails(
            registrationTime = eventCreationTime,
            state = Some(state),
            zipcode = Some(zipcode),
            nonUsState = None,
            country = Some(country))

          val personalDetails: PunterPersonalDetails = PunterPersonalDetails(
            userName = punter.details.userName,
            email = punter.details.email,
            phoneNumber = punter.details.phoneNumber,
            name = punter.details.name,
            dateOfBirth = punter.details.dateOfBirth,
            gender = punter.details.gender,
            isTestAccount = false,
            isPhoneNumberVerified = false,
            document = None,
            address = punter.details.address)
          val kycDetails: PatronKYCDetails = PatronKYCDetails(
            kycVerificationMethod = KYCVerificationMethod.NoKYC,
            kycVerificationStatus = KYCVerificationStatus.NoStatus,
            kycVerificationTime = defaultVerificationTime)

          val patronDetails = PatronDetails(
            punterId = event.punterId,
            geoId = defaultGeoId,
            dupi = DUPI(punter.details.name.lastName, punter.details.dateOfBirth, punter.ssn.toLast4Digits),
            registrationDetails,
            personalDetails,
            kycDetails,
            lastUpdateTime = eventCreationTime)
          repository.upsert(patronDetails)
        }
      }
      case event: Events.PunterVerified =>
        repository.get(event.punterId).flatMap {
          case Some(patronDetails) => {
            val verificationMethod = event.verifiedBy match {
              case Some(_) => KYCVerificationMethod.Manual
              case None    => KYCVerificationMethod.Automatic
            }
            val verificationStatus = KYCVerificationStatus.Passed
            val kycDetails = PatronKYCDetails(verificationMethod, verificationStatus, event.verifiedAt)
            repository.upsert(patronDetails.copy(kyc = kycDetails))
          }
          case None => Future.unit
        }
      case _: Events.SelfExclusionBegan | _: Events.PunterUnverified | _: Events.SelfExclusionEnded |
          _: Events.CoolOffExclusionBegan | _: Events.DailySessionLimitChanged | _: Events.WeeklySessionLimitChanged |
          _: Events.MonthlySessionLimitChanged | _: Events.DailyDepositLimitChanged |
          _: Events.WeeklyDepositLimitChanged | _: Events.MonthlyDepositLimitChanged |
          _: Events.DailyStakeLimitChanged | _: Events.WeeklyStakeLimitChanged | _: Events.PunterSuspended |
          _: Events.PunterUnsuspended | _: Events.SessionStarted | _: Events.SessionEnded | _: Events.SessionUpdated |
          _: Events.LoginFailureCounterIncremented | _: Events.MonthlyStakeLimitChanged | _: Events.CoolOffEnded |
          _: Events.FailedMFAAttemptCounterIncremented | _: Events.LoginContextGotReset |
          _: Events.PunterUnsuspendStarted | _: Events.NegativeBalanceAccepted | _: Events.NegativeBalanceCancelled |
          _: Events.PunterStateGotReset =>
        Future.unit
    }
}
