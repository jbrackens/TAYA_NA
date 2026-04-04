package phoenix.suppliers.oddin
import scala.concurrent.duration._

import advxml.implicits._
import akka.actor.typed.scaladsl.adapter._
import com.github.tomakehurst.wiremock.client.WireMock
import org.scalatest.EitherValues
import org.scalatest.LoneElement
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.CacheConfig
import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.core.domain.DataProvider
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.ActorMarketsBoundedContext
import phoenix.markets.LifecycleChangeReason
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsTable
import phoenix.markets.UpdateSportRequest
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.oddin.EndpointStub
import phoenix.oddin.OddinApiSpecSupport
import phoenix.oddin.domain.OddinMessageHandler.BetCancel
import phoenix.oddin.domain.OddinMessageHandler.BetSettlement
import phoenix.oddin.domain.OddinMessageHandler.FixtureChange
import phoenix.oddin.domain.OddinMessageHandler.OddsChange
import phoenix.oddin.domain.OddinRestApi
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinMessageAdapter
import phoenix.oddin.infrastructure.OddinRestApiCachedMarketDescriptionsRepository
import phoenix.oddin.infrastructure.OddinStreams
import phoenix.support.DataGenerator.clock
import phoenix.support.DataGenerator.generateIdentifier
import phoenix.support._

