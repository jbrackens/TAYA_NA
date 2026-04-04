package phoenix.punters.exclusion.infrastructure

import java.time.LocalDate

import slick.lifted.CaseClassShape
import slick.lifted.Rep

import phoenix.core.HashedValue
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.domain.NormalizedLastName

object ExclusionPredicates {
  private val MAX_LEVENSHTEIN_DISTANCE = 1

  def matchesExactly(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Option[Boolean]] =
    byFullSSN(first, second) ||
    (byPartialSSN(first, second) && byDateOfBirth(first, second)) ||
    ((noSSN(first) || noSSN(second)) && byDateOfBirth(first, second) && byLastNameExact(first, second))

  def matchesClosely(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Boolean] =
    (noSSN(first) || noSSN(second)) && byDateOfBirth(first, second) && byLastNameClose(first, second)

  private def byFullSSN(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Option[Boolean]] =
    first.fullSSN.isDefined && second.fullSSN.isDefined && first.fullSSN === second.fullSSN

  private def byPartialSSN(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Option[Boolean]] =
    first.last4DigitsOfSSN.isDefined && second.last4DigitsOfSSN.isDefined && first.last4DigitsOfSSN === second.last4DigitsOfSSN

  private def noSSN(candidate: LiftedMatchingCandidate): Rep[Boolean] =
    candidate.fullSSN.isEmpty && candidate.last4DigitsOfSSN.isEmpty

  private def noSSN(candidate: MatchingCandidate): Boolean =
    candidate.fullSSN.isEmpty && candidate.last4DigitsOfSSN.isEmpty

  private def byDateOfBirth(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Boolean] =
    first.dateOfBirth === second.dateOfBirth

  private def byLastNameExact(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Boolean] =
    normalized(first.lastName) === normalized(second.lastName)

  private def byLastNameClose(first: LiftedMatchingCandidate, second: MatchingCandidate): Rep[Boolean] = {
    val distance = levenshteinDistance(normalized(first.lastName), normalized(second.lastName))
    distance > 0 && distance <= MAX_LEVENSHTEIN_DISTANCE
  }

  private def normalized(value: Rep[String]): Rep[String] =
    value.trim.toLowerCase

  private def levenshteinDistance(first: Rep[String], second: Rep[String]): Rep[Int] =
    SimpleFunction
      .ternary[String, String, Int, Int]("levenshtein_less_equal")
      .apply(first, second, MAX_LEVENSHTEIN_DISTANCE)

  final case class LiftedMatchingCandidate(
      fullSSN: Rep[Option[HashedValue]],
      last4DigitsOfSSN: Rep[Option[Last4DigitsOfSSN]],
      lastName: Rep[String],
      dateOfBirth: Rep[LocalDate])

  final case class MatchingCandidate(
      fullSSN: Option[HashedValue],
      last4DigitsOfSSN: Option[Last4DigitsOfSSN],
      lastName: String,
      dateOfBirth: LocalDate)

  implicit object MatchingCandidateShape
      extends CaseClassShape(LiftedMatchingCandidate.tupled, MatchingCandidate.tupled)

  implicit val hashedValueMapper: BaseColumnType[HashedValue] =
    MappedColumnType.base[HashedValue, String](_.value, HashedValue)

  implicit val last4DigitsOfSSNMapper: BaseColumnType[Last4DigitsOfSSN] =
    MappedColumnType.base[Last4DigitsOfSSN, String](_.value, Last4DigitsOfSSN.fromString(_).toOption.get)

  implicit val normalizedLastNameMapper: BaseColumnType[NormalizedLastName] =
    MappedColumnType.base[NormalizedLastName, String](_.value, NormalizedLastName(_))
}
