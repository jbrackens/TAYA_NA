package phoenix.punters.idcomply.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import net.logstash.logback.argument.StructuredArguments.keyValue
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.LastName
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.ExclusionCandidate
import phoenix.punters.exclusion.domain.ExclusionMatch.CloseMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.ExactMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.NotMatched
import phoenix.punters.exclusion.domain.PersonalDetails
import phoenix.punters.idcomply.application.CheckDGEExclusion.PlayerExcludedFromGambling

final class CheckDGEExclusion(excludedPlayers: ExcludedPlayersRepository)(implicit ec: ExecutionContext) {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  def checkAgainstExcludedPlayers(
      ssn: FullSSN,
      lastName: LastName,
      dateOfBirth: DateOfBirth): EitherT[Future, PlayerExcludedFromGambling.type, Unit] = {
    val candidate = ExclusionCandidate(ssn, PersonalDetails(lastName, dateOfBirth))
    val exclusionCheck = excludedPlayers.isExcluded(candidate)

    EitherT.liftF(exclusionCheck).subflatMap {
      case ExactMatch =>
        Left(PlayerExcludedFromGambling)

      case CloseMatch =>
        log.warn(
          "DGE exclusion check resulted in a close match - this means player should be most likely forbidden from gambling - but we should confirm [{}, {}]",
          keyValue("ssn", ssn.value),
          keyValue("lastName", lastName.value))
        Left(PlayerExcludedFromGambling)

      case NotMatched =>
        Right(())
    }
  }
}

object CheckDGEExclusion {
  object PlayerExcludedFromGambling
}
