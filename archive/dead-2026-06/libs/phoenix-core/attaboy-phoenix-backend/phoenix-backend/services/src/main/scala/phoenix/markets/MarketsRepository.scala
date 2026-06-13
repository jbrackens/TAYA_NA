package phoenix.markets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.Done
import cats.Order
import cats.data.NonEmptyList
import cats.data.OptionT
import io.circe.syntax._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.SeqUtils._
import phoenix.core.odds.Odds
import phoenix.core.ordering.Direction
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository._
import phoenix.markets.MarketsTable._
import phoenix.markets.domain.MarketType
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.fixtures.FixturesTable.fixturesQuery
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportsTable._
import phoenix.markets.tournaments.DisplayableTournamentsTable.displayableTournamentsQuery
import phoenix.markets.tournaments.TournamentsTable.tournamentsQuery
import phoenix.projections.DomainMappers._

final class MarketsRepository(
    dbConfig: DatabaseConfig[JdbcProfile],
    selectionOddsUpperBoundInclusive: Odds,
    filtersConfig: FiltersConfig) {
  import dbConfig.db

  def save(market: Market)(implicit ec: ExecutionContext): Future[Unit] = {
    db.run(marketsQuery.insertOrUpdate(market).map(_ => ()))
  }

  def updateMarketInfo(marketId: MarketId, marketInfo: MarketInfo)(implicit ec: ExecutionContext): Future[Done] = {
    val query =
      marketsQuery.filter(_.marketId === marketId).map(market => (market.name, market.fixtureId, market.specifiers))
    db.run(query.update((marketInfo.name, marketInfo.fixtureId, marketInfo.specifiers))).map(_ => Done)
  }

  def updateMarketOdds(marketId: MarketId, selectionOdds: Seq[SelectionOdds])(implicit
      ec: ExecutionContext): Future[Unit] = {
    val query = marketsQuery.filter(_.marketId === marketId).map(_.selectionOdds)
    db.run(query.update(selectionOdds)).map(_ => ())
  }

  def addLifecycleChange(marketId: MarketId, statusChange: MarketLifecycleChange)(implicit
      ec: ExecutionContext): Future[Unit] = {
    for {
      _ <- db.run(sqlu"""UPDATE "markets"
                        SET "status_history" = "status_history" || ${statusChange.asJson.noSpacesSortKeys}::jsonb
                        WHERE market_id = ${marketId.value}""".map(_ => ()))
      query = marketsQuery.filter(_.marketId === marketId).map(_.updatedAt)
      _ <- db.run(query.update(statusChange.updatedAt))
    } yield ()
  }

  def saveSport(sport: Sport)(implicit ec: ExecutionContext): Future[Done] =
    db.run(sportsQuery.insertOrUpdate(sport).map(_ => Done))

  def saveTournament(tournament: Tournament)(implicit ec: ExecutionContext): Future[Done] =
    db.run(tournamentsQuery.insertOrUpdate(tournament).map(_ => Done))

  def saveDisplayableTournament(displayableTournament: DisplayableTournament)(implicit
      ec: ExecutionContext): Future[Done] =
    db.run(displayableTournamentsQuery.insertOrUpdate(displayableTournament).map(_ => Done))

  def deleteDisplayableTournament(tournamentId: TournamentId)(implicit ec: ExecutionContext): Future[Done] =
    db.run(displayableTournamentsQuery.filter(_.tournamentId === tournamentId).delete).map(_ => Done)

  def saveFixture(fixture: Fixture)(implicit ec: ExecutionContext): Future[Done] =
    db.run(fixturesQuery.insertOrUpdate(fixture)).map(_ => Done)

  def updateFixtureInfo(fixtureId: FixtureId, name: String, startTime: OffsetDateTime, competitors: Seq[Competitor])(
      implicit ec: ExecutionContext): Future[Done] = {
    val query = fixturesQuery
      .filter(_.fixtureId === fixtureId)
      .map(fixture => (fixture.name, fixture.startTime, fixture.competitors))
    db.run(query.update((name, startTime, competitors))).map(_ => Done)
  }

  def getLastUpdateMarkets()(implicit ec: ExecutionContext): Future[Option[OffsetDateTime]] =
    db.run(marketsQuery.sortBy(_.updatedAt.desc).take(1).result.headOption).map(_.map(_.updatedAt))

  def addFixtureLifecycleStatusChange(fixtureId: FixtureId, statusChange: FixtureLifecycleStatusChange)(implicit
      ec: ExecutionContext): Future[Done] = {
    db.run(sqlu"""UPDATE "fixtures"
                   SET 
                      "status_history" = "status_history" || ${statusChange.asJson.noSpacesSortKeys}::jsonb,
                      "lifecycle_status" = ${statusChange.status.entryName}
                   WHERE fixture_id = $fixtureId""".map(_ => Done))
  }

  def addFixtureScoreChange(fixtureId: FixtureId, scoreChange: FixtureScoreChange)(implicit
      ec: ExecutionContext): Future[Done] = {
    db.run(sqlu"""UPDATE "fixtures"
                   SET "score_history" = "score_history" || ${scoreChange.asJson.noSpacesSortKeys}::jsonb
                   WHERE fixture_id = $fixtureId""".map(_ => Done))
  }

  def markFixtureFinished(fixtureId: FixtureId, finishTime: OffsetDateTime)(implicit
      ec: ExecutionContext): Future[Done] = {
    val query = fixturesQuery.filter(_.fixtureId === fixtureId).map(_.finishTime)
    db.run(query.update(Option(finishTime)).map(_ => Done))
  }

  def getMarketWithDetails(marketId: MarketId, displayableOnly: Boolean = false)(implicit
      ec: ExecutionContext): Future[Option[MarketWithDetails]] =
    findMarketWithDetails(marketId, displayableOnly)
      .map(marketDatum => marketDatum.copy(_1 = marketDatum._1.trimOdds(selectionOddsUpperBoundInclusive)))
      .map(MarketWithDetails.tupled)
      .value

  private def findMarketWithDetails(
      marketId: MarketId,
      displayableOnly: Boolean): OptionT[Future, (Market, Fixture, Tournament, Sport)] = {
    val foundMarket = marketsQuery.filter(_.marketId === marketId).take(1)
    val marketDetails = fetchMarketDetails(foundMarket, displayableOnly)
    val visibleMarkets =
      if (displayableOnly)
        marketDetails
          .join(DisplayableMarketsTable.displayableMarketsQuery)
          .on {
            case ((market, _, tournament, _), displayableMarkets) =>
              tournament.sportId === displayableMarkets.sportId &&
              market.category === displayableMarkets.marketCategory.?
          }
          .filter(_._2.visibility.inSetBind(Set(MarketVisibility.Featured, MarketVisibility.Enabled)))
          .map(_._1)
      else marketDetails

    OptionT(db.run(visibleMarkets.result.headOption))
  }

  private def fetchMarketDetails(marketQuery: Query[MarketsTable, Market, Seq], displayableOnly: Boolean) = {
    marketQuery
      .join(fixturesQuery)
      .on(_.fixtureId === _.fixtureId)
      .join(tournamentsQuery)
      .on {
        case ((_, fixture), tournament) => fixture.tournamentId === tournament.tournamentId
      }
      .filterIf(filtersConfig.tournamentsDisplayedToPuntersEnabled && displayableOnly)(
        _._2.tournamentId.in(displayableTournamentsQuery.map(_.tournamentId)))
      .join(sportsQuery)
      .on { case (((_, _), tournament), sport) => tournament.sportId === sport.sportId }
      .filterIf(displayableOnly)(_._2.displayToPunters)
      .map { case (((market, fixture), tournament), sport) => (market, fixture, tournament, sport) }
  }

  def getMarketsWithFilter(pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[MarketWithDetails]] = {

    val marketWithDetailsQuery = fetchMarketDetails(marketsQuery, displayableOnly = false).sortBy {
      case (market, _, _, _) => market.createdAt
    }

    val dbio = for {
      marketData <- marketWithDetailsQuery.drop(pagination.offset).take(pagination.itemsPerPage).result
      totalCount <- marketWithDetailsQuery.length.result
    } yield {
      val withoutOutOfBoundsSelections =
        marketData.map(marketDatum => marketDatum.copy(_1 = marketDatum._1.trimOdds(selectionOddsUpperBoundInclusive)))
      PaginatedResult(withoutOutOfBoundsSelections.map(MarketWithDetails.tupled), totalCount, pagination)
    }

    db.run(dbio)
  }

  def getFixturesWithFilter(
      query: FixtureQuery,
      marketVisibilities: Set[MarketVisibility],
      startTimeOrderingDirection: Direction,
      pagination: Pagination)(implicit ec: ExecutionContext): Future[PaginatedResult[FixtureData]] = {
    val fixturesWithFilterQuery = buildFixturesWithFilterQuery(
      query,
      startTimeOrderingDirection,
      filtersConfig.tournamentsDisplayedToPuntersEnabled)

    val fixturesWithMarkets =
      fixturesWithFilterQuery
        .joinLeft(marketsQuery)
        .on {
          case (((fixture, _), _), market) => fixture.fixtureId === market.fixtureId
        }
        .join(DisplayableMarketsTable.displayableMarketsQuery.filter(_.visibility.inSetBind(marketVisibilities)))
        .on {
          case ((((_, tournament), _), market), displayableMarkets) =>
            tournament.sportId === displayableMarkets.sportId &&
            market.flatMap(_.category) === displayableMarkets.marketCategory.?
        }
        .map(_._1)

    val dbio = for {
      fixtureData <-
        fixturesWithMarkets
          .drop(pagination.offset)
          .take(pagination.itemsPerPage)
          // looks like for some reason, the additional joining clause messes up the original ordering, so we need to orderBy again
          // ta the same time, the initial orderBy clause has to be there so that pagination works correctly
          .sortBy {
            case (((fixture, _), _), _) => fixture.startTime.withOrderingDirection(startTimeOrderingDirection)
          }
          .result
      totalCount <- fixturesWithMarkets.distinctOn(_._1._1._1.fixtureId).length.result
    } yield PaginatedResult(toFixtureData(fixtureData), totalCount, pagination)

    db.run(dbio)
  }

  private def buildFixturesWithFilterQuery(
      query: FixtureQuery,
      startTimeOrderingDirection: Direction,
      checkDisplayableTournaments: Boolean) = {
    val acceptedStatuses = (query.fixtureStatus match {
      case l if l.nonEmpty => l
      case _               => FixtureStatus.UnfinishedStatuses
    }).flatMap(_.fixtureLifecycleStatusMappings)

    fixturesQuery
      // TODO (PHXD-966): consider denormalizing the tables
      //  (storing the # of all markets in the fixture) to speed up this query
      .filter(_.lifecycleStatus.inSetBind(acceptedStatuses))
      .join(tournamentsQuery)
      .on(_.tournamentId === _.tournamentId)
      .filterOpt(query.tournamentId)(_._1.tournamentId === _)
      .filterIf(checkDisplayableTournaments)(_._2.tournamentId.in(displayableTournamentsQuery.map(_.tournamentId)))
      .join(displayedSports)
      .on { (fixtureAndTournament, sport) => fixtureAndTournament._2.sportId === sport.sportId }
      .filterOpt(query.sportId) { (fixtureAndTournamentAndSport, sportId) =>
        fixtureAndTournamentAndSport._2.sportId === sportId
      }
      .sortBy {
        case ((fixture, _), _) => fixture.startTime.withOrderingDirection(startTimeOrderingDirection)
      }
  }

  def findByFixtureId(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility])(implicit
      ec: ExecutionContext): Future[Option[FixtureData]] = {
    val fixtureWithMarketsQuery = buildFixtureByIdWithMarketsQuery(fixtureId, marketVisibilities)
    val results = db.run(fixtureWithMarketsQuery.result).map(toFixtureData)
    results.map(_.headOption)
  }

  private def buildFixtureByIdWithMarketsQuery(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility]) = {
    fixturesQuery
      .filter(_.fixtureId === fixtureId)
      .take(1)
      .join(tournamentsQuery)
      .on(_.tournamentId === _.tournamentId)
      .join(sportsQuery)
      .on { (fixtureAndTournament, sport) => fixtureAndTournament._2.sportId === sport.sportId }
      .joinLeft(marketsQuery)
      .on { (fixtureAndTournamentAndSport, market) =>
        fixtureAndTournamentAndSport._1._1.fixtureId === market.fixtureId
      }
      .joinLeft(DisplayableMarketsTable.displayableMarketsQuery)
      .on {
        case ((((_, tournament), _), market), displayableMarkets) =>
          tournament.sportId === displayableMarkets.sportId &&
          market.flatMap(_.category) === displayableMarkets.marketCategory.?
      }
      .filter(
        _._2.map(_.visibility).getOrElse(MarketVisibility.Disabled: MarketVisibility).inSetBind(marketVisibilities))
      .map(_._1)
  }

  private def toFixtureData(fixturesWithMarkets: Seq[FixtureTournamentSportMarket]): Seq[FixtureData] = {
    // Using groupByWithKeyOrderPreserved so that another `sortBy` isn't necessary.
    fixturesWithMarkets
      .groupByWithKeyOrderPreserved { case (fixtureTournamentSport, _) => fixtureTournamentSport }
      .map {
        case (fixtureTournamentSport, groupedFixturesWithMarkets) =>
          val ((fixture, tournament), sport) = fixtureTournamentSport
          val marketList = groupedFixturesWithMarkets
            .flatMap { case (_, market) => market }
            .map(_.trimOdds(selectionOddsUpperBoundInclusive))
            .sortBy(_.category.map(_.value))

          FixtureData(sport, tournament, fixture, marketList)
      }
  }

  def getFixtureIdsForFixturesWithStatus(fixtureStatus: Set[FixtureStatus]): Future[Seq[FixtureId]] = {
    val query = fixturesQuery
      .filter(_.lifecycleStatus.inSetBind(fixtureStatus.flatMap(_.fixtureLifecycleStatusMappings)))
      .map(_.fixtureId)
    db.run(query.result)
  }

  def getAllSportListings()(implicit ec: ExecutionContext): Future[Seq[SportView]] = {
    val query = buildAllSportListingsQuery()
    db.run(query.result).map(toSportViewSeq)
  }

  private def buildAllSportListingsQuery() = {
    val checkDisplayableTournaments = filtersConfig.tournamentsDisplayedToPuntersEnabled

    val displayableTournaments = tournamentsQuery.filterIf(checkDisplayableTournaments)(
      _.tournamentId.in(displayableTournamentsQuery.map(_.tournamentId)))

    val unfinishedFixtures =
      fixturesQuery.filter(
        _.lifecycleStatus.inSetBind(FixtureStatus.UnfinishedStatuses.flatMap(_.fixtureLifecycleStatusMappings)))

    sportsQuery
      .joinLeft(displayableTournaments)
      .on(_.sportId === _.sportId)
      .joinLeft(unfinishedFixtures)
      .on(_._2.map(_.tournamentId) === _.tournamentId)
      .groupBy {
        case ((sport, tournament), _) =>
          (
            sport.sportId,
            sport.name,
            sport.abbreviation,
            sport.displayToPunters,
            tournament.map(_.tournamentId),
            tournament.map(_.name))
      }
      .map {
        case ((sportId, sportName, abbreviation, displayToPunters, tournamentId, tournamentName), q) =>
          (
            sportId,
            sportName,
            abbreviation,
            displayToPunters,
            tournamentId,
            tournamentName,
            q.map { case ((_, _), maybeFixture) => maybeFixture.map(_.fixtureId) }.countDefined)
      }
  }

  private def toSportViewSeq(sportsWithTournaments: Seq[SportListingResult]): Seq[SportView] =
    sportsWithTournaments
      .groupBy { case (sportId, _, _, _, _, _, _) => sportId }
      .map {
        case (_, results) =>
          val (sportId, sportName, sportAbbreviation, displayToPunters, maybeTournamentId, _, _) = results.head
          val tournaments = maybeTournamentId
            .map(
              _ =>
                results
                  .collect {
                    case (_, _, _, _, Some(tournamentId), Some(tournamentName), fixtureCount) if fixtureCount > 0 =>
                      TournamentView(tournamentId, tournamentName, fixtureCount)
                  }
                  .sortBy(_.numberOfFixtures)
                  .reverse)
            .getOrElse(Seq.empty)
          SportView(sportId, sportName, sportAbbreviation, displayToPunters, tournaments)
      }
      .toSeq
      .sortBy(_.tournaments.size)
      .reverse

  def changeVisibility(sportId: SportId, marketCategory: MarketCategory, marketVisibility: MarketVisibility)(implicit
      ec: ExecutionContext): Future[Unit] = {
    val baseQuery = DisplayableMarketsTable.displayableMarketsQuery
    val filteredEntry = baseQuery.filter(m => m.sportId === sportId && m.marketCategory === marketCategory)
    val action = marketVisibility match {
      case MarketVisibility.Enabled | MarketVisibility.Featured =>
        for {
          existingEntry <- filteredEntry.result
          _ <-
            if (existingEntry.isEmpty)
              baseQuery += DisplayableMarket(sportId, marketCategory, marketVisibility)
            else
              filteredEntry.map(_.visibility).update(marketVisibility)
        } yield ()
      case MarketVisibility.Disabled =>
        filteredEntry.delete
    }
    db.run(action.map(_ => ()).transactionally)
  }

  def getMarketCategories(sportId: SportId, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[MarketCategoryVisibility]] = {
    val query =
      marketsQuery
        .join(fixturesQuery)
        .on(_.fixtureId === _.fixtureId)
        .join(tournamentsQuery)
        .on(_._2.tournamentId === _.tournamentId)
        .filter(_._2.sportId === sportId)
        .map { case ((market, _), _) => market.category }
        .filter(_.isDefined)
        .distinct
        .joinLeft(DisplayableMarketsTable.displayableMarketsQuery)
        .on {
          case (category, displayableMarkets) =>
            displayableMarkets.sportId === sportId &&
            category === displayableMarkets.marketCategory.?
        }
        .map {
          case (category, displayableMarkets) =>
            (category, displayableMarkets.map(_.visibility))
        }
        .sortBy(_._1)

    db.run(for {
      categories <- query.drop(pagination.offset).take(pagination.itemsPerPage).result
      totalCount <- query.length.result
    } yield {
      val result = categories.map {
        case (category, visibility) =>
          MarketCategoryVisibility(category.get, visibility.getOrElse(MarketVisibility.Disabled))
      }
      PaginatedResult(result, totalCount, pagination)
    })
  }
}

