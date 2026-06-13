package phoenix.core.websocket

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.ActorSystem
import akka.stream.scaladsl.Source
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.CirceAkkaSerializable
import phoenix.core.websocket.WebSocketFlow.FailureOr

/**
 * Uses MultiChannelStream as backbone of exposed responses
 */
abstract class DynamicSourcesMessageHandler[REQUEST, RESPONSE <: CirceAkkaSerializable](val name: String)(implicit
    system: ActorSystem,
    ec: ExecutionContext)
    extends WebSocketMessageHandler[REQUEST, RESPONSE] {
  protected val log: Logger = LoggerFactory.getLogger(getClass)

  protected val multiChannelStream = new MultiChannelStream[RESPONSE](name)

  def responsesSource: Source[RESPONSE, Any] = multiChannelStream.broadcastOutput

  def terminate(): Unit = multiChannelStream.terminate()

  def handle(input: FailureOr[REQUEST]): Future[Unit]

}
