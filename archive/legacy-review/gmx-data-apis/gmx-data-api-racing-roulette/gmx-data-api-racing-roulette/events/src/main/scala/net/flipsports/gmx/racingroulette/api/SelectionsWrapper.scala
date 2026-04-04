package net.flipsports.gmx.racingroulette.api

import scala.collection.JavaConverters._

object SelectionsWrapper {
  def fromJson(json: String): SelectionUpdate = new SelectionsJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[SelectionUpdate] = new SelectionsJWrapper().fromJsonList(json).asScala

  def toJson(value: SelectionUpdate) = new SelectionsJWrapper().toJson(value)

}