class StronglyTypedOddinFlowsSpec
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

  def buildEventHandler(marketsContext: MarketsBoundedContext, oddinStreams: OddinStreams) = {
    val oddinConfig = OddinConfig.of(system)
    PhoenixOddinFlows.buildOddinPipeline(oddinStreams, oddinConfig, marketsContext)
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

  def makeSportAndTournamentVisibleToPunters(sportId: SportId, tournamentId: TournamentId): Unit = {
    val updateSportRequest = UpdateSportRequest(
      correlationId = generateIdentifier(),
      receivedAtUtc = clock.currentOffsetDateTime(),
      sportId = sportId,
      sportName = "Dota 2",
      sportAbbreviation = "Dota2",
      displayToPunters = Some(true))
    // Make sure the sport is visible to punters, otherwise it's not gonna be included in the result of `getFixtures`
    awaitSeq(
      marketsContext.createOrUpdateSport(updateSportRequest).map(_ => ()),
      marketsContext.makeTournamentDisplayable(tournamentId))
  }

  def createStreamsAndRun(client: OddinRestApi): OddinMessageAdapter = {
    val marketRepository =
      OddinRestApiCachedMarketDescriptionsRepository(client, cacheConfig)(system.toClassic, ec)
    val oddinMessageAdapter = new OddinMessageAdapter(ConstantUUIDGenerator, clock)
    val oddinStreams = new OddinStreams(oddinMessageAdapter, client, marketRepository)

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

            // When
            val oddsChange1Str = stringFromResource(baseDir = FixtureChangeDir, fileName = "odds-change-event.xml")
            oddinMessageAdapter.onOddsChange(OddsChange(oddsChange1Str))

            // And
            makeSportAndTournamentVisibleToPunters(
              SportId(DataProvider.Phoenix, "3"),
              TournamentId(DataProvider.Oddin, "od:tournament:862"))

            // Then
            eventually(eventuallyTimeout, eventuallyInterval) {
              val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:19816")

              val result =
                awaitRight(marketsContext.getFixtureDetails(expectedFixtureId, MarketVisibility.values.toSet))

              result.fixtureId mustBe expectedFixtureId
              result.status mustBe FixtureLifecycleStatus.PostGame
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

            // When
            val oddsChange1Str = unsafeTransformXML(
              stringFromResource(baseDir = FixtureChangeDir, fileName = "odds-change-event.xml"),
              root ==> SetAttrs(k"event_id" := v"od:match:19815"))
            val fixtureChange1Str = unsafeTransformXML(
              stringFromResource(baseDir = FixtureChangeDir, fileName = "fixture-change-event.xml"),
              root ==> SetAttrs(k"event_id" := v"od:match:19815"))
            oddinMessageAdapter.onOddsChange(OddsChange(oddsChange1Str))

            // And
            eventually(eventuallyTimeout, eventuallyInterval) {
              val result = await(dbConfig.db.run(MarketsTable.marketsQuery.size.result))
              result must be > 0
            }

            // And
            oddinMessageAdapter.onFixtureChange(FixtureChange(fixtureChange1Str))

            // And
            makeSportAndTournamentVisibleToPunters(
              SportId(DataProvider.Phoenix, "4"),
              TournamentId(DataProvider.Oddin, "od:tournament:862"))

            // Then
            eventually(eventuallyTimeout, eventuallyInterval) {

              val expectedFixtureId = FixtureId(DataProvider.Oddin, "od:match:19815")

              val result =
                awaitRight(marketsContext.getFixtureDetails(expectedFixtureId, MarketVisibility.values.toSet))

              result.fixtureId mustBe expectedFixtureId
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
      withOddinApi(MarketDescriptionsRequest ++ PushRequests, phoenixSpecOddinConfig(httpBaseUrl)) { client =>
        // Given
        val oddinMessageAdapter = createStreamsAndRun(client)

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

object StronglyTypedOddinFlowsSpec extends XmlSupport {

  val SpecDataDir = "data/phoenix-oddin-flows-spec"
  val OddsChangeDir = s"$SpecDataDir/oddin-odds-change"
  val FixtureChangeDir = s"$SpecDataDir/oddin-fixture-change"
  val OddinSettlementDir = s"$SpecDataDir/oddin-settlement"
  val OddinCancelDir = s"$SpecDataDir/oddin-cancel"

  val MarketDescriptionsRequest =
    Seq(
      EndpointStub(
        "/v1/descriptions/en/markets",
        Seq(stringFromResource(SpecDataDir, fileName = "list-market-descriptions-response.xml")),
        WireMock.exactly(1)))

  val OddsChangeFixtureSummaryRequest =
    Seq(
      EndpointStub(
        "/v1/sports/en/sport_events/od:match:19817/summary",
        Seq(stringFromResource(OddsChangeDir, fileName = "fixture-result-response.xml")),
        WireMock.exactly(1)))

  val FixtureSummaryRequests =
    Seq(
      EndpointStub(
        "/v1/sports/en/sport_events/od:match:19816/summary",
        Seq(unsafeTransformXML(
          stringFromResource(FixtureChangeDir, fileName = "fixture-result-response.xml"),
          $.sport_event ==> SetAttrs(k"scheduled" := v"${clock.currentOffsetDateTime().toIsoLocalDateTimeString}"))),
        WireMock.exactly(1)))

  val UpdatedFixtureSummaryRequests = Seq(
    EndpointStub(
      s"/v1/sports/en/sport_events/od:match:19815/summary",
      Seq(
        unsafeTransformXML(
          stringFromResource(FixtureChangeDir, fileName = "fixture-result-response.xml"),
          $.sport_event ==> SetAttrs(k"id" := v"od:match:19815"),
          $.sport_event.tournament.sport ==> SetAttrs(k"id" := v"od:sport:4")),
        unsafeTransformXML(
          stringFromResource(FixtureChangeDir, fileName = "fixture-result-response.xml"),
          $.sport_event ==> SetAttrs(k"id" := v"od:match:19815"),
          $.sport_event.tournament.sport ==> SetAttrs(k"id" := v"od:sport:4"),
          $.sport_event ==> SetAttrs(k"name" := v"Team Aspirations1 vs Future.club1"))),
      WireMock.exactly(2)))

  val SettlementRequests = Seq(
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:12345/summary",
      Seq(stringFromResource(OddinSettlementDir, fileName = "fixture-result-response.xml")),
      WireMock.exactly(1)))

  val CancelRequests = Seq(
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:23456/summary",
      Seq(stringFromResource(OddinCancelDir, "fixture-result-response.xml")),
      WireMock.exactly(1)))

  val OddinPushDir = s"$SpecDataDir/oddin-push"
  val PushRequests = Seq(
    EndpointStub(
      "/v1/sports/en/sport_events/od:match:22222/summary",
      Seq(stringFromResource(OddinPushDir, "fixture-result-response.xml")),
      WireMock.exactly(1)))
}
