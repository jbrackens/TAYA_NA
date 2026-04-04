package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.mapper

import java.util.UUID

import net.flipsports.gmx.common.primitive.ImplicitConverters.charSequence2String
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements
import net.flipsports.gmx.racingroulette.api.MarketUpdate

object MarketsUpdateMapper {

  def map(record: MarketUpdate): Elements.MarketUpdate =
    Elements.MarketUpdate(
      uuid = UUID.randomUUID().toString,
      id = record.getId,
      eventId = record.getEventId,
      marketTypeId = record.getMarketTypeId,
      lastUpdateDateTime = record.getLastUpdateDateTime,
      createdDate = record.getCreatedDate
    )
}
