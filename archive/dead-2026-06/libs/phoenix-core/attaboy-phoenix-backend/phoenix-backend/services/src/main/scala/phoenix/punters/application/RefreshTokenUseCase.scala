package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.PuntersBoundedContext.PunterSuspendedError
import phoenix.punters.application.RefreshTokenUseCase.InvalidToken
import phoenix.punters.application.RefreshTokenUseCase.PunterDoesNotExist
import phoenix.punters.application.RefreshTokenUseCase.PunterSuspended
import phoenix.punters.application.RefreshTokenUseCase.RefreshTokenError
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors.InvalidRefreshToken
import phoenix.punters.domain.RefreshToken
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RefreshTokenResponse

class RefreshTokenUseCase(authenticationRepository: AuthenticationRepository, punters: PuntersBoundedContext)(implicit
    ec: ExecutionContext,
    clock: Clock) {

  def refreshToken(refreshToken: RefreshToken): EitherT[Future, RefreshTokenError, RefreshTokenResponse] = {
    for {
      tokenResponse <- authenticationRepository.refreshToken(refreshToken).map(RefreshTokenResponse.apply).leftMap {
        case InvalidRefreshToken => InvalidToken
      }
      refreshTokenTimeout = RefreshToken.refreshTokenTimeout(clock, tokenResponse.token.refreshExpiresIn)
      _ <-
        punters
          .keepaliveSession(PunterId(tokenResponse.token.userId), refreshTokenTimeout)
          .leftMap {
            case PunterSuspendedError(_)      => PunterSuspended
            case PunterProfileDoesNotExist(_) => PunterDoesNotExist
          }
          .leftWiden[RefreshTokenError]

    } yield tokenResponse
  }

}

object RefreshTokenUseCase {

  sealed trait RefreshTokenError
  final case object InvalidToken extends RefreshTokenError
  final case object PunterSuspended extends RefreshTokenError
  final case object PunterDoesNotExist extends RefreshTokenError
}
