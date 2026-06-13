package phoenix.bets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetHistory
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetSummary
import phoenix.bets.PunterBetHistoryRepository.BetsHistoryTable
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.markets.MarketsBoundedContext.MarketAggregate.CompetitorSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.MarketSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SelectionSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId

private class PunterBetHistoryRepository(dbConfig: DatabaseConfig[JdbcProfile]) {
  import dbConfig.db

  private val allBets: TableQuery[BetsHistoryTable] = TableQuery[BetsHistoryTable]

  def save(bet: BetHistory)(implicit ec: ExecutionContext): Future[Unit] =
    db.run(allBets.insertOrUpdate(bet).map(_ => ()))

  def get(id: BetId): Future[Option[BetHistory]] = {
    val findsBetById = allBets.filter(_.betId === id).take(1)
    db.run(findsBetById.result.headOption)
  }

  def find(punterId: PunterId, query: BetHistoryQuery)(implicit
      ec: ExecutionContext): Future[PaginatedResult[BetHistory]] = {

    val filteredBets = allBets
      .filter(checkPunterId(punterId))
      .filterOpt(query.placedWithin)(ensureTimeRange)
      .filter(ensureBetStatus(query.statuses))
      .filterOpt(query.outcome)((dbQuery, outcome) => ensureBetOutcome(outcome)(dbQuery))
      .sortBy(_.placedAt.desc)

    findPaginatedBets(query.pagination, filteredBets)
  }

  private def findPaginatedBets(pagination: Pagination, bets: Query[BetsHistoryTable, BetHistory, Seq])(implicit
      ec: ExecutionContext): Future[PaginatedResult[BetHistory]] = {
    val databaseQuery = for {
      records <- bets.drop(pagination.offset).take(pagination.itemsPerPage).result
      totalCount <- bets.length.result
    } yield PaginatedResult(records, totalCount, pagination)

    db.run(databaseQuery)
  }

  private def checkPunterId(punterId: PunterId): BetsHistoryTable => Rep[Boolean] =
    bet => bet.punterId === punterId

  private def ensureTimeRange(bet: BetsHistoryTable, placedWithin: TimeRange): Rep[Boolean] =
    bet.placedAt >= placedWithin.start && bet.placedAt <= placedWithin.end

  private def ensureBetStatus(statuses: Set[BetStatus]): BetsHistoryTable => Rep[Boolean] =
    bet => bet.status.inSetBind(statuses)

  private def ensureBetOutcome(outcome: BetOutcome): BetsHistoryTable => Rep[Option[Boolean]] = { bet =>
    bet.outcome === outcome
  }
}

object PunterBetHistoryRepository {
  private class BetsHistoryTable(tag: Tag) extends Table[BetHistory](tag, "punter_bets_history") {

    def punterId = column[PunterId]("punter_id")

    def betId = column[BetId]("bet_id", O.PrimaryKey)
    def stake = column[Stake]("stake")
    def odds = column[Odds]("odds")
    def placedAt = column[OffsetDateTime]("placed_at")
    def settledAt = column[Option[OffsetDateTime]]("settled_at")
    def resettledAt = column[Option[OffsetDateTime]]("resettled_at")
    def pushedAt = column[Option[OffsetDateTime]]("pushed_at")
    def voidedAt = column[Option[OffsetDateTime]]("voided_at")
    def cancelledAt = column[Option[OffsetDateTime]]("cancelled_at")
    def outcome = column[Option[BetOutcome]]("outcome")
    def status = column[BetStatus]("status")
    def sportId = column[SportId]("sport_id")
    def sportName = column[String]("sport_name")
    def tournamentId = column[TournamentId]("tournament_id")
    def tournamentName = column[String]("tournament_name")

    def fixtureId = column[String]("fixture_id")
    def fixtureName = column[String]("fixture_name")
    def fixtureStatus: Rep[FixtureLifecycleStatus] = column[FixtureLifecycleStatus]("fixture_status")
    def fixtureStartTime = column[OffsetDateTime]("fixture_start_time")

    def marketId = column[MarketId]("market_id")
    def marketName = column[String]("market_name")

    def selectionId = column[SelectionId]("selection_id")
    def selectionName = column[String]("selection_name")

    def competitorId = column[Option[CompetitorId]]("competitor_id")
    def competitorName = column[Option[String]]("competitor_name")

