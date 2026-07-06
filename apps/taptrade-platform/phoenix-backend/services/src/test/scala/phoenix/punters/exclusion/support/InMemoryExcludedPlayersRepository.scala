package phoenix.punters.exclusion.support

import scala.concurrent.Future

import cats.syntax.functorFilter._
import org.apache.commons.text.similarity.LevenshteinDistance

import phoenix.core.OptionUtils._
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.ExclusionCandidate
import phoenix.punters.exclusion.domain.ExclusionMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.CloseMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.ExactMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.NotMatched
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.NormalizedLastName

final class InMemoryExcludedPlayersRepository extends ExcludedPlayersRepository {
  private val MAX_LEVENSHTEIN_DISTANCE = 1
  private val distance = new LevenshteinDistance(MAX_LEVENSHTEIN_DISTANCE + 1)

  private var exclusions: List[ExcludedPlayer] = List.empty

  override def upsert(player: ExcludedPlayer): Future[Unit] = {
    Future.successful {
      exclusions = exclusions.filterNot(_.uniqueIdentifier == player.uniqueIdentifier) :+ player
    }
  }

  override def isExcluded(candidate: ExclusionCandidate): Future[ExclusionMatch] =
    Future.successful {
      excludedPlayers
        .mapFilter(
          player =>
            byFullSSN(player, candidate)
              .orElse(byPartialSSNAndDateOfBirth(player, candidate))
              .orElse(byDateOfBirthAndLastNameExact(player, candidate))
              .orElse(byDateOfBirthAndLastNameClose(player, candidate)))
        .headOption
        .getOrElse(NotMatched)
    }

  private def byFullSSN(player: ExcludedPlayer, candidate: ExclusionCandidate): Option[ExactMatch.type] =
    Option.when(player.ssn.invariantContains(Right(candidate.ssn)))(ExactMatch)

  private def byPartialSSNAndDateOfBirth(
      player: ExcludedPlayer,
      candidate: ExclusionCandidate): Option[ExactMatch.type] =
    Option.when(
      player.ssn.invariantContains(Left(candidate.ssn.last4Digits)) &&
      player.dateOfBirth == candidate.personalDetails.dateOfBirth)(ExactMatch)

  private def byDateOfBirthAndLastNameExact(
      player: ExcludedPlayer,
      candidate: ExclusionCandidate): Option[ExactMatch.type] =
    Option.when(
      player.dateOfBirth == candidate.personalDetails.dateOfBirth &&
      player.name.normalizedLastName == candidate.personalDetails.lastName)(ExactMatch)

  private def byDateOfBirthAndLastNameClose(
      player: ExcludedPlayer,
      candidate: ExclusionCandidate): Option[CloseMatch.type] =
    Option.when(
      player.dateOfBirth == candidate.personalDetails.dateOfBirth &&
      isCloseByLevenshteinDistance(player.name.normalizedLastName, candidate.personalDetails.lastName))(CloseMatch)

  private def isCloseByLevenshteinDistance(first: NormalizedLastName, second: NormalizedLastName): Boolean = {
    val d = distance.apply(first.value, second.value)
    0 <= d && d <= MAX_LEVENSHTEIN_DISTANCE
  }

  private def excludedPlayers: List[ExcludedPlayer] =
    exclusions.filter(_.exclusion.status == ExclusionStatus.Active)
}
