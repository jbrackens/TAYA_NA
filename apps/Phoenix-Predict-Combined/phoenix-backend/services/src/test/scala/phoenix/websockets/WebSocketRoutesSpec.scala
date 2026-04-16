package phoenix.websockets

import java.util.UUID

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter.ClassicActorSystemOps
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.ws.Message
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.ScalatestRouteTest
import akka.http.scaladsl.testkit.WSProbe
import akka.stream.scaladsl.Flow
import com.typesafe.config
import com.typesafe.config.Config
import io.circe.syntax._
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetStateUpdate
import phoenix.bets.support.BetEventStreamMock
import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.core.error.PresentationErrorCode
import phoenix.core.websocket.EventStream
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.JwtAuthenticatorMock.invalidToken
import phoenix.jwt.JwtAuthenticatorMock.punterToken
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.support.FixtureEventStreamMock
import phoenix.markets.support.MarketEventStreamMock
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.ConfigFactory
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateSportId
import phoenix.support.FutureSupport
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.wallets.support.WalletEventStreamMock
import phoenix.websockets.WebSocketRoutesSpec._
import phoenix.websockets.messages.WebSocketJsonFormats._
import phoenix.websockets.messages._

class WebSocketRoutesSpec
    extends AnyWordSpecLike
    with Matchers
    with ScalatestRouteTest
    with FutureSupport
    with BeforeAndAfterAll {

  override def testConfig: Config =
    ConfigFactory.forUnitTesting.withFallback(
      config.ConfigFactory.parseString("phoenix.web-sockets.timeout = 1 second"))

  implicit val typedSystem: ActorSystem[Nothing] = system.toTyped
  implicit val clock: Clock = Clock.utcClock

  val socket: WSProbe = WSProbe()

  protected override def afterAll(): Unit = cleanUp()

  "WebSocketRoutes" should {

    "respond with success messages" when {

      "subscribing to a fixture channel" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "unsubscribing from a fixture channel" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Unsubscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "subscribing to a market channel" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, request.channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "unsubscribing from a market channel" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Unsubscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "subscribing to bets updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "unsubscribing from bets updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Unsubscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "subscribing to wallets updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = WalletsChannel()
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "unsubscribing from wallets updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = WalletsChannel()
        val request = Unsubscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }
    }

    "respond with error messages" when {

      "subscribing to a market channel" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)

        checkWsConversation(() => createWebSocketRouteWithFailures, request, expectedResponse)
      }

      "subscribing to a fixture channel" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse = SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)

        checkWsConversation(() => createWebSocketRouteWithFailures, request, expectedResponse)
      }

      "subscribing to bet updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse =
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)

        checkWsConversation(() => createWebSocketRouteWithFailures, request, expectedResponse)
      }

      "subscribing to wallet updates channel" in {

        val correlationId = randomCorrelationId()
        val channel = WalletsChannel()
        val request = Subscribe(correlationId, Some(punterToken), channel)
        val expectedResponse =
          SubscriptionFailure(correlationId, channel, PresentationErrorCode.InternalError)

        checkWsConversation(() => createWebSocketRouteWithFailures, request, expectedResponse)
      }
    }

    "send a heartbeat" when {

      "receiving a heartbeat" in {

        val heartbeat = Heartbeat()

        checkWsConversation(() => createWebSocketRouteWithSuccesses, heartbeat, heartbeat)
      }
    }

    "still succeed in case of an invalid or missing auth token" when {

      "a fixture subscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Subscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a fixture subscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Subscribe(correlationId, token = None, channel = channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a fixture unsubscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Unsubscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a fixture unsubscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = FixtureChannel(generateSportId(), generateFixtureId())
        val request = Unsubscribe(correlationId, token = None, channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a market subscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Subscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a market subscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Subscribe(correlationId, token = None, channel)
        val expectedResponse = SubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a market unsubscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Unsubscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a market unsubscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = MarketChannel(generateMarketId())
        val request = Unsubscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = UnsubscriptionSuccess(correlationId, channel)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }
    }

    "fail in case of an invalid or missing auth token" when {
      "a bet subscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Subscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = SubscriptionFailure(correlationId, channel, PresentationErrorCode.InvalidAuthToken)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a bet subscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Subscribe(correlationId, token = None, channel)
        val expectedResponse = SubscriptionFailure(correlationId, channel, PresentationErrorCode.MissingAuthToken)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a bet unsubscribe request contains an invalid JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Unsubscribe(correlationId, Some(invalidToken), channel)
        val expectedResponse = UnsubscriptionFailure(correlationId, channel, PresentationErrorCode.InvalidAuthToken)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }

      "a bet unsubscribe request contains no JWT token" in {

        val correlationId = randomCorrelationId()
        val channel = BetsChannel()
        val request = Unsubscribe(correlationId, token = None, channel)
        val expectedResponse = UnsubscriptionFailure(correlationId, channel, PresentationErrorCode.MissingAuthToken)

        checkWsConversation(() => createWebSocketRouteWithSuccesses, request, expectedResponse)
      }
    }

    "ignore whitespace around the incoming JSON" in {
      val (wsClient, route) = createWebSocketRouteWithSuccesses

      webSocket(wsClient.flow) ~> route ~> check {
        isWebSocketUpgrade shouldEqual true

        val request = Subscribe(randomCorrelationId(), Some(invalidToken), MarketChannel(generateMarketId()))
        val requestStr = s"  \n  \t  ${request.asJson.noSpacesSortKeys}   "
        wsClient.sendMessage(requestStr)

        val message = wsClient.expectMessage()
        message.asTextMessage.getStrictText should not be failedWithInvalidJsonError

        wsClient.sendCompletion()
        wsClient.expectCompletion()
      }
    }

    "return error when incoming JSON is malformed" in {
      checkWsConversation(
        () => createWebSocketRouteWithSuccesses,
        request = """{hel"{""'\'{{} """,
        failedWithInvalidJsonError)
    }

    "succeed even when token is null (rather than completely missing)" in {
      val expectedResponse = SubscriptionSuccess(
        channel = MarketChannel(MarketId(DataProvider.Oddin, "3a7ee1f6-219a-4700-b646-2f1ec45072c3")),
        correlationId = CorrelationId("27232f06-b644-4178-92c0-54238fa575f0"))

      checkWsConversation(
        () => createWebSocketRouteWithSuccesses,
        request =
          """{"token":null,"channel":"market^m:o:3a7ee1f6-219a-4700-b646-2f1ec45072c3","event":"subscribe","correlationId":"27232f06-b644-4178-92c0-54238fa575f0"}""",
        expectedResponse)
    }
  }

  private def webSocket(clientSideHandler: Flow[Message, Message, NotUsed]): HttpRequest =
    WS("/web-socket", clientSideHandler)

  private def createWebSocketRoute(
      jwtAuthenticator: JwtAuthenticator,
      marketStreams: EventStream[MarketId, MarketStateUpdate],
      fixtureStreams: EventStream[FixtureId, FixtureStateUpdate],
      betStreams: EventStream[PunterId, BetStateUpdate],
      walletStreams: EventStream[WalletId, WalletStateUpdate]): (WSProbe, Route) =
    (
      WSProbe(),
      WebSocketRoutes.webSocketRoute(
        jwtAuthenticator,
        ConstantUUIDGenerator,
        marketStreams,
        fixtureStreams,
        betStreams,
        walletStreams))

  private def createWebSocketRouteWithSuccesses: (WSProbe, Route) =
    createWebSocketRoute(
      JwtAuthenticatorMock.jwtAuthenticatorMock(),
      MarketEventStreamMock.successful,
      FixtureEventStreamMock.successful,
      BetEventStreamMock.successful,
      WalletEventStreamMock.successful)

  private def createWebSocketRouteWithFailures: (WSProbe, Route) =
    createWebSocketRoute(
      JwtAuthenticatorMock.jwtAuthenticatorMock(),
      MarketEventStreamMock.failing,
      FixtureEventStreamMock.failing,
      BetEventStreamMock.failing,
      WalletEventStreamMock.failing)

  private def checkWsConversation(
      probeRouteGen: () => (WSProbe, Route),
      request: IncomingMessage,
      expectedResponse: OutgoingMessage): Unit =
    checkWsConversation(probeRouteGen, request.asJson.noSpacesSortKeys, expectedResponse)

  private def checkWsConversation(
      probeRouteGen: () => (WSProbe, Route),
      request: String,
      expectedResponse: OutgoingMessage): Unit = {
    val (wsClient, route) = probeRouteGen()

    webSocket(wsClient.flow) ~> route ~> check {
      isWebSocketUpgrade shouldEqual true
      wsClient.sendMessage(request)
      wsClient.expectMessage(expectedResponse.asJson.noSpacesSortKeys)
      wsClient.sendCompletion()
      wsClient.expectCompletion()
    }
  }
}

object WebSocketRoutesSpec {

  val failedWithInvalidJsonError = Error(PresentationErrorCode.InvalidJson)

  def randomCorrelationId(): CorrelationId =
    CorrelationId(UUID.randomUUID().toString)
}
