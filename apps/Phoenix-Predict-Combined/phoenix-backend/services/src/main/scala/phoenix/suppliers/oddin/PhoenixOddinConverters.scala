package phoenix.suppliers.oddin

import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.dataapi.internal.oddin.Competitor
import phoenix.dataapi.internal.oddin.MatchScore
import phoenix.dataapi.shared
import phoenix.markets._
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.oddin.OddinConstants
import phoenix.oddin.infrastructure.xml.SpecifiersKey.Handicap
import phoenix.oddin.infrastructure.xml.SpecifiersKey.Round
import phoenix.oddin.infrastructure.xml.SpecifiersKey.Side
import phoenix.oddin.infrastructure.xml.SpecifiersKey.Threshold
import phoenix.oddin.infrastructure.xml.SpecifiersKey.Time
import phoenix.oddin.infrastructure.xml.SpecifiersKey.TimeUnit

private[oddin] object PhoenixOddinConverters {
  import OddinConstants._

  def toMarketSpecifiers(specifiers: Map[String, String]): Seq[MarketSpecifier] =
    specifiers.map(standardiseSpecifiers).map(MarketSpecifier.tupled).toSeq

  /**
   * Standardises the specifiers across data suppliers.
   * The only values used from the FE are (map, value, unit) where unit
   * represents the unit of measure (e.g. 10 minutes, where "minutes" is the unit).
   * Oddin provides several specifiers but for displaying purposes they are all mapped to a value.
   */
  def standardiseSpecifiers(entry: (String, String)): (String, String) = {
    val (specifierKey, specifierValue) = entry
    val standardizedSpecifierKey = specifierKey match {
      case Threshold | Handicap | Side | Round | Time => "value"
      case TimeUnit                                   => "unit"
      case _                                          => specifierKey
    }
    (standardizedSpecifierKey, specifierValue)
  }

  def toSelectionOdds(selectionOdds: phoenix.dataapi.internal.oddin.SelectionOdds): SelectionOdds =
    SelectionOdds(
      selectionId = selectionOdds.selectionId,
      selectionName = selectionOdds.selectionName,
      odds = selectionOdds.odds.map(o => Odds(BigDecimal(o))),
      selectionOdds.active)

  def toSelectionOdds(selectionOdds: phoenix.dataapi.internal.phoenix.SelectionOdds): SelectionOdds =
    SelectionOdds(
      selectionId = selectionOdds.selectionId.toString,
      selectionName = selectionOdds.selectionName,
      odds = selectionOdds.odds.map(o => Odds(BigDecimal(o))),
      selectionOdds.active)

  def toFixtureStatus(eventStatus: String): FixtureLifecycleStatus =
    eventStatus.toLowerCase match {
      case NotStarted  => FixtureLifecycleStatus.PreGame
      case Live        => FixtureLifecycleStatus.InPlay
      case Suspended   => FixtureLifecycleStatus.BreakInPlay
      case Ended       => FixtureLifecycleStatus.PostGame
      case Finalized   => FixtureLifecycleStatus.PostGame
      case Cancelled   => FixtureLifecycleStatus.GameAbandoned
      case Abandoned   => FixtureLifecycleStatus.GameAbandoned
      case Delayed     => FixtureLifecycleStatus.PreGame
      case Postponed   => FixtureLifecycleStatus.Postponed
      case Interrupted => FixtureLifecycleStatus.BreakInPlay
      case Closed      => FixtureLifecycleStatus.PostGame
      case Unknown     => FixtureLifecycleStatus.Unknown
      case _           => throw new IllegalArgumentException(s"Unrecognised EventStatus $eventStatus")
    }

  def toFixtureScore(matchScore: MatchScore): FixtureScore =
    FixtureScore(home = matchScore.home, away = matchScore.away)

  def toCompetitor(competitor: Competitor): sports.Competitor =
    sports.Competitor(CompetitorId(DataProvider.Oddin, competitor.id), competitor.fullName, competitor.side)

  def toCompetitor(competitor: shared.Competitor): sports.Competitor =
    sports.Competitor(CompetitorId.unsafeParse(competitor.namespacedId), competitor.name, competitor.side.name())
}
