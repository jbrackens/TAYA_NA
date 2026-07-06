package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.SendVerificationCodeFailure
import phoenix.punters.domain.VerificationFailure
import phoenix.punters.infrastructure.KeycloakHelpers

final class RequestVerification(
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def requestVerificationById(
      punterId: PunterId): EitherT[Future, RequestVerificationError, MultifactorVerificationId] =
    for {
      user <- KeycloakHelpers.getRegisteredUser(
        authenticationRepository,
        puntersRepository,
        punterId,
        RequestVerificationError.PunterNotFound,
        RequestVerificationError.PunterNotFound)
      verificationId <- sendVerificationCode(user.details.phoneNumber)
    } yield verificationId

  def requestVerificationByPhone(
      phoneNumber: MobilePhoneNumber,
      deviceFingerprint: DeviceFingerprint,
      optionalIpAddress: Option[IpAddress]): EitherT[Future, RequestVerificationError, MultifactorVerificationId] = {
    val ipAddress = optionalIpAddress.map(_.toString).getOrElse("")
    log.info(
      s"Requesting verification by phone Request[phone=${phoneNumber}, ip=${ipAddress}, visitorId=${deviceFingerprint.visitorId}, confidence=${deviceFingerprint.confidence}]")
    for {
      verificationId <- sendVerificationCode(phoneNumber)
    } yield verificationId
  }

  def checkVerification(
      id: MultifactorVerificationId,
      code: MultifactorVerificationCode,
      optionalIpAddress: Option[IpAddress]): EitherT[Future, RequestVerificationError, Unit] = {
    val ipAddress = optionalIpAddress.map(_.toString).getOrElse("")
    log.info(s"Check verification by id Request[id=${id}, code=${code}, ip=${ipAddress}]")
    checkMultiFactorVerification(id, code)
  }

  private def checkMultiFactorVerification(
      id: MultifactorVerificationId,
      code: MultifactorVerificationCode): EitherT[Future, RequestVerificationError, Unit] = {
    import VerificationFailure._
    multiFactorAuthenticationService.approveVerification(id, code).leftFlatMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved | MaxCheckAttemptsReached |
          UnknownVerificationFailure =>
        EitherT.leftT(RequestVerificationError.MFAFailed)
    }
  }

  private def sendVerificationCode(
      phoneNumber: MobilePhoneNumber): EitherT[Future, RequestVerificationError, MultifactorVerificationId] = {
    import SendVerificationCodeFailure._
    multiFactorAuthenticationService.sendVerificationCode(phoneNumber).leftMap {
      case _: InvalidPhoneNumber              => RequestVerificationError.InvalidPhoneNumber
      case MaxSendAttemptsReached             => RequestVerificationError.MaxMFASendCodeAttemptsReached
      case UnknownSendVerificationCodeFailure => RequestVerificationError.SendVerificationCodeFailure
    }
  }
}

sealed trait RequestVerificationError
object RequestVerificationError {
  case object PunterNotFound extends RequestVerificationError
  case object InvalidPhoneNumber extends RequestVerificationError
  case object MaxMFASendCodeAttemptsReached extends RequestVerificationError
  case object SendVerificationCodeFailure extends RequestVerificationError
  case object MFAFailed extends RequestVerificationError
}
