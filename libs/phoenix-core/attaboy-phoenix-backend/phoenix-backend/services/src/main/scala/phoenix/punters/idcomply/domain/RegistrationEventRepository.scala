package phoenix.punters.idcomply.domain
import java.time.OffsetDateTime

import scala.concurrent.Future

import io.scalaland.chimney.Transformer

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.domain.Address
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.Gender
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.Username
import phoenix.punters.idcomply.domain.Events.RegistrationEvent
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCMatch
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpRequest

trait RegistrationEventRepository {
  def save(event: RegistrationEvent): Future[Unit]

  def latestEventForId(punterId: PunterId): Future[Option[RegistrationEvent]]

  def allEvents(punterId: PunterId): Future[List[RegistrationEvent]]
}

object Events {

  sealed trait RegistrationEvent {
    val punterId: PunterId
    val createdAt: OffsetDateTime
  }

  final case class SignUpEventData(
      name: PersonalName,
      username: Username,
      email: Email,
      phoneNumber: MobilePhoneNumber,
      address: Address,
      dateOfBirth: DateOfBirth,
      gender: Option[Gender],
      ssn: Last4DigitsOfSSN,
      referralCode: Option[ReferralCode])
  object SignUpEventData {
    implicit val signUpRequestTransformer: Transformer[SignUpRequest, SignUpEventData] =
      Transformer.define[SignUpRequest, SignUpEventData].buildTransformer
  }

  sealed trait KYCResultEventData
  object KYCResultEventData {
    final case class FailMatchEventData(alerts: List[Alert], details: List[Detail]) extends KYCResultEventData
    final case class PartialMatchEventData(alerts: List[Alert], details: List[Detail]) extends KYCResultEventData
    final case class FullMatchEventData(transactionId: TransactionId) extends KYCResultEventData

    def fromKYCResult(kycResult: KYCResult): KYCResultEventData =
      kycResult match {
        case KYCResult(KYCMatch.FailMatch, _, alerts, details)     => FailMatchEventData(alerts, details)
        case KYCResult(KYCMatch.PartialMatch, _, alerts, details)  => PartialMatchEventData(alerts, details)
        case KYCResult(KYCMatch.FullMatch(_), transactionId, _, _) => FullMatchEventData(transactionId)
      }
  }

  final case class PunterSignUpStarted(punterId: PunterId, createdAt: OffsetDateTime, signUpRequest: SignUpEventData)
      extends RegistrationEvent

  final case class PunterGotSuccessfulKYCResponse(
      punterId: PunterId,
      createdAt: OffsetDateTime,
      kycResult: KYCResultEventData)
      extends RegistrationEvent

  final case class PunterGotFailedKYCResponse(punterId: PunterId, createdAt: OffsetDateTime, kycError: KYCError)
      extends RegistrationEvent

  final case class PunterWasAskedQuestions(
      punterId: PunterId,
      createdAt: OffsetDateTime,
      transactionId: TransactionId,
      questions: List[Question])
      extends RegistrationEvent

  final case class PunterGotFailMatchQuestionsResponse(punterId: PunterId, createdAt: OffsetDateTime, message: String)
      extends RegistrationEvent

  final case class PunterAnsweredQuestions(
      punterId: PunterId,
      createdAt: OffsetDateTime,
      transactionId: TransactionId,
      answers: List[Answer])
      extends RegistrationEvent

  final case class PunterWasAskedForPhotoVerification(
      punterId: PunterId,
      createdAt: OffsetDateTime,
      token: TokenId,
      openKey: OpenKey)
      extends RegistrationEvent

  final case class PunterPhotoVerificationTokenStatusWasChecked(
      punterId: PunterId,
      createdAt: OffsetDateTime,
      status: IDPVTokenStatus)
      extends RegistrationEvent

  final case class PunterFailedPhotoVerification(punterId: PunterId, createdAt: OffsetDateTime)
      extends RegistrationEvent
}
