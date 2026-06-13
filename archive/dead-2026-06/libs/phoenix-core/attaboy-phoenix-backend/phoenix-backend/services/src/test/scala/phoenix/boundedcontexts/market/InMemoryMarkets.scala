package phoenix.boundedcontexts.market

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.core.ordering.Direction
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.FixtureData
import phoenix.markets._
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.SportEntity
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.{sports => internal}
import phoenix.support.DataGenerator

class InMemoryMarkets(
    var sports: List[UpdateSportRequest] = List.empty,
    var fixtures: List[UpdateFixtureRequest] = List.empty,
    var markets: List[UpdateMarketRequest] = List.empty,
    var displayableTournaments: List[TournamentId] = List.empty,
    var displayableMarkets: List[(SportId, MarketCategory, MarketVisibility)] = List.empty)
    extends MarketsBoundedContext {

  override def createOrUpdateMarket(request: CommonUpdateMarketRequest)(implicit
      ec: ExecutionContext): Future[MarketId] = {
    Future.successful {
      markets = markets :+ toUpdateMarketRequest(request)
      request.marketId
    }
  }

  override def createOrUpdateMarket(request: UpdateMarketRequest)(implicit ec: ExecutionContext): Future[MarketId] =
    Future.successful {
      markets = markets :+ request
      request.marketId
    }

  override def lastUpdateTimestamp()(implicit ec: ExecutionContext): Future[OffsetDateTime] =
    Future(DataGenerator.randomOffsetDateTime())

  private def toUpdateMarketRequest(request: CommonUpdateMarketRequest): UpdateMarketRequest = {
    UpdateMarketRequest(
      request.correlationId,
      request.receivedAtUtc,
      request.fixtureId,
      request.marketId,
      request.marketName,
      request.marketCategory,
      request.marketType,
      request.marketLifecycle,
      extractSpecifiers(request),
      request.selectionOdds)
  }

  override def updateSelectionOdds(marketId: MarketId, selectionOdds: Seq[SelectionOdds])(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] =
    EitherT.fromEither {
      findMarket(marketId).map { market =>
        val updateSelections = market.copy(selectionOdds = selectionOdds)
        markets = markets.filterNot(_ == market) :+ updateSelections
        ()
      }
    }

  override def getMarket(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, MarketAggregate] =
    EitherT.fromEither {
      val market = for {
        market <- markets.find(_.marketId == marketId)
        fixture <- fixtures.find(_.fixtureId == market.fixtureId)
        sport <- sports.find(_.sportId == fixture.sportId)
      } yield toAggregate(market, sport, fixture)

      market.toRight(MarketNotFound(marketId))
    }

  private def toAggregate(
      market: UpdateMarketRequest,
      sport: UpdateSportRequest,
      fixture: UpdateFixtureRequest): MarketAggregate =
    MarketAggregate(
      market.marketId,
      market.marketName,
      SportSummary(sport.sportId, sport.sportName),
      TournamentSummary(fixture.tournamentId, fixture.tournamentName),
      FixtureSummary(fixture.fixtureId, fixture.fixtureName, fixture.startTime, fixture.fixtureStatus),
      market.marketLifecycle,
      market.selectionOdds)

  override def getFixtures(query: FixtureQuery, startTimeOrderingDirection: Option[Direction], pagination: Pagination)(
      implicit ec: ExecutionContext): Future[PaginatedResult[FixtureNavigationData]] = {
    Future.successful(PaginatedResult(Seq.empty, 0, pagination))
  }

  override def getFixtureDetails(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility])(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, FixtureDetailData] = {
    EitherT.fromOption(
      fixtures.find(_.fixtureId == fixtureId).map { fixtureRequest =>
        val sport = findSport(fixtureRequest.sportId)
        val tournament = toTournament(fixtureRequest)
        val fixture = toFixture(fixtureRequest)
        val fixtureData = FixtureData(sport, tournament, fixture, Seq.empty)
        MarketDataConverters.toFixtureDetailData(fixtureData)
      },
      throw new NoSuchElementException(s"No fixture for [fixtureId = $fixtureId]"))
  }

  override def getFixtureIds(fixtureStatus: Set[FixtureStatus])(implicit ec: ExecutionContext): Future[Seq[FixtureId]] =
    Future.successful(
      fixtures
        .filter(fixture => fixtureStatus.exists(_.fixtureLifecycleStatusMappings.contains(fixture.fixtureStatus)))
        .map(_.fixtureId))

  private def findSport(sportId: SportId): Sport = {
    sports
      .find(_.sportId == sportId)
      .map { sport =>
        Sport(sport.sportId, sport.sportName, sport.sportAbbreviation, sport.displayToPunters.getOrElse(false))
      }
      .getOrElse(throw new NoSuchElementException(s"No sport exists for [sportId = $sportId]"))
  }

  private def toTournament(fixtureRequest: UpdateFixtureRequest): Tournament =
    Tournament(
      tournamentId = fixtureRequest.tournamentId,
      sportId = fixtureRequest.sportId,
      name = fixtureRequest.tournamentName,
      startTime = fixtureRequest.tournamentStartTime)

  private def toFixture(fixtureRequest: UpdateFixtureRequest): Fixture =
    Fixture(
      fixtureId = fixtureRequest.fixtureId,
      name = fixtureRequest.fixtureName,
      tournamentId = fixtureRequest.tournamentId,
      startTime = fixtureRequest.startTime,
      competitors = fixtureRequest.competitors.map(toCompetitor).toSeq,
      scoreHistory = Seq.empty,
      lifecycleStatus = fixtureRequest.fixtureStatus,
      statusHistory = Seq.empty,
      finishTime = None,
      createdAt = DataGenerator.randomOffsetDateTime())

  private def toCompetitor(competitor: internal.Competitor): Competitor =
    Competitor(competitorId = competitor.id, name = competitor.name, qualifier = competitor.qualifier)

  private def findFixture(id: FixtureId): Either[FixtureNotFound, UpdateFixtureRequest] =
    fixtures.find(_.fixtureId == id).toRight(FixtureNotFound(id))

  private def findMarket(id: MarketId): Either[MarketNotFound, UpdateMarketRequest] =
    markets.find(_.marketId == id).toRight(MarketNotFound(id))

  override def getTradingMarkets(pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[TradingMarketNavigationData]] =
    Future.failed(UnexpectedMarketErrorException(new IllegalArgumentException("error")))

  override def getTradingMarket(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, TradingMarketNavigationData] =
    EitherT.liftF(Future.failed(UnexpectedMarketErrorException(new IllegalArgumentException("error"))))

  override def updateMarketInfo(marketId: MarketId, request: MarketInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] =
    EitherT.liftF(Future.failed(UnexpectedMarketErrorException(new IllegalArgumentException("error"))))

  override def changeVisibility(sportId: SportId, marketCategory: MarketCategory, marketVisibility: MarketVisibility)(
      implicit ec: ExecutionContext): EitherT[Future, Nothing, Unit] = {
    val untouchedCategories = displayableMarkets.filterNot {
      case (sId, mCategory, _) =>
        sportId == sId && marketCategory == mCategory
    }
    marketVisibility match {
      case MarketVisibility.Enabled | MarketVisibility.Featured =>
        displayableMarkets = untouchedCategories :+ (sportId, marketCategory, marketVisibility)
      case MarketVisibility.Disabled =>
        displayableMarkets = untouchedCategories

    }
    EitherT.safeRightT(())
  }

  override def getMarketCategories(sportId: SportId, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[MarketCategoryVisibility]] = {

    @annotation.nowarn
    val allCategories = (for {
      market <- markets
      marketCategory <- market.marketCategory.toList
      fixture <- fixtures if market.fixtureId == fixture.fixtureId
      displayableMarket <- displayableMarkets if displayableMarket._2 == marketCategory
    } yield MarketCategoryVisibility(marketCategory, displayableMarket._3)).distinct.sortBy(_.marketCategory.value)

    Future.successful(
      PaginatedResult(
        allCategories.drop(pagination.offset).take(pagination.itemsPerPage),
        allCategories.length,
        pagination))
  }

  override def updateFixtureInfo(sportId: SportId, fixtureId: FixtureId, request: FixtureInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit] =
    EitherT.fromEither {
      findFixture(fixtureId).map { fixture =>
        val newFixture = fixture.copy(fixtureName = request.fixtureName.getOrElse(fixture.fixtureName))
        fixtures = fixtures.filterNot(_.fixtureId == fixtureId) :+ newFixture
      }
    }

  override def createOrUpdateFixture(request: UpdateFixtureRequest)(implicit
      ec: ExecutionContext): Future[FixtureResult] =
    Future.successful {
      fixtures = fixtures :+ request
      FixtureResult(request.sportId, request.tournamentId, request.fixtureId)
    }

  override def createOrUpdateSport(request: UpdateSportRequest)(implicit
      ec: ExecutionContext): Future[SportEntity.SportId] =
    Future.successful {
      sports = sports :+ request
      request.sportId
    }

  override def listAllSports()(implicit ec: ExecutionContext): Future[Seq[SportView]] =
    Future.successful {
      Seq.empty
    }

  override def settleMarket(
      marketId: MarketId,
      winningSelectionId: SelectionId,
      reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketSettlingError, Unit] =
    EitherT.fromEither {
      for {
        market <- findMarket(marketId)
        _ <-
          market.selectionOdds
            .find(_.selectionId == winningSelectionId)
            .toRight(SelectionNotFound(marketId, winningSelectionId))
      } yield {
        markets = markets.filterNot(_ == market) :+ market.copy(marketLifecycle =
            MarketLifecycle.Settled(reason, winningSelectionId))
      }
    }

  override def resettleMarket(
      marketId: MarketId,
      newWinningSelectionId: SelectionId,
      reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketResettlingError, Unit] =
    EitherT.fromEither {
      for {
        market <- findMarket(marketId)
        _ <-
          market.selectionOdds
            .find(_.selectionId == newWinningSelectionId)
            .toRight(SelectionNotFound(marketId, newWinningSelectionId))
      } yield {
        markets = markets.filterNot(_ == market) :+ market.copy(marketLifecycle =
            MarketLifecycle.Resettled(reason, newWinningSelectionId))
      }
    }

  override def cancelMarket(marketId: MarketId, reason: LifecycleCancellationReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketCancellingError, Unit] =
    EitherT.fromEither {
      findMarket(marketId).map { market =>
        markets = markets.filterNot(_ == market) :+ market.copy(marketLifecycle = MarketLifecycle.Cancelled(reason))
      }
    }

  override def freezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketFreezingError, Unit] =
    EitherT.fromEither {
      findMarket(marketId).map { market =>
        markets = markets.filterNot(_ == market) :+ market.copy(marketLifecycle = MarketLifecycle.NotBettable(reason))
      }
    }

  override def unfreezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketUnfreezingError, Unit] =
    EitherT.fromEither {
      findMarket(marketId).map { market =>
        markets = markets.filterNot(_ == market) :+ market.copy(marketLifecycle = MarketLifecycle.Bettable(reason))
      }
    }

  override def makeTournamentDisplayable(tournamentId: SportEntity.TournamentId)(implicit
      ec: ExecutionContext): Future[Unit] =
    Future.successful {
      displayableTournaments = displayableTournaments :+ tournamentId
    }

  override def makeTournamentNotDisplayable(tournamentId: TournamentId)(implicit ec: ExecutionContext): Future[Unit] =
    Future.successful {
      displayableTournaments = displayableTournaments.filterNot(_ == tournamentId)
    }

  override def getMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] = {
    EitherT.fromEither {
      findMarket(marketId).map { market =>
        val marketInfo =
          MarketInfo(
            market.marketName,
            market.fixtureId,
            market.marketType,
            market.marketCategory,
            market.marketSpecifiers)
        InitializedMarket(marketId, marketInfo, market.marketLifecycle, market.selectionOdds)
      }
    }
  }

  def getDgeAllowedMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] =
    getMarketState(marketId)

  private def extractSpecifiers(request: CommonUpdateMarketRequest): Seq[MarketSpecifier] =
    Seq(
      request.marketSpecifiers.value.map(v => MarketSpecifier("value", v.value)),
      request.marketSpecifiers.map.map(m => MarketSpecifier("map", m.value)),
      request.marketSpecifiers.unit.map(u => MarketSpecifier("unit", u.value))).flatten

  override def listTradingFixtures(
      query: FixtureQuery,
      startTimeOrderingDirection: Option[Direction],
      pagination: Pagination)(implicit ec: ExecutionContext): Future[PaginatedResult[TradingFixtureDetails]] = ???

  override def getTradingFixture(fixtureId: FixtureId)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, TradingFixtureDetails] = ???

  override def updateMatchStatus(request: UpdateMatchStatusRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, MatchStatusResult] = ???
}
