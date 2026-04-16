package phoenix.boundedcontexts.market

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.Assertions.fail

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.core.ordering.Direction
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.markets.CommonUpdateMarketRequest
import phoenix.markets.InitializedMarket
import phoenix.markets.LifecycleCancellationReason
import phoenix.markets.LifecycleChangeReason
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.LifecycleOperationalChangeReason
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.markets.SelectionOdds
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateMarketRequest
import phoenix.markets.UpdateMatchStatusRequest
import phoenix.markets.UpdateSportRequest
import phoenix.markets.domain.MarketType
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.oddin.OddinConstants

object MarketBoundedContextMock {
  def apply(
      createOrUpdateMarketFn: UpdateMarketRequest => Future[MarketId] = _ => fail(),
      createOrUpdateCommonMarketFn: CommonUpdateMarketRequest => Future[MarketId] = _ => fail(),
      updateSelectionOddsFn: (MarketId, Seq[SelectionOdds]) => Future[Either[MarketNotFound, Unit]] = (_, _) => fail(),
      getMarketFn: MarketId => Future[Either[MarketNotFound, MarketAggregate]] = _ => fail(),
      getFixtureDetailsFn: FixtureId => Future[Either[FixtureNotFound, FixtureDetailData]] = _ => fail(),
      getFixtureIdsFn: Set[FixtureStatus] => Future[Seq[FixtureId]] = _ => fail(),
      getTradingMarketsFn: Pagination => Future[PaginatedResult[TradingMarketNavigationData]] = _ => fail(),
      getTradingMarketFn: MarketId => Future[Either[MarketNotFound, TradingMarketNavigationData]] = _ => fail(),
      updateMarketInfoFn: (MarketId, MarketInfoUpdateRequest) => Future[Either[MarketNotFound, Unit]] =
        (_, _) => fail(),
      changeVisibilityFn: (SportId, MarketCategory, MarketVisibility) => Future[Either[Nothing, Unit]] = (_, _, _) =>
        fail(),
      getMarketCategoriesFn: (SportId, Pagination) => Future[PaginatedResult[MarketCategoryVisibility]] = (_, _) =>
        fail(),
      listAllSportsFn: () => Future[Seq[SportView]] = () => fail(),
      settleMarketFn: (MarketId, SelectionId, LifecycleChangeReason) => Future[Either[MarketSettlingError, Unit]] =
        (_, _, _) => fail(),
      resettleMarketFn: (MarketId, SelectionId, LifecycleChangeReason) => Future[Either[MarketResettlingError, Unit]] =
        (_, _, _) => fail(),
      cancelMarketFn: (MarketId, LifecycleChangeReason) => Future[Either[MarketCancellingError, Unit]] = (_, _) =>
        fail(),
      freezeMarketFn: (MarketId, LifecycleChangeReason) => Future[Either[MarketFreezingError, Unit]] = (_, _) => fail(),
      unfreezeMarketFn: (MarketId, LifecycleChangeReason) => Future[Either[MarketUnfreezingError, Unit]] = (_, _) =>
        fail(),
      getFixturesFn: (FixtureQuery, Option[Direction], Pagination) => Future[PaginatedResult[FixtureNavigationData]] =
        (_, _, _) => fail(),
      getMarketStateFn: MarketId => Future[Either[MarketNotFound, InitializedMarket]] = _ => fail(),
      getDgeAllowedMarketStateFn: MarketId => Future[Either[MarketNotFound, InitializedMarket]] = _ => fail(),
      listTradingFixturesFn: (
          FixtureQuery,
          Option[Direction],
          Pagination) => Future[PaginatedResult[TradingFixtureDetails]] = (_, _, _) => fail(),
      getTradingFixtureFn: FixtureId => Future[Either[FixtureNotFound, TradingFixtureDetails]] = _ => fail(),
      updateFixtureInfoFn: (SportId, FixtureId, FixtureInfoUpdateRequest) => Future[Either[FixtureNotFound, Unit]] =
        (_, _, _) => fail(),
      tournamentDisplayFn: TournamentId => Future[Unit] = _ => fail(),
      tournamentNotDisplayFn: TournamentId => Future[Unit] = _ => fail()): MarketsBoundedContext =
    new MarketsBoundedContext {
      override def createOrUpdateMarket(request: UpdateMarketRequest)(implicit ec: ExecutionContext): Future[MarketId] =
        createOrUpdateMarketFn(request)

      override def createOrUpdateMarket(request: CommonUpdateMarketRequest)(implicit
          ec: ExecutionContext): Future[MarketId] =
        createOrUpdateCommonMarketFn(request)

      override def lastUpdateTimestamp()(implicit ec: ExecutionContext): Future[OffsetDateTime] =
        Future(OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))

