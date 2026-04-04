package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette

import akka.actor.{ActorRef, ActorSystem}
import akka.event.{Logging, LoggingAdapter}
import akka.stream.scaladsl.Source
import com.softwaremill.tagging.@@
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler.{CalculateReturnHandler, EventUpdateHandler, PlaceBetsHandler, SubscribeEventHandler}
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient

import scala.concurrent.ExecutionContext

class RouletteEngine(val eventsActor: ActorRef @@ EventStreamDispatcherActor.Type, val rouletteStream: RouletteStream, val bettingAPIClient: BettingAPIClient)
                    (implicit system: ActorSystem, ec: ExecutionContext)
  extends SubscribeEventHandler
    with EventUpdateHandler
    with CalculateReturnHandler
    with PlaceBetsHandler {

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)

  def handleRequest(input: BaseRequest): Unit = rouletteStream.publishResponse {
    input match {
      case msg: SubscribeEventReq => handleSubscribe(msg)
      case msg: EventUpdateReq => handleEventUpdate(msg)
      case msg: CalculateReturnReq => handleCalculateReturn(msg)
      case msg: PlaceBetsReq => handlePlaceBet(msg)
    }
  }

  def responsesSource: Source[BaseResponse, Any] = rouletteStream.broadcastOutput

  def terminate(): Unit = rouletteStream.terminate()

}
