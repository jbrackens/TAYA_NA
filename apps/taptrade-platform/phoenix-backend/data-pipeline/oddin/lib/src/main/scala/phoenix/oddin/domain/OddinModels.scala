package phoenix.oddin.domain

import java.time.OffsetDateTime

import scala.collection.immutable

import cats.syntax.validated._
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.odds.Odds
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.oddin.OddinConstants.Abandoned
import phoenix.oddin.OddinConstants.Cancelled
import phoenix.oddin.OddinConstants.Closed
import phoenix.oddin.OddinConstants.Delayed
import phoenix.oddin.OddinConstants.Ended
import phoenix.oddin.OddinConstants.Finalized
import phoenix.oddin.OddinConstants.Interrupted
import phoenix.oddin.OddinConstants.Live
import phoenix.oddin.OddinConstants.NotStarted
import phoenix.oddin.OddinConstants.Postponed
import phoenix.oddin.OddinConstants.Suspended
import phoenix.oddin.OddinConstants.Unknown
import phoenix.oddin.domain.marketChange.MarketChange
import phoenix.oddin.domain.sportEventStatusChange.SportEventStatusChange

object OddinProvider {
  val prefix = "o"
}

final case class OddinSportId private (value: String) {
  def namespacedPhoenixSportId: PhoenixTournamentId =
    PhoenixTournamentId(s"${OddinSportId.namespacedPhoenixPrefix}$value")
}
object OddinSportId {

  private val oddinPrefix = "od:sport:"
  private val namespacedPhoenixPrefix = s"s:${OddinProvider.prefix}:"

  def fromString(value: String): Validation[OddinSportId] =
    OddinIdValidator.fromString(value, oddinPrefix, OddinSportId.apply)
}

final case class OddinTournamentId private (value: String) {
  def namespacedPhoenixTournamentId: PhoenixTournamentId =
    PhoenixTournamentId(s"${OddinTournamentId.namespacedPhoenixPrefix}$value")

}
object OddinTournamentId {

  private val oddinPrefix = "od:tournament:"
  private val namespacedPhoenixPrefix = s"t:${OddinProvider.prefix}:"

  def fromString(value: String): Validation[OddinTournamentId] =
    OddinIdValidator.fromString(value, oddinPrefix, OddinTournamentId.apply)
}

final case class OddinSportEventId private (value: String) {
  def namespacedPhoenixFixtureId: PhoenixFixtureId =
    PhoenixFixtureId(s"${OddinSportEventId.namespacedPhoenixPrefix}$value")
}
object OddinSportEventId {

  private val oddinPrefix = "od:match:"
  private val namespacedPhoenixPrefix = s"f:${OddinProvider.prefix}:"

  def fromString(value: String): Validation[OddinSportEventId] =
    OddinIdValidator.fromString(value, oddinPrefix, OddinSportEventId.apply)
}

final case class OddinCompetitorId private (value: String) {
  def namespacedPhoenixFixtureId: PhoenixCompetitorId =
    PhoenixCompetitorId(s"${OddinCompetitorId.namespacedPhoenixPrefix}$value")
}
object OddinCompetitorId {

  private val oddinPrefix = "od:competitor:"
  private val namespacedPhoenixPrefix = s"c:${OddinProvider.prefix}:"

  def fromString(value: String): Validation[OddinCompetitorId] =
    OddinIdValidator.fromString(value, oddinPrefix, OddinCompetitorId.apply)
}

final case class PhoenixSportId private[domain] (value: String)
final case class PhoenixTournamentId private[domain] (value: String)
final case class PhoenixFixtureId private[domain] (value: String)
final case class PhoenixCompetitorId private[domain] (value: String)
final case class PhoenixMarketId(value: String)

final case class OddinMarketId private (value: String) {
  def namespaced =
    s"${OddinMarketId.namespacedPhoenixPrefix}$value"
}
object OddinMarketId {

  private val namespacedPhoenixPrefix = s"m:${OddinProvider.prefix}:"

