package phoenix.core.websocket

import scala.concurrent.Future

import akka.stream.scaladsl.Source

import phoenix.core.websocket.WebSocketFlow.FailureOr

trait WebSocketMessageHandler[REQUEST, RESPONSE] {

  /**
   * Source of updates this handler is producing
   */
  def responsesSource: Source[RESPONSE, Any]

  /**
   * Used to cleanup resources when WS is being dropped
   */
  def terminate(): Unit

  /**
   * Main logic
   */
  def handle(input: FailureOr[REQUEST]): Future[Unit]

}
