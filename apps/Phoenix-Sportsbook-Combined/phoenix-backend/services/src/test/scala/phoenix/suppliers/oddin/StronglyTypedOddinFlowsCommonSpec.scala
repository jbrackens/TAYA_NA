package phoenix.suppliers.oddin

import scala.concurrent.duration._

import advxml.implicits._
import akka.actor.typed.scaladsl.adapter._
import org.scalatest.EitherValues
import org.scalatest.LoneElement
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.CacheConfig
import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets._
import phoenix.markets.fixtures.FixturesTable
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportsTable
import phoenix.markets.tournaments.TournamentsTable
import phoenix.oddin.OddinApiSpecSupport
import phoenix.oddin.domain.OddinMessageHandler.BetCancel
import phoenix.oddin.domain.OddinMessageHandler.BetSettlement
import phoenix.oddin.domain.OddinMessageHandler.FixtureChange
import phoenix.oddin.domain.OddinMessageHandler.OddsChange
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.infrastructure.CommonOddinStreams
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinMessageAdapter
import phoenix.oddin.infrastructure.OddinRestApiCachedMarketDescriptionsRepository
import phoenix.support.DataGenerator.generateIdentifier
import phoenix.support._

class StronglyTypedOddinFlowsCommonSpec
    extends XmlSupport
    with OddinApiSpecSupport
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with EitherValues
    with LoneElement
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables
    with HttpSpec {
  import StronglyTypedOddinFlowsSpec._

  implicit val clock = Clock.utcClock
  implicit val typedSystem = system

  val eventuallyTimeout = Timeout(awaitTimeout.value * 3)
  val eventuallyInterval = awaitInterval

  val marketsContext = ActorMarketsBoundedContext(system, dbConfig)
  val cacheConfig = CacheConfig(10, 50, 10.minutes, 10.seconds)

  override protected def afterAll(): Unit = {
    super.afterAll()
    TestUtils.testCleanUp(system)
  }

  def buildEventHandler(marketsContext: MarketsBoundedContext, oddinStreams: CommonOddinStreams) = {
    val oddinConfig = OddinConfig.of(system)
    PhoenixOddinFlows.buildCommonOddinPipeline(oddinStreams, oddinConfig, marketsContext)
  }

  def waitForMarketToBeInLifecycleState(
      expectedFixtureId: FixtureId,
      expectedMarketId: MarketId,
      expectedMarketLifecycle: MarketLifecycle): Unit = {
    eventually(eventuallyTimeout, eventuallyInterval) {
      val fixture = awaitRight(marketsContext.getTradingFixture(expectedFixtureId))

      fixture.markets.filter(_.marketId == expectedMarketId).loneElement.currentLifecycle mustBe expectedMarketLifecycle
    }
  }

  def makeSportVisibleToPunters(sportId: SportId): Unit = {
    val updateSportRequest = UpdateSportRequest(
      correlationId = generateIdentifier(),
      receivedAtUtc = clock.currentOffsetDateTime(),
      sportId = sportId,
      sportName = "Dota 2",
      sportAbbreviation = "Dota2",
      displayToPunters = Some(true))
    // Make sure the sport is visible to punters, otherwise it's not gonna be included in the result of `getFixtures`
    await(marketsContext.createOrUpdateSport(updateSportRequest))
  }

  def makeTournamentVisibleToPunters(tournamentId: TournamentId): Unit =
    await(marketsContext.makeTournamentDisplayable(tournamentId))

  def createStreamsAndRun(client: OddinRestApi): OddinMessageAdapter = {
    val marketRepository =
      OddinRestApiCachedMarketDescriptionsRepository(client, cacheConfig)(system.toClassic, ec)
    val oddinMessageAdapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
    val oddinStreams = new CommonOddinStreams(oddinMessageAdapter, client, marketRepository)

    buildEventHandler(marketsContext, oddinStreams).run()

    oddinMessageAdapter
  }

  "A PhoenixOddinFlow" should {

    "send a ChangeMarket message to a Market Entity" in {

      withTruncatedTables {
        withOddinApi(
          MarketDescriptionsRequest ++ OddsChangeFixtureSummaryRequest,
          phoenixSpecOddinConfig(httpBaseUrl)) { client =>
          // Given
          val oddinMessageAdapter = createStreamsAndRun(client)

          // And
          val fixtureChangeStr = stringFromResource(baseDir = OddsChangeDir, fileName = "fixture-change-event.xml")
          oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChangeStr))
          waitForFixtureToBeCreated()

          // When
          val oddsChangeStr = stringFromResource(baseDir = OddsChangeDir, fileName = "odds-change-event.xml")
          oddinMessageAdapter.onOddsChange(OddsChange(oddsChangeStr))

          // Then
          eventually(eventuallyTimeout, eventuallyInterval) {

            // Not all market elements in odds-change-event.xml have odds.
            // There are 100 market elements and 33 are sans-odds
            val expectedNumberOfMarkets = 100
            val result = await(marketsContext.getTradingMarkets(Pagination(1, 10000)))

            result.data must have size expectedNumberOfMarkets

            val market = await(
              marketsContext.getMarket(MarketId(DataProvider.Oddin, "od:match:19817:27:map=3|threshold=36")).value)

            market.value.name mustBe "Map duration 36 - map 3"
            market.value.currentLifecycle mustBe NotBettable(DataSupplierStatusChange)
            market.value.selections.filter(_.active) must have size 0
            market.value.selections.filterNot(_.active) must have size 2
          }
        }
      }
    }

    "update fixture status when receiving odds change events" in {

      withTruncatedTables {
        withOddinApi(MarketDescriptionsRequest ++ FixtureSummaryRequests, phoenixSpecOddinConfig(httpBaseUrl)) {
          client =>
            // Given
            val oddinMessageAdapter = createStreamsAndRun(client)

            val fixtureChangeStr = stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml")
            oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChangeStr))
            waitForFixtureToBeCreated()

            // When
            val oddsChange1Str = stringFromResource(baseDir = FixtureChangeDir, fileName = "odds-change-event.xml")
            oddinMessageAdapter.onOddsChange(OddsChange(oddsChange1Str))

            // And
            makeSportVisibleToPunters(SportId(DataProvider.Phoenix, "3"))
            makeTournamentVisibleToPunters(TournamentId(DataProvider.Oddin, "od:tournament:862"))

            // Then
            eventually(eventuallyTimeout, eventuallyInterval) {

              val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:19816")

              val result =
                awaitRight(marketsContext.getFixtureDetails(expectedFixtureId, MarketVisibility.values.toSet))

              result.status mustBe FixtureLifecycleStatus.InPlay
              result.competitors("away").score mustBe 4242
            }
        }
      }
    }

    "update fixture when receiving fixture change events" in {

      withTruncatedTables {

        withOddinApi(MarketDescriptionsRequest ++ UpdatedFixtureSummaryRequests, phoenixSpecOddinConfig(httpBaseUrl)) {
          client =>
            // Given
            val oddinMessageAdapter = createStreamsAndRun(client)

            val fixtureChange1Str = unsafeTransformXML(
              stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml"),
              root ==> SetAttrs(k"event_id" := v"od:match:19815"))
            oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChange1Str))
            waitForFixtureToBeCreated()

            // When
            val oddsChange1Str = unsafeTransformXML(
              stringFromResource(baseDir = FixtureChangeDir, fileName = "odds-change-event.xml"),
              root ==> SetAttrs(k"event_id" := v"od:match:19815"))
            oddinMessageAdapter.onOddsChange(OddsChange(oddsChange1Str))

            eventually(eventuallyTimeout, eventuallyInterval) {
              val result = await(dbConfig.db.run(MarketsTable.marketsQuery.result))

              result.size must be > 0
            }

            // And
            oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChange1Str))

            // And
            makeSportVisibleToPunters(SportId(DataProvider.Phoenix, "4"))
            makeTournamentVisibleToPunters(TournamentId(DataProvider.Oddin, "od:tournament:862"))

            // Then
            eventually(eventuallyTimeout, eventuallyInterval) {

              val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:19815")

              val result =
                awaitRight(marketsContext.getFixtureDetails(expectedFixtureId, MarketVisibility.values.toSet))

              result.status mustBe FixtureLifecycleStatus.PostGame
              result.fixtureName mustBe "Team Aspirations1 vs Future.club1"
            }
        }
      }
    }

    "settle a market" in {

      withTruncatedTables {
        withOddinApi(MarketDescriptionsRequest ++ SettlementRequests, phoenixSpecOddinConfig(httpBaseUrl)) { client =>
          // Given
          val oddinMessageAdapter = createStreamsAndRun(client)

          val fixtureChange1Str = unsafeTransformXML(
            stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml"),
            root ==> SetAttrs(k"event_id" := v"od:match:12345"))
          oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChange1Str))
          waitForFixtureToBeCreated()

          // When
          val oddsChangeStr = stringFromResource(baseDir = OddinSettlementDir, fileName = "odds-change-event.xml")
          oddinMessageAdapter.onOddsChange(OddsChange(oddsChangeStr))

          val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:12345")
          val expectedMarketId = MarketId(DataProvider.Oddin, "od:match:12345:2:handicap=1.5")

          // And
          val bettableBecauseActive =
            MarketLifecycle.Bettable(LifecycleChangeReason.DataSupplierStatusChange)
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, bettableBecauseActive)

          // And
          val settlementStr = stringFromResource(baseDir = OddinSettlementDir, fileName = "bet-settlement-event.xml")
          oddinMessageAdapter.onBetSettlement(BetSettlement(settlementStr))

          // Then
          val expectedWinningSelectionId = "2"
          val expectedMarketLifecycle =
            MarketLifecycle.Settled(LifecycleChangeReason.DataSupplierStatusChange, expectedWinningSelectionId)
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, expectedMarketLifecycle)

        }
      }
    }

    "cancel a market" in {
      withTruncatedTables {
        withOddinApi(MarketDescriptionsRequest ++ CancelRequests, phoenixSpecOddinConfig(httpBaseUrl)) { client =>
          // Given
          val oddinMessageAdapter = createStreamsAndRun(client)

          val fixtureChange1Str = unsafeTransformXML(
            stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml"),
            root ==> SetAttrs(k"event_id" := v"od:match:23456"))
          oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChange1Str))
          waitForFixtureToBeCreated()

          // When
          val oddsChangeStr = stringFromResource(baseDir = OddinCancelDir, fileName = "odds-change-event.xml")
          oddinMessageAdapter.onOddsChange(OddsChange(oddsChangeStr))

          val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:23456")
          val expectedMarketId = MarketId(DataProvider.Oddin, "od:match:23456:4:best_of=3|variant=best_of:3")

          // And
          val bettableBecauseActive =
            MarketLifecycle.Bettable(LifecycleChangeReason.DataSupplierStatusChange)
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, bettableBecauseActive)

          // And
          val cancelStr = stringFromResource(baseDir = OddinCancelDir, fileName = "bet-cancel-event.xml")
          oddinMessageAdapter.onBetCancel(BetCancel(cancelStr))

          // Then
          val cancelledBecauseCancelled =
            MarketLifecycle.Cancelled(LifecycleChangeReason.DataSupplierCancellation("BetCancel"))
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, cancelledBecauseCancelled)

        }
      }
    }

    "push a market" in {
      withTruncatedTables {
        withOddinApi(MarketDescriptionsRequest ++ PushRequests, phoenixSpecOddinConfig(httpBaseUrl)) { client =>
          // Given
          val oddinMessageAdapter = createStreamsAndRun(client)

          val fixtureChangeStr =
            unsafeTransformXML(
              stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml"),
              root ==> SetAttrs(k"event_id" := v"od:match:22222"))
          oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChangeStr))
          waitForFixtureToBeCreated()

          // When
          val oddsChangeStr = stringFromResource(baseDir = OddinPushDir, fileName = "odds-change-event.xml")
          oddinMessageAdapter.onOddsChange(OddsChange(oddsChangeStr))

          val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:22222")
          val expectedMarketId = MarketId(DataProvider.Oddin, "od:match:22222:5:map=3")

          // And
          val bettableBecauseActive =
            MarketLifecycle.Bettable(LifecycleChangeReason.DataSupplierStatusChange)
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, bettableBecauseActive)

          // And
          val cancelStr = stringFromResource(baseDir = OddinPushDir, fileName = "bet-push-event.xml")
          oddinMessageAdapter.onBetCancel(BetCancel(cancelStr))

          // Then
          val cancelledBecausePushed =
            MarketLifecycle.Cancelled(LifecycleChangeReason.DataSupplierPush())
          waitForMarketToBeInLifecycleState(expectedFixtureId, expectedMarketId, cancelledBecausePushed)
        }
      }
    }
  }

  private def waitForFixtureToBeCreated() =
    eventually(eventuallyTimeout, eventuallyInterval) {
      val fixtureRecordsNumber = await(dbConfig.db.run(FixturesTable.fixturesQuery.size.result))
      val tournamentsRecordsNumber = await(dbConfig.db.run(TournamentsTable.tournamentsQuery.size.result))
      val sportRecordsNumber = await(dbConfig.db.run(SportsTable.sportsQuery.size.result))
      fixtureRecordsNumber mustBe 1
      tournamentsRecordsNumber mustBe 1
      sportRecordsNumber mustBe 1
    }
}
