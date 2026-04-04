package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.mapper

import java.util.UUID

import net.flipsports.gmx.common.primitive.ImplicitConverters.charSequence2String
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements
import net.flipsports.gmx.racingroulette.api.{EventUpdate, Participant}

import scala.collection.JavaConverters._

object EventUpdateMapper {

  def map(record: EventUpdate) = Elements.EventsUpdate(
    uuid = UUID.randomUUID().toString,
    eventId = record.getId,
    eventType = record.getType,
    eventName = record.getEventName,
    leagueName = record.getLeagueName,
    startEventDate = record.getStartEventDate,
    status = record.getStatus,
    participants = record.getParticipants.asScala.map(mapParticipant),
    lastUpdateDateTime = record.getLastUpdateDateTime,
    createdDate = record.getCreatedDate
  )

  def mapParticipant(item: Participant) = Elements.ParticipantUpdate(
    uuid = UUID.randomUUID().toString,
    id = item.getId,
    name = item.getName,
    runnerNumber = item.getRunnerNumber,
    runnerStatus = item.getRunnerStatus
  )
}
