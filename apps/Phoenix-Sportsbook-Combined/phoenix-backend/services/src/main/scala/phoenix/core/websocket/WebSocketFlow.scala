package phoenix.core.websocket

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.NotUsed
import akka.stream.ActorAttributes
import akka.stream.Supervision
import akka.stream.scaladsl._
import io.circe._
import org.slf4j.LoggerFactory

import phoenix.core.websocket.WebSocketFlow._

/**
 * Wrapper object for WS Flow, not bound to MultiChannelStream so simpler implementations should also work.
 */

class WebSocketFlow[REQUEST, RESPONSE](name: String, messageHandler: WebSocketMessageHandler[REQUEST, RESPONSE])(
    implicit ec: ExecutionContext) {
  private val log = LoggerFactory.getLogger(getClass)

  /**
   * All WS requests are consumed from this Sink
   */
  private val requestIn: Sink[FailureOr[REQUEST], Future[Done]] = incomingFlow()

  /**
   * Flow that can be used by the WebSocket. Connects requestIn with handler output stream.
   */
  val websocketFlow: Flow[FailureOr[REQUEST], RESPONSE, NotUsed] = {
    Flow
      .fromSinkAndSourceCoupled(requestIn, messageHandler.responsesSource)
      .watchTermination() { (_, f) =>
        f.andThen {
          case Success(_) =>
            log.info(s"Successful termination for websocketFlow $name")
          case Failure(e) =>
            log.info(s"Failure when terminating websocketFlow $name", e)
        }.andThen { _ =>
          log.info("Terminating message handler")
          messageHandler.terminate()
        }
        NotUsed
      }
      .named(s"flow-$name")
  }

  private def incomingFlow(): Sink[FailureOr[REQUEST], Future[Done]] = {
    val decider: Supervision.Decider = e => {
      log.warn(s"Exception in incoming stream: ${e.getMessage}")
      Supervision.Resume
    }

    Sink
      .foreachAsync(parallelism = 1) { input =>
        messageHandler.handle(input)
      }
      .withAttributes(ActorAttributes.supervisionStrategy(decider))
  }
}

object WebSocketFlow {

  type FailureOr[T] = Either[InvalidJson, T]

  sealed trait InvalidJson
  object InvalidJson {
    final case class Parsing(json: String, error: ParsingFailure) extends InvalidJson
    final case class Decoding(json: Json, error: DecodingFailure) extends InvalidJson
  }
}
