package phoenix.punters.application
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PasswordResetRequired
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.PuntersBoundedContext.PunterSuspendedError
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.PuntersBoundedContext.SessionNotFound
import phoenix.punters.application.LoginProcess.CheckCredentialsError
import phoenix.punters.application.LoginProcess.LoggedIn
import phoenix.punters.application.LoginProcess.LoginProcessError
import phoenix.punters.application.LoginProcess.LoginProcessError.PunterProfileNotFound
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFoundInSettings
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.SignInTimestamp
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.TermsValidator.doTermsNeedToBeAccepted
import phoenix.punters.domain.UserTokenResponse
import phoenix.punters.domain.Username
import phoenix.utils.UUIDGenerator

final class LoginProcess(
    puntersBoundedContext: PuntersBoundedContext,
    authenticationRepository: AuthenticationRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    puntersRepository: PuntersRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val logoutUseCase: LogoutUseCase = new LogoutUseCase(authenticationRepository, puntersBoundedContext)

  def checkCredentials(
      punterId: PunterId,
      username: Username,
      password: MaybeValidPassword): EitherT[Future, CheckCredentialsError, Unit] =
    createToken(punterId, username, password).map(_ => ())

  def login(
      punterId: PunterId,
      username: Username,
      password: MaybeValidPassword,
      termsAgreement: TermsAgreement,
      lastSignInTimestamp: Option[SignInTimestamp],
      deviceFingerprint: DeviceFingerprint,
      clientIP: IpAddress): EitherT[Future, LoginProcessError, LoggedIn] = {
    val now = clock.currentOffsetDateTime()

    for {
      _ <- logout(punterId)
      token <- createTokenForLoginProcess(punterId, username, password)
      refreshTokenTimeout = RefreshToken.refreshTokenTimeout(clock, token.refreshExpiresIn)
      sessionId <- startSession(punterId, refreshTokenTimeout, clientIP)
      _ <- EitherT.liftF(deviceFingerprintsRepository.insert(punterId, deviceFingerprint))
      _ <-
        puntersRepository
          .updateSettings(punterId, _.copy(lastSignIn = Some(LastSignInData(SignInTimestamp(now), clientIP))))
          .leftMap { case PunterIdNotFoundInSettings => PunterProfileNotFound }
      terms <- EitherT.liftF(termsAndConditionsRepository.getCurrentTerms())
      hasToAcceptTerms =
        doTermsNeedToBeAccepted(terms.currentTermsVersion, terms.termsDaysThreshold, now, termsAgreement)
    } yield LoggedIn(token, sessionId, hasToAcceptTerms = hasToAcceptTerms, lastSignIn = lastSignInTimestamp)
  }

  private def createTokenForLoginProcess(
      punterId: PunterId,
      username: Username,
      password: MaybeValidPassword): EitherT[Future, LoginProcessError, UserTokenResponse] = {
    createToken(punterId, username, password).leftMap {
      case CheckCredentialsError.UnauthorizedLogin => LoginProcessError.UnauthorizedLogin
      case CheckCredentialsError.UnauthorizedLoginWithPasswordReset =>
        LoginProcessError.UnauthorizedLoginWithPasswordReset
      case CheckCredentialsError.PunterProfileNotFound => LoginProcessError.PunterProfileNotFound
    }
  }

  private def createToken(
      punterId: PunterId,
      username: Username,
      password: MaybeValidPassword): EitherT[Future, CheckCredentialsError, UserTokenResponse] =
    authenticationRepository
      .signIn(username, password)
      .leftFlatMap((_: Errors.UnauthorizedLoginError.type) => handleSignInFailure(punterId))

  private def handleSignInFailure(punterId: PunterId): EitherT[Future, CheckCredentialsError, UserTokenResponse] = {
    puntersBoundedContext
      .incrementLoginFailureCounter(punterId)
      .biflatMap[CheckCredentialsError, UserTokenResponse](
        (_: PunterProfileDoesNotExist) => EitherT.leftT(CheckCredentialsError.PunterProfileNotFound),
        {
          case PasswordResetRequired(true) =>
            EitherT.leftT(CheckCredentialsError.UnauthorizedLoginWithPasswordReset)
          case PasswordResetRequired(false) =>
            EitherT.leftT(CheckCredentialsError.UnauthorizedLogin)
        })
  }

  private def logout(punterId: PunterId): EitherT[Future, LoginProcessError.PunterProfileNotFound.type, Unit] =
    logoutUseCase
      .logout(punterId)
      .biflatMap(
        {
          case SessionNotFound              => EitherT.safeRightT(())
          case PunterProfileDoesNotExist(_) => EitherT.leftT(LoginProcessError.PunterProfileNotFound)
        },
        _ => EitherT.safeRightT(()))

  private def startSession(
      punterId: PunterId,
      refreshTokenTimeout: OffsetDateTime,
      ipAddress: IpAddress): EitherT[Future, LoginProcessError, SessionId] =
    for {
      sessionId <-
        puntersBoundedContext
          .startSession(punterId, SessionId.fromUUID(uuidGenerator.generate()), refreshTokenTimeout, Some(ipAddress))
          .map(session => session.sessionId)
          .leftMap[LoginProcessError]((_: PunterSuspendedError) => LoginProcessError.PunterSuspended)
    } yield sessionId
}

object LoginProcess {

  final case class LoggedIn(
      token: UserTokenResponse,
      sessionId: SessionId,
      hasToAcceptTerms: Boolean,
      lastSignIn: Option[SignInTimestamp])

  sealed trait CheckCredentialsError extends Product with Serializable
  object CheckCredentialsError {
    final case object UnauthorizedLogin extends CheckCredentialsError
    final case object UnauthorizedLoginWithPasswordReset extends CheckCredentialsError
    final case object PunterProfileNotFound extends CheckCredentialsError
  }

  sealed trait LoginProcessError extends Product with Serializable
  object LoginProcessError {
    final case object UnauthorizedLogin extends LoginProcessError
    final case object UnauthorizedLoginWithPasswordReset extends LoginProcessError
    final case object PunterSuspended extends LoginProcessError
    final case object PunterProfileNotFound extends LoginProcessError
  }
}
