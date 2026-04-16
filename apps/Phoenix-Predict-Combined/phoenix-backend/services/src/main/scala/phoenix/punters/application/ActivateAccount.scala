package phoenix.punters.application
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._
import cats.syntax.either._

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.EmailVerificationResult
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors

final class ActivateAccount(authenticationRepository: AuthenticationRepository, puntersRepository: PuntersRepository)(
    implicit ec: ExecutionContext) {

  def activateAccount(punterId: PunterId): EitherT[Future, ActivateAccountError, Unit] = {
    for {
      _ <- verifyPunter(punterId).leftWiden[ActivateAccountError]
    } yield ()
  }

  private def verifyPunter(punterId: PunterId): EitherT[Future, ActivateAccountError.PunterNotFound.type, Unit] = {

    for {
      _ <- puntersRepository.updateSettings(punterId, _.copy(isAccountVerified = true)).leftMap {
        case PuntersRepositoryErrors.PunterIdNotFoundInSettings => ActivateAccountError.PunterNotFound
      }
      _ <- EitherT(authenticationRepository.verifyEmail(punterId).map {
        case EmailVerificationResult.Success      => ().asRight
        case EmailVerificationResult.UserNotFound => ActivateAccountError.PunterNotFound.asLeft
      })
    } yield ()

  }
}

sealed trait ActivateAccountError
object ActivateAccountError {
  case object PunterNotFound extends ActivateAccountError
}
