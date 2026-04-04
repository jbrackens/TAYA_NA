package net.flipsports.gmx.streaming.sbtech.dto

import net.flipsports.gmx.streaming.sbtech.SourceTypes

case class Odds(
  id: Id,
  kind: Kind,
  eventTimestamp: Long,
  event: Option[SourceTypes.Event.ValueType] = None,
  market: Option[SourceTypes.Market.ValueType] = None,
  selection: Option[SourceTypes.Selection.ValueType] = None
  ) extends Serializable {

  def isNullRecord(): Boolean = event.isEmpty && market.isEmpty && selection.isEmpty

}
