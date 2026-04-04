package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.http.core.IpAddress
import phoenix.punters.KeycloakDataConverter
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.LoginProcess.LoggedIn
import phoenix.punters.application.LoginProcess.LoginProcessError
import phoenix.punters.application.LoginWithVerificationError._
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.Username
import phoenix.punters.domain.VerificationFailure
import phoenix.punters.domain._
import phoenix.utils.UUIDGenerator

final class LoginWithVerificationUseCase(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersBoundedContext: PuntersBoundedContext,
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    uuidGenerator: UUIDGenerator,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    clock: Clock)(implicit ec: ExecutionContext) {
  private val log = LoggerFactory.getLogger(getClass)

  private val loginProcess =
    new LoginProcess(
      puntersBoundedContext,
      authenticationRepository,
      termsAndConditionsRepository,
      deviceFingerprintsRepository,
      puntersRepository,
      uuidGenerator,
      clock)

  def loginWithVerification(
      punterProfile: PunterProfile,
      registeredUserKeycloak: RegisteredUserKeycloak,
      username: Username,
      password: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode,
      deviceFingerprint: DeviceFingerprint,
      clientIP: IpAddress): EitherT[Future, LoginWithVerificationError, LoggedIn] = {
    log.info(s"logging in with verification $username")

    for {
      _ <- checkIfUserNeedsToResetPassword(punterProfile)
      _ <- approveMultifactorVerification(punterProfile.punterId, verificationId, verificationCode)
      registeredUser <-
        KeycloakDataConverter.enrichKeycloakUser(registeredUserKeycloak, puntersRepository, PunterProfileDoesNotExist)
      termsAgreement = registeredUser.details.termsAgreement
      lastSignInTimestamp = registeredUser.lastSignIn.map(_.timestamp)
      loggedIn <-
        loginProcess
          .login(
            punterProfile.punterId,
            username,
            password,
            termsAgreement,
            lastSignInTimestamp,
            deviceFingerprint,
            clientIP)
          .leftMap {
            case LoginProcessError.UnauthorizedLogin                  => UnauthorizedLoginError
            case LoginProcessError.UnauthorizedLoginWithPasswordReset => UnauthorizedLoginWithPasswordResetError
            case LoginProcessError.PunterSuspended                    => PunterSuspended
            case LoginProcessError.PunterProfileNotFound              => LoginWithVerificationError.PunterProfileDoesNotExist
          }
      _ <- verifyPhoneNumber(punterProfile.punterId)
    } yield loggedIn
  }

  private def verifyPhoneNumber(punterId: PunterId): EitherT[Future, LoginWithVerificationError, Unit] = {
    puntersRepository
      .updateDetails(punterId, _.copy(isPhoneNumberVerified = true))
      .leftMap(_ => LoginWithVerificationError.PunterProfileDoesNotExist)
  }

  private def checkIfUserNeedsToResetPassword(
      punterProfile: PunterProfile): EitherT[Future, LoginWithVerificationError, Unit] =
    EitherT.cond(!punterProfile.passwordResetRequired, (), LoginWithVerificationError.PunterShouldResetPassword)

  private def approveMultifactorVerification(
      punterId: PunterId,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, LoginWithVerificationError, Unit] = {
    import VerificationFailure._
    multiFactorAuthenticationService.approveVerification(verificationId, verificationCode).leftFlatMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved =>
        handleIncorrectMultifactorVerification(punterId, IncorrectVerification)
      case MaxCheckAttemptsReached =>
        EitherT.leftT(LoginWithVerificationError.MaxMFACheckAttemptsReached)
      case UnknownVerificationFailure =>
        EitherT.leftT(LoginWithVerificationError.MFAVerificationFailed)
    }
  }

  private def handleIncorrectMultifactorVerification(
      punterId: PunterId,
      incorrectVerification: IncorrectVerification.type): EitherT[Future, LoginWithVerificationError, Unit] = {
    puntersBoundedContext
      .recordFailedMFAAttempt(punterId)
      .leftMap(_ => LoginWithVerificationError.PunterProfileDoesNotExist)
      .subflatMap { passwordResetRequired =>
        Left {
          if (passwordResetRequired.value) LoginWithVerificationError.IncorrectVerificationWithPasswordReset
          else incorrectVerification
        }
      }
  }
}

sealed trait LoginWithVerificationError extends Product with Serializable
object LoginWithVerificationError {
  case object PunterShouldResetPassword extends LoginWithVerificationError
  case object UnauthorizedLoginError extends LoginWithVerificationError
  case object UnauthorizedLoginWithPasswordResetError extends LoginWithVerificationError
  case object IncorrectVerification extends LoginWithVerificationError
  case object IncorrectVerificationWithPasswordReset extends LoginWithVerificationError
  case object MFAVerificationFailed extends LoginWithVerificationError
  case object MaxMFACheckAttemptsReached extends LoginWithVerificationError
  case object PunterProfileDoesNotExist extends LoginWithVerificationError
  case object PunterSuspended extends LoginWithVerificationError
  case object WrongPasswordFormatError extends LoginWithVerificationError
}