  def apply(
      sportEventId: OddinSportEventId,
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers): OddinMarketId =
    new OddinMarketId(s"${sportEventId.value}:${marketDescriptionId.value}:${marketSpecifiers.orderedString}")

  def unsafe(value: String): OddinMarketId =
    new OddinMarketId(value)
}

final case class OutcomeId(value: Int)
final case class OutcomeName(value: String)
final case class MarketDescriptionId(value: Int)

final case class SportName(value: String)
final case class SportAbbreviation(value: String)
final case class Sport(id: OddinSportId, name: SportName, abbreviation: SportAbbreviation)

final case class TournamentName(value: String)
final case class TournamentStartTime(value: OffsetDateTime)
final case class Tournament(id: OddinTournamentId, name: TournamentName, startTime: TournamentStartTime)

final case class SportEventName(value: String)
final case class SportEventStartTime(value: OffsetDateTime)
sealed trait LiveOdds extends EnumEntry with UpperSnakecase
object LiveOdds extends Enum[LiveOdds] {
  override def values: immutable.IndexedSeq[LiveOdds] = findValues
  final case object Available extends LiveOdds
  final case object NotAvailable extends LiveOdds
}

final case class OddsChangeSportEvent(
    id: OddinSportEventId,
    name: SportEventName,
    startTime: SportEventStartTime,
    state: SportEventState,
    liveOdds: LiveOdds,
    sport: Sport,
    tournament: Tournament,
    competitors: List[Competitor])

final case class MatchSummarySportEvent(
    id: OddinSportEventId,
    name: SportEventName,
    startTime: SportEventStartTime,
    state: SportEventState,
    liveOdds: LiveOdds,
    sport: Sport,
    tournament: Tournament,
    competitors: List[Competitor])

final case class LiveSportEvent(
    id: OddinSportEventId,
    name: SportEventName,
    startTime: SportEventStartTime,
    sport: Sport,
    tournament: Tournament,
    competitors: List[Competitor]) {
  val state = SportEventState.Live
}

final case class PreMatchSportEvent(
    id: OddinSportEventId,
    name: SportEventName,
    startTime: SportEventStartTime,
    sport: Sport,
    tournament: Tournament,
    competitors: List[Competitor])

final case class CompetitorName(value: String)
final case class CompetitorAbbreviation(value: String)
sealed trait CompetitorSide extends EnumEntry with UpperSnakecase
object CompetitorSide extends Enum[CompetitorSide] {
  override def values: immutable.IndexedSeq[CompetitorSide] = findValues

  final case object Home extends CompetitorSide
  final case object Away extends CompetitorSide
}
final case class Competitor(
    id: OddinCompetitorId,
    name: CompetitorName,
    abbreviation: CompetitorAbbreviation,
    side: CompetitorSide)

sealed trait SportEventState extends EnumEntry with UpperSnakecase
object SportEventState extends Enum[SportEventState] {
  override def values: immutable.IndexedSeq[SportEventState] = findValues

  final case object NotStarted extends SportEventState
  final case object Started extends SportEventState
  final case object Live extends SportEventState
  final case object Suspended extends SportEventState
  final case object Ended extends SportEventState
  final case object Finalized extends SportEventState
  final case object Cancelled extends SportEventState
  final case object Delayed extends SportEventState
  final case object Interrupted extends SportEventState
  final case object Postponed extends SportEventState
  final case object Abandoned extends SportEventState
  final case object Closed extends SportEventState

  def fromString(value: String): Validation[SportEventState] =
    value match {
      case "not_started" => NotStarted.validNel
      case "started"     => Started.validNel
      case "live"        => Live.validNel
      case "suspended"   => Suspended.validNel
      case "ended"       => Ended.validNel
      case "finalized"   => Finalized.validNel
      case "cancelled"   => Cancelled.validNel
      case "delayed"     => Delayed.validNel
      case "interrupted" => Interrupted.validNel
      case "postponed"   => Postponed.validNel
      case "abandoned"   => Abandoned.validNel
      case "closed"      => Closed.validNel
      case _             => ValidationException(s"Expected a valid FixtureStatus string value but received '$value'").invalidNel
    }
}

