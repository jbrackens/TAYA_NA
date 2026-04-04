package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller

import akka.actor.{ActorRef, ActorSystem}
import akka.pattern.ask
import akka.util.Timeout
import com.softwaremill.tagging.@@
import net.flipsports.gmx.common.akka.PrivateMethodExposer
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.Messages.{GetAllEvents, GetEventState, GetEventStateResult}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper.EventUpdateOps
import play.api.libs.json.{Format, Json}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

class OperatorController(eventStreamDispatcherActor: ActorRef @@ EventStreamDispatcherActor.Type, cc: ControllerComponents, actorSystem: ActorSystem)
                        (implicit ec: ExecutionContext)
  extends AbstractController(cc) with EventUpdateOps {

  implicit val childTimeout: Timeout = Timeout(50.millis)

  implicit lazy val InGameEventConverter: Format[InGameEvent] = Json.format[InGameEvent]
  implicit lazy val EventStateConverter: Format[EventState] = Json.format[EventState]
  implicit lazy val ParticipantStateConverter: Format[ParticipantState] = Json.format[ParticipantState]
  implicit lazy val MarketStateConverter: Format[MarketState] = Json.format[MarketState]
  implicit lazy val SelectionStateConverter: Format[SelectionState] = Json.format[SelectionState]

  def displayEvents(): Action[AnyContent] = {
    Action.async {
      val future = (eventStreamDispatcherActor ? GetAllEvents).mapTo[List[String]]
      future.map(list => Ok(Json.toJson(list)).as(JSON))
    }
  }

  def displayEvent(eventId: String): Action[AnyContent] = {
    Action.async {
      val future = (eventStreamDispatcherActor ? GetEventState("EMPTY", eventId)).mapTo[GetEventStateResult]
      future.map(event => Ok(Json.toJson(event.state)))
    }
  }

  def displayActors(): Action[AnyContent] = {
    Action { _ =>
      val printTree = new PrivateMethodExposer(actorSystem)('printTree)()
      Ok(printTree.toString)
    }
  }
}
