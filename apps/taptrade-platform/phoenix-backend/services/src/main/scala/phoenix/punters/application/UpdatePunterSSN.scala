package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.instances.future._

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdateSSNRequest

final class UpdatePunterSSN(
    puntersRepository: PuntersRepository,
    excludedPlayersRepository: ExcludedPlayersRepository,
    punters: PuntersBoundedContext,
    bets: BetsBoundedContext)(implicit ec: ExecutionContext, clock: Clock) {

  private val selfExcludeAfterDataChange = new SelfExcludeAfterDataChange(excludedPlayersRepository, punters, bets)

  def updatePunterSSN(
      punterId: PunterId,
      newSSNRequest: UpdateSSNRequest): EitherT[Future, UpdatePunterSSNError, Unit] =
    for {
      _ <- updatePuntersRepository(punterId, newSSNRequest)
      punter <- puntersRepository.findByPunterId(punterId).toRight(UpdatePunterSSNError.PunterNotFound)
      _ <-
        selfExcludeAfterDataChange
          .maybeSelfExcludeBasedOnDGEImportedData(newSSNRequest.ssn, punter)
          .leftMap[UpdatePunterSSNError] {
            case SelfExcludeAfterDataChangeError.PunterNotFound => UpdatePunterSSNError.PunterNotFound
          }
    } yield ()

  private def updatePuntersRepository(
      punterId: PunterId,
      newSsnRequest: UpdateSSNRequest): EitherT[Future, UpdatePunterSSNError, Unit] = {
    puntersRepository.setSSN(punterId, newSsnRequest.ssn).leftMap {
      case PuntersRepositoryErrors.PunterIdNotFound => UpdatePunterSSNError.PunterNotFound
      case PuntersRepositoryErrors.SSNAlreadyExists => UpdatePunterSSNError.SSNAlreadyExists
    }
  }
}

sealed trait UpdatePunterSSNError
object UpdatePunterSSNError {
  case object PunterNotFound extends UpdatePunterSSNError
  case object SSNAlreadyExists extends UpdatePunterSSNError
}
