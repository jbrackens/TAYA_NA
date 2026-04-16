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
import phoenix.punters.application.LoginProcess.CheckCredentialsError
import phoenix.punters.application.LoginProcess.LoggedIn
import phoenix.punters.application.LoginProcess.LoginProcessError
import phoenix.punters.application.LoginUseCaseError.PunterProfileDoesNotExist
import phoenix.punters.application.LoginUseCaseError.UnauthorizedLoginError
import phoenix.punters.application.LoginUseCaseError.UnauthorizedLoginWithPasswordResetError
import phoenix.punters.application.LoginUseCaseOutput.SuccessfulLogin
import phoenix.punters.application.LoginUseCaseOutput.VerificationRequested
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.SendVerificationCodeFailure
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.Username
import phoenix.punters.domain._
import phoenix.utils.UUIDGenerator

final class LoginUseCase(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersBoundedContext: PuntersBoundedContext,
    verificationRepository: MultiFactorAuthenticationService,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    uuidGenerator: UUIDGenerator,
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

  def login(
      punterProfile: PunterProfile,
      registeredUserKeycloak: RegisteredUserKeycloak,
      username: Username,
      password: MaybeValidPassword,
      deviceFingerprint: DeviceFingerprint,
      clientIP: IpAddress): EitherT[Future, LoginUseCaseError, LoginUseCaseOutput] = {
    log.info(s"logging in $username")

    def login(registeredUser: RegisteredUser) = {
      val punterId = PunterId(registeredUser.userId.value.toString)
      val termsAgreement = registeredUser.details.termsAgreement
      val lastSignInTimestamp = registeredUser.lastSignIn.map(_.timestamp)
      loginProcess
        .login(punterId, username, password, termsAgreement, lastSignInTimestamp, deviceFingerprint, clientIP)
        .leftMap[LoginUseCaseError] {
          case LoginProcessError.UnauthorizedLogin                  => UnauthorizedLoginError
          case LoginProcessError.UnauthorizedLoginWithPasswordReset => UnauthorizedLoginWithPasswordResetError
          case LoginProcessError.PunterSuspended                    => LoginUseCaseError.PunterSuspended
          case LoginProcessError.PunterProfileNotFound              => PunterProfileDoesNotExist
        }
        .map(SuccessfulLogin)
    }

    def sendVerificationCode(registeredUser: RegisteredUser) =
      for {
        _ <- loginProcess.checkCredentials(punterProfile.punterId, username, password).leftMap {
          case CheckCredentialsError.UnauthorizedLogin                  => UnauthorizedLoginError
          case CheckCredentialsError.UnauthorizedLoginWithPasswordReset => UnauthorizedLoginWithPasswordResetError
          case CheckCredentialsError.PunterProfileNotFound              => PunterProfileDoesNotExist
        }
        useCaseOutput <- requestVerification(registeredUser.details.phoneNumber)
      } yield useCaseOutput

    for {
      _ <- checkIfUserNeedsToResetPassword(punterProfile)
      registeredUser <-
        KeycloakDataConverter.enrichKeycloakUser(registeredUserKeycloak, puntersRepository, PunterProfileDoesNotExist)
      useCaseOutput <-
        if (registeredUser.details.twoFactorAuthEnabled || !registeredUser.details.isPhoneNumberVerified)
          sendVerificationCode(registeredUser)
        else login(registeredUser)
    } yield useCaseOutput
  }

  private def checkIfUserNeedsToResetPassword(punterProfile: PunterProfile): EitherT[Future, LoginUseCaseError, Unit] =
    EitherT.cond(!punterProfile.passwordResetRequired, (), LoginUseCaseError.PunterShouldResetPassword)

  private def requestVerification(
      phoneNumber: MobilePhoneNumber): EitherT[Future, LoginUseCaseError, LoginUseCaseOutput.VerificationRequested] =
    verificationRepository
      .sendVerificationCode(phoneNumber)
      .bimap(
        {
          case _: SendVerificationCodeFailure.InvalidPhoneNumber => LoginUseCaseError.InvalidPhoneNumber
          case SendVerificationCodeFailure.MaxSendAttemptsReached =>
            LoginUseCaseError.MaxMFASendCodeAttemptsReached
          case SendVerificationCodeFailure.UnknownSendVerificationCodeFailure =>
            LoginUseCaseError.SendVerificationCodeFailure
        },
        VerificationRequested)
}

sealed trait LoginUseCaseOutput extends Product with Serializable
object LoginUseCaseOutput {
  final case class VerificationRequested(verificationId: MultifactorVerificationId) extends LoginUseCaseOutput
  final case class SuccessfulLogin(loggedIn: LoggedIn) extends LoginUseCaseOutput
}

sealed trait LoginUseCaseError extends Product with Serializable
object LoginUseCaseError {
  case object PunterShouldResetPassword extends LoginUseCaseError
  case object UnauthorizedLoginError extends LoginUseCaseError
  case object UnauthorizedLoginWithPasswordResetError extends LoginUseCaseError
  case object PunterSuspended extends LoginUseCaseError
  case object PunterProfileDoesNotExist extends LoginUseCaseError
  case object InvalidPhoneNumber extends LoginUseCaseError
  case object MaxMFASendCodeAttemptsReached extends LoginUseCaseError
  case object SendVerificationCodeFailure extends LoginUseCaseError
}
