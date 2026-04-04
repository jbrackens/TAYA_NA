package net.flipsports.gmx.racingroulette.api

import scala.collection.JavaConverters._

object EventIdWrapper {

  def fromJson(json: String): EventId = new EventIdJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[EventId] = new EventIdJWrapper().fromJsonList(json).asScala

  def toJson(value: EventId) = new EventIdJWrapper().toJson(value)

}
