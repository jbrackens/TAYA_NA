package phoenix.markets

import scala.math.Ordering.Implicits._
import scala.util.Random

import org.scalatest.LoneElement
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.core.ordering.Direction.Ascending
import phoenix.core.ordering.Direction.Descending
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.DisplayableTournament
import phoenix.markets.MarketsBoundedContext.Fixture
import phoenix.markets.MarketsBoundedContext.FixtureLifecycleStatusChange
import phoenix.markets.MarketsBoundedContext.MarketCategoryVisibility
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.MarketsBoundedContext.SportView
import phoenix.markets.MarketsBoundedContext.Tournament
import phoenix.markets.MarketsBoundedContext.TournamentView
import phoenix.markets.MarketsRepository.FixtureData
import phoenix.markets.MarketsRepository.Market
import phoenix.markets.MarketsRepository.MarketWithDetails
import phoenix.markets.domain.MarketType
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.tournaments.DisplayableTournamentsTable
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class MarketsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with LoneElement
    with TruncatedTables
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val selectionOddsUpperBoundInclusive = generateOdds()
  private val oddsBelowBound = Odds(randomNumber(Odds.MinValue, selectionOddsUpperBoundInclusive.value))
  private val oddsAboveBound = Odds(
    randomNumber(
      selectionOddsUpperBoundInclusive.value + BigDecimal(0.1f),
      selectionOddsUpperBoundInclusive.value + randomNumber(1, 20)))

  private val displayedSports = Seq(SportId(DataProvider.Phoenix, "1"))
  private val displayedMarkets = Seq(MarketType.MatchWinner)
  private val enabledMarkets: Set[MarketVisibility] = Set(MarketVisibility.Featured, MarketVisibility.Enabled)

  private val repository = new MarketsRepository(
    dbConfig,
    selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
    FiltersConfig(displayedSports, displayedMarkets, tournamentsDisplayedToPuntersEnabled = false))

  "Markets Repository" when {

    def randomDisplayedMarketType(): MarketType =
      Random.shuffle(Seq(MarketType.MatchWinner)).head

    def randomMarketCategory() = MarketCategory(randomString(10))

    def createSport(sportDisplay: Boolean, repository: MarketsRepository): Sport = {
      val sport = generateSport().copy(displayToPunters = sportDisplay)
      await(repository.saveSport(sport))

      sport
    }

    def createTournament(
        sportId: SportId,
        tournamentDisplay: Boolean = true,
        repository: MarketsRepository = repository): Tournament = {
      val tournament = Tournament(generateTournamentId(), sportId, generateTournamentName(), generateDateTime())
      await(repository.saveTournament(tournament))

      if (tournamentDisplay)
        await(repository.saveDisplayableTournament(DisplayableTournament(tournament.tournamentId)))

      tournament
    }

    def createSportAndTournament(
        sportDisplay: Boolean = true,
        tournamentDisplay: Boolean = true,
        repository: MarketsRepository = repository): (Sport, Tournament) = {
      val sport = createSport(sportDisplay, repository)
      val tournament = createTournament(sport.sportId, tournamentDisplay, repository)

      (sport, tournament)
    }

    def createFixture(
        tournamentId: TournamentId,
        status: FixtureLifecycleStatus = randomFixtureLifecycleStatus()): Fixture = {
      val fixture = generateFixture().copy(tournamentId = tournamentId, lifecycleStatus = status)
      await(repository.saveFixture(fixture))

      fixture
    }

    def createMarket(
        fixtureId: FixtureId,
        sportId: SportId,
        marketVisibility: MarketVisibility = MarketVisibility.Featured,
        marketCategory: MarketCategory = randomMarketCategory()): Market = {
      val market = generateMarket().copy(
        fixtureId = fixtureId,
        selectionOdds = List(
          generateSelectionOdds(oddsBelowBound),
          generateSelectionOdds(selectionOddsUpperBoundInclusive),
          generateSelectionOdds(oddsAboveBound)),
        marketType = randomDisplayedMarketType(),
        category = Some(marketCategory))
      await(repository.save(market))
      await(repository.changeVisibility(sportId, marketCategory, marketVisibility))

      market
    }

    def createFixtureAndMarket(
        tournamentId: TournamentId,
        sportId: SportId,
        marketVisibility: MarketVisibility = MarketVisibility.Featured,
        marketCategory: MarketCategory = randomMarketCategory(),
        status: FixtureLifecycleStatus = randomFixtureLifecycleStatus()): (Fixture, Market) = {
      val fixture = createFixture(tournamentId = tournamentId, status = status)
      val market = createMarket(fixture.fixtureId, sportId, marketVisibility, marketCategory)

      (fixture, market)
    }

    def buildQuery(sportId: SportId, tournamentId: TournamentId): FixtureQuery =
      FixtureQuery(Some(sportId), Some(tournamentId), FixtureStatus.values.toSet)

    def buildQueryWithStatus(sportId: SportId, tournamentId: TournamentId, status: FixtureStatus): FixtureQuery =
      FixtureQuery(Some(sportId), Some(tournamentId), Set(status))

    def keepOddsInsideAcceptedRange(market: Market): Market =
      market.copy(selectionOdds = market.selectionOdds.filter(areInsideAcceptedRange))

    def areInsideAcceptedRange(selectionOdds: SelectionOdds): Boolean =
      selectionOdds.odds.exists(_ <= selectionOddsUpperBoundInclusive)

    "using 'findByFixtureId'" should {
      "not find nonexistent fixtures" in withTruncatedTables {
        await(repository.findByFixtureId(generateFixtureId(), enabledMarkets)) should ===(None)
      }

      "find existing fixture data" in withTruncatedTables {
        val (sport, tournament) = createSportAndTournament()

        val fixture = createFixture(tournament.tournamentId)

        val markets = List.fill(3)(createMarket(fixture.fixtureId, sport.sportId))

        val expectedReturnedMarkets = markets.map(keepOddsInsideAcceptedRange).sortBy(_.category.map(_.value))

        await(repository.findByFixtureId(fixture.fixtureId, enabledMarkets)) should ===(
          Some(FixtureData(sport, tournament, fixture, expectedReturnedMarkets)))
      }

      "return only markets for display" in withTruncatedTables {
        // given
        val (sport1, tournament1) = createSportAndTournament()
        val (fixture1, _) =
          createFixtureAndMarket(
            tournament1.tournamentId,
            sport1.sportId,
            marketVisibility = MarketVisibility.Disabled,
            status = FixtureLifecycleStatus.PreGame)

        val market2 = createMarket(fixture1.fixtureId, sport1.sportId)
        val market3 = createMarket(fixture1.fixtureId, sport1.sportId)

        // when
        val result = await(repository.findByFixtureId(fixture1.fixtureId, enabledMarkets))

        // then
        val expectedMarkets = Seq(market2, market3).map(keepOddsInsideAcceptedRange).sortBy(_.category.map(_.value))
        result shouldBe Some(FixtureData(sport1, tournament1, fixture1, expectedMarkets))
      }
    }

    "using 'getAllSportListings'" should {

      "return sports with tournaments filtered for display" in withTruncatedTables {
        // given
        val sport: Sport = generateSport().copy(displayToPunters = true)

        val repositoryWithTournamentFilter = new MarketsRepository(
          dbConfig,
          selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
          FiltersConfig(Seq(sport.sportId), displayedMarkets, tournamentsDisplayedToPuntersEnabled = true))

        // and
        await(repository.saveSport(sport))

        val tournament1 = createTournament(sport.sportId, tournamentDisplay = true, repositoryWithTournamentFilter)
        val (_, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport.sportId, status = FixtureLifecycleStatus.InPlay)

        val tournament2 = createTournament(sport.sportId, tournamentDisplay = false, repositoryWithTournamentFilter)
        val (_, _) =
          createFixtureAndMarket(tournament2.tournamentId, sport.sportId, status = FixtureLifecycleStatus.InPlay)

        // when
        val result = await(repositoryWithTournamentFilter.getAllSportListings())

        // then
        val expectedSportView = SportView(
          sport.sportId,
          sport.name,
          sport.abbreviation,
          sport.displayToPunters,
          Seq(TournamentView(tournament1.tournamentId, tournament1.name, numberOfFixtures = 1)))

        result.loneElement shouldBe expectedSportView
      }

      "return sports with no displayable tournaments after filtering" in withTruncatedTables {
        // given
        val sport: Sport = generateSport().copy(displayToPunters = true)

        val repositoryWithTournamentFilter = new MarketsRepository(
          dbConfig,
          selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
          FiltersConfig(Seq(sport.sportId), displayedMarkets, tournamentsDisplayedToPuntersEnabled = true))

        // and
        await(repository.saveSport(sport))

        val tournament = createTournament(sport.sportId, tournamentDisplay = false, repositoryWithTournamentFilter)
        val (_, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.InPlay)

        // when
        val result = await(repositoryWithTournamentFilter.getAllSportListings())

        // then
        val expectedSportView =
          SportView(sport.sportId, sport.name, sport.abbreviation, sport.displayToPunters, Seq.empty)

        result.loneElement shouldBe expectedSportView
      }
    }

    "using 'getFixturesWithFilter'" should {

      val pagination = Pagination(currentPage = 1, itemsPerPage = 1000)

      "return only UPCOMING and IN_PLAY fixtures in listing when no fixtureStatus filter applied" in withTruncatedTables {
        // given
        val (sport, tournament1) = createSportAndTournament()
        val (fixture1, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport.sportId, status = FixtureLifecycleStatus.PreGame)

        val (fixture2, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport.sportId, status = FixtureLifecycleStatus.InPlay)

        val (_, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport.sportId, status = FixtureLifecycleStatus.PostGame)

        // when
        val query = FixtureQuery(None, None, Set.empty)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        val expectedFixtureIds = Seq(fixture1.fixtureId, fixture2.fixtureId)
        result.data.map(_.fixture.fixtureId) should contain theSameElementsAs expectedFixtureIds
      }

      "return only fixtures that have markets when pagination does not affect the result" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament()
        val (fixtureWithoutMarket, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId)
        val _ = createFixture(tournamentId = tournament.tournamentId) // fixture without market

        // when
        val query =
          FixtureQuery(None, None, FixtureStatus.values.toSet)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        val expectedFixtureIds = Seq(fixtureWithoutMarket.fixtureId)
        result.data.map(_.fixture.fixtureId) should contain theSameElementsAs expectedFixtureIds
      }

      "return only fixtures that have markets when the result is affected by pagination" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament()

        val createdFixturesAndMarkets =
          List.fill(10)(createFixtureAndMarket(tournament.tournamentId, sport.sportId))
        val returnedFixturesAndMarkets = createdFixturesAndMarkets.map(fixtureAndMarket =>
          fixtureAndMarket.copy(_2 = keepOddsInsideAcceptedRange(fixtureAndMarket._2)))

        for (_ <- 1 to 10) {
          createFixture(tournamentId = tournament.tournamentId) // fixture without market
        }

        // when
        val query =
          FixtureQuery(Some(sport.sportId), Some(tournament.tournamentId), fixtureStatus = FixtureStatus.values.toSet)
        val result =
          await(repository
            .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 1, itemsPerPage = 1000)))

        // then
        result.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets

        // when
        val result1 =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 1, itemsPerPage = 5)))
        val result2 =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 2, itemsPerPage = 5)))
        val result3 =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 3, itemsPerPage = 5)))
        val result4 =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 4, itemsPerPage = 5)))
        val result5 =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 5, itemsPerPage = 5)))

        // then
        result1.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets.take(5)
        result2.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets.drop(5)
        result3.data shouldBe empty
        result4.data shouldBe empty
        result5.data shouldBe empty

        // when
        val result1_desc =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Descending, Pagination(currentPage = 1, itemsPerPage = 5)))
        val result2_desc =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Descending, Pagination(currentPage = 2, itemsPerPage = 5)))
        val result3_desc =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Descending, Pagination(currentPage = 3, itemsPerPage = 5)))
        val result4_desc =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Descending, Pagination(currentPage = 4, itemsPerPage = 5)))
        val result5_desc =
          await(
            repository
              .getFixturesWithFilter(query, enabledMarkets, Descending, Pagination(currentPage = 5, itemsPerPage = 5)))

        // then
        result1_desc.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets.reverse
          .take(5)
        result2_desc.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets.reverse
          .drop(5)
        result3_desc.data shouldBe empty
        result4_desc.data shouldBe empty
        result5_desc.data shouldBe empty
      }

      "return only fixtures that have markets when the result is affected by pagination - another case" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament()

        val returnedFixturesAndMarkets1 =
          List.fill(5)(createFixtureAndMarket(tournament.tournamentId, sport.sportId)).map { fixtureAndMarket =>
            fixtureAndMarket.copy(_2 = keepOddsInsideAcceptedRange(fixtureAndMarket._2))
          }

        for (_ <- 1 to 10) {
          createFixture(tournamentId = tournament.tournamentId) // fixture without market
        }

        val returnedFixturesAndMarkets2 =
          List.fill(5)(createFixtureAndMarket(tournament.tournamentId, sport.sportId)).map { fixtureAndMarket =>
            fixtureAndMarket.copy(_2 = keepOddsInsideAcceptedRange(fixtureAndMarket._2))
          }

        // when
        val query =
          FixtureQuery(Some(sport.sportId), Some(tournament.tournamentId), fixtureStatus = FixtureStatus.values.toSet)
        val result =
          await(repository
            .getFixturesWithFilter(query, enabledMarkets, Ascending, Pagination(currentPage = 1, itemsPerPage = 1000)))

        // then
        result.data.map { fd =>
          (fd.fixture, fd.markets.loneElement)
        } shouldBe returnedFixturesAndMarkets1 ++ returnedFixturesAndMarkets2

        def getFixturesWithFilter(pagination: Pagination) =
          repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination)
        // when
        val result1 = await(getFixturesWithFilter(Pagination(currentPage = 1, itemsPerPage = 5)))
        val result2 = await(getFixturesWithFilter(Pagination(currentPage = 2, itemsPerPage = 5)))
        val result3 = await(getFixturesWithFilter(Pagination(currentPage = 3, itemsPerPage = 5)))
        val result4 = await(getFixturesWithFilter(Pagination(currentPage = 4, itemsPerPage = 5)))
        val result5 = await(getFixturesWithFilter(Pagination(currentPage = 5, itemsPerPage = 5)))
        // then
        result1.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets1
        result2.data.map(fd => (fd.fixture, fd.markets.loneElement)) shouldBe returnedFixturesAndMarkets2
        result3.data shouldBe empty
        result4.data shouldBe empty
        result5.data shouldBe empty
      }

      "return fixtures listing filtered by sportId" in withTruncatedTables {
        // given
        val (sport1, tournament1) = createSportAndTournament()
        val (expectedFixture, _) = createFixtureAndMarket(tournament1.tournamentId, sport1.sportId)

        val (sport2, tournament2) = createSportAndTournament()
        val (_, _) = createFixtureAndMarket(tournament2.tournamentId, sport2.sportId)

        // when
        val query = buildQuery(sport1.sportId, tournament1.tournamentId)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        result.data.map(_.fixture.fixtureId) should contain only expectedFixture.fixtureId
      }

      "return fixtures listing filtered by tournamentId" in withTruncatedTables {
        // given
        val (sport, tournament1) = createSportAndTournament()
        val (_, _) = createFixtureAndMarket(tournament1.tournamentId, sport.sportId)

        val tournament2 = createTournament(sport.sportId)
        val (expectedFixture, _) = createFixtureAndMarket(tournament2.tournamentId, sport.sportId)

        // when
        val query = buildQuery(sport.sportId, tournament2.tournamentId)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        result.data.map(_.fixture.fixtureId) should contain only expectedFixture.fixtureId
      }

      "return fixtures listing filtered by status" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament()

        val (notStarted, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.PreGame)
        val (live, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.InPlay)
        val (_, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.BreakInPlay)
        val (postGame, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.PostGame)
        val (gameAbandoned, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.GameAbandoned)
        val (_, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.Unknown)

        // when
        val upcomingQuery = buildQueryWithStatus(sport.sportId, tournament.tournamentId, FixtureStatus.Upcoming)
        val upcomingResult =
          await(repository.getFixturesWithFilter(upcomingQuery, enabledMarkets, Ascending, pagination))

        val inPlayQuery = buildQueryWithStatus(sport.sportId, tournament.tournamentId, FixtureStatus.InPlay)
        val inPlayResult = await(repository.getFixturesWithFilter(inPlayQuery, enabledMarkets, Ascending, pagination))

        val finishedQuery = buildQueryWithStatus(sport.sportId, tournament.tournamentId, FixtureStatus.Finished)
        val finishedResult =
          await(repository.getFixturesWithFilter(finishedQuery, enabledMarkets, Ascending, pagination))

        // then
        val upcomingIds = Seq(notStarted.fixtureId)
        val inPlayIds = Seq(live.fixtureId)
        val finishedIds = Seq(postGame.fixtureId, gameAbandoned.fixtureId)

        upcomingResult.data.map(_.fixture.fixtureId) should contain theSameElementsAs upcomingIds
        inPlayResult.data.map(_.fixture.fixtureId) should contain theSameElementsAs inPlayIds
        finishedResult.data.map(_.fixture.fixtureId) should contain theSameElementsAs finishedIds
      }

      "return fixtures listing filtered by sports for display" in withTruncatedTables {
        // given
        val (sport1, tournament1) = createSportAndTournament()
        val (fixtureWithSportDisplayed, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport1.sportId)

        val (sport2, tournament2) = createSportAndTournament(sportDisplay = false)
        val (_, _) =
          createFixtureAndMarket(tournament2.tournamentId, sport2.sportId)

        // when
        val query =
          FixtureQuery(None, None, FixtureStatus.values.toSet)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        val expectedFixtureIds = Seq(fixtureWithSportDisplayed.fixtureId)
        result.data.map(_.fixture.fixtureId) should contain theSameElementsAs expectedFixtureIds
      }

      "return fixtures listing filtered by tournaments for display" in withTruncatedTables {
        // given
        val repositoryWithTournamentFilter = new MarketsRepository(
          dbConfig,
          selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
          FiltersConfig(displayedSports, displayedMarkets, tournamentsDisplayedToPuntersEnabled = true))

        // and
        val (sport1, tournament1) = createSportAndTournament(repository = repositoryWithTournamentFilter)
        val (fixtureWithSportDisplayed, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport1.sportId)
        val (sport2, tournament2) = createSportAndTournament(tournamentDisplay = false)
        val (_, _) = {
          createFixtureAndMarket(tournament2.tournamentId, sport2.sportId)
        }

        // when
        val query =
          FixtureQuery(None, None, FixtureStatus.values.toSet)
        val result =
          await(repositoryWithTournamentFilter.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))
        // then
        val expectedFixtureIds = Seq(fixtureWithSportDisplayed.fixtureId)
        result.data.map(_.fixture.fixtureId) should contain theSameElementsAs expectedFixtureIds
      }

      "return fixtures listing filtered by markets for display" in withTruncatedTables {
        // given
        val (sport1, tournament1) = createSportAndTournament()
        val (fixtureWithMarketsDisplayed, _) =
          createFixtureAndMarket(tournament1.tournamentId, sport1.sportId, MarketVisibility.Disabled)

        val market2 = createMarket(fixtureWithMarketsDisplayed.fixtureId, sport1.sportId, MarketVisibility.Featured)
        val market3 = createMarket(fixtureWithMarketsDisplayed.fixtureId, sport1.sportId, MarketVisibility.Enabled)

        val (_, _) =
          createFixtureAndMarket(
            tournamentId = tournament1.tournamentId,
            sport1.sportId,
            marketVisibility = MarketVisibility.Disabled)

        // when
        val query =
          FixtureQuery(None, None, FixtureStatus.values.toSet)
        val result = await(repository.getFixturesWithFilter(query, enabledMarkets, Ascending, pagination))

        // then
        val expectedMarkets = Seq(market2, market3).map(keepOddsInsideAcceptedRange).sortBy(_.category.map(_.value))
        result.data.loneElement shouldBe FixtureData(sport1, tournament1, fixtureWithMarketsDisplayed, expectedMarkets)
      }
    }

    "using 'getMarketsWithFilter'" should {
      "not find anything when nothing exists" in withTruncatedTables {
        val pagination = Pagination(currentPage = 1, itemsPerPage = 10)
        await(repository.getMarketsWithFilter(pagination)) should ===(
          PaginatedResult(data = Seq.empty, totalCount = 0, pagination))
      }

      "get markets of all sports when the query doesn't define an specific sport" in withTruncatedTables {
        val pagination = Pagination(currentPage = 1, itemsPerPage = 10)

        val (sport1, tournament1) = createSportAndTournament()
        val fixture1 = createFixture(tournament1.tournamentId)
        val marketsOfSport1 = List.fill(1)(createMarket(fixture1.fixtureId, sport1.sportId))

        val (sport2, tournament2) = createSportAndTournament()
        val fixture2 = createFixture(tournament2.tournamentId)
        val marketsOfSport2 = List.fill(1)(createMarket(fixture2.fixtureId, sport2.sportId))

        val expectedDataSport1 = marketsOfSport1.map(market =>
          MarketWithDetails(keepOddsInsideAcceptedRange(market), fixture1, tournament1, sport1))
        val expectedDataSport2 = marketsOfSport2.map(market =>
          MarketWithDetails(keepOddsInsideAcceptedRange(market), fixture2, tournament2, sport2))
        val expectedDataResult = expectedDataSport1 ++ expectedDataSport2

        await(repository.getMarketsWithFilter(pagination)) should ===(
          PaginatedResult(data = expectedDataResult, totalCount = expectedDataResult.length, pagination))
      }
    }

    "using 'getMarketWithDetails'" should {
      "not find anything when the market doesn't exist" in withTruncatedTables {
        await(repository.getMarketWithDetails(generateMarketId())) should ===(None)
      }

      "find an existing market details" in withTruncatedTables {
        val (sport, tournament) = createSportAndTournament()
        val fixture = createFixture(tournament.tournamentId)
        val market = createMarket(fixture.fixtureId, sport.sportId)

        val expectedResult = MarketWithDetails(keepOddsInsideAcceptedRange(market), fixture, tournament, sport)

        await(repository.getMarketWithDetails(market.marketId)) should ===(Some(expectedResult))
      }

      "ignore market and sport display filters" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament(sportDisplay = false)
        val (fixture, market) =
          createFixtureAndMarket(
            tournament.tournamentId,
            sport.sportId,
            marketVisibility = MarketVisibility.Disabled,
            status = FixtureLifecycleStatus.PreGame)

        // when
        val result = await(repository.getMarketWithDetails(market.marketId))

        // then
        result should ===(Some(MarketWithDetails(keepOddsInsideAcceptedRange(market), fixture, tournament, sport)))
      }
    }

    "using 'addFixtureLifecycleStatusChange'" should {
      "update fixture lifecycle" in withTruncatedTables {
        // given
        val (sport, tournament) = createSportAndTournament()
        val (fixture, _) =
          createFixtureAndMarket(tournament.tournamentId, sport.sportId, status = FixtureLifecycleStatus.PreGame)

        // when
        val expectedStatusChangeTime = clock.currentOffsetDateTime()
        await(
          repository.addFixtureLifecycleStatusChange(
            fixture.fixtureId,
            FixtureLifecycleStatusChange(FixtureLifecycleStatus.InPlay, expectedStatusChangeTime)))

        // then
        val result = await(
          repository.getFixturesWithFilter(
            FixtureQuery(Some(sport.sportId), Some(tournament.tournamentId), Set(FixtureStatus.InPlay)),
            enabledMarkets,
            Ascending,
            Pagination(1, 1000)))

        result.data
          .find(_.fixture.fixtureId == fixture.fixtureId)
          .map { fixtureResult =>
            fixtureResult.fixture.lifecycleStatus shouldBe FixtureLifecycleStatus.InPlay
          }
          .getOrElse(fail())
      }
    }

    "using 'saveDisplayableTournament'" should {
      "add a displayable tournament" in withTruncatedTables {
        // given
        val repository = new MarketsRepository(
          dbConfig,
          selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
          FiltersConfig(displayedSports, displayedMarkets, tournamentsDisplayedToPuntersEnabled = true))

        // when
        val tournamentId = TournamentId(DataProvider.Oddin, randomString())
        await(repository.saveDisplayableTournament(DisplayableTournament(tournamentId)))

        // then
        val storedTournament =
          await(dbConfig.db.run(DisplayableTournamentsTable.displayableTournamentsQuery.result)).loneElement

        storedTournament.tournamentId should ===(tournamentId)
      }
    }

    "using 'deleteDisplayableTournament'" should {
      "delete a displayable tournament" in withTruncatedTables {
        // given
        val repository = new MarketsRepository(
          dbConfig,
          selectionOddsUpperBoundInclusive = selectionOddsUpperBoundInclusive,
          FiltersConfig(displayedSports, displayedMarkets, tournamentsDisplayedToPuntersEnabled = true))

        val tournamentId1 = TournamentId(DataProvider.Oddin, randomString())
        val tournamentId2 = TournamentId(DataProvider.Oddin, randomString())

        await(repository.saveDisplayableTournament(DisplayableTournament(tournamentId1)))
        await(repository.saveDisplayableTournament(DisplayableTournament(tournamentId2)))

        await(dbConfig.db.run(DisplayableTournamentsTable.displayableTournamentsQuery.result))
          .map(_.tournamentId)
          .toSet should ===(Set(tournamentId1, tournamentId2))

        // when
        await(repository.deleteDisplayableTournament(tournamentId1))

        // then
        await(
          dbConfig.db.run(DisplayableTournamentsTable.displayableTournamentsQuery.result)).loneElement.tournamentId ===
          tournamentId2
      }
    }

    "using 'changeVisibility'" should {
      val sportId = SportId.unsafeParse("s:o:1")
      val marketCategory = MarketCategory("Category")

      "enable a marketCategory" in withTruncatedTables {
        await(repository.changeVisibility(sportId, marketCategory, MarketVisibility.Enabled))

        val entries = await(dbConfig.db.run(DisplayableMarketsTable.displayableMarketsQuery.result))

        entries should have size 1
        entries.head.sportId should ===(sportId)
        entries.head.marketCategory should ===(marketCategory)
        entries.head.visibility should ===(MarketVisibility.Enabled)
      }

      "feature a marketCategory that is already enabled" in withTruncatedTables {
        await(repository.changeVisibility(sportId, marketCategory, MarketVisibility.Enabled))
        await(repository.changeVisibility(sportId, marketCategory, MarketVisibility.Featured))

        val entries = await(dbConfig.db.run(DisplayableMarketsTable.displayableMarketsQuery.result))

        entries should have size 1
        entries.head.sportId should ===(sportId)
        entries.head.marketCategory should ===(marketCategory)
        entries.head.visibility should ===(MarketVisibility.Featured)
      }

      "disable a marketCategory that is already enabled" in withTruncatedTables {
        await(repository.changeVisibility(sportId, marketCategory, MarketVisibility.Enabled))
        await(repository.changeVisibility(sportId, marketCategory, MarketVisibility.Disabled))

        val entries = await(dbConfig.db.run(DisplayableMarketsTable.displayableMarketsQuery.result))

        entries should have size 0
      }
    }

    "using 'getMarketCategories'" should {
      "find all the categories in order without repeating them" in withTruncatedTables {
        val category1 = MarketCategory("cat1")
        val category2 = MarketCategory("cat2")
        val category3 = MarketCategory("cat3")
        val category4 = MarketCategory("cat4")

        val (sport1, tournament11) = createSportAndTournament()
        val tournament12 = createTournament(sport1.sportId)
        val (sport2, tournament21) = createSportAndTournament()
        val fixture111 = createFixture(tournament11.tournamentId)
        val fixture121 = createFixture(tournament12.tournamentId)
        val fixture122 = createFixture(tournament12.tournamentId)
        val fixture211 = createFixture(tournament21.tournamentId)
        createMarket(fixture111.fixtureId, sport1.sportId, MarketVisibility.Featured, marketCategory = category1)
        createMarket(fixture111.fixtureId, sport1.sportId, MarketVisibility.Disabled, marketCategory = category2)
        createMarket(fixture121.fixtureId, sport1.sportId, MarketVisibility.Disabled, marketCategory = category3)
        createMarket(fixture122.fixtureId, sport1.sportId, MarketVisibility.Enabled, marketCategory = category2)
        createMarket(fixture211.fixtureId, sport2.sportId, MarketVisibility.Enabled, marketCategory = category1)
        createMarket(fixture211.fixtureId, sport2.sportId, MarketVisibility.Featured, marketCategory = category4)
        val categories =
          await(repository.getMarketCategories(sport1.sportId, Pagination(currentPage = 1, itemsPerPage = 10)))
        categories.data should be(
          List(
            MarketCategoryVisibility(category1, MarketVisibility.Featured),
            MarketCategoryVisibility(category2, MarketVisibility.Enabled),
            MarketCategoryVisibility(category3, MarketVisibility.Disabled)))
      }
    }
  }
}
