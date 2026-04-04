package phoenix.suppliers.mockdata

import java.time.OffsetDateTime

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.actor.typed.scaladsl.Behaviors
import akka.cluster.typed.ClusterSingleton
import akka.cluster.typed.SingletonActor
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.markets.LifecycleChangeReason
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.SelectionOdds
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateMarketRequest
import phoenix.markets.UpdateSportRequest
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity

object MockDataCoordinator {
  private val log = LoggerFactory.getLogger(this.objectName)

  def init(
      system: ActorSystem[_],
      phoenixMockDataConfig: PhoenixMockDataConfig,
      marketsContext: MarketsBoundedContext) =
    ClusterSingleton(system).init(
      SingletonActor(MockDataCoordinator(phoenixMockDataConfig, marketsContext), MockDataCoordinator.simpleObjectName))

  def apply(phoenixMockDataConfig: PhoenixMockDataConfig, marketsContext: MarketsBoundedContext): Behavior[NotUsed] =
    Behaviors.setup { context =>
      log.info(s"MOCK DATA INGESTION ENABLED? ${phoenixMockDataConfig.dataIngestionEnabled}")
      if (phoenixMockDataConfig.dataIngestionEnabled) {
        implicit val ec = context.executionContext

        val startTime = OffsetDateTime.parse("2022-02-24T12:00:00.000Z")
        val timeout = 10.seconds
        val sportId = SportEntity.SportId(DataProvider.Phoenix, "1")
        val tournamentId = SportEntity.TournamentId(DataProvider.Oddin, "tournamentId")
        val fixtureId = SportEntity.FixtureId(DataProvider.Oddin, "fixtureId")
        val marketId = MarketsBoundedContext.MarketId(DataProvider.Oddin, "marketId")
        val competitor1 =
          Competitor(SportEntity.CompetitorId(DataProvider.Oddin, "competitorId1"), "aCompetitor1", "home")
        val competitor2 =
          Competitor(SportEntity.CompetitorId(DataProvider.Oddin, "competitorId2"), "aCompetitor2", "away")
        val marketLifecycle = MarketLifecycle.Bettable(LifecycleChangeReason.BackofficeChange("added on startup"))
        val selectionOdds = SelectionOdds("selectionId", "aSelection", Some(Odds(5.5)), true)
        Await.result(
          (for {
            _ <- marketsContext.createOrUpdateSport(
              UpdateSportRequest(
                correlationId = "testSport",
                receivedAtUtc = startTime,
                sportId = sportId,
                sportName = "aSport",
                sportAbbreviation = "aS",
                displayToPunters = Some(true)))
            _ <- marketsContext.createOrUpdateFixture(
              UpdateFixtureRequest(
                correlationId = "testFixture",
                receivedAtUtc = startTime,
                sportId = sportId,
                sportName = "aSport",
                sportAbbreviation = "aS",
                tournamentId = tournamentId,
                tournamentName = "aTournament",
                tournamentStartTime = startTime,
                fixtureId = fixtureId,
                fixtureName = "aFixture",
                startTime = startTime,
                competitors = Set(competitor1, competitor2),
                currentScore = None,
                fixtureStatus = FixtureLifecycleStatus.InPlay))
            _ <- marketsContext.makeTournamentDisplayable(tournamentId)
            _ <- marketsContext.createOrUpdateMarket(
              UpdateMarketRequest(
                correlationId = "testMarket",
                receivedAtUtc = startTime,
                fixtureId = fixtureId,
                marketId = marketId,
                marketName = "aMarket",
                marketCategory = None,
                marketType = MarketType.MatchWinner,
                marketLifecycle = marketLifecycle,
                marketSpecifiers = List(),
                selectionOdds = List(selectionOdds)))
          } yield ()),
          timeout)
      }

      Behaviors.empty
    }

}
