package phoenix.markets.fixtures

import java.time.OffsetDateTime

import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.projections.DomainMappers._

class FixturesTable(tag: Tag) extends Table[Fixture](tag, "fixtures") {
  def fixtureId: Rep[FixtureId] = column[FixtureId]("fixture_id", O.PrimaryKey)
  def name: Rep[String] = column[String]("name")
  def tournamentId: Rep[TournamentId] = column[TournamentId]("tournament_id")
  def startTime: Rep[OffsetDateTime] = column[OffsetDateTime]("start_time")
  def competitors: Rep[Seq[Competitor]] = column[Seq[Competitor]]("competitors")
  def scoreHistory: Rep[Seq[FixtureScoreChange]] = column[Seq[FixtureScoreChange]]("score_history")
  def lifecycleStatus: Rep[FixtureLifecycleStatus] = column[FixtureLifecycleStatus]("lifecycle_status")
  def statusHistory: Rep[Seq[FixtureLifecycleStatusChange]] =
    column[Seq[FixtureLifecycleStatusChange]]("status_history")
  def finishTime: Rep[Option[OffsetDateTime]] = column[Option[OffsetDateTime]]("finish_time")
  def createdAt: Rep[OffsetDateTime] = column[OffsetDateTime]("created_at")

  override def * : ProvenShape[Fixture] =
    (
      fixtureId,
      name,
      tournamentId,
      startTime,
      competitors,
      scoreHistory,
      lifecycleStatus,
      statusHistory,
      finishTime,
      createdAt).mapTo[Fixture]
}

object FixturesTable {
  val fixturesQuery: TableQuery[FixturesTable] = TableQuery[FixturesTable]
}