case class FixtureStatus(label: String)

object FixtureStatus {

  private val log = LoggerFactory.getLogger(this.objectName)

  val NOT_STARTED: FixtureStatus = FixtureStatus(NotStarted)
  val LIVE: FixtureStatus = FixtureStatus(Live)
  val SUSPENDED: FixtureStatus = FixtureStatus(Suspended)
  val ENDED: FixtureStatus = FixtureStatus(Ended)
  val FINALIZED: FixtureStatus = FixtureStatus(Finalized)
  val CANCELLED: FixtureStatus = FixtureStatus(Cancelled)
  val DELAYED: FixtureStatus = FixtureStatus(Delayed)
  val INTERRUPTED: FixtureStatus = FixtureStatus(Interrupted)
  val POSTPONED: FixtureStatus = FixtureStatus(Postponed)
  val ABANDONED: FixtureStatus = FixtureStatus(Abandoned)
  val CLOSED: FixtureStatus = FixtureStatus(Closed)
  val UNKNOWN: FixtureStatus = FixtureStatus(Unknown)

  def fromString(str: String): Validation[FixtureStatus] =
    str match {
      case "0" | NotStarted  => NOT_STARTED.validNel
      case "1" | Live        => LIVE.validNel
      case "2" | Suspended   => SUSPENDED.validNel
      case "3" | Ended       => ENDED.validNel
      case "4" | Finalized   => FINALIZED.validNel
      case "5" | Cancelled   => CANCELLED.validNel
      case "6" | Delayed     => DELAYED.validNel
      case "7" | Interrupted => INTERRUPTED.validNel
      case "8" | Postponed   => POSTPONED.validNel
      case "9" | Abandoned   => ABANDONED.validNel
      case Closed            => CLOSED.validNel
      case _ =>
        log.error(s"No match for fixture status string '$str'")
        UNKNOWN.validNel
    }
}

final case class HomeScore(value: Int)
final case class AwayScore(value: Int)

final case class WinnerId(value: OddinCompetitorId)
final case class SportEventStatus(
    winnerId: Option[WinnerId],
    homeScore: HomeScore,
    awayScore: AwayScore,
    state: SportEventState,
    progress: SportEventProgress)

final case class MatchSummary(sportEvent: MatchSummarySportEvent, status: SportEventStatus)

sealed trait SportEventProgress extends EnumEntry with UpperSnakecase
object SportEventProgress extends Enum[SportEventProgress] {
  override def values: immutable.IndexedSeq[SportEventProgress] = findValues

  final case object NotStarted extends SportEventProgress
  final case object Closed extends SportEventProgress
  final case object Cancelled extends SportEventProgress
  final case object Postponed extends SportEventProgress
  final case object Delayed extends SportEventProgress
  final case object Map1 extends SportEventProgress
  final case object Map2 extends SportEventProgress
  final case object Map3 extends SportEventProgress
  final case object Map4 extends SportEventProgress
  final case object Map5 extends SportEventProgress
  final case object Map6 extends SportEventProgress
  final case object Map7 extends SportEventProgress

  def fromInt(value: Int): Validation[SportEventProgress] =
    value match {
      case 0  => NotStarted.validNel
      case 1  => Closed.validNel
      case 2  => Cancelled.validNel
      case 3  => Postponed.validNel
      case 4  => Delayed.validNel
      case 51 => Map1.validNel
      case 52 => Map2.validNel
      case 53 => Map3.validNel
      case 54 => Map4.validNel
      case 55 => Map5.validNel
      case 56 => Map6.validNel
      case 57 => Map7.validNel
      case _  => ValidationException(s"Expected a valid FixtureProgress integer value but received '$value'").invalidNel
    }
}

sealed trait MarketStatus extends EnumEntry with UpperSnakecase
object MarketStatus extends Enum[MarketStatus] {
  override def values: immutable.IndexedSeq[MarketStatus] = findValues

  case object Active extends MarketStatus
  case object Deactivated extends MarketStatus
  case object Suspended extends MarketStatus
  case object HandedOver extends MarketStatus
  case object Settled extends MarketStatus
  case object Cancelled extends MarketStatus