      override def updateSelectionOdds(marketId: MarketId, selectionOdds: Seq[SelectionOdds])(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] =
        EitherT(updateSelectionOddsFn(marketId, selectionOdds))

      override def getMarket(marketId: MarketId)(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, MarketAggregate] =
        EitherT(getMarketFn(marketId))

      override def getFixtures(
          query: FixtureQuery,
          startTimeOrderingDirection: Option[Direction],
          pagination: Pagination)(implicit ec: ExecutionContext): Future[PaginatedResult[FixtureNavigationData]] =
        getFixturesFn(query, startTimeOrderingDirection, pagination)

      override def getFixtureDetails(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility])(implicit
          ec: ExecutionContext): EitherT[Future, FixtureNotFound, FixtureDetailData] =
        EitherT(getFixtureDetailsFn(fixtureId))

      override def getFixtureIds(fixtureStatus: Set[FixtureStatus])(implicit
          ec: ExecutionContext): Future[Seq[FixtureId]] =
        getFixtureIdsFn(fixtureStatus)

      override def getTradingMarkets(pagination: Pagination)(implicit
          ec: ExecutionContext): Future[PaginatedResult[TradingMarketNavigationData]] =
        getTradingMarketsFn(pagination)

      override def getTradingMarket(marketId: MarketId)(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, TradingMarketNavigationData] =
        EitherT(getTradingMarketFn(marketId))

      override def updateMarketInfo(marketId: MarketId, request: MarketInfoUpdateRequest)(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] =
        EitherT(updateMarketInfoFn(marketId, request))

      override def changeVisibility(
          sportId: SportId,
          marketCategory: MarketCategory,
          marketVisibility: MarketVisibility)(implicit ec: ExecutionContext): EitherT[Future, Nothing, Unit] =
        EitherT(changeVisibilityFn(sportId, marketCategory, marketVisibility))

      override def getMarketCategories(sportId: SportId, pagination: Pagination)(implicit
          ec: ExecutionContext): Future[PaginatedResult[MarketCategoryVisibility]] =
        getMarketCategoriesFn(sportId, pagination)

      override def updateFixtureInfo(sportId: SportId, fixtureId: FixtureId, request: FixtureInfoUpdateRequest)(implicit
          ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit] =
        EitherT(updateFixtureInfoFn(sportId, fixtureId, request))

      override def createOrUpdateFixture(request: UpdateFixtureRequest)(implicit
          ec: ExecutionContext): Future[FixtureResult] =
        Future.failed(UnexpectedMarketErrorException(new IllegalArgumentException("error")))

      override def createOrUpdateSport(request: UpdateSportRequest)(implicit
          ec: ExecutionContext): Future[SportEntity.SportId] =
        Future.failed(UnexpectedMarketErrorException(new IllegalArgumentException("error")))

      override def listAllSports()(implicit ec: ExecutionContext): Future[Seq[SportView]] =
        listAllSportsFn()

      override def settleMarket(
          marketId: MarketId,
          winningSelectionId: SelectionId,
          reason: LifecycleOperationalChangeReason)(implicit
          ec: ExecutionContext): EitherT[Future, MarketSettlingError, Unit] =
        EitherT(settleMarketFn(marketId, winningSelectionId, reason))

      override def resettleMarket(
          marketId: MarketId,
          newWinningSelectionId: SelectionId,
          reason: LifecycleOperationalChangeReason)(implicit
          ec: ExecutionContext): EitherT[Future, MarketResettlingError, Unit] =
        EitherT(resettleMarketFn(marketId, newWinningSelectionId, reason))

      override def cancelMarket(marketId: MarketId, reason: LifecycleCancellationReason)(implicit
          ec: ExecutionContext): EitherT[Future, MarketCancellingError, Unit] =
        EitherT(cancelMarketFn(marketId, reason))

      override def freezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
          ec: ExecutionContext): EitherT[Future, MarketFreezingError, Unit] =
        EitherT(freezeMarketFn(marketId, reason))

      override def unfreezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
          ec: ExecutionContext): EitherT[Future, MarketUnfreezingError, Unit] =
        EitherT(unfreezeMarketFn(marketId, reason))

      override def makeTournamentDisplayable(tournamentId: TournamentId)(implicit ec: ExecutionContext): Future[Unit] =
        tournamentDisplayFn(tournamentId)

      override def makeTournamentNotDisplayable(tournamentId: TournamentId)(implicit
          ec: ExecutionContext): Future[Unit] =
        tournamentNotDisplayFn(tournamentId)

      override def getMarketState(marketId: MarketId)(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] =
        EitherT(getMarketStateFn(marketId))

      override def getDgeAllowedMarketState(marketId: MarketId)(implicit
          ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] =
        EitherT(getDgeAllowedMarketStateFn(marketId))

      override def listTradingFixtures(
          query: FixtureQuery,
          startTimeOrderingDirection: Option[Direction],
          pagination: Pagination)(implicit ec: ExecutionContext): Future[PaginatedResult[TradingFixtureDetails]] =
        listTradingFixturesFn(query, startTimeOrderingDirection, pagination)

      override def getTradingFixture(fixtureId: FixtureId)(implicit
          ec: ExecutionContext): EitherT[Future, FixtureNotFound, TradingFixtureDetails] =
        EitherT(getTradingFixtureFn(fixtureId))

      override def updateMatchStatus(request: UpdateMatchStatusRequest)(implicit
          ec: ExecutionContext): EitherT[Future, FixtureNotFound, MatchStatusResult] = ???
    }

  def returningMarketState(marketState: InitializedMarket): MarketsBoundedContext =
    apply(getMarketStateFn = _ => Future.successful(Right(marketState)))

  def returningDgeAllowedMarketState(marketState: InitializedMarket): MarketsBoundedContext =
    apply(getDgeAllowedMarketStateFn = _ => Future.successful(Right(marketState)))

  def returningMarket(marketAggregate: MarketAggregate): MarketsBoundedContext =
    apply(getMarketFn = _ => Future.successful(Right(marketAggregate)))

  val returningMarketNotFound: MarketsBoundedContext =
    apply(getMarketFn = marketId => Future.successful(Left(MarketNotFound(marketId))))

  val returningMarketStateNotFound: MarketsBoundedContext =
    apply(getMarketStateFn = marketId => Future.successful(Left(MarketNotFound(marketId))))

  def returningAllMarkets(implicit clock: Clock): MarketsBoundedContext =
    apply(
      getMarketFn = _ =>
        Future.successful(
          Right(MarketAggregate(
            id = MarketId(DataProvider.Oddin, "market123"),
            name = "someMarketName",
            sport = SportSummary(SportId(DataProvider.Oddin, "sport123"), "sport"),
            tournament = TournamentSummary(TournamentId(DataProvider.Oddin, "tournament123"), "someTournamentName"),
            fixture = FixtureSummary(
              FixtureId(DataProvider.Oddin, "fixture123"),
              "fixture",
              clock.currentOffsetDateTime(),
              FixtureLifecycleStatus.InPlay),
            currentLifecycle = Bettable(DataSupplierStatusChange),
            selections = Seq.empty))),
      getFixtureDetailsFn = _ => Future.successful(Right(FixtureDetailResponse.response)),
      createOrUpdateMarketFn = market => Future.successful(market.marketId),
      getTradingMarketsFn = pagination => Future.successful(TradingMarketsResponse.response(pagination)),
      getTradingMarketFn = _ => Future.successful(Right(TradingMarketResponse.response)),
      updateMarketInfoFn = (_, _) => Future.successful(Right(())),
      listAllSportsFn = () => Future.successful(Seq.empty),
      settleMarketFn = (_, _, _) => Future.successful(Right(())),
      resettleMarketFn = (_, _, _) => Future.successful(Right(())),
      cancelMarketFn = (_, _) => Future.successful(Right(())),
      freezeMarketFn = (_, _) => Future.successful(Right(())),
      unfreezeMarketFn = (_, _) => Future.successful(Right(())),
      getFixturesFn = (_, _, pagination) => Future.successful(FixtureNavigationDataResponse.response(pagination)))

  val returningAllMarketsException: MarketsBoundedContext = apply(
    getMarketFn = id => Future.successful(Left(MarketNotFound(id))),
    getMarketStateFn = id => Future.successful(Left(MarketNotFound(id))),
    getDgeAllowedMarketStateFn = id => Future.successful(Left(MarketNotFound(id))),
    getTradingMarketFn = id => Future.successful(Left(MarketNotFound(id))),
    getFixtureDetailsFn = fixtureId => Future.successful(Left(FixtureNotFound(fixtureId))),
    getFixturesFn =
      (_, _, _) => Future.failed(UnexpectedMarketErrorException(new RuntimeException("database exception"))))

  object FixtureNavigationDataResponse {

    private val fixtureNavigationData = FixtureNavigationData(
      fixtureId = FixtureId(DataProvider.Oddin, "fixtureId"),
      fixtureName = "Fixture Name",
      startTime = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
      isLive = false,
      sport = Sport(
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "League of Legends",
        abbreviation = "LoL",
        displayToPunters = true),
      tournament = Tournament(
        tournamentId = TournamentId(DataProvider.Oddin, "tournament123"),
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "Tournament McTournamentyFace",
        startTime = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)),
      status = FixtureLifecycleStatus.PreGame,
      markets = List(
        MarketStateUpdate(
          marketId = MarketId(DataProvider.Oddin, "marketId1"),
          marketName = "market name",
          marketType = MarketType.BeyondGodlike,
          marketCategory = MarketCategory(MarketType.BeyondGodlike.entryName),
          marketStatus = MarketLifecycle.NotBettable(BackofficeChange()),
          specifiers = Map("specifier_key" -> "specifier_value"),
          selectionOdds = List(
            SelectionOdds(
              selectionId = "od:selection:1",
              selectionName = "first team wins",
              Some(Odds(21.37)),
              active = true)))),
      marketsTotalCount = 1,
      competitors = Map(
        "competitor_key" -> CompetitorWithScore(
          competitorId = CompetitorId(DataProvider.Oddin, "competitorId"),
          name = "competitor name",
          qualifier = "competitor qualifier",
          score = 10)))

    def response(pagination: Pagination): PaginatedResult[FixtureNavigationData] =
      PaginatedResult(List(fixtureNavigationData), 1, pagination)

    def responseJson(pagination: Pagination): String =
      s"""
         |{
         |  "currentPage": ${pagination.currentPage},
         |  "itemsPerPage": ${pagination.itemsPerPage},
         |  "totalCount": 1,
         |  "hasNextPage": false,
         |  "data": [
         |    {
         |      "fixtureId": "f:o:fixtureId",
         |      "fixtureName": "Fixture Name",
         |      "startTime": "2020-01-01T00:00:00Z",
         |      "isLive": false,
         |      "sport": {
         |        "sportId": "s:p:1",
         |        "name": "League of Legends",
         |        "abbreviation": "LoL",
         |        "displayToPunters": true
         |      },
         |      "tournament": {
         |        "tournamentId": "t:o:tournament123",
         |        "sportId": "s:p:1",
         |        "name": "Tournament McTournamentyFace",
         |        "startTime": "2020-01-01T00:00:00Z"
         |      },
         |      "status": "PRE_GAME",
         |      "markets": [
         |        {
         |          "marketId": "m:o:marketId1",
         |          "marketName": "market name",
         |          "marketType": "BEYOND_GODLIKE",
         |          "marketCategory": "BEYOND_GODLIKE",
         |          "marketStatus": {
         |            "changeReason": {
         |              "reason": "Requested by backoffice",
         |              "type": "BACKOFFICE_CHANGE"
         |            },
         |            "type": "NOT_BETTABLE"
         |          },
         |          "specifiers": {
         |            "specifier_key": "specifier_value"
         |          },
         |          "selectionOdds": [
         |            {
         |              "active": true,
         |              "displayOdds": {
         |                "decimal": 21.37,
         |                "american": "+2000",
         |                "fractional": "20/1"
         |              },
         |              "selectionId": "od:selection:1",
         |              "selectionName": "first team wins"
         |            }
         |          ]
         |        }
         |      ],
         |      "marketsTotalCount": 1,
         |      "competitors": {
         |        "competitor_key": {
         |          "competitorId": "c:o:competitorId",
         |          "name": "competitor name",
         |          "qualifier": "competitor qualifier",
         |          "score": 10
         |        }
         |      }
         |    }
         |  ]
         |}
         |""".stripMargin
  }

  object FixtureDetailResponse {

    val marketStateUpdate = MarketStateUpdate(
      marketId = MarketId(DataProvider.Oddin, "marketId1"),
      marketName = "market name",
      marketType = MarketType.BeyondGodlike,
      marketCategory = MarketCategory(MarketType.BeyondGodlike.entryName),
      marketStatus = MarketLifecycle.NotBettable(BackofficeChange()),
      specifiers = Map("specifier_key" -> "specifier_value"),
      selectionOdds = List(
        SelectionOdds(
          selectionId = "od:selection:1",
          selectionName = "first team wins",
          Some(Odds(21.37)),
          active = true)))
    val response: FixtureDetailData = FixtureDetailData(
      fixtureId = FixtureId(DataProvider.Oddin, "fixture123"),
      fixtureName = "Fixture Name",
      startTime = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
      isLive = false,
      sport = Sport(
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "League of Legends",
        abbreviation = "LoL",
        displayToPunters = true),
      tournament = Tournament(
        tournamentId = TournamentId(DataProvider.Oddin, "tournament123"),
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "Tournament McTournamentyFace",
        startTime = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)),
      status = FixtureLifecycleStatus.PreGame,
      score = FixtureScore(home = 0, away = 0),
      markets = Map(MarketType.BeyondGodlike -> List(marketStateUpdate)),
      marketsList = Set(marketStateUpdate),
      marketsTotalCount = 0,
      competitors = Map(
        "competitor_key" -> CompetitorWithScore(
          competitorId = CompetitorId(DataProvider.Oddin, "competitorId"),
          name = "competitor name",
          qualifier = "competitor qualifier",
          score = 10)))

    val responseJson: String =
      """
        |{
        |  "fixtureId": "f:o:fixture123",
        |  "fixtureName": "Fixture Name",
        |  "startTime": "2020-01-01T00:00:00Z",
        |  "isLive": false,
        |  "sport": {
        |    "sportId": "s:p:1",
        |    "name": "League of Legends",
        |    "abbreviation": "LoL",
        |    "displayToPunters": true
        |  },
        |  "tournament": {
        |    "tournamentId": "t:o:tournament123",
        |    "sportId": "s:p:1",
        |    "name": "Tournament McTournamentyFace",
        |    "startTime": "2020-01-01T00:00:00Z"
        |  },
        |  "status": "PRE_GAME",
        |  "score": {
        |    "home": 0,
        |    "away": 0
        |  },
        |  "markets": {
        |    "BEYOND_GODLIKE": [
        |      {
        |        "marketId": "m:o:marketId1",
        |        "marketName": "market name",
        |        "marketType": "BEYOND_GODLIKE",
        |        "marketCategory": "BEYOND_GODLIKE",
        |        "marketStatus": {
        |          "changeReason": {
        |            "reason": "Requested by backoffice",
        |            "type": "BACKOFFICE_CHANGE"
        |          },
        |          "type": "NOT_BETTABLE"
        |        },
        |        "specifiers": {
        |          "specifier_key": "specifier_value"
        |        },
        |        "selectionOdds": [
        |          {
        |            "active": true,
        |            "displayOdds": {
        |              "decimal": 21.37,
        |              "american": "+2000",
        |              "fractional": "20/1"
        |            },
        |            "selectionId": "od:selection:1",
        |            "selectionName": "first team wins"
        |          }
        |        ]
        |      }
        |    ]
        |  },
        |  "marketsList": [
        |   {
        |      "marketId": "m:o:marketId1",
        |      "marketName": "market name",
        |      "marketType": "BEYOND_GODLIKE",
        |      "marketCategory": "BEYOND_GODLIKE",
        |      "marketStatus": {
        |        "changeReason": {
        |          "reason": "Requested by backoffice",
        |          "type": "BACKOFFICE_CHANGE"
        |        },
        |        "type": "NOT_BETTABLE"
        |      },
        |      "specifiers": {
        |        "specifier_key": "specifier_value"
        |      },
        |      "selectionOdds": [
        |        {
        |          "active": true,
        |          "displayOdds": {
        |            "decimal": 21.37,
        |            "american": "+2000",
        |            "fractional": "20/1"
        |          },
        |          "selectionId": "od:selection:1",
        |          "selectionName": "first team wins"
        |        }
        |      ]
        |    }
        |  ],
        |  "marketsTotalCount": 0,
        |  "competitors": {
        |    "competitor_key": {
        |      "competitorId": "c:o:competitorId",
        |      "name": "competitor name",
        |      "qualifier": "competitor qualifier",
        |      "score": 10
        |    }
        |  }
        |}
        |""".stripMargin
  }

  object TradingFixtureResponse {
    val response: TradingFixtureDetails = TradingFixtureDetails(
      fixtureId = FixtureId(DataProvider.Oddin, "1"),
      fixtureName = "example fixture",
      startTime = OffsetDateTime.of(2030, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
      isLive = false,
      sport = Sport(
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "League of Legends",
        abbreviation = "LoL",
        displayToPunters = true),
      score = FixtureScore(home = 0, away = 0),
      status = FixtureLifecycleStatus.PreGame,
      scoreHistory = Seq.empty,
      statusHistory = Seq(
        FixtureLifecycleStatusChange(
          FixtureLifecycleStatus.PreGame,
          OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))),
      marketsTotalCount = 1,
      markets = List(
        TradingMarketData(
          marketId = MarketId(DataProvider.Oddin, "od:market:1"),
          marketName = "aMarket",
          marketType = MarketType.BeyondGodlike,
          marketCategory = MarketType.BeyondGodlike.entryName,
          selectionOdds = Seq(
            SelectionOdds(
              selectionId = "od:selection:1",
              selectionName = "first team wins",
              Some(Odds(21.37)),
              active = true),
            SelectionOdds(
              selectionId = "od:selection:2",
              selectionName = "second team wins",
              Some(Odds(73.12)),
              active = true)),
          currentLifecycle = MarketLifecycle.NotBettable(BackofficeChange()),
          lifecycleChanges = Seq(
            MarketLifecycleChange(
              MarketLifecycle.NotBettable(BackofficeChange()),
              OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))))),
      competitors = Seq(
        Competitor(
          competitorId = CompetitorId(DataProvider.Oddin, "od:competitor:1"),
          name = "first team",
          qualifier = OddinConstants.Unknown),
        Competitor(
          competitorId = CompetitorId(DataProvider.Oddin, "od:competitor:2"),
          name = "second team",
          qualifier = OddinConstants.Unknown)))

    val responseJson: String =
      """
        |{
        |  "competitors": [
        |    {
        |      "competitorId": "c:o:od:competitor:1",
        |      "name": "first team",
        |      "qualifier": "unknown"
        |    },
        |    {
        |      "competitorId": "c:o:od:competitor:2",
        |      "name": "second team",
        |      "qualifier": "unknown"
        |    }
        |  ],
        |  "fixtureId": "f:o:1",
        |  "fixtureName": "example fixture",
        |  "isLive": false,
        |  "marketsTotalCount": 1,
        |  "markets": [{
        |    "currentLifecycle": {
        |      "changeReason": {
        |        "reason": "Requested by backoffice",
        |        "type": "BACKOFFICE_CHANGE"
        |      },
        |      "type": "NOT_BETTABLE"
        |    },
        |    "lifecycleChanges": [
        |      {
        |        "lifecycle": {
        |          "changeReason": {
        |            "reason": "Requested by backoffice",
        |            "type": "BACKOFFICE_CHANGE"
        |          },
        |          "type": "NOT_BETTABLE"
        |        },
        |        "updatedAt": "2020-01-01T00:00:00Z"
        |      }
        |    ],
        |    "marketId": "m:o:od:market:1",
        |    "marketName": "aMarket",
        |    "marketType": "BEYOND_GODLIKE",
        |    "marketCategory": "BEYOND_GODLIKE",
        |    "selectionOdds": [
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 21.37,
        |          "american": "+2000",
        |          "fractional": "20/1"
        |        },
        |        "selectionId": "od:selection:1",
        |        "selectionName": "first team wins"
        |      },
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 73.12,
        |          "american": "+7000",
        |          "fractional": "70/1"
        |        },
        |        "selectionId": "od:selection:2",
        |        "selectionName": "second team wins"
        |      }
        |    ]
        |  }],
        |  "score": {
        |    "away": 0,
        |    "home": 0
        |  },
        |  "scoreHistory": [],
        |  "sport": {
        |    "abbreviation": "LoL",
        |    "name": "League of Legends",
        |    "sportId": "s:p:1",
        |    "displayToPunters": true
        |  },
        |  "startTime": "2030-01-01T00:00:00Z",
        |  "status": "PRE_GAME",
        |  "statusHistory": [
        |    {
        |      "status": "PRE_GAME",
        |      "updatedAt": "2020-01-01T00:00:00Z"
        |    }
        |  ]
        |}
        |""".stripMargin

    val responseListJson: String =
      """
        |{"currentPage":1,"data":[{
        |  "competitors": [
        |    {
        |      "competitorId": "c:o:od:competitor:1",
        |      "name": "first team",
        |      "qualifier": "unknown"
        |    },
        |    {
        |      "competitorId": "c:o:od:competitor:2",
        |      "name": "second team",
        |      "qualifier": "unknown"
        |    }
        |  ],
        |  "fixtureId": "f:o:1",
        |  "fixtureName": "example fixture",
        |  "isLive": false,
        |  "marketsTotalCount": 1,
        |  "markets": [{
        |    "currentLifecycle": {
        |      "changeReason": {
        |        "reason": "Requested by backoffice",
        |        "type": "BACKOFFICE_CHANGE"
        |      },
        |      "type": "NOT_BETTABLE"
        |    },
        |    "lifecycleChanges": [
        |      {
        |        "lifecycle": {
        |          "changeReason": {
        |            "reason": "Requested by backoffice",
        |            "type": "BACKOFFICE_CHANGE"
        |          },
        |          "type": "NOT_BETTABLE"
        |        },
        |        "updatedAt": "2020-01-01T00:00:00Z"
        |      }
        |    ],
        |    "marketId": "m:o:od:market:1",
        |    "marketName": "aMarket",
        |    "marketType": "BEYOND_GODLIKE",
        |    "marketCategory": "BEYOND_GODLIKE",
        |    "selectionOdds": [
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 21.37,
        |          "american": "+2000",
        |          "fractional": "20/1"
        |        },
        |        "selectionId": "od:selection:1",
        |        "selectionName": "first team wins"
        |      },
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 73.12,
        |          "american": "+7000",
        |          "fractional": "70/1"
        |        },
        |        "selectionId": "od:selection:2",
        |        "selectionName": "second team wins"
        |      }
        |    ]
        |  }],
        |  "score": {
        |    "away": 0,
        |    "home": 0
        |  },
        |  "scoreHistory": [],
        |  "sport": {
        |    "abbreviation": "LoL",
        |    "name": "League of Legends",
        |    "sportId": "s:p:1",
        |    "displayToPunters": true
        |  },
        |  "startTime": "2030-01-01T00:00:00Z",
        |  "status": "PRE_GAME",
        |  "statusHistory": [
        |    {
        |      "status": "PRE_GAME",
        |      "updatedAt": "2020-01-01T00:00:00Z"
        |    }
        |  ]
        |}],"hasNextPage":false,"itemsPerPage":10,"totalCount":1}
        |""".stripMargin
  }

  object TradingMarketsResponse {
    def response(pagination: Pagination): PaginatedResult[TradingMarketNavigationData] =
      PaginatedResult(Seq(TradingMarketResponse.response), 1, pagination)

    def responseJson(pagination: Pagination): String =
      s"""
        |{
        |  "currentPage": ${pagination.currentPage},
        |  "itemsPerPage": ${pagination.itemsPerPage},
        |  "totalCount": 1,
        |  "hasNextPage": false,
        |  "data": [
        |    {
        |      "competitors": [
        |        {
        |          "competitorId": "c:o:od:competitor:1",
        |          "name": "first team",
        |          "qualifier": "unknown"
        |        },
        |        {
        |          "competitorId": "c:o:od:competitor:2",
        |          "name": "second team",
        |          "qualifier": "unknown"
        |        }
        |      ],
        |      "fixtureId": "f:o:1",
        |      "fixtureName": "example fixture",
        |      "isLive": false,
        |      "market": {
        |        "currentLifecycle": {
        |          "changeReason": {
        |            "reason": "Requested by backoffice",
        |            "type": "BACKOFFICE_CHANGE"
        |          },
        |          "type": "NOT_BETTABLE"
        |        },
        |        "lifecycleChanges": [
        |          {
        |            "lifecycle": {
        |              "changeReason": {
        |                "reason": "Requested by backoffice",
        |                "type": "BACKOFFICE_CHANGE"
        |              },
        |              "type": "NOT_BETTABLE"
        |            },
        |            "updatedAt": "2020-01-01T00:00:00Z"
        |          }
        |        ],
        |        "marketId": "m:o:od:market:1",
        |        "marketName": "aMarket",
        |        "marketType": "BEYOND_GODLIKE",
        |        "marketCategory": "BEYOND_GODLIKE",
        |        "selectionOdds": [
        |          {
        |            "active":true,
        |            "displayOdds": {
        |              "decimal": 21.37,
        |              "american": "+2000",
        |              "fractional": "20/1"
        |            },
        |            "selectionId": "od:selection:1",
        |            "selectionName": "first team wins"
        |          },
        |          {
        |            "active":true,
        |            "displayOdds": {
        |              "decimal": 73.12,
        |              "american": "+7000",
        |              "fractional": "70/1"
        |            },
        |            "selectionId": "od:selection:2",
        |            "selectionName": "second team wins"
        |          }
        |        ]
        |      },
        |      "score": {
        |        "away": 0,
        |        "home": 0
        |      },
        |      "scoreHistory": [],
        |      "sport": {
        |        "abbreviation": "LoL",
        |        "name": "League of Legends",
        |        "sportId": "s:p:1",
        |        "displayToPunters": true
        |      },
        |      "startTime": "2030-01-01T00:00:00Z",
        |      "status": "PRE_GAME",
        |      "statusHistory": [
        |        {
        |          "status": "PRE_GAME",
        |          "updatedAt": "2020-01-01T00:00:00Z"
        |        }
        |      ]
        |    }
        |  ]
        |}
        |""".stripMargin
  }

  object TradingMarketResponse {
    val response: TradingMarketNavigationData = TradingMarketNavigationData(
      fixtureId = FixtureId(DataProvider.Oddin, "1"),
      fixtureName = "example fixture",
      startTime = OffsetDateTime.of(2030, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
      isLive = false,
      sport = Sport(
        sportId = SportId(DataProvider.Phoenix, "1"),
        name = "League of Legends",
        abbreviation = "LoL",
        displayToPunters = true),
      score = FixtureScore(home = 0, away = 0),
      status = FixtureLifecycleStatus.PreGame,
      scoreHistory = Seq.empty,
      statusHistory = Seq(
        FixtureLifecycleStatusChange(
          FixtureLifecycleStatus.PreGame,
          OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))),
      market = TradingMarketData(
        marketId = MarketId(DataProvider.Oddin, "od:market:1"),
        marketName = "aMarket",
        marketType = MarketType.BeyondGodlike,
        marketCategory = MarketType.BeyondGodlike.entryName,
        selectionOdds = Seq(
          SelectionOdds(
            selectionId = "od:selection:1",
            selectionName = "first team wins",
            Some(Odds(21.37)),
            active = true),
          SelectionOdds(
            selectionId = "od:selection:2",
            selectionName = "second team wins",
            Some(Odds(73.12)),
            active = true)),
        currentLifecycle = MarketLifecycle.NotBettable(BackofficeChange()),
        lifecycleChanges = Seq(
          MarketLifecycleChange(
            MarketLifecycle.NotBettable(BackofficeChange()),
            OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)))),
      competitors = Seq(
        Competitor(
          competitorId = CompetitorId(DataProvider.Oddin, "od:competitor:1"),
          name = "first team",
          qualifier = OddinConstants.Unknown),
        Competitor(
          competitorId = CompetitorId(DataProvider.Oddin, "od:competitor:2"),
          name = "second team",
          qualifier = OddinConstants.Unknown)))

    val responseJson: String =
      """
        |{
        |  "competitors": [
        |    {
        |      "competitorId": "c:o:od:competitor:1",
        |      "name": "first team",
        |      "qualifier": "unknown"
        |    },
        |    {
        |      "competitorId": "c:o:od:competitor:2",
        |      "name": "second team",
        |      "qualifier": "unknown"
        |    }
        |  ],
        |  "fixtureId": "f:o:1",
        |  "fixtureName": "example fixture",
        |  "isLive": false,
        |  "market": {
        |    "currentLifecycle": {
        |      "changeReason": {
        |        "reason": "Requested by backoffice",
        |        "type": "BACKOFFICE_CHANGE"
        |      },
        |      "type": "NOT_BETTABLE"
        |    },
        |    "lifecycleChanges": [
        |      {
        |        "lifecycle": {
        |          "changeReason": {
        |            "reason": "Requested by backoffice",
        |            "type": "BACKOFFICE_CHANGE"
        |          },
        |          "type": "NOT_BETTABLE"
        |        },
        |        "updatedAt": "2020-01-01T00:00:00Z"
        |      }
        |    ],
        |    "marketId": "m:o:od:market:1",
        |    "marketName": "aMarket",
        |    "marketType": "BEYOND_GODLIKE",
        |    "marketCategory": "BEYOND_GODLIKE",
        |    "selectionOdds": [
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 21.37,
        |          "american": "+2000",
        |          "fractional": "20/1"
        |        },
        |        "selectionId": "od:selection:1",
        |        "selectionName": "first team wins"
        |      },
        |      {
        |        "active":true,
        |        "displayOdds": {
        |          "decimal": 73.12,
        |          "american": "+7000",
        |          "fractional": "70/1"
        |        },
        |        "selectionId": "od:selection:2",
        |        "selectionName": "second team wins"
        |      }
        |    ]
        |  },
        |  "score": {
        |    "away": 0,
        |    "home": 0
        |  },
        |  "scoreHistory": [],
        |  "sport": {
        |    "abbreviation": "LoL",
        |    "name": "League of Legends",
        |    "sportId": "s:p:1",
        |    "displayToPunters": true
        |  },
        |  "startTime": "2030-01-01T00:00:00Z",
        |  "status": "PRE_GAME",
        |  "statusHistory": [
        |    {
        |      "status": "PRE_GAME",
        |      "updatedAt": "2020-01-01T00:00:00Z"
        |    }
        |  ]
        |}
        |""".stripMargin
  }
}
