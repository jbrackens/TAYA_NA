package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor

import akka.actor._
import akka.event.Logging.MDC
import akka.event.{DiagnosticLoggingAdapter, Logging, LoggingReceive}
import akka.stream._
import akka.stream.scaladsl._
import akka.{Done, NotUsed}
import com.softwaremill.tagging.@@
import net.flipsports.gmx.common.mdc.MDCOps
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.BaseRequest
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.{RouletteEngine, RouletteStream}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.Messages._
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient

import scala.concurrent.{ExecutionContext, Future}

/**
 * Creates a user actor that sets up the websocket stream.
 */
class UserWebsocketActor(name: String, rouletteEngine: RouletteEngine)
                        (implicit ec: ExecutionContext)
  extends DiagnosticActorLogging with MDCOps {

  implicit val logger: DiagnosticLoggingAdapter = Logging(this)

  /**
   * All WS requests are consumed from this Sink
   */
  private val requestIn: Sink[BaseRequest, Future[Done]] = Sink.foreach { input =>
    putCorrelation(input.extractUUID)
    self ! input
    clear()
  }

  /**
   * Flow that can be used by the WebSocket. Connects requestIn with messagesOut.
   */
  private lazy val websocketFlow: Flow[BaseRequest, BaseResponse, NotUsed] =
    Flow.fromSinkAndSourceCoupled(requestIn, rouletteEngine.responsesSource).watchTermination() { (_, termination) =>
      logger.info(s"Termination signal from websocketFlow in actor: $self")
      termination.foreach(_ => context.stop(self))
      NotUsed
    }.named(s"flow-$name")

  override def mdc(currentMessage: Any): MDC = extractCorrelationMDC(currentMessage)

  /**
   * Main behaviour
   */
  override def receive: Receive = LoggingReceive {
    case _: OpenStream =>
      sender() ! websocketFlow
    case msg: BaseRequest =>
      rouletteEngine.handleRequest(msg)
    case x: Any =>
      logger.error(s"UNSUPPORTED!! $x")
  }

  /**
   * If this actor is killed directly, stop anything that we started running explicitly.
   */
  override def postStop(): Unit = {
    logger.info(s"Stopping actor: $self")
    rouletteEngine.terminate()
  }
}


object UserWebsocketActor {

  def props(name: String, eventsActor: ActorRef @@ EventStreamDispatcherActor.Type, bettingAPIClient: BettingAPIClient)
           (implicit system: ActorSystem, mat: Materializer, ec: ExecutionContext) = {
    val rouletteStream = new RouletteStream(name)
    val rouletteEngine = new RouletteEngine(eventsActor, rouletteStream, bettingAPIClient)
    Props(new UserWebsocketActor(name, rouletteEngine))
  }

}
