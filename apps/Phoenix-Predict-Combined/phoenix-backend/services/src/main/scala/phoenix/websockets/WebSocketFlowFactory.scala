package phoenix.websockets

import scala.concurrent.ExecutionContext

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.http.scaladsl.model.ws.Message
import akka.http.scaladsl.model.ws.TextMessage
import akka.stream.Attributes
import akka.stream.Materializer
import akka.stream.scaladsl.Flow
import cats.syntax.either._
import io.circe.parser.parse
import io.circe.syntax._
import org.slf4j.LoggerFactory

import phoenix.bets.BetStateUpdate
import phoenix.core.ScalaObjectUtils._
import phoenix.core.websocket.EventStream
import phoenix.core.websocket.WebSocketFlow
import phoenix.core.websocket.WebSocketFlow.InvalidJson
import phoenix.jwt.JwtAuthenticator
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.IncomingMessage
import phoenix.websockets.messages.OutgoingMessage
import phoenix.websockets.messages.WebSocketJsonFormats._

object WebSocketFlowFactory {
  private val log = LoggerFactory.getLogger(getClass)

  def buildWebSocketFlow(
      sessionId: SessionId,
      markets: EventStream[MarketId, MarketStateUpdate],
      fixtures: EventStream[FixtureId, FixtureStateUpdate],
      bets: EventStream[PunterId, BetStateUpdate],
      wallets: EventStream[WalletId, WalletStateUpdate],
      tokenVerifier: JwtAuthenticator)(implicit
      system: ActorSystem[_],
      ec: ExecutionContext): Flow[Message, Message, NotUsed] = {
    val messageHandler =
      new WebSocketChannelDispatchingMessageHandler(sessionId, markets, fixtures, bets, wallets, tokenVerifier)
    val webSocketFlow = new WebSocketFlow[IncomingMessage, OutgoingMessage](sessionId.value, messageHandler)

    val config = WebSocketsConfig.of(system)

    val requestIn = incomingFlow(config)
    val responsesOut = outgoingFlow()

    // wrap typed WebSocket Flow in JS converters (simulates play.api.mvc.WebSocket.MessageFlowTransformer$)
    requestIn.via(webSocketFlow.websocketFlow).via(responsesOut).named(s"flow-webSocket-${sessionId.value}")
  }

  private[this] def incomingFlow(config: WebSocketsConfig)(implicit
      mat: Materializer): Flow[Message, Either[InvalidJson, IncomingMessage], NotUsed] = {
    Flow[Message]
      .collect { case message: TextMessage => message }
      .mapAsync(1)(_.toStrict(config.timeout))
      .map { case TextMessage.Strict(json) => parseJsonMessage(json) }
      .log(WebSocketServer.simpleObjectName)
      .withAttributes(Attributes.logLevels(onElement = Logging.InfoLevel))
  }

  private[this] def outgoingFlow(): Flow[OutgoingMessage, TextMessage.Strict, NotUsed] = {
    Flow[OutgoingMessage].map { response =>
      log.info(s"Response received, relaying to UI web socket: $response")
      TextMessage.Strict(response.asJson.noSpacesSortKeys)
    }
  }

  private[this] def parseJsonMessage(json: String): Either[InvalidJson, IncomingMessage] =
    for {
      parsed <- parse(json).leftMap(InvalidJson.Parsing(json, _))
      message <- parsed.as[IncomingMessage].leftMap(InvalidJson.Decoding(parsed, _))
    } yield message
}
