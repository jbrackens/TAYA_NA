package phoenix.punters.domain

import scala.concurrent.Future

import cats.data.EitherT
import cats.data.Validated

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException

trait MultiFactorAuthenticationService {
  def sendVerificationCode(
      mobilePhoneNumber: MobilePhoneNumber): EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId]

  def approveVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit]
}

final case class MultifactorVerificationId(value: String)

final case class MultifactorVerificationCode private (value: String)
object MultifactorVerificationCode {
  val VerificationCodeLength = 6

  def apply(rawValue: String): Validation[MultifactorVerificationCode] = {
    Validated.condNel(
      rawValue.length == VerificationCodeLength,
      new MultifactorVerificationCode(rawValue),
      ValidationException(s"Verification code needs to have a length of: $VerificationCodeLength"))
  }

  def unsafe(raw: String): MultifactorVerificationCode =
    apply(raw).fold(error => throw error.head, identity)
}

sealed trait SendVerificationCodeFailure
object SendVerificationCodeFailure {
  final case class InvalidPhoneNumber(phoneNumber: String) extends SendVerificationCodeFailure
  case object MaxSendAttemptsReached extends SendVerificationCodeFailure
  case object UnknownSendVerificationCodeFailure extends SendVerificationCodeFailure
}

sealed trait VerificationFailure
object VerificationFailure {
  case object IncorrectVerificationCode extends VerificationFailure
  case object VerificationExpiredOrAlreadyApproved extends VerificationFailure
  case object MaxCheckAttemptsReached extends VerificationFailure
  case object UnknownVerificationFailure extends VerificationFailure
}
