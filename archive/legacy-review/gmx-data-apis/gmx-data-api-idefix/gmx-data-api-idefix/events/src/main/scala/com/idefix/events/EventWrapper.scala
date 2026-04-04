package com.idefix.events

import scala.collection.JavaConverters._

object EventWrapper {

  def fromJson(json: String): Event = new EventJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[Event] = new EventJWrapper().fromJsonList(json).asScala

  def toJson(value: Event): String = new EventJWrapper().toJson(value)

}
