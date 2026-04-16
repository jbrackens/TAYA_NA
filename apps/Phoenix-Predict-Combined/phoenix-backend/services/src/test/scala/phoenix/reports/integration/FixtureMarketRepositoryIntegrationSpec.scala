package phoenix.reports.integration

import scala.reflect.ClassTag

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.infrastructure.InMemoryFixtureMarketRepository
import phoenix.reports.infrastructure.SlickFixtureMarketRepository
import phoenix.support.DataGenerator.generateDateTime
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateFixtureName
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateSelectionName
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

class FixtureMarketRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with GivenWhenThen
    with TruncatedTables {

  private case class TestSetup[R <: FixtureMarketRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickFixtureMarketRepository(dbConfig)
  })
  private val testRepositorySetup =
    TestSetup(() => new InMemoryFixtureMarketRepository())

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {
      "return market with joined fixture" in {
        val repository = testSetup.constructRepository()

        Given("Markets with fixtures")
        val market1 = generateMarket()
        val market2 = generateMarket()
        val fixture1 = generateFixture(market1.fixtureId)
        val fixture2 = generateFixture(market2.fixtureId)

        awaitSeq(
          repository.upsert(market1),
          repository.upsert(market2),
          repository.upsert(fixture1),
          repository.upsert(fixture2))

        And("Markets without fixtures")
        val market3 = generateMarket()
        val market4 = generateMarket()

        awaitSeq(repository.upsert(market3), repository.upsert(market4))

        And("Fixtures without markets")
        awaitSeq(repository.upsert(generateFixture()), repository.upsert(generateFixture()))

        When("market is requested")
        val actualMarket1 = await(repository.get(market1.marketId))
        val actualMarket2 = await(repository.get(market2.marketId))
        val actualMarket3 = await(repository.get(market3.marketId))
        val actualMarket4 = await(repository.get(market4.marketId))

        Then("only those with fixture should be returned")
        actualMarket1 should be(Some(FixtureMarket(fixture1, market1, Seq.empty[MarketSelection])))
        actualMarket2 should be(Some(FixtureMarket(fixture2, market2, Seq.empty[MarketSelection])))
        actualMarket3 should be(None)
        actualMarket4 should be(None)
      }

      "return market with selections" in {
        val repository = testSetup.constructRepository()

        Given("Markets with fixtures and selections")
        val market1 = generateMarket()
        val market2 = generateMarket()
        val fixture1 = generateFixture(market1.fixtureId)
        val fixture2 = generateFixture(market2.fixtureId)
        val selection1 = generateMarketSelection(market1.marketId)
        val selection2 = generateMarketSelection(market2.marketId)

        awaitSeq(
          repository.upsert(market1),
          repository.upsert(market2),
          repository.upsert(fixture1),
          repository.upsert(fixture2),
          repository.upsert(Seq(selection1)),
          repository.upsert(Seq(selection2)))

        When("market is requested")
        val actualMarket1 = await(repository.get(market1.marketId))
        val actualMarket2 = await(repository.get(market2.marketId))

        Then("only those with fixture should be returned")
        actualMarket1 should be(Some(FixtureMarket(fixture1, market1, Seq(selection1))))
        actualMarket2 should be(Some(FixtureMarket(fixture2, market2, Seq(selection2))))
      }
    }
  }

  def generateMarket(marketId: MarketId = generateMarketId()): Market =
    Market(marketId, generateMarketName(), generateFixtureId())

  def generateMarketSelection(
      marketId: MarketId = generateMarketId(),
      selectionId: SelectionId = generateSelectionId()): MarketSelection =
    MarketSelection(selectionId, generateSelectionName(), marketId)

  def generateFixture(fixtureId: FixtureId = generateFixtureId()): Fixture =
    Fixture(fixtureId, generateFixtureName(), generateDateTime())
}
