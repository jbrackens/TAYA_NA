package phoenix.oddin.infrastructure.xml

import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.MarketStatus
import phoenix.oddin.domain.OddinCompetitorId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinSportId
import phoenix.oddin.domain.OddinTournamentId
import phoenix.oddin.domain.marketChange.OutcomeActive

object UnsafeOddinValueObjectExtensions {

  implicit class UnsafeSportIdOps(self: OddinSportId.type) {
    def fromStringUnsafe(value: String): OddinSportId =
      OddinSportId
        .fromString(value)
        .fold(
          e => throw new IllegalArgumentException(s"Invalid OddinSportId $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeSportEventIdOps(self: OddinSportEventId.type) {
    def fromStringUnsafe(value: String): OddinSportEventId =
      OddinSportEventId
        .fromString(value)
        .fold(
          e =>
            throw new IllegalArgumentException(s"Invalid OddinSportEventId $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeTournamentIdOps(self: OddinTournamentId.type) {
    def fromStringUnsafe(value: String): OddinTournamentId =
      OddinTournamentId
        .fromString(value)
        .fold(
          e =>
            throw new IllegalArgumentException(s"Invalid OddinTournamentId $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeCompetitorIdOps(self: OddinCompetitorId.type) {
    def fromStringUnsafe(value: String): OddinCompetitorId =
      OddinCompetitorId
        .fromString(value)
        .fold(
          e =>
            throw new IllegalArgumentException(s"Invalid OddinCompetitorId $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeMarketSpecifiersOps(self: MarketSpecifiers.type) {
    def fromStringUnsafe(value: String): MarketSpecifiers =
      MarketSpecifiers
        .fromString(value)
        .fold(
          e => throw new IllegalArgumentException(s"Invalid MarketSpecifiers $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeMarketStatusOps(self: MarketStatus.type) {
    def fromIntUnsafe(value: Int): MarketStatus =
      MarketStatus
        .fromInt(value)
        .fold(
          e => throw new IllegalArgumentException(s"Invalid MarketStatus $value, error: ${e.toList.mkString(",")}"),
          identity)
  }

  implicit class UnsafeOutcomeActiveOps(self: OutcomeActive.type) {
    def fromIntUnsafe(value: Int): OutcomeActive =
      OutcomeActive
        .fromInt(value)
        .fold(
          e => throw new IllegalArgumentException(s"Invalid OutcomeActive $value, error: ${e.toList.mkString(",")}"),
          identity)
  }
}
