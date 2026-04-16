package phoenix.markets.fixtures

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureLifecycleStatus._
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

final case class FixtureQuery(
    sportId: Option[SportId],
    tournamentId: Option[TournamentId],
    fixtureStatus: Set[FixtureStatus])

sealed trait FixtureStatus extends EnumEntry with UpperSnakecase {
  val fixtureLifecycleStatusMappings: Set[FixtureLifecycleStatus]
}

object FixtureStatus extends Enum[FixtureStatus] {
  val values = findValues

  val UnfinishedStatuses: Set[FixtureStatus] = Set(Upcoming, InPlay)

  final case object Upcoming extends FixtureStatus {
    override val fixtureLifecycleStatusMappings = Set(PreGame)
  }
  final case object InPlay extends FixtureStatus {
    override val fixtureLifecycleStatusMappings = Set(FixtureLifecycleStatus.InPlay)
  }
  final case object Finished extends FixtureStatus {
    override val fixtureLifecycleStatusMappings = Set(PostGame, GameAbandoned)
  }
  final case object Uncertain extends FixtureStatus {
    override val fixtureLifecycleStatusMappings = Set(BreakInPlay, Postponed, Unknown)
  }
}
