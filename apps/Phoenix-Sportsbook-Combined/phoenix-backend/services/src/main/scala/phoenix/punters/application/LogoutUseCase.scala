package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.LoggerFactory

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.EndSessionError
import phoenix.punters.domain.AuthenticationRepository

final class LogoutUseCase(
    authenticationRepository: AuthenticationRepository,
    puntersBoundedContext: PuntersBoundedContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def logout(punterId: PunterId)(implicit ec: ExecutionContext): EitherT[Future, EndSessionError, Unit] = {
    log.info(s"logging out $punterId")
    for {
      _ <- puntersBoundedContext.endSession(punterId)
      _ <- EitherT.liftF(authenticationRepository.signOut(punterId))
    } yield ()
  }
}
