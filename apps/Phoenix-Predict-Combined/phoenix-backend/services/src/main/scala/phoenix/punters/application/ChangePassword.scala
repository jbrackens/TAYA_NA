package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.core.emailing.Mailer
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.ChangePasswordUseCaseError._
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors.UnauthorizedLoginError
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
import phoenix.punters.domain.VerificationFailure

final class ChangePassword(
    authenticationRepository: AuthenticationRepository,
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    mailer: Mailer,
    clock: Clock)(implicit ec: ExecutionContext) {

  def changePassword(
      punterId: PunterId,
      currentPassword: MaybeValidPassword,
      newPassword: MaybeValidPassword,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, ChangePasswordUseCaseError, Unit] =
    for {
      _ <- guardVerification(verificationId, verificationCode)
      punterData <- findPunterData(punterId)
      validNewPassword <- EitherT.fromEither[Future](
        ValidPassword.fromString(newPassword.value).toEither.left.map(_ => NewPasswordHasInvalidFormat))
      _ <- guardCurrentPasswordMatches(currentPassword, punterData)
      _ <- changePassword(punterId, validNewPassword)
      _ <- sendPasswordChangedEmail(punterData.details.email)
    } yield ()

  private def guardVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, ChangePasswordUseCaseError, Unit] = {
    import VerificationFailure._
    multiFactorAuthenticationService.approveVerification(verificationId, verificationCode).leftMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved =>
        ChangePasswordUseCaseError.InvalidMFAVerification
      case MaxCheckAttemptsReached =>
        ChangePasswordUseCaseError.MaxMFACheckAttemptsReached
      case UnknownVerificationFailure =>
        ChangePasswordUseCaseError.MFAVerificationFailed
    }
  }

  private def findPunterData(
      punterId: PunterId): EitherT[Future, ChangePasswordUseCaseError.PunterNotFound.type, RegisteredUserKeycloak] =
    EitherT.fromOptionF(
      authenticationRepository.findUser(UserLookupId.byPunterId(punterId)),
      ifNone = ChangePasswordUseCaseError.PunterNotFound)

  private def guardCurrentPasswordMatches(currentPassword: MaybeValidPassword, punterData: RegisteredUserKeycloak)
      : EitherT[Future, ChangePasswordUseCaseError.CurrentPasswordNotMatching.type, Unit] =
    authenticationRepository
      .signIn(punterData.details.userName, currentPassword)
      .bimap((_: UnauthorizedLoginError.type) => ChangePasswordUseCaseError.CurrentPasswordNotMatching, _ => ())

  private def changePassword(
      punterId: PunterId,
      newPassword: ValidPassword): EitherT[Future, ChangePasswordUseCaseError, Unit] =
    authenticationRepository
      .changePassword(punterId, newPassword)
      .leftMap((_: UserNotFound.type) => ChangePasswordUseCaseError.PunterNotFound)

  private def sendPasswordChangedEmail(email: Email): EitherT[Future, ChangePasswordUseCaseError, Unit] = {
    val now = clock.currentOffsetDateTime()
    val template = PasswordChanged.build(email, PasswordChangedParams(now))
    EitherT.liftF[Future, ChangePasswordUseCaseError, Unit](mailer.send(template))
  }
}

sealed trait ChangePasswordUseCaseError
object ChangePasswordUseCaseError {
  case object InvalidMFAVerification extends ChangePasswordUseCaseError
  case object MFAVerificationFailed extends ChangePasswordUseCaseError
  case object MaxMFACheckAttemptsReached extends ChangePasswordUseCaseError
  case object PunterNotFound extends ChangePasswordUseCaseError
  case object CurrentPasswordNotMatching extends ChangePasswordUseCaseError
  case object PunterSuspended extends ChangePasswordUseCaseError
  case object NewPasswordHasInvalidFormat extends ChangePasswordUseCaseError
  case object UnauthorizedLoginOnPasswordChange extends ChangePasswordUseCaseError
}
