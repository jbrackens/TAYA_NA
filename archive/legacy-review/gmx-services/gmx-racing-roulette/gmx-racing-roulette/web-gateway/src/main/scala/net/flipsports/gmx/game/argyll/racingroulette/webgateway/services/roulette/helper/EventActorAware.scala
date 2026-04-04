package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper

import akka.actor.ActorRef
import akka.pattern._
import akka.util.Timeout
import com.softwaremill.tagging.@@
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.Messages.{GetEventState, GetEventStateResult, GetEventStream, GetEventStreamResult}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor

import scala.concurrent.Future
import scala.concurrent.duration._

trait EventActorAware {
  def eventsActor: ActorRef @@ EventStreamDispatcherActor.Type

  implicit val timeout = Timeout(50.millis)

  def getEventStream(reqMeta: RequestMetadata): Future[GetEventStreamResult] = {
    val future = eventsActor ? GetEventStream(reqMeta.extractUUID, reqMeta.eventId)
    future.mapTo[GetEventStreamResult]
  }

  def getEventState(reqMeta: RequestMetadata): Future[GetEventStateResult] = {
    val future = eventsActor ? GetEventState(reqMeta.extractUUID, reqMeta.eventId)
    future.mapTo[GetEventStateResult]
  }
}
