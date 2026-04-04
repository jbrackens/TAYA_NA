package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller

import akka.NotUsed
import akka.actor._
import akka.event.{Logging, LoggingAdapter}
import akka.pattern.ask
import akka.stream.scaladsl._
import akka.util.Timeout
import com.softwaremill.tagging._
import com.typesafe.config.Config
import net.flipsports.gmx.common.play.AllowedOriginCheck
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette.{RequestDeserializer, ResponseSerializer}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.BaseRequest
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.BaseResponse
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.Messages.OpenStream
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.UserWebsocketProviderActor
import play.api.libs.json._
import play.api.mvc.WebSocket.MessageFlowTransformer
import play.api.mvc._

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}

class RouletteController(userStreamProvider: ActorRef @@ UserWebsocketProviderActor.Type, requestDeserializer: RequestDeserializer,
                         responseSerializer: ResponseSerializer, cc: ControllerComponents)
                        (implicit val config: Config, system: ActorSystem, ec: ExecutionContext)
  extends AbstractController(cc){

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)
  implicit val userActorTimeout: Timeout = Timeout(50.millis)

  implicit val readsBaseRequest = Reads {
    requestDeserializer.fromJson
  }
  implicit val writesBaseResponse = Writes {
    responseSerializer.toJson
  }
  implicit val messageTransformer = MessageFlowTransformer.jsonMessageFlowTransformer[BaseRequest, BaseResponse]

  private val originCheck = new AllowedOriginCheck()

  def openWebSocket(): WebSocket = WebSocket.acceptOrResult[BaseRequest, BaseResponse] {
      case requestHeader if originCheck.verifyRequest(requestHeader) =>
        wsFutureFlow(requestHeader).map { flow =>
          Right(flow)
        }.recover {
          case e: Exception =>
            logger.error("Cannot create websocket", e)
            Left(InternalServerError)
        }
      case rejected =>
        Future.successful {
          logger.error(s"Request $rejected failed same origin check")
          Left(Forbidden)
        }
  }

  private def wsFutureFlow(request: RequestHeader): Future[Flow[BaseRequest, BaseResponse, NotUsed]] = {
    val future = userStreamProvider ? OpenStream(request.id.toString)

    future.mapTo[Flow[BaseRequest, BaseResponse, NotUsed]]
      .map(_.named(flowName(request.id.toString)))
  }

  private def flowName(requestId: String): String = {
    s"flow-webSocket-$requestId"
  }
}