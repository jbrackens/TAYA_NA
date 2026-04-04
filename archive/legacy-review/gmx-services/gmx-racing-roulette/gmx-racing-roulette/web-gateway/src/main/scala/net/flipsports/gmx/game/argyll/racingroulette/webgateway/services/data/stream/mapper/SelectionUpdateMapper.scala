package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.mapper

import java.util.UUID

import net.flipsports.gmx.common.primitive.ImplicitConverters.{charSequence2String, mapCharSequence2String}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements
import net.flipsports.gmx.racingroulette.api.SelectionUpdate

import scala.collection.JavaConverters._

object SelectionUpdateMapper {

  def map(record: SelectionUpdate): Elements.SelectionUpdate =
    Elements.SelectionUpdate(
      uuid = UUID.randomUUID().toString,
      eventId = record.getEventId,
      bettingId = record.getBettingId,
      participantId = record.getParticipantId,
      marketId = record.getMarketId,
      status = record.getStatus,
      trueOdds = record.getTrueOdds.doubleValue(),
      displayOdds = record.getDisplayOdds.asScala.toMap,
      lastUpdateDateTime = record.getLastUpdateDateTime,
      createdDate = record.getCreatedDate
    )
}
