package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor

import akka.actor._
import akka.event.Logging.MDC
import akka.event.{DiagnosticLoggingAdapter, Logging, LoggingReceive}
import akka.pattern.{ask, pipe}
import akka.stream.Materializer
import akka.stream.scaladsl._
import akka.util.Timeout
import com.softwaremill.tagging.@@
import net.flipsports.gmx.common.mdc.MDCOps
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.BaseRequest
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.BaseResponse
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.Messages.OpenStream
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

class UserWebsocketProviderActor(eventStreamDispatcherActor: ActorRef @@ EventStreamDispatcherActor.Type, bettingAPIClient: BettingAPIClient)
                                (implicit system: ActorSystem, mat: Materializer, ec: ExecutionContext)
  extends DiagnosticActorLogging with MDCOps {

  implicit val logger: DiagnosticLoggingAdapter = Logging(this)
  implicit val childTimeout: Timeout = Timeout(50.millis)

  override def mdc(currentMessage: Any): MDC = extractCorrelationMDC(currentMessage)

  override def receive: Receive = LoggingReceive {
    case msg: OpenStream =>
      val child: ActorRef = createChild(msg.requestId)
      val futureFlow = (child ? msg).mapTo[Flow[BaseRequest, BaseResponse, _]]
      pipe(futureFlow) to sender()
  }

  def createChild(requestId: String): ActorRef = {
    val name = getRoute(requestId)
    logger.info(s"Creating user actor: $name")
    context.actorOf(UserWebsocketActor.props(name, eventStreamDispatcherActor, bettingAPIClient), name)
  }

  private def getRoute(requestId: String): String = {
    s"userStreamActor-$requestId"
  }
}


object UserWebsocketProviderActor {

  trait Type

}