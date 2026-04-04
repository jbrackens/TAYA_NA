package phoenix.punters.exclusion.domain

import java.time.LocalDate

import scala.concurrent.Future

import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.LastName
import phoenix.punters.domain.SocialSecurityNumber.FullSSN

trait ExcludedPlayersRepository {
  def upsert(player: ExcludedPlayer): Future[Unit]
  def isExcluded(candidate: ExclusionCandidate): Future[ExclusionMatch]
}

final case class ExclusionCandidate(ssn: FullSSN, personalDetails: PersonalDetails)
final case class PersonalDetails(lastName: NormalizedLastName, dateOfBirth: LocalDate)
object PersonalDetails {
  def apply(lastName: LastName, dateOfBirth: DateOfBirth): PersonalDetails =
    PersonalDetails(
      NormalizedLastName(lastName.value),
      LocalDate.of(dateOfBirth.year, dateOfBirth.month, dateOfBirth.day))
}

sealed trait ExclusionMatch
object ExclusionMatch {
  case object ExactMatch extends ExclusionMatch
  case object CloseMatch extends ExclusionMatch
  case object NotMatched extends ExclusionMatch
}
