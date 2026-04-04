package net.flipsports.gmx.racingroulette.api

import scala.collection.JavaConverters._

object EventsWrapper {

  def fromJson(json: String): EventUpdate = new EventsJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[EventUpdate] = new EventsJWrapper().fromJsonList(json).asScala

  def toJson(value: EventUpdate) = new EventsJWrapper().toJson(value)

}
