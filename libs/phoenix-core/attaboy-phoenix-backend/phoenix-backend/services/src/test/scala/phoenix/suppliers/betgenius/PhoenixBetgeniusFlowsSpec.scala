package phoenix.suppliers.betgenius

import io.circe.parser._
import org.scalatest.EitherValues
import org.scalatest.LoneElement
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.betgenius.domain.FixtureIngest
import phoenix.betgenius.domain.MarketSetIngest
import phoenix.betgenius.domain.ResultSetIngest
import phoenix.betgenius.domain.SelectionId
import phoenix.betgenius.infrastructure.BetgeniusIngestSource
import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.ActorMarketsBoundedContext
import phoenix.markets.LifecycleChangeReason
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketsTable
import phoenix.markets.fixtures.FixturesTable
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.common.PhoenixSharedFlows
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FileSupport
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables

class PhoenixBetgeniusFlowsSpec
    extends AnyWordSpecLike
    with Matchers
    with FileSupport
    with EitherValues
    with FutureSupport
    with LoneElement
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables {

  implicit val clock = Clock.utcClock
  val marketsContext = ActorMarketsBoundedContext(system, dbConfig)
  val SpecDataDir = "data/common-flows-spec"
  val FixtureUpdateDataDir = s"$SpecDataDir/fixture-update"
  val MarketChangeDataDir = s"$SpecDataDir/market-change"
  val FixtureResultDataDir = s"$SpecDataDir/fixture-result"

  val eventuallyTimeout = Timeout(awaitTimeout.value * 3)
  val eventuallyInterval = awaitInterval

  "A PhoenixBetgeniusFlow" should {

    "process a fixture update message" in {

      withTruncatedTables {
        // Given
        val json = stringFromResource(FixtureUpdateDataDir, fileName = "fixture.json")
        val fixtureIngest = decode[FixtureIngest](json).value
        val (queue, source) = BetgeniusIngestSource()
        val oddinConfig = OddinConfig.of(system)
        val graph = PhoenixSharedFlows.buildCommonPipeline(oddinConfig, source, marketsContext)

        // When
        graph.run()
        await(queue.offer(fixtureIngest))

        // Then
        validateFixtureUpdated(fixtureIngest)
      }
    }

    "process a market changed message" in {

      withTruncatedTables {
        // Given
        val marketJson = stringFromResource(MarketChangeDataDir, fileName = "marketSet.json")
        val marketSetIngest = decode[Seq[MarketSetIngest]](marketJson).value.loneElement

        val (queue, source) = BetgeniusIngestSource()
        val oddinConfig = OddinConfig.of(system)
        val graph = PhoenixSharedFlows.buildCommonPipeline(oddinConfig, source, marketsContext)

        // When
        graph.run()
        await(queue.offer(marketSetIngest))

        // Then
        validateMarketUpdated(marketSetIngest, Bettable(LifecycleChangeReason.DataSupplierStatusChange))
      }
    }

    "process a fixture result message" in {

      withTruncatedTables {
        // Given
        val fixtureJson = stringFromResource(FixtureResultDataDir, fileName = "fixture.json")
        val fixtureIngest: FixtureIngest = decode[FixtureIngest](fixtureJson).value

        val marketSetJson = stringFromResource(FixtureResultDataDir, fileName = "marketSet.json")
        val marketSetIngest = decode[Seq[MarketSetIngest]](marketSetJson).value.loneElement

        val resultSetJson = stringFromResource(FixtureResultDataDir, fileName = "resultSet.json")
        val resultSetIngest = decode[Seq[ResultSetIngest]](resultSetJson).value.loneElement

        val (queue, source) = BetgeniusIngestSource()
        val oddinConfig = OddinConfig.of(system)
        val graph = PhoenixSharedFlows.buildCommonPipeline(oddinConfig, source, marketsContext)

        // When
        graph.run()
        await(queue.offer(fixtureIngest))
        validateFixtureUpdated(fixtureIngest)

        // And
        await(queue.offer(marketSetIngest))
        validateMarketUpdated(marketSetIngest, Bettable(LifecycleChangeReason.DataSupplierStatusChange))

        // And
        await(queue.offer(resultSetIngest))

        // Then
        validateMarketUpdated(
          marketSetIngest,
          Settled(LifecycleChangeReason.DataSupplierStatusChange, SelectionId(300000011).namespaced))
      }
    }
  }

  private def validateMarketUpdated(marketSetIngest: MarketSetIngest, expectedMarketLifecycle: MarketLifecycle) = {
    eventually(eventuallyTimeout, eventuallyInterval) {
      val storedMarket = await(dbConfig.db.run(MarketsTable.marketsQuery.result)).loneElement
      storedMarket.fixtureId.value mustBe marketSetIngest.marketSet.fixtureId.namespaced
      storedMarket.marketId.value mustBe marketSetIngest.marketSet.markets.loneElement.id.namespaced
      storedMarket.currentLifecycle mustBe expectedMarketLifecycle
    }
  }

  private def validateFixtureUpdated(fixtureIngest: FixtureIngest) = {
    eventually(eventuallyTimeout, eventuallyInterval) {
      val storedFixture = await(dbConfig.db.run(FixturesTable.fixturesQuery.result)).loneElement
      storedFixture.fixtureId.value mustBe fixtureIngest.fixture.id.namespaced
      storedFixture.name mustBe fixtureIngest.fixture.name.value
    }
  }
}
