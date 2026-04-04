package phoenix

import java.util.UUID

import scala.concurrent.duration.DurationInt
import scala.util.Random

import akka.stream.scaladsl.Sink
import org.scalatest.Inspectors
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers

import phoenix.Constants.Websockets._

class MarketsContractTest
    extends TestUserPerSpec
    with Matchers
    with Inspectors
    with ScalaFutures
    with WebSocketSupport
    with MarketRequests {

  "punter" should {
    "be able to list all available fixtures" in {
      // when
      val responseBody = await(allAvailableFixtures())

      // then
      responseBody.data should not be empty
    }

    "be able to get fixture details" in {
      // given
      val allFixtures = await(allAvailableFixtures())
      val fixturesSubset = Random.shuffle(allFixtures.data).take(20)

      // then
      forAll(fixturesSubset) { fixture =>
        await(getFixture(fixture.sport.sportId, fixture.fixtureId))
      }
    }

    "be able to subscribe to selection odds changes" in {
      // given a random market and a subscription message to its updates being sent to web sockets:
      val correlationId = UUID.randomUUID().toString
      val randomMarket = await(randomBettableMarket())
      val expectedChannel = s"market^${randomMarket.marketId}"

      val outgoingMessage = subscribeToMarketUpdates(correlationId, expectedChannel)
      val websocketMessages = await(subscribeToWebsocket(outgoingMessage).takeWithin(20.seconds).runWith(Sink.seq))

      // then
      websocketMessages should not be empty

      // and
      val expectedEvent = SubscribeSuccess
      withClue(s"Expecting SubscribeSuccess event key in websocketMessages: ${websocketMessages}") {
        websocketMessages.headOption.map(_.event.get) shouldBe Some(expectedEvent)
      }

      // and
      forExactly(1, websocketMessages) { message =>
        message.event.get shouldBe expectedEvent
        message.correlationId shouldBe correlationId
        message.channel shouldBe expectedChannel
      }

      // TODO (PHXD-834): disabling this step, as it depends on random behavior from the Oddin SDK
      // (if no market updates come to the randomly chosen market, it'll fail).
      // We require to have a proper dev/staging environment split
      // in order to be able to force market changes for a particular market when it suits the tests,
      // using the currently available market dev routes.

//      forAtLeast(1, websocketMessages) { message =>
//        message._type shouldBe "market-data-update"
//      }
    }
  }
}