object MarketsRepository {
  type SportListingResult = (SportId, String, String, Boolean, Option[TournamentId], Option[String], Int)
  type FixtureTournamentSportDisplayableTMarket =
    ((((Fixture, Tournament), Sport), DisplayableTournament), Option[Market])
  type FixtureTournamentSportMarket = (((Fixture, Tournament), Sport), Option[Market])
  type FixtureWithMarket = ((Fixture, Sport), Option[Market])
  type MarketDetails = (Market, Sport, Fixture)

  final case class Market(
      marketId: MarketId,
      name: String,
      fixtureId: FixtureId,
      marketType: MarketType,
      category: Option[MarketCategory],
      selectionOdds: Seq[SelectionOdds],
      specifiers: Seq[MarketSpecifier],
      lifecycleChanges: NonEmptyList[MarketLifecycleChange],
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime) {

    def currentLifecycle: MarketLifecycle =
      lifecycleChanges.sortBy(_.updatedAt)(Order.fromOrdering[OffsetDateTime]).last.lifecycle

    private[MarketsRepository] def trimOdds(selectionOddsUpperBoundInclusive: Odds): Market =
      this.copy(selectionOdds = selectionOdds.filter(s =>
        s.odds.isEmpty || s.odds.get <= selectionOddsUpperBoundInclusive))
  }

  case class FixtureData(sport: Sport, tournament: Tournament, fixture: Fixture, markets: Seq[Market])
  case class MarketWithDetails(market: Market, fixture: Fixture, tournament: Tournament, sport: Sport)
  case class MarketLifecycleChange(lifecycle: MarketLifecycle, updatedAt: OffsetDateTime)
}
