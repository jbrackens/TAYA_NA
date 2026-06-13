package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.UpdatePunterPreferencesError.PunterNotFound
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.UserPreferences

final class UpdatePunterPreferences(puntersRepository: PuntersRepository)(implicit ec: ExecutionContext) {
  def updatePunterPreferences(
      punterId: PunterId,
      newPreferences: UserPreferences): EitherT[Future, UpdatePunterPreferencesError, Unit] =
    puntersRepository.updateSettings(punterId, x => x.copy(userPreferences = newPreferences)).leftMap {
      case PuntersRepositoryErrors.PunterIdNotFoundInSettings => PunterNotFound
    }

}

sealed trait UpdatePunterPreferencesError
object UpdatePunterPreferencesError {
  case object PunterNotFound extends UpdatePunterPreferencesError
}
