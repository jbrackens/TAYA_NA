package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor

import akka.NotUsed
import akka.stream.scaladsl.Source
import net.flipsports.gmx.common.mdc.MDCCorrelationUUID
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state.InGameEvent

object Messages {

  case class GetAllEvents()

  case class GetEventStream(requestId: String, eventId: String) extends MDCCorrelationUUID {
    override def extractUUID: String = requestId
  }

  case class GetEventStreamResult(eventUpdates: Source[InGameEvent, NotUsed])

  case class GetEventState(uuid: String, eventId: String) extends MDCCorrelationUUID {
    override def extractUUID: String = uuid
  }

  case class GetEventStateResult(state: InGameEvent)

  case class StopIfOlder(referenceTime: Long)
  case class Stopped(eventId: String)

}
