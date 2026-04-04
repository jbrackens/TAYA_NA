package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state


import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.MarketUpdate


case class MarketState(id: String,
                       marketTypeId: String,
                       eventId: String,
                       sbtechUpdateTime: Long,
                       flinkProcessedTime: Long)


object MarketState {
  def asState(message: MarketUpdate) = MarketState(
    id = message.id,
    marketTypeId = message.marketTypeId,
    eventId = message.eventId,
    sbtechUpdateTime = message.lastUpdateDateTime,
    flinkProcessedTime = message.createdDate
  )
}
