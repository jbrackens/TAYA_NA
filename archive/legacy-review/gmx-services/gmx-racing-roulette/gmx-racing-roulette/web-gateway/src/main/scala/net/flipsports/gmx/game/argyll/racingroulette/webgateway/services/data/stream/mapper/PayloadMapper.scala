package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.mapper

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.StateUpdate
import net.flipsports.gmx.racingroulette.api.{EventUpdate, MarketUpdate, SelectionUpdate}

class PayloadMapper {
  def map(payload: AnyRef): StateUpdate = payload match {
    case s: SelectionUpdate => SelectionUpdateMapper.map(s)
    case e: EventUpdate => EventUpdateMapper.map(e)
    case m: MarketUpdate => MarketsUpdateMapper.map(m)
  }

}
