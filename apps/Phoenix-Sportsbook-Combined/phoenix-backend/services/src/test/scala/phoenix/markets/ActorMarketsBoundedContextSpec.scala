package phoenix.markets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import cats.data.EitherT
import cats.data.NonEmptyList
import org.scalatest.EitherValues
import org.scalatest.LoneElement
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import slick.basic.DatabaseConfig

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.core.ordering.Direction.Ascending
import phoenix.core.ordering.Direction.Descending
import phoenix.core.pagination.Pagination
import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.MarketScenarios
import phoenix.support.TestScenarios.RandomMarket
import phoenix.support.TruncatedTables

/**
 * Tests the actor-based implementation of the MarketBoundedContext, hooking
 * it up with an actual Actor System.
 */
class ActorMarketsBoundedContextSpec
    extends AnyFreeSpec
    with Matchers
    with FutureSupport
    with EitherValues
    with LoneElement
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables {

  private val eventuallyTimeout = Timeout(awaitTimeout.value)
  private val eventuallyInterval = awaitInterval

  implicit val actorSystem: ActorSystem[Nothing] = system

  "Market BC" - new MarketsBoundedContextScope {

    def createVisibleMarket(sportId: SportId, market: CommonUpdateMarketRequest): EitherT[Future, Nothing, MarketId] =
      marketActorContext
        .changeVisibility(sportId, market.marketCategory.get, MarketVisibility.Featured)
        .semiflatMap(_ => marketActorContext.createOrUpdateMarket(market))

    def createVisibleMarket(sportId: SportId, market: UpdateMarketRequest): EitherT[Future, Nothing, MarketId] =
      marketActorContext
        .changeVisibility(sportId, market.marketCategory.get, MarketVisibility.Featured)
        .semiflatMap(_ => marketActorContext.createOrUpdateMarket(market))

    "Getting a market" - {
      "should respond with error for non existing market" in {
        // given
        val marketId = generateMarketId()

        // when
        val error = awaitLeft(marketActorContext.getMarket(marketId))

        // then
        error shouldBe MarketNotFound(marketId)
      }

      "should return market aggregate" in {
        // given
        val initialSelection = SelectionOdds(generateSelectionId(), "Over 2.137", Some(Odds(21.37)), active = true)
        val randomMarket = marketScenarios.bettableMarket(NonEmptyList.one(initialSelection))

        // when
        val market = awaitRight(marketActorContext.getMarket(randomMarket.marketId))

        // then
        market.selections shouldBe List(initialSelection)
      }
    }

    "Getting fixtures" - {

      def createSportAndTournamentAndFixtures(statuses: List[FixtureLifecycleStatus] =
        List.fill(10)(randomFixtureLifecycleStatus())): (SportId, TournamentId, List[FixtureId]) = {
        // given
        val sportId = generateSportId()
        val sportRequest = generateSportRequest(sportId).copy(displayToPunters = Some(true))
        await(marketActorContext.createOrUpdateSport(sportRequest))

        // and
        val tournamentId = generateTournamentId()
        val fixtureResults = statuses.map { fixtureStatus =>
          val fixtureId = generateFixtureId()
          val fixtureRequest =
            generateFixtureRequest(sportId = sportId, tournamentId = tournamentId, fixtureId = fixtureId)
              .copy(fixtureStatus = fixtureStatus)
          val fixture = await(marketActorContext.createOrUpdateFixture(fixtureRequest))

          val marketRequest = generateMarketRequest(fixtureId = fixtureId)
          awaitRight(createVisibleMarket(sportId, marketRequest))

          fixture
        }
        val expectedFixtureIds = fixtureResults.map(_.fixtureId)

        (sportId, tournamentId, expectedFixtureIds)
      }

      def validateFixtures(tournamentId: TournamentId, expectedFixtures: List[FixtureId]) = {
        eventually(eventuallyTimeout, eventuallyInterval) {
          // when
          val query = FixtureQuery(sportId = None, Some(tournamentId), FixtureStatus.values.toSet)
          val displayedFixtures =
            await(marketActorContext.getFixtures(query, None, Pagination.atFirstPage(10)))

          // then
          displayedFixtures.data.map(_.fixtureId) should contain theSameElementsAs expectedFixtures
        }
      }

      "should return all fixture ids where the fixture is in the queried status" in {
        truncateTables()

        // given
        createSportAndTournamentAndFixtures(
          List(FixtureLifecycleStatus.PreGame, FixtureLifecycleStatus.BreakInPlay, FixtureLifecycleStatus.Unknown))
        val (_, _, expectedFixtureIds) = createSportAndTournamentAndFixtures(
          List(FixtureLifecycleStatus.InPlay, FixtureLifecycleStatus.PostGame, FixtureLifecycleStatus.GameAbandoned))

        eventually(eventuallyTimeout, eventuallyInterval) {
          // when
          val returnedFixtureIds =
            await(marketActorContext.getFixtureIds(Set(FixtureStatus.InPlay, FixtureStatus.Finished)))

          // then
          returnedFixtureIds should contain theSameElementsAs expectedFixtureIds
        }
      }

      "should update fixture match status" in {
        truncateTables()

        // given
        val (sportId, _, createdFixtureIds) =
          createSportAndTournamentAndFixtures(List(FixtureLifecycleStatus.PreGame))

        eventually(eventuallyTimeout, eventuallyInterval) {
          // when
          await(marketActorContext.getFixtureIds(Set(FixtureStatus.InPlay, FixtureStatus.Finished)))

          // and
          val fixtureLive = createdFixtureIds.head
          val updateRequest = generateMatchStatusUpdateRequest(sportId, fixtureLive, FixtureLifecycleStatus.InPlay)

          // given
          await(marketActorContext.updateMatchStatus(updateRequest).value)
          awaitRight(
            marketActorContext
              .getFixtureDetails(updateRequest.fixtureId, Set(MarketVisibility.Featured, MarketVisibility.Enabled)))

          // then
          val fixtureInPlay = await(marketActorContext.getFixtureIds(Set(FixtureStatus.InPlay)))
          fixtureInPlay.head shouldBe fixtureLive
        }
      }

      "should return all fixtures in the requested order" in {

        // given
        val (sportId, tournamentId, expectedFixtureIds) = createSportAndTournamentAndFixtures()

        val fixtureQuery =
          FixtureQuery(sportId = None, tournamentId = None, fixtureStatus = FixtureStatus.values.toSet)
        val pagination = Pagination(currentPage = 1, itemsPerPage = 10)

        // and
        await(marketActorContext.makeTournamentDisplayable(tournamentId))

        eventually(eventuallyTimeout, eventuallyInterval) {
          // when
          val fixturesBySport =
            await(
              marketActorContext
                .getFixtures(fixtureQuery.copy(sportId = Some(sportId)), startTimeOrderingDirection = None, pagination))

          // then
          fixturesBySport.data.map(_.fixtureId) shouldBe expectedFixtureIds
          // the default ordering should be ascending by startTime

          // when
          val fixturesByTournament =
            await(
              marketActorContext.getFixtures(
                fixtureQuery.copy(tournamentId = Some(tournamentId)),
                startTimeOrderingDirection = None,
                pagination))

          // then
          fixturesByTournament.data.map(_.fixtureId) shouldBe expectedFixtureIds
        }

        // when
        val fixturesBySportAscending =
          await(
            marketActorContext.getFixtures(
              fixtureQuery.copy(sportId = Some(sportId)),
              startTimeOrderingDirection = Some(Ascending),
              Pagination(currentPage = 2, itemsPerPage = 5)))

        // then
        fixturesBySportAscending.data.map(_.fixtureId) shouldBe expectedFixtureIds.drop(5)

        // when
        val fixturesByTournamentDescending =
          await(
            marketActorContext.getFixtures(
              fixtureQuery.copy(tournamentId = Some(tournamentId)),
              startTimeOrderingDirection = Some(Descending),
              Pagination(currentPage = 1, itemsPerPage = 5)))

        // then
        fixturesByTournamentDescending.data.map(_.fixtureId) shouldBe expectedFixtureIds.reverse.take(5)
      }

      "should group markets by marketType in fixture details response" in {
        // given
        val sport = generateSportRequest()
        await(marketActorContext.createOrUpdateSport(sport))

        // and
        val fixture = generateFixtureRequest().copy(sportId = sport.sportId)
        await(marketActorContext.createOrUpdateFixture(fixture))

        // and
        val market1 = generateMarketRequest().copy(
          fixtureId = fixture.fixtureId,
          marketType = domain.MarketType.MatchWinner,
          marketSpecifiers = Seq.empty,
          marketLifecycle = Bettable(DataSupplierStatusChange),
          selectionOdds = List.empty)
        awaitRight(createVisibleMarket(sport.sportId, market1))
        // and
        val market2 = generateMarketRequest().copy(
          fixtureId = fixture.fixtureId,
          marketType = domain.MarketType.CorrectMatchScore,
          marketSpecifiers = Seq.empty,
          marketLifecycle = Bettable(DataSupplierStatusChange),
          selectionOdds = List.empty)
        awaitRight(createVisibleMarket(sport.sportId, market2))

        // when
        eventually(eventuallyTimeout, eventuallyInterval) {
          val fixtureDetails =
            awaitRight(
              marketActorContext
                .getFixtureDetails(fixture.fixtureId, Set(MarketVisibility.Featured, MarketVisibility.Enabled)))

          // then
          fixtureDetails.markets.keySet should contain theSameElementsAs Set(market1.marketType, market2.marketType)
        }
      }

      "should only return fixtures for tournaments displayable to punters" in {
        truncateTables()

        // given
        val (_, tournamentId, expectedFixtures) = createSportAndTournamentAndFixtures()
        validateFixtures(tournamentId, List.empty)

        // when
        await(marketActorContext.makeTournamentDisplayable(tournamentId))

        // then
        validateFixtures(tournamentId, expectedFixtures)

        // when
        await(marketActorContext.makeTournamentNotDisplayable(tournamentId))

        // then
        validateFixtures(tournamentId, List.empty)
      }
    }

    "Market creation" - {
      "should create the expected market with a common market update" in {
        // given
        val sport = generateSportRequest()
        await(marketActorContext.createOrUpdateSport(sport))

        // and
        val fixture = generateFixtureRequest().copy(sportId = sport.sportId)
        await(marketActorContext.createOrUpdateFixture(fixture))

        val selectionOdds =
          SelectionOdds("selectionId", "selectionName", Some(Odds(BigDecimal.int2bigDecimal(1))), active = true)
        val marketRequest = CommonUpdateMarketRequest(
          "correlationId",
          DataGenerator.clock.currentOffsetDateTime(),
          fixture.fixtureId,
          MarketId(DataProvider.Oddin, "marketId"),
          "MarketName",
          domain.MarketType.MatchWinner,
          Some(MarketCategory(randomString(10))),
          Bettable(DataSupplierStatusChange),
          MarketSpecifiers(Some(ValueSpecifier("value1")), Some(MapSpecifier("map1")), Some(UnitSpecifier("unit1"))),
          List(selectionOdds))
        val marketRequest2 = marketRequest.copy(
          marketId = MarketId(DataProvider.Oddin, "marketId2"),
          marketSpecifiers = MarketSpecifiers(Some(ValueSpecifier("value2")), None, None))
        val marketRequest3 =
          marketRequest.copy(
            marketId = MarketId(DataProvider.Oddin, "marketId3"),
            marketSpecifiers = MarketSpecifiers(None, None, None))

        // when
        awaitRight(createVisibleMarket(sport.sportId, marketRequest))
        awaitRight(createVisibleMarket(sport.sportId, marketRequest2))
        awaitRight(createVisibleMarket(sport.sportId, marketRequest3))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val market1 =
            await(marketActorContext.getMarketState(MarketId(DataProvider.Oddin, "marketId")).value).getOrElse(fail())
          val market2 =
            await(marketActorContext.getMarketState(MarketId(DataProvider.Oddin, "marketId2")).value).getOrElse(fail())
          val market3 =
            await(marketActorContext.getMarketState(MarketId(DataProvider.Oddin, "marketId3")).value).getOrElse(fail())

          market1.id shouldBe MarketId(DataProvider.Oddin, "marketId")
          market1.info.name shouldBe "MarketName"
          market1.info.fixtureId shouldBe fixture.fixtureId
          market1.info.specifiers should contain theSameElementsAs Seq(
            MarketSpecifier("value", "value1"),
            MarketSpecifier("map", "map1"),
            MarketSpecifier("unit", "unit1"))
          market1.info.marketType shouldBe domain.MarketType.MatchWinner
          market1.marketSelections.selections shouldBe Map("selectionId" -> selectionOdds)
          market1.lifecycle shouldBe Bettable(DataSupplierStatusChange)

          market2.id shouldBe MarketId(DataProvider.Oddin, "marketId2")
          market2.info.specifiers should contain only MarketSpecifier("value", "value2")

          market3.id shouldBe MarketId(DataProvider.Oddin, "marketId3")
          market3.info.specifiers shouldBe empty
        }
      }
    }

    "Trading operations" - {
      "should return fixture detail for each market" in {

        // given
        val sport = generateSportRequest().copy(sportId = activeSportId)
        await(marketActorContext.createOrUpdateSport(sport))

        // and
        val unusedFixture = generateFixtureRequest().copy(sportId = sport.sportId)
        await(marketActorContext.createOrUpdateFixture(unusedFixture))

        val fixture = generateFixtureRequest().copy(sportId = sport.sportId)
        await(marketActorContext.createOrUpdateFixture(fixture))

        // and
        val marketRequest1 = generateMarketRequest().copy(
          fixtureId = fixture.fixtureId,
          marketType = domain.MarketType.MatchWinner,
          marketSpecifiers = Seq.empty,
          marketLifecycle = Bettable(DataSupplierStatusChange),
          selectionOdds = List.empty)
        val marketId1 = awaitRight(createVisibleMarket(sport.sportId, marketRequest1))

        // and
        val marketRequest2 = generateMarketRequest().copy(
          fixtureId = fixture.fixtureId,
          marketType = domain.MarketType.CorrectMatchScore,
          marketSpecifiers = Seq.empty,
          marketLifecycle = Bettable(DataSupplierStatusChange),
          selectionOdds = List.empty)
        val marketId2 = awaitRight(createVisibleMarket(sport.sportId, marketRequest2))

        // when
        eventually(eventuallyTimeout, eventuallyInterval) {
          val result =
            await(marketActorContext.getTradingMarkets(Pagination(currentPage = 1, itemsPerPage = 1000)))

          val expectedIds = Seq(marketId1, marketId2)
          val retrievedIds = result.data.map(_.market.marketId)

          // then
          retrievedIds should contain allElementsOf expectedIds
        }
      }
    }

    "Settling a market" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val response = awaitLeft(
          marketActorContext.settleMarket(nonExistingMarket, generateSelectionId(), BackofficeChange("Settled")))

        // then
        response shouldBe MarketNotFound(nonExistingMarket)
      }

      "should fail for non existing winning selection" in {
        // given
        val initialSelection = SelectionOdds(generateSelectionId(), "Over 2.137", Some(Odds(21.37)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.one(initialSelection)).marketId

        // when
        val nonExistingSelection = generateSelectionId()
        val response =
          awaitLeft(marketActorContext.settleMarket(marketId, nonExistingSelection, BackofficeChange("Settled")))

        // then
        response shouldBe SelectionNotFound(marketId, nonExistingSelection)
      }

      "should settle market properly" in {
        // given
        val firstSelection = SelectionOdds(generateSelectionId(), "Over 2.137", Some(Odds(21.37)), active = true)
        val secondSelection = SelectionOdds(generateSelectionId(), "Under 2.137", Some(Odds(10.12)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.of(firstSelection, secondSelection)).marketId

        // when
        awaitRight(marketActorContext.settleMarket(marketId, firstSelection.selectionId, BackofficeChange("Settled")))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val market = awaitRight(marketActorContext.getMarket(marketId))
          market.currentLifecycle shouldBe a[Settled]
        }
      }

      "should not settle market twice" in {
        // given
        val selection = SelectionOdds(generateSelectionId(), "Over 2.137", Some(Odds(21.37)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.one(selection)).marketId

        // and
        awaitRight(marketActorContext.settleMarket(marketId, selection.selectionId, BackofficeChange("Settled")))

        // when
        val error =
          awaitLeft(marketActorContext.settleMarket(marketId, selection.selectionId, BackofficeChange("Settled")))

        // then
        error shouldBe DuplicateSettleMarketEvent(marketId, selection.selectionId)
      }
    }

    "Resettling a market" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val response = awaitLeft(
          marketActorContext.resettleMarket(nonExistingMarket, generateSelectionId(), BackofficeChange("Resettled")))

        // then
        response shouldBe MarketNotFound(nonExistingMarket)
      }

      "should fail for non existing winning selection" in {
        // given
        val initialSelection = SelectionOdds(generateSelectionId(), "Over", Some(Odds(21.37)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.one(initialSelection)).marketId

        // when
        val nonExistingSelection = generateSelectionId()
        val response =
          awaitLeft(marketActorContext.resettleMarket(marketId, nonExistingSelection, BackofficeChange("Resettled")))

        // then
        response shouldBe SelectionNotFound(marketId, nonExistingSelection)
      }

      "should resettle market" in {
        // given
        val firstSelection = SelectionOdds(generateSelectionId(), "Over", Some(Odds(21.37)), active = true)
        val secondSelection = SelectionOdds(generateSelectionId(), "Under", Some(Odds(10.12)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.of(firstSelection, secondSelection)).marketId

        // and
        awaitRight(marketActorContext.settleMarket(marketId, firstSelection.selectionId, DataSupplierStatusChange))

        // when
        awaitRight(
          marketActorContext.resettleMarket(marketId, secondSelection.selectionId, BackofficeChange("Resettled")))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val market = awaitRight(marketActorContext.getMarket(marketId))
          market.currentLifecycle shouldBe a[Resettled]
        }
      }

      "should fail for unsettled market" in {
        // given
        val firstSelection = SelectionOdds(generateSelectionId(), "Over", Some(Odds(21.37)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.of(firstSelection)).marketId

        // when
        val error = awaitLeft(
          marketActorContext.resettleMarket(marketId, firstSelection.selectionId, BackofficeChange("Resettled")))

        // then
        error shouldBe CannotResettleMarket(marketId, firstSelection.selectionId)
      }

      "should not resettle market twice" in {
        // given
        val firstSelection = SelectionOdds(generateSelectionId(), "Over", Some(Odds(21.37)), active = true)
        val secondSelection = SelectionOdds(generateSelectionId(), "Under", Some(Odds(10.12)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.of(firstSelection, secondSelection)).marketId

        // and
        awaitRight(marketActorContext.settleMarket(marketId, firstSelection.selectionId, DataSupplierStatusChange))

        // when
        awaitRight(
          marketActorContext.resettleMarket(marketId, secondSelection.selectionId, BackofficeChange("Resettled")))

        // when
        val error = awaitLeft(
          marketActorContext.resettleMarket(marketId, firstSelection.selectionId, BackofficeChange("Resettled")))

        // then
        error shouldBe CannotResettleMarket(marketId, firstSelection.selectionId)
      }

      "should not resettle market if the resettle winning selection is the same as the settlement one" in {
        // given
        val firstSelection = SelectionOdds(generateSelectionId(), "Over", Some(Odds(21.37)), active = true)
        val marketId = marketScenarios.bettableMarket(NonEmptyList.of(firstSelection)).marketId

        // and
        awaitRight(marketActorContext.settleMarket(marketId, firstSelection.selectionId, DataSupplierStatusChange))

        // when
        val error = awaitLeft(
          marketActorContext.resettleMarket(marketId, firstSelection.selectionId, BackofficeChange("Resettled")))

        // then
        error shouldBe CannotResettleMarket(marketId, firstSelection.selectionId)
      }
    }

    "Cancelling a market" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val response = awaitLeft(marketActorContext.cancelMarket(nonExistingMarket, BackofficeCancellation()))

        // then
        response shouldBe MarketNotFound(nonExistingMarket)
      }

      "should cancel market properly" in {
        // given
        val marketId = marketScenarios.bettableMarket().marketId

        // when
        awaitRight(marketActorContext.cancelMarket(marketId, BackofficeCancellation()))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val market = awaitRight(marketActorContext.getMarket(marketId))
          market.currentLifecycle shouldBe a[Cancelled]
        }
      }

      "should not cancel market twice" in {
        // given
        val marketId = marketScenarios.bettableMarket().marketId

        // and
        awaitRight(marketActorContext.cancelMarket(marketId, BackofficeCancellation()))

        // when
        val error =
          awaitLeft(marketActorContext.cancelMarket(marketId, BackofficeCancellation()))

        // then
        error shouldBe DuplicateCancelMarketEvent(marketId)
      }
    }

    "Freezing a market" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val error = awaitLeft(marketActorContext.freezeMarket(nonExistingMarket, BackofficeChange("Possible fraud")))

        // then
        error shouldBe MarketNotFound(nonExistingMarket)
      }

      "should freeze market" in {
        // given
        val marketId = marketScenarios.bettableMarket().marketId

        // when
        awaitRight(marketActorContext.freezeMarket(marketId, BackofficeChange()))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val marketDetails = awaitRight(marketActorContext.getMarket(marketId))

          marketDetails.currentLifecycle shouldBe a[NotBettable]
          marketDetails.isBettable shouldBe false
        }
      }

      "should not freeze market twice" in {
        // given
        val marketId = marketScenarios.bettableMarket().marketId

        // and
        awaitRight(marketActorContext.freezeMarket(marketId, BackofficeChange()))

        // when
        val error = awaitLeft(marketActorContext.freezeMarket(marketId, BackofficeChange()))

        // then
        error shouldBe DuplicateFreezeMarketEvent(marketId)
      }
    }

    "Unfreezing frozen market" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val error = awaitLeft(marketActorContext.unfreezeMarket(nonExistingMarket, BackofficeChange()))

        // then
        error shouldBe MarketNotFound(nonExistingMarket)
      }

      "should fail if market not frozen" in {
        // given
        val marketId = marketScenarios.bettableMarket().marketId

        // when
        val error = awaitLeft(marketActorContext.unfreezeMarket(marketId, BackofficeChange()))

        // then
        error shouldBe CannotUnfreezeMarket(marketId)
      }

      "market not bettable due to backoffice changes cannot be unfrozen by oddin change" in {
        // given
        val marketId = marketScenarios.notBettableMarket(reason = BackofficeChange()).marketId

        // when
        val error =
          awaitLeft(marketActorContext.unfreezeMarket(marketId, DataSupplierStatusChange))

        // then
        error shouldBe CannotUnfreezeMarket(marketId)
      }

      "backoffice changes can override oddin changes" in {
        // given
        val marketId = marketScenarios.notBettableMarket(reason = DataSupplierStatusChange).marketId

        // when
        awaitRight(marketActorContext.unfreezeMarket(marketId, BackofficeChange()))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val marketDetails = awaitRight(marketActorContext.getMarket(marketId))

          marketDetails.currentLifecycle shouldBe a[Bettable]
          marketDetails.isBettable shouldBe true
        }
      }

      "market suspended by oddin can be made bettable again with oddin change" in {
        // given
        val marketId = marketScenarios.notBettableMarket(reason = DataSupplierStatusChange).marketId

        // when
        awaitRight(marketActorContext.unfreezeMarket(marketId, DataSupplierStatusChange))

        // then
        eventually(eventuallyTimeout, eventuallyInterval) {
          val marketDetails = awaitRight(marketActorContext.getMarket(marketId))

          marketDetails.currentLifecycle shouldBe a[Bettable]
          marketDetails.isBettable shouldBe true
        }
      }
    }

    "Getting trading market data" - {
      "should fail for non existing market" in {
        // given
        val nonExistingMarket = generateMarketId()

        // when
        val error = awaitLeft(marketActorContext.getTradingMarket(nonExistingMarket))

        // then
        error shouldBe MarketNotFound(nonExistingMarket)
      }

      "should properly retrieve market data otherwise" in {
        // given
        val RandomMarket(sportId, _, fixtureId, marketId, _, _, _, _, _, _) =
          marketScenarios.notBettableMarket(reason = DataSupplierStatusChange)

        // when
        val tradingMarketData = awaitRight(marketActorContext.getTradingMarket(marketId))

        // then
        tradingMarketData.market.marketId shouldBe marketId
        tradingMarketData.sport.sportId shouldBe sportId
        tradingMarketData.fixtureId shouldBe fixtureId
      }
    }

    "Update fixture info" - {
      "should fail for non existing fixture" in {
        // given
        val nonExistingFixture = generateFixtureId()
        val sportId = generateSportId()
        val sportRequest = generateSportRequest(sportId).copy(displayToPunters = Some(true))
        await(marketActorContext.createOrUpdateSport(sportRequest))

        val request = FixtureInfoUpdateRequest(
          fixtureName = None,
          fixtureStatus = Some(randomFixtureLifecycleStatus()),
          fixtureStartTime = None)

        // when
        val errorMessage =
          await(marketActorContext.updateFixtureInfo(sportId, nonExistingFixture, request).value.recoverWith {
            case e: UnexpectedMarketErrorException =>
              Future.successful(e.underlying.getMessage())
          })

        // then
        errorMessage shouldBe Left(FixtureNotFound(nonExistingFixture))
      }

      "should update the fixture if the fixture is present in actor state" in {
        // given
        val sportId = generateSportId()
        val sportRequest = generateSportRequest(sportId).copy(displayToPunters = Some(true))
        await(marketActorContext.createOrUpdateSport(sportRequest))
        val fixtureRequest = generateFixtureRequest().copy(sportId = sportId)
        val fixture = await(marketActorContext.createOrUpdateFixture(fixtureRequest))
        val request = FixtureInfoUpdateRequest(
          fixtureName = None,
          fixtureStatus = Some(randomFixtureLifecycleStatus()),
          fixtureStartTime = None)

        // when
        eventually(eventuallyTimeout, eventuallyInterval) {
          awaitRight(marketActorContext.updateFixtureInfo(sportId, fixture.fixtureId, request))
          // then
          val updatedFixture =
            awaitRight(marketActorContext.getFixtureDetails(fixture.fixtureId, MarketVisibility.values.toSet))
          updatedFixture.status shouldBe request.fixtureStatus.get
        }
      }

      "should update the fixture with the fallback if the fixture is present in DB" in {
        // given
        val sportId = generateSportId()
        val sportRequest = generateSportRequest(sportId).copy(displayToPunters = Some(true))
        await(marketActorContext.createOrUpdateSport(sportRequest))

        // old fixture (> 30 days ago)
        val fixtureRequest = generateFixtureRequest()
          .copy(sportId = sportId, startTime = DataGenerator.clock.currentOffsetDateTime().minusDays(40))
        val fixture = await(marketActorContext.createOrUpdateFixture(fixtureRequest))

        val request = FixtureInfoUpdateRequest(
          fixtureName = None,
          fixtureStatus = Some(randomFixtureLifecycleStatus()),
          fixtureStartTime = None)

        // when
        eventually(eventuallyTimeout, eventuallyInterval) {
          val response = awaitRight(marketActorContext.updateFixtureInfo(sportId, fixture.fixtureId, request))
          // then
          val updatedFixture =
            awaitRight(marketActorContext.getFixtureDetails(fixture.fixtureId, MarketVisibility.values.toSet))
          response shouldBe ()
          updatedFixture.status shouldBe request.fixtureStatus.get
        }
      }
    }
  }

  trait MarketsBoundedContextScope {
    private implicit val clock: Clock = Clock.utcClock
    implicit val ec: ExecutionContext = system.executionContext

    val activeSportId = SportId(DataProvider.Oddin, "od:sport:3")

    val marketActorContext: MarketsBoundedContext =
      ActorMarketsBoundedContext(system, DatabaseConfig.forConfig("slick", system.settings.config))

    val marketScenarios = new MarketScenarios(marketActorContext)
  }
}
