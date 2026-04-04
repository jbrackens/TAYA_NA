package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state


import java.time.{Instant, ZoneOffset, ZonedDateTime}

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.EventStatus
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.EventStatus.NotStarted
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.EventsUpdate


case class EventState(id: String,
                      eventType: String,
                      eventName: String,
                      leagueName: String,
                      startEventDate: ZonedDateTime,
                      status: EventStatus,
                      participants: Seq[ParticipantState] = Seq(),
                      sbtechUpdateTime: Long,
                      flinkProcessedTime: Long)


object EventState {
  def asState(message: EventsUpdate) = EventState(
    id = message.eventId,
    eventType = message.eventType,
    eventName = message.eventName,
    leagueName = message.leagueName,
    startEventDate = Instant.ofEpochSecond(message.startEventDate).atZone(ZoneOffset.UTC),
    status = parseStatus(message.status),
    participants = message.participants.map(ParticipantState.asState),
    sbtechUpdateTime = message.lastUpdateDateTime,
    flinkProcessedTime = message.createdDate
  )

  def parseStatus(input: String): EventStatus = {
    EventStatus.withNameOption(input).getOrElse(NotStarted)
  }
}