    type BetFields =
      (
          BetId,
          Stake,
          Odds,
          OffsetDateTime,
          Option[OffsetDateTime],
          Option[OffsetDateTime],
          Option[OffsetDateTime],
          Option[OffsetDateTime],
          Option[OffsetDateTime],
          Option[BetOutcome],
          BetStatus)
    type SportFields = (SportId, String)
    type TournamentFields = (TournamentId, String)
    type FixtureFields = (String, String, OffsetDateTime, FixtureLifecycleStatus)
    type MarketFields = (MarketId, String)
    type SelectionFields = (SelectionId, String)
    type CompetitorFields = (Option[CompetitorId], Option[String])
    type TableRow = (
        PunterId,
        BetFields,
        SportFields,
        TournamentFields,
        FixtureFields,
        MarketFields,
        SelectionFields,
        CompetitorFields)

    override def * : ProvenShape[BetHistory] = {
      val betFields =
        (betId, stake, odds, placedAt, settledAt, resettledAt, voidedAt, pushedAt, cancelledAt, outcome, status)
      val sportFields = (sportId, sportName)
      val tournamentFields = (tournamentId, tournamentName)
      val fixtureFields = (fixtureId, fixtureName, fixtureStartTime, fixtureStatus)
      val marketFields = (marketId, marketName)
      val selectionFields = (selectionId, selectionName)
      val competitorFields = (competitorId, competitorName)

      (
        punterId,
        betFields,
        sportFields,
        tournamentFields,
        fixtureFields,
        marketFields,
        selectionFields,
        competitorFields).<>(fromTableRow, toTableRow)
    }

    private def fromTableRow(row: TableRow): BetHistory =
      row match {
        case (
              punterId,
              (betId, stake, odds, placedAt, settledAt, resettledAt, voidedAt, pushedAt, cancelledAt, outcome, status),
              (sportId, sportName),
              (tournamentId, tournamentName),
              (fixtureId, fixtureName, fixtureStartTime, fixtureLifecycleStatus),
              (marketId, marketName),
              (selectionId, selectionName),
              (maybeCompetitorId, maybeCompetitorName)) =>
          val bet = BetSummary(
            betId,
            stake,
            odds,
            placedAt = placedAt,
            settledAt = settledAt,
            resettledAt = resettledAt,
            voidedAt = voidedAt,
            pushedAt = pushedAt,
            cancelledAt = cancelledAt,
            outcome = outcome,
            status = status)
          val sport = SportSummary(sportId, sportName)
          val tournament = TournamentSummary(tournamentId, tournamentName)
          val fixture =
            FixtureSummary(FixtureId.unsafeParse(fixtureId), fixtureName, fixtureStartTime, fixtureLifecycleStatus)
          val market = MarketSummary(marketId, marketName)
          val selection = SelectionSummary(selectionId, selectionName)
          val competitor = for {
            competitorId <- maybeCompetitorId
            competitorName <- maybeCompetitorName
          } yield CompetitorSummary(competitorId, competitorName)

          BetHistory(punterId, bet, sport, tournament, fixture, market, selection, competitor)
      }

    private def toTableRow(punterBet: BetHistory): Option[TableRow] = {
      val betFields = (
        punterBet.bet.id,
        punterBet.bet.stake,
        punterBet.bet.odds,
        punterBet.bet.placedAt,
        punterBet.bet.settledAt,
        punterBet.bet.resettledAt,
        punterBet.bet.voidedAt,
        punterBet.bet.pushedAt,
        punterBet.bet.cancelledAt,
        punterBet.bet.outcome,
        punterBet.bet.status)
      val sportFields = (punterBet.sport.id, punterBet.sport.name)
      val tournamentFields = (punterBet.tournament.id, punterBet.tournament.name)
      val fixtureFields =
        (punterBet.fixture.id.value, punterBet.fixture.name, punterBet.fixture.startTime, punterBet.fixture.status)
      val marketFields = (punterBet.market.id, punterBet.market.name)
      val selectionFields = (punterBet.selection.id, punterBet.selection.name)
      val competitorFields = (punterBet.competitor.map(_.id), punterBet.competitor.map(_.name))

      Some(
        (
          punterBet.punter,
          betFields,
          sportFields,
          tournamentFields,
          fixtureFields,
          marketFields,
          selectionFields,
          competitorFields))
    }
  }
}
