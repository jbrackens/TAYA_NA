package phoenix.oddin

import phoenix.oddin.data._

import scala.xml.{ Node, NodeSeq, XML }

object OddinXmlParsing {

  val AbbreviationKey = "abbreviation"
  val ActiveKey = "active"
  val ApiUrlKey = "api_url"
  val AwayScoreKey = "away_score"
  val ChangeTypeKey = "change_type"
  val CompetitorKey = "competitor"
  val DescriptionKey = "description"
  val EventIdKey = "event_id"
  val ExtraInfoKey = "extra_info"
  val FixtureKey = "fixture"
  val GeneratedAtKey = "generated_at"
  val HomeScoreKey = "home_score"
  val IdKey = "id"
  val InfoKey = "info"
  val KeyKey = "key"
  val LiveOddsKey = "liveodds"
  val MarketKey = "market"
  val MatchStatusKey = "match_status"
  val MatchStatusCodeKey = "match_status_code"
  val NameKey = "name"
  val NumberKey = "number"
  val OddsKey = "odds"
  val OutcomeKey = "outcome"
  val PeriodScoreKey = "period_score"
  val ProducerKey = "producer"
  val ProductKey = "product"
  val QualifierKey = "qualifier"
  val RequestIdKey = "request_id"
  val ResponseCodeKey = "response_code"
  val ScheduledKey = "scheduled"
  val ScopeKey = "scope"
  val ScoreboardAvailableKey = "scoreboard_available"
  val SpecifiersKey = "specifiers"
  val SportKey = "sport"
  val SportEventKey = "sport_event"
  val SportEventStatusKey = "sport_event_status"
  val StartDateKey = "start_date"
  val StatefulRecoveryWindowInMinutes = "stateful_recovery_window_in_minutes"
  val StatusKey = "status"
  val TimestampKey = "timestamp"
  val TournamentKey = "tournament"
  val TournamentLengthKey = "tournament_length"
  val TrueKey = "true"
  val TypeKey = "type"
  val ValueKey = "value"
  val VariantKey = "variant"

  def parseMarketDescriptions(ns: NodeSeq): MarketDescriptions = {
    val responseCode = ns \@ ResponseCodeKey
    val marketDescriptions = (ns \ MarketKey).map(parseMarketDescription)

    MarketDescriptions(responseCode, marketDescriptions)
  }

  def parseMarketDescription(n: Node): MarketDescription = {
    val id = (n \@ IdKey).toInt
    val name = n \@ NameKey
    val variant = n \@ VariantKey
    val outcomes = parseOutcomeDescriptions(n)
    val specifiers = parseSpecifiers(n)

    MarketDescription(id, name, variant, outcomes, specifiers)
  }

  def parseOutcomeDescriptions(n: Node): Seq[OutcomeDescription] =
    (n \\ OutcomeKey).map(parseOutcomeDescription)

  def parseOutcomeDescription(n: Node): OutcomeDescription = {
    val id = (n \@ IdKey).toInt
    val name = n \@ NameKey

    OutcomeDescription(id, name)
  }

  def parseSpecifiers(n: Node): Seq[Specifier] =
    (n \ SpecifiersKey).map(parseSpecifier)

  def parseSpecifier(n: Node): Specifier = {
    val name = n \@ IdKey
    val `type` = n \@ TypeKey

    Specifier(name, `type`)
  }

  def parseProducers(ns: NodeSeq): Producers = {
    val responseCode = ns \@ ResponseCodeKey
    val producers = (ns \ ProducerKey).map(parseProducer)

    Producers(responseCode, producers)
  }

  def parseProducer(n: Node): Producer = {
    val id = (n \@ IdKey).toInt
    val name = n \@ NameKey
    val description = n \@ DescriptionKey
    val apiUrl = n \@ ApiUrlKey
    val active = (n \@ ActiveKey) == TrueKey
    val scope = n \@ ScopeKey
    val statefulRecoveryWindowInMinutes = (n \@ StatefulRecoveryWindowInMinutes).toInt

    Producer(id, name, description, apiUrl, active, scope, statefulRecoveryWindowInMinutes)
  }

  def parseMatchStatusDescriptions(n: Node): MatchStatusDescriptions = {
    val responseCode = n \@ ResponseCodeKey
    val matchStatuses = (n \ MatchStatusKey).map(parseMatchStatus)

    MatchStatusDescriptions(responseCode, matchStatuses)
  }

  def parseMatchStatuses(ns: NodeSeq): Seq[MatchStatus] =
    (ns \ MatchStatusKey).map(parseMatchStatus)

  def parseMatchStatus(n: Node): MatchStatus = {
    val id = (n \@ IdKey).toInt
    val description = n \@ DescriptionKey

    MatchStatus(id, description)
  }

  def parseMarkets(ns: NodeSeq): Seq[Market] =
    (ns \ MarketKey).map(parseMarket)

  def parseMarket(n: Node): Market = {
    val id = (n \@ IdKey).toInt
    val specifiers = parseMarketSpecifiers(n \@ SpecifiersKey)
    val status = (n \@ StatusKey).toInt
    val outcomes = (n \ OutcomeKey).map(parseOutcome)

    Market(id, specifiers, status, outcomes)
  }

  def parseMarketSpecifiers(str: String): Map[String, String] =
    str
      .split("""\|""")
      .map { kv =>
        val arr = kv.split("=")
        arr(0) -> arr(1)
      }
      .toMap

  def parseOutcome(n: Node): Outcome = {
    val id = (n \@ IdKey).toInt
    val active = (n \@ ActiveKey).toInt
    val odds = n.attribute(OddsKey).map(o => o.toString())

    Outcome(id, active, odds)
  }