  def fromInt(value: Int): Validation[MarketStatus] =
    value match {
      case 1  => Active.validNel
      case 0  => Deactivated.validNel
      case -1 => Suspended.validNel
      case -2 => HandedOver.validNel
      case -3 => Settled.validNel
      case -4 => Cancelled.validNel
      case _  => ValidationException(s"Expected a valid MarketStatus integer value but received '$value'").invalidNel
    }
}

object marketDescription {

  final case class Outcome(outcomeId: OutcomeId, outcomeName: OutcomeName)

  final case class MarketDescriptionName(value: String)
  final case class MarketVariant(value: String)
  final case class MarketDescription(
      marketDescriptionId: MarketDescriptionId,
      marketDescriptionName: MarketDescriptionName,
      marketDescriptionVariant: Option[MarketVariant],
      marketDescriptionOutcomes: List[Outcome])
}

object marketChange {

  final case class OutcomeOdds(value: Odds)
  sealed trait OutcomeActive extends EnumEntry with UpperSnakecase {
    def toBoolean: Boolean
  }
  object OutcomeActive extends Enum[OutcomeActive] {
    override def values: immutable.IndexedSeq[OutcomeActive] = findValues

    case object Active extends OutcomeActive {
      override def toBoolean: Boolean = true
    }
    case object Inactive extends OutcomeActive {
      override def toBoolean: Boolean = false
    }

    def fromInt(value: Int): Validation[OutcomeActive] =
      value match {
        case 0 => Inactive.validNel
        case 1 => Active.validNel
        case _ => ValidationException(s"Expected a valid OutcomeActive Integer value but received '$value'").invalidNel
      }
  }
  final case class Outcome(id: OutcomeId, odds: Option[OutcomeOdds], active: OutcomeActive)

  final case class Market(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers,
      marketStatus: MarketStatus,
      marketOutcomes: List[Outcome])

  final case class MarketChange(sportEventId: OddinSportEventId, markets: List[Market])
}

object sportEventStatusChange {
  final case class SportEventStatusChange(
      sportEventId: OddinSportEventId,
      homeScore: HomeScore,
      awayScore: AwayScore,
      matchStatus: FixtureStatus)
}

object oddsChange {
  final case class OddsChange(sportEventStatusChange: Option[SportEventStatusChange], marketChange: MarketChange)
}

object fixtureChange {
  final case class FixtureChange(sportEventId: OddinSportEventId)
}

object tournamentChange {
  final case class TournamentChange(tournamentId: OddinTournamentId)
}

object marketCancel {
  final case class Market(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers,
      voidReason: VoidReason)
  final case class MarketCancel(sportEventId: OddinSportEventId, markets: List[Market])
}

object marketSettlement {

  sealed trait Result extends EnumEntry with UpperSnakecase
  object Result extends Enum[Result] {
    override def values: immutable.IndexedSeq[Result] = findValues

    case object Won extends Result
    case object Lost extends Result

    def fromInt(value: Int): Validation[Result] =
      value match {
        case 0 => Lost.validNel
        case 1 => Won.validNel
        case _ =>
          ValidationException(
            s"Expected a valid market settlement Result integer value but received '$value'").invalidNel
      }
  }

  final case class Outcome(outcomeId: OutcomeId, result: Result)

  final case class Market(
      marketDescriptionId: MarketDescriptionId,
      marketSpecifiers: MarketSpecifiers,
      marketStatus: MarketStatus,
      marketOutcomes: List[Outcome])

  final case class MarketSettlement(sportEventId: OddinSportEventId, markets: List[Market])
}

sealed trait VoidReason extends EnumEntry with UpperSnakecase

object VoidReason extends Enum[VoidReason] {
  override def values: immutable.IndexedSeq[VoidReason] = findValues

  case object Unknown extends VoidReason
  case object Push extends VoidReason

  def fromInt(voidReason: Int): VoidReason =
    if (voidReason == 1) Push
    else Unknown
}
