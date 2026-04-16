package phoenix.punters.exclusion.infrastructure

import java.time.LocalDate
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.functor._
import enumeratum.SlickEnumSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.Clock
import phoenix.core.HashedValue
import phoenix.core.SHA256
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayerId
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.ExclusionCandidate
import phoenix.punters.exclusion.domain.ExclusionMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.CloseMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.ExactMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.NotMatched
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionStatus.Active
import phoenix.punters.exclusion.infrastructure.ExclusionPredicates._

final class SlickExcludedPlayersRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)(implicit
    ec: ExecutionContext)
    extends ExcludedPlayersRepository {
  import dbConfig._

  import ExcludedPlayerMappers._

  private val exclusionsTable = TableQuery[ExcludedPlayerTable]
  private val activeExclusions = exclusionsTable.filter(row => row.exclusionStatus === (Active: ExclusionStatus))

  override def upsert(player: ExcludedPlayer): Future[Unit] =
    db.run(exclusionsTable.insertOrUpdate(ExcludedPlayerRow.from(player, clock))).void

  override def isExcluded(candidate: ExclusionCandidate): Future[ExclusionMatch] =
    db.run(lookForExactMatch(candidate).flatMap[ExclusionMatch, NoStream, Effect.All] {
      case ExactMatch => DBIO.successful(ExactMatch)
      case _          => lookForCloseMatch(candidate)
    })

  private def lookForExactMatch(candidate: ExclusionCandidate): DBIO[ExclusionMatch] = {
    val exactMatchQuery =
      activeExclusions.filter(row => ExclusionPredicates.matchesExactly(convert(row), convert(candidate))).exists

    exactMatchQuery.result.map(exactMatchFound => if (exactMatchFound) ExactMatch else NotMatched)
  }

  private def lookForCloseMatch(candidate: ExclusionCandidate): DBIO[ExclusionMatch] = {
    val closeMatchQuery =
      activeExclusions.filter(row => ExclusionPredicates.matchesClosely(convert(row), convert(candidate))).exists

    closeMatchQuery.result.map(closeMatchFound => if (closeMatchFound) CloseMatch else NotMatched)
  }

  private def convert(candidate: ExcludedPlayerTable): LiftedMatchingCandidate =
    LiftedMatchingCandidate(
      fullSSN = candidate.hashedFullSSN,
      last4DigitsOfSSN = candidate.last4SSNDigits,
      lastName = candidate.lastName,
      dateOfBirth = candidate.dateOfBirth)

  private def convert(candidate: ExclusionCandidate): MatchingCandidate =
    MatchingCandidate(
      fullSSN = Some(Hashing.hash(candidate.ssn)),
      last4DigitsOfSSN = Some(candidate.ssn.last4Digits),
      lastName = candidate.personalDetails.lastName.value,
      dateOfBirth = candidate.personalDetails.dateOfBirth)
}

private final case class ExcludedPlayerRow(
    uniqueId: HashedValue,
    lastName: String,
    hashedFullSSN: Option[HashedValue],
    last4SSNDigits: Option[Last4DigitsOfSSN],
    dateOfBirth: LocalDate,
    exclusionStatus: ExclusionStatus,
    exclusionStatusChangeDate: LocalDate,
    updatedAt: OffsetDateTime)

private object ExcludedPlayerRow {
  def from(excludedPlayer: ExcludedPlayer, clock: Clock): ExcludedPlayerRow =
    ExcludedPlayerRow(
      uniqueId = Hashing.hash(excludedPlayer.uniqueIdentifier),
      lastName = excludedPlayer.name.normalizedLastName.value,
      hashedFullSSN = EitherT(excludedPlayer.ssn).map(Hashing.hash).collectRight,
      last4SSNDigits = EitherT(excludedPlayer.ssn).swap.collectRight,
      dateOfBirth = excludedPlayer.dateOfBirth,
      exclusionStatus = excludedPlayer.exclusion.status,
      exclusionStatusChangeDate = excludedPlayer.exclusion.changeDate,
      updatedAt = clock.currentOffsetDateTime())

  def tupled = (ExcludedPlayerRow.apply _).tupled
}

private object Hashing {
  def hash(id: ExcludedPlayerId): HashedValue = hash(id.value)
  def hash(ssn: FullOrPartialSSN): HashedValue = ssn.fold(hash, hash)
  def hash(ssn: FullSSN): HashedValue = hash(ssn.value)
  def hash(ssn: Last4DigitsOfSSN): HashedValue = hash(ssn.value)

  private def hash(value: String): HashedValue = SHA256.hash(value)
}

private class ExcludedPlayerTable(tag: Tag) extends Table[ExcludedPlayerRow](tag, "dge_exclusions") {
  import ExcludedPlayerMappers._

  def uniqueId = column[HashedValue]("unique_id", O.PrimaryKey)
  def lastName = column[String]("last_name")
  def hashedFullSSN = column[Option[HashedValue]]("hashed_ssn")
  def last4SSNDigits = column[Option[Last4DigitsOfSSN]]("last_4_ssn_digits")
  def dateOfBirth = column[LocalDate]("date_of_birth")
  def exclusionStatus = column[ExclusionStatus]("exclusion_status")
  def exclusionChangeDate = column[LocalDate]("exclusion_status_change_date")
  def updatedAt = column[OffsetDateTime]("updated_at")

  override def * : ProvenShape[ExcludedPlayerRow] =
    (uniqueId, lastName, hashedFullSSN, last4SSNDigits, dateOfBirth, exclusionStatus, exclusionChangeDate, updatedAt)
      .mapTo[ExcludedPlayerRow]
}

private object ExcludedPlayerMappers extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile

  implicit val exclusionStatusMapper: BaseColumnType[ExclusionStatus] = mappedColumnTypeForEnum(ExclusionStatus)
}
