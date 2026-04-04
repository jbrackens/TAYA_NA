package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.validator

import akka.event.LoggingAdapter
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.{EventsUpdate, ParticipantUpdate}

trait EventUpdateValidator {

  def isDayOfEvent(msg: EventsUpdate)(implicit logger: LoggingAdapter): Boolean = msg.eventType match {
    case "DayOfEventRace" =>
      true
    case _ =>
      logger.debug(s"Invalid event.type: ${msg.eventType}")
      false
  }

  def containsValidParticipants(msg: EventsUpdate)(implicit logger: LoggingAdapter): Boolean = {
    val result = msg.participants
      .forall(p => isDayOfEventParticipant(p))
    if (!result) {
      logger.debug("Not all participants valid")
    }
    result
  }

  def isDayOfEventParticipant(participant: ParticipantUpdate): Boolean = {
    participant.runnerStatus match {
      case "DOE" => true
      case "NR" => true
      case _ => false
    }
  }
}
