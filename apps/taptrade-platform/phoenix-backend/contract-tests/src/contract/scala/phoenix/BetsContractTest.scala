package phoenix

import java.util.UUID

import scala.concurrent.duration.DurationInt

import akka.stream.scaladsl.Sink
import org.scalatest.Inspectors
import org.scalatest.LoneElement.convertToCollectionLoneElementWrapper
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers

import phoenix.Constants.Bets._
import phoenix.Constants.Currency._
import phoenix.Constants.Http._
import phoenix.Constants.Websockets._

class BetsContractTest
    extends TestUserPerSpec
    with Matchers
    with Inspectors
    with ScalaFutures
    with WebSocketSupport
    with BetRequests {

  "Frontend" should {
    "be notified when a bet has been opened" in {
      // given a subscription to bet updates and a subsequent bet being opened for that punter
      val geolocation = Geolocation(GeoHeader)
      val correlationId = UUID.randomUUID().toString

      val websocketMessages = await(for {
        response <- signIn(testUser.credentials)
        accessToken = response.token
        outgoingMessage = subscribeToBetUpdates(correlationId, accessToken.token)
        incomingMessages <- subscribeToWebsocket(outgoingMessage)
          .via(placeBetEffectFlow(accessToken, response.token.userId, geolocation, amount = 2.0, currency = USD))
          .takeWithin(20.seconds)
          .runWith(Sink.seq)
      } yield incomingMessages)

      websocketMessages should not be empty

      // and
      withClue(s"Expecting SubscribeSuccess and UpdateKey event keys: ${websocketMessages}") {
        websocketMessages.map(_.event.get) shouldBe List(SubscribeSuccess, UpdateKey) 
      }

      // and
      forExactly(1, websocketMessages) { message =>
        message.event.get shouldBe SubscribeSuccess
        message.correlationId shouldBe correlationId
        message.channel shouldBe BetsChannel
      }

      // and
      forExactly(1, websocketMessages) { message =>
        message.event.get shouldBe UpdateKey
        message.correlationId shouldBe correlationId
        message.channel shouldBe BetsChannel
        message.data.map(_.hcursor.downField(StateField).as[String]) shouldBe Some(Right(Opened))
      }
    }

    "not allow not authenticated punter to place bet" in {
      // given a subscription to bet updates and a subsequent bet being opened for that punter
      val geolocation = Geolocation(GeoHeader)
      val failedRequest = placeBetFailureOnRandomMarket("dummyToken", geolocation, 2.0, "USD")

      failedRequest.errors.loneElement.errorCode shouldBe "invalidAuthToken"
    }

    //"be notified when a bet has been settled" in {
    // TODO (PHXD-609): as bet settlements require modifying market state, and using dev routes to create new markets
    //  can lead to issues to frontend/other teams if sharing the same environment than the one used in these
    //  this test will need to wait until a proper staging environment is created
    //}
  }

  "punter" should { // TODO (PHXD-963): add this test
    "be able to fetch bets history filtered by bet outcome" ignore {}
  }
}
