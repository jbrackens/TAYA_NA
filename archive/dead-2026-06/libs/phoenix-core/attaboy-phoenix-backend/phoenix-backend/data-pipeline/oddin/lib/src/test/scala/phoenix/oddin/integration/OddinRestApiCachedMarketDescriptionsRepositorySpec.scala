package phoenix.oddin.integration

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.scaladsl.adapter._
import akka.http.scaladsl.model.StatusCodes
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.oddin.domain.MarketDescriptionId
import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.MarketSpecifiers
import phoenix.oddin.domain.OutcomeId
import phoenix.oddin.domain.OutcomeName
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.domain.marketDescription.MarketDescriptionName
import phoenix.oddin.domain.marketDescription.MarketVariant
import phoenix.oddin.domain.marketDescription.Outcome
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinRestApiCachedMarketDescriptionsRepository
import phoenix.oddin.infrastructure.xml.UnsafeOddinValueObjectExtensions.UnsafeMarketSpecifiersOps
import phoenix.oddin.support.OddinRestApiSupport.createClient
import phoenix.oddin.support.OddinRestApiSupport.createFailingClient
import phoenix.oddin.support.TestResponse
import phoenix.support.FileSupport
import phoenix.support.FutureSupport

class OddinRestApiCachedMarketDescriptionsRepositorySpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with FileSupport {

  private implicit val classicSystem = system.toClassic
  private implicit val ec = system.executionContext

  private val oddinConfig = OddinConfig.of(system)

  "find a matching market description" in {
    val oddinRestApi =
      createClient(
        oddinConfig.apiConfig,
        TestResponse(
          "/v1/descriptions/en/markets",
          stringFromResource(baseDir = "data/http", fileName = "list-all-market-descriptions-response.xml")))
    val repository = OddinRestApiCachedMarketDescriptionsRepository(oddinRestApi, oddinConfig.marketDescriptionsCache)

    val marketDescriptionId = MarketDescriptionId(1)
    val marketSpecifiers = MarketSpecifiers.fromStringUnsafe("variant=way:two|way=two")

    val marketDescription = awaitRight(repository.find(marketDescriptionId, marketSpecifiers))

    marketDescription shouldBe expectedMarketDescription
  }

  "return appropriate error if unable to list market descriptions" in {
    val oddinRestApi = createFailingClient(oddinConfig.apiConfig, StatusCodes.InternalServerError)
    val repository = OddinRestApiCachedMarketDescriptionsRepository(oddinRestApi, oddinConfig.marketDescriptionsCache)

    val marketDescriptionId = MarketDescriptionId(1)
    val marketSpecifiers = MarketSpecifiers.fromStringUnsafe("way=two")

    val marketDescription = awaitLeft(repository.find(marketDescriptionId, marketSpecifiers))

    marketDescription shouldBe UnableToFindMarketDescription(marketDescriptionId, marketSpecifiers)
  }

  "return appropriate error if unable to find market description in the list of all descriptions" in {
    val oddinRestApi = createFailingClient(oddinConfig.apiConfig, StatusCodes.InternalServerError)
    val repository = OddinRestApiCachedMarketDescriptionsRepository(oddinRestApi, oddinConfig.marketDescriptionsCache)

    val marketDescriptionId = MarketDescriptionId(1001)
    val marketSpecifiers = MarketSpecifiers.fromStringUnsafe("foo=bar")

    val marketDescription = awaitLeft(repository.find(marketDescriptionId, marketSpecifiers))

    marketDescription shouldBe UnableToFindMarketDescription(marketDescriptionId, marketSpecifiers)
  }

  private val expectedMarketDescription = MarketDescription(
    MarketDescriptionId(1),
    MarketDescriptionName("Match winner - {way}way"),
    Some(MarketVariant("way:two")),
    List(Outcome(OutcomeId(1), OutcomeName("home")), Outcome(OutcomeId(2), OutcomeName("away"))))
}