  def parseSports(ns: NodeSeq): Seq[Sport] =
    (ns \ SportKey).map(parseSport)

  def parseSport(node: Node): Sport = {
    val id = node \@ IdKey
    val name = node \@ NameKey
    val abbreviation = node \@ AbbreviationKey

    Sport(id, name, abbreviation)
  }

  def parseSportEvents(ns: NodeSeq): Seq[SportEvent] =
    (ns \ SportEventKey).map(parseSportEvent)

  def parseSportEvent(node: Node): SportEvent = {
    val id = node \@ IdKey
    val name = node \@ NameKey
    val scheduled = node \@ ScheduledKey
    val liveodds: Option[String] = node.attribute(LiveOddsKey).map { s => s.head.toString }
    val tournament = (node \\ TournamentKey).map(parseTournament).head
    val competitors = parseCompetitors(node \\ CompetitorKey)

    SportEvent(id, name, scheduled, liveodds, tournament, competitors)
  }

  def parseCompetitors(seq: NodeSeq): Seq[Competitor] = seq.map(parseCompetitor)

  def parseCompetitor(node: Node): Competitor = {
    val id = node \@ IdKey
    val name = node \@ NameKey
    val abbreviation = node \@ AbbreviationKey
    val qualifier: Option[String] = node.attribute(QualifierKey).map { s => s.head.toString }

    Competitor(id, name, abbreviation, qualifier)
  }

  def parseTournament(node: Node): Tournament = {
    val id = node \@ IdKey
    val name = node \@ NameKey
    val scheduled = node \@ ScheduledKey
    val tlNode = node \\ TournamentLengthKey
    val tournamentLength =
      if (tlNode.nonEmpty) Some(tlNode.map { tl =>
        val startDate = tl \@ StartDateKey
        TournamentLength(startDate)
      }.head)
      else None
    val sport = parseSport((node \ SportKey).head)
    val competitors = parseCompetitors(node \\ CompetitorKey)

    Tournament(id, name, scheduled, tournamentLength, sport, competitors)
  }

  def parseTournamentSchedule(ns: NodeSeq): TournamentSchedule = {
    val generatedAt = (ns \@ GeneratedAtKey).toLong
    val tournament = (ns \ TournamentKey).map { node => parseTournament(node) }.head
    val sportEvents = parseSportEvents(ns \\ SportEventKey)

    TournamentSchedule(generatedAt, tournament, sportEvents)
  }

  def parseFixture(seq: NodeSeq): Fixture = {
    seq.map { n =>
      val id = n \@ IdKey
      val name = n \@ NameKey
      val scheduled = n \@ ScheduledKey
      val status = n \@ StatusKey
      val tournament = (n \\ TournamentKey).map(parseTournament).head
      val competitors = parseCompetitors(n \\ CompetitorKey)
      val emptyMap: Map[String, String] = Map.empty
      val extraInfo = ((n \\ ExtraInfoKey).head \ InfoKey).foldLeft(emptyMap) { (map, node) =>
        val key = node \@ KeyKey
        val value = node \@ ValueKey
        map + (key -> value)
      }

      Fixture(id, name, scheduled, status, tournament, competitors, extraInfo)
    }.head
  }

  def parseFixtures(ns: NodeSeq): Seq[Fixture] =
    (ns \ FixtureKey).map(parseFixture)

  def parsePeriodScore(n: Node): PeriodScore = {
    val `type` = n \@ TypeKey
    val number = (n \@ NumberKey).toInt
    val matchStatusCode = (n \@ MatchStatusCodeKey).toInt
    val homeScore = (n \@ HomeScoreKey).toInt
    val awayScore = (n \@ AwayScoreKey).toInt

    PeriodScore(`type`, number, matchStatusCode, homeScore, awayScore)
  }

  def parseSportEventStatus(n: Node): SportEventStatus = {
    val homeScore = (n \@ HomeScoreKey).toInt
    val awayScore = (n \@ AwayScoreKey).toInt
    val status = (n \@ StatusKey).toInt
    val scoreboardAvailable = (n \@ ScoreboardAvailableKey) == TrueKey
    val matchStatus = (n \@ MatchStatusKey).toInt
    val periodScores = (n \\ PeriodScoreKey).map(parsePeriodScore)

    SportEventStatus(homeScore, awayScore, status, scoreboardAvailable, matchStatus, periodScores)
  }

  def parseOddsChange(correlationId: String, n: Node): OddsChange = {
    val timestamp = (n \@ TimestampKey).toLong
    val eventId = n \@ EventIdKey
    val product = (n \@ ProductKey).toInt
    val requestId = n.attribute(RequestIdKey).map(_.toString.toLong)
    val sportEventStatus = (n \ SportEventStatusKey).map(parseSportEventStatus).headOption
    val markets = (n \\ MarketKey).map(parseMarket)

    OddsChange(correlationId, timestamp, eventId, product, requestId, sportEventStatus, markets)
  }

  def parseFixtureChange(correlationId: String, n: Node): FixtureChange = {
    val timestamp = (n \@ TimestampKey).toLong
    val eventId = n \@ EventIdKey
    val product = (n \@ ProductKey).toInt
    val changeType = (n \@ ChangeTypeKey).toInt

    FixtureChange(correlationId, timestamp, eventId, product, changeType)
  }

  def parseOddsChange(correlationId: String, xmlString: String): OddsChange = {
    val xml = XML.loadString(xmlString)
    parseOddsChange(correlationId, xml)
  }

  def parseFixtureChange(correlationId: String, xmlString: String): FixtureChange = {
    val xml = XML.loadString(xmlString)
    parseFixtureChange(correlationId, xml)
  }
}
