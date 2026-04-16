package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.Punter
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.application.CheckDGEExclusion

final class SelfExcludeAfterDataChange(
    excludedPlayersRepository: ExcludedPlayersRepository,
    punters: PuntersBoundedContext,
    bets: BetsBoundedContext)(implicit ec: ExecutionContext, clock: Clock) {

  private val checkDGEExclusion = new CheckDGEExclusion(excludedPlayersRepository)
  private val selfExclude = new SelfExclude(punters, bets)

  def maybeSelfExcludeBasedOnDGEImportedData(
      ssn: FullSSN,
      punter: Punter): EitherT[Future, SelfExcludeAfterDataChangeError, Unit] = {
    checkDGEExclusion
      .checkAgainstExcludedPlayers(ssn, punter.details.name.lastName, punter.details.dateOfBirth)
      .leftFlatMap { _ =>
        selfExclude
          .selfExclude(punter.punterId, SelfExclusionDuration.OneYear)
          .leftMap[SelfExcludeAfterDataChangeError](_ => SelfExcludeAfterDataChangeError.PunterNotFound)
      }
  }
}

sealed trait SelfExcludeAfterDataChangeError
object SelfExcludeAfterDataChangeError {
  case object PunterNotFound extends SelfExcludeAfterDataChangeError
}
