package phoenix

import scala.concurrent.Future
import scala.concurrent.Promise

import akka.NotUsed
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.ws.Message
import akka.http.scaladsl.model.ws.TextMessage
import akka.http.scaladsl.model.ws.WebSocketRequest
import akka.http.scaladsl.model.ws.WebSocketUpgradeResponse
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Source
import io.circe.Codec
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec
import io.circe.parser._
import io.circe.syntax._

import phoenix.WebSocketProtocol._

trait WebSocketSupport extends HttpSupport with WebSocketFormats {
  private lazy val webSocketsUrl = Config.instance.phoenix.webSocketsUrl

  def subscribeToWebsocket(initialMessage: OutgoingWebsocketMessage): Source[IncomingWebsocketMessage, NotUsed] = {
    log.info("Starting Web Socket connection...")

    subscriptionSource(initialMessage)
      .viaMat(establishWebsocketConnection)(Keep.none)
      .collect {
        case TextMessage.Strict(text) =>
          log.info(s"Incoming on WS: '$text'")
          text
      }
      .mapConcat(decode[IncomingWebsocketMessage](_).toOption)
  }

  private def subscriptionSource(initial: OutgoingWebsocketMessage): Source[Message, Promise[Option[Nothing]]] = {
    val outgoingSource = Source.single(TextMessage.Strict(initial.asJson.noSpacesSortKeys))
    val openedForever = outgoingSource.concatMat(Source.maybe)(Keep.right)

    openedForever
  }

  private def establishWebsocketConnection: Flow[Message, Message, Future[WebSocketUpgradeResponse]] = {
    httpClient.webSocketClientFlow(WebSocketRequest(Uri(s"$webSocketsUrl/web-socket")))
  }
}

trait WebSocketFormats {
  implicit val outgoingMessageCodec: Codec[OutgoingWebsocketMessage] = deriveCodec
  implicit val incomingMessageCodec: Codec[IncomingWebsocketMessage] = deriveCodec
}

object WebSocketProtocol {

  /**
   * This corresponds to a message outgoing from the contract tests to the backend.
   * From the perspective of the backend, it's an incoming message, see `phoenix.websockets.messages.IncomingMessage`.
   */
  case class OutgoingWebsocketMessage(correlationId: String, event: String, channel: String, token: Option[String])

  /**
   * This corresponds to a message incoming to the contract tests from the backend.
   * From the perspective of the backend, it's an outgoing message, see `phoenix.websockets.messages.OutgoingMessage`.
   */
  case class IncomingWebsocketMessage(correlationId: String, channel: String, event: Option[String], data: Option[Json])
}
