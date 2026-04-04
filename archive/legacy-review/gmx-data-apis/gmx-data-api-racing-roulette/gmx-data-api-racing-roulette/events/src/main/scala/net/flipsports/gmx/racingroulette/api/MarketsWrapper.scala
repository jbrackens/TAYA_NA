package net.flipsports.gmx.racingroulette.api

import scala.collection.JavaConverters._

object MarketsWrapper {
  def fromJson(json: String): MarketUpdate = new MarketsJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[MarketUpdate] = new MarketsJWrapper().fromJsonList(json).asScala

  def toJson(value: MarketUpdate) = new MarketsJWrapper().toJson(value)

}
