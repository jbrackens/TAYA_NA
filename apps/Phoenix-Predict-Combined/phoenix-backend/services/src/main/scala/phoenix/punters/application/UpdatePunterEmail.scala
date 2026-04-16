package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.UpdatePunterEmailError.EmailChangeError
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.Email
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.VerificationFailure

final class UpdatePunterEmail(
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def update(
      punterId: PunterId,
      newEmail: Email,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, UpdatePunterEmailError, Unit] = {
    for {
      _ <- ensureVerification(verificationId, verificationCode)
      _ <- ensureEmailIsNotAlreadyUsed(newEmail)
      punterData <- findPunterData(punterId)
      _ <- updateEmail(punterId, punterData, newEmail)
    } yield ()
  }

  private def ensureVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, UpdatePunterEmailError, Unit] = {
    import VerificationFailure._
    multiFactorAuthenticationService.approveVerification(verificationId, verificationCode).leftMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved =>
        UpdatePunterEmailError.InvalidMFAVerification
      case MaxCheckAttemptsReached =>
        UpdatePunterEmailError.MaxMFACheckAttemptsReached
      case UnknownVerificationFailure =>
        UpdatePunterEmailError.MFAVerificationFailed
    }
  }

  private def ensureEmailIsNotAlreadyUsed(
      newEmail: Email): EitherT[Future, UpdatePunterEmailError.EmailAlreadyUsed.type, Unit] = {
    for {
      _ <- EitherT {
        authenticationRepository.userExists(UserLookupId.byEmail(newEmail)).map {
          case true  => Left(UpdatePunterEmailError.EmailAlreadyUsed)
          case false => Right(())
        }
      }
      _ <- EitherT {
        puntersRepository.findPuntersByFilters(PunterSearch(email = Some(newEmail)), Pagination(1, 1)).map { results =>
          results.totalCount match {
            case 0 => Right(())
            case _ => Left(UpdatePunterEmailError.EmailAlreadyUsed)
          }
        }
      }
    } yield ()
  }

  private def findPunterData(
      punterId: PunterId): EitherT[Future, UpdatePunterEmailError.PunterNotFound.type, RegisteredUserKeycloak] =
    EitherT.fromOptionF(
      authenticationRepository.findUser(UserLookupId.byPunterId(punterId)),
      ifNone = UpdatePunterEmailError.PunterNotFound)

  private def updateEmail(
      punterId: PunterId,
      punterData: RegisteredUserKeycloak,
      newEmail: Email): EitherT[Future, UpdatePunterEmailError, Unit] = {

    for {
      _ <- EitherT.liftF(
        authenticationRepository
          .updateUser(punterId, punterData.details.copy(email = newEmail, isEmailVerified = false)))
      _ <-
        puntersRepository
          .updateDetails(punterId, details => details.copy(email = newEmail))
          .leftMap[UpdatePunterEmailError] { err =>
            log.error(s"updateEmail: cannot be executed: $err")
            EmailChangeError
          }
    } yield ()
  }
}

sealed trait UpdatePunterEmailError
object UpdatePunterEmailError {
  case object InvalidMFAVerification extends UpdatePunterEmailError
  case object MFAVerificationFailed extends UpdatePunterEmailError
  case object MaxMFACheckAttemptsReached extends UpdatePunterEmailError
  case object EmailAlreadyUsed extends UpdatePunterEmailError
  case object EmailChangeError extends UpdatePunterEmailError
  case object PunterNotFound extends UpdatePunterEmailError
}
