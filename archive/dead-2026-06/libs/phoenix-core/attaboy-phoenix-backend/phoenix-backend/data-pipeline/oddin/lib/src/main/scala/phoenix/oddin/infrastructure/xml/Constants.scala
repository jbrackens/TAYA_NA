package phoenix.oddin.infrastructure.xml

object Elements {

  val Competitor = "competitor"
  val Market = "market"
  val Outcome = "outcome"
  val Sport = "sport"
  val SportEvent = "sport_event"
  val SportEventStatus = "sport_event_status"
  val Tournament = "tournament"
}

object Attributes {

  val Abbreviation = "abbreviation"
  val Active = "active"
  val AwayScore = "away_score"
  val AwayKills = "away_kills"
  val EventId = "event_id"
  val HomeScore = "home_score"
  val HomeKills = "home_kills"
  val Id = "id"
  val LiveOdds = "liveodds"
  val MatchStatusCode = "match_status_code"
  val Name = "name"
  val Number = "number"
  val Odds = "odds"
  val Qualifier = "qualifier"
  val Result = "result"
  val Scheduled = "scheduled"
  val Specifiers = "specifiers"
  val Status = "status"
  val Type = "type"
  val Variant = "variant"
  val WinnerId = "winner_id"
}

object SpecifiersKey {
  val Threshold = "threshold"
  val Handicap = "handicap"
  val Time = "time"
  val Round = "round"
  val Side = "side"
  val Map = "map"
  val TimeUnit = "time_unit"
}
