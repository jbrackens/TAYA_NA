package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.core.emailing.Mailer
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.application.ResetPasswordError.PunterNotFound
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors.UserNotFound
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.Email
import phoenix.punters.domain.EmailNotification.PasswordChanged
import phoenix.punters.domain.EmailNotification.PasswordChanged.PasswordChangedParams
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.ValidPassword
import phoenix.punters.domain.VerificationFailure.IncorrectVerificationCode
import phoenix.punters.domain.VerificationFailure.MaxCheckAttemptsReached
import phoenix.punters.domain.VerificationFailure.UnknownVerificationFailure
import phoenix.punters.domain.VerificationFailure.VerificationExpiredOrAlreadyApproved

final class ResetPassword(
    authenticationRepository: AuthenticationRepository,
    puntersBoundedContext: PuntersBoundedContext,
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    mailer: Mailer,
    clock: Clock)(implicit ec: ExecutionContext) {

  def resetPassword(
      punterId: PunterId,
      newPassword: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, ResetPasswordError, Unit] =
    for {
      _ <- guardVerification(verificationId, verificationCode)
      validNewPassword <- EitherT.fromEither[Future](
        ValidPassword.fromString(newPassword.value).toEither.left.map(_ => ResetPasswordError.WrongPasswordFormat))
      _ <- changePassword(punterId, validNewPassword)
      punterData <- findPunterData(punterId)
      _ <- sendPasswordChangedEmail(punterData.details.email)
      _ <- resetLoginContext(punterId)
    } yield ()

  private def guardVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, ResetPasswordError, Unit] = {
    multiFactorAuthenticationService.approveVerification(verificationId, verificationCode).leftMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved =>
        ResetPasswordError.InvalidMFAVerification
      case MaxCheckAttemptsReached    => ResetPasswordError.MaxMFACheckAttemptsReached
      case UnknownVerificationFailure => ResetPasswordError.MFAVerificationFailed
    }
  }

  private def changePassword(
      punterId: PunterId,
      newPassword: ValidPassword): EitherT[Future, ResetPasswordError, Unit] = {
    authenticationRepository
      .changePassword(punterId, newPassword)
      .leftMap((_: UserNotFound.type) => ResetPasswordError.PunterNotFound)
  }

  private def findPunterData(
      punterId: PunterId): EitherT[Future, ResetPasswordError.PunterNotFound.type, RegisteredUserKeycloak] =
    EitherT.fromOptionF(
      authenticationRepository.findUser(UserLookupId.byPunterId(punterId)),
      ifNone = ResetPasswordError.PunterNotFound)

  private def sendPasswordChangedEmail(email: Email): EitherT[Future, ResetPasswordError, Unit] = {
    val now = clock.currentOffsetDateTime()
    val template = PasswordChanged.build(email, PasswordChangedParams(now))
    EitherT.liftF[Future, ResetPasswordError, Unit](mailer.send(template))
  }

  private def resetLoginContext(punterId: PunterId): EitherT[Future, ResetPasswordError, Unit] =
    puntersBoundedContext.resetLoginContext(punterId).leftMap((_: PunterProfileDoesNotExist) => PunterNotFound)
}

sealed trait ResetPasswordError
object ResetPasswordError {
  case object WrongPasswordFormat extends ResetPasswordError
  case object PunterNotFound extends ResetPasswordError
  case object UnauthorizedLoginOnPasswordChange extends ResetPasswordError
  case object InvalidMFAVerification extends ResetPasswordError
  case object MaxMFACheckAttemptsReached extends ResetPasswordError
  case object MFAVerificationFailed extends ResetPasswordError
}
